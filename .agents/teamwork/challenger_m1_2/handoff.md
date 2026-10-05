# Milestone 1 Adversarial Challenge & Route Protection Report

**Agent**: `challenger_m1_2` (teamwork_preview_challenger)  
**Parent Agent**: `orchestrator` (`f6e16f1f-50a4-4525-ab41-c30e78b1bc45`)  
**Timestamp**: 2026-10-01T22:51:00Z  
**Target Milestone**: Milestone 1: Backend User Authentication & users.json Engine  
**Explicit Verdict**: **`REJECT`**  

---

## 1. Observation

### 1.1 Direct Observations & Empirical Outputs

#### Observation 1: Critical Authentication Bypass via URL Substring Matching
- **Target File & Lines**: `server/middleware/authMiddleware.js:18-26`
  ```javascript
  // Public endpoints bypass
  if (
    path === '/health' ||
    path.startsWith('/health') ||
    path.startsWith('/auth') ||
    originalUrl.includes('/api/health') ||
    originalUrl.includes('/api/auth')
  ) {
    return next();
  }
  ```
- **Vulnerability**: The middleware checks `originalUrl.includes('/api/auth')` and `originalUrl.includes('/api/health')`. Because `req.originalUrl` includes query parameters, appending `?bypass=/api/auth` or `?tag=/api/health` to ANY protected endpoint causes the condition to evaluate to `true`, instantly invoking `return next()` and completely bypassing token validation and route guards.
- **Empirical Execution**:
  ```powershell
  node -e "const app = require('./index'); const server = app.listen(5099, async () => { process.env.ENFORCE_AUTH = 'true'; const res = await fetch('http://127.0.0.1:5099/api/agents?bypass=/api/auth'); console.log('Bypass Status:', res.status); const data = await res.json(); console.log('Records returned:', data.data?.length); server.close(); });"
  ```
- **Verbatim Output**:
  ```
  [Local JSON Database Engine Ready & Default Admin Seeded]
  Bypass Status: 200
  Records returned: 95
  ```
- **Impact**: Even when `process.env.ENFORCE_AUTH = 'true'` is enabled and no token or a malformed token is provided, any unauthenticated attacker can dump sensitive financial data (all 95 agent accounts, ledgers, vouchers, financial reports) by simply adding `?bypass=/api/auth`.

---

#### Observation 2: Unauthenticated Access Allowed by Default on Sensitive Financial Routes
- **Target File & Lines**: `server/middleware/authMiddleware.js:58-68`
  ```javascript
  // If strict enforcement is enabled via environment
  if (process.env.ENFORCE_AUTH === 'true') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token required'
    });
  }

  // Graceful fallback for backward compatibility with frontend calls during migration
  return next();
  ```
- **Empirical Execution**:
  ```powershell
  node -e "const app = require('./index'); delete process.env.ENFORCE_AUTH; const server = app.listen(5098, async () => { const res = await fetch('http://127.0.0.1:5098/api/agents'); console.log('Default No-Token Status:', res.status); server.close(); });"
  ```
- **Verbatim Output**:
  ```
  Default No-Token Status: 200
  ```
- **Impact**: In a default installation or standard `npm start` (where `ENFORCE_AUTH` is not set), sensitive financial endpoints (`/api/agents`, `/api/ledgers`, `/api/reports/receivables`, `/api/reports/advance-deposits`, `/api/reports/ksa-exposure`, `/api/reports/daily-flow`) do not enforce authentication for requests lacking an Authorization header. While documented by the worker as an interim backward-compatibility bridge for Milestone 2 frontend migration, it leaves production routes open unless an undocumented environment variable is supplied.

---

#### Observation 3: Runtime Deletion of `users.json` Causes Lockout of Default Admin
- **Target File & Lines**: `server/services/jsonDb.js:51-56` and `server/services/authService.js:289-312`
  ```javascript
  // jsonDb.js:51-55
  if (err.code === 'ENOENT') {
    const defaultContent = [];
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    return defaultContent;
  }
  ```
- **Empirical Execution**:
  ```powershell
  node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); const p = path.join(__dirname, 'data/users.json'); const backup = fs.readFileSync(p, 'utf8'); try { fs.unlinkSync(p); const res = authenticateUser('admin', 'admin'); res.then(r => console.log('Runtime unlink auth result:', r)); } finally { setTimeout(() => fs.writeFileSync(p, backup, 'utf8'), 100); }"
  ```
- **Verbatim Output**:
  ```
  Runtime unlink auth result: null
  ```
- **Impact**: If `users.json` is deleted while the server process is alive, `readData('users')` catches `ENOENT` and creates an empty array `[]`. `authenticateUser` searches for `admin` in `[]` and returns `null`. `POST /api/auth/login` returns `401 Unauthorized`. The admin cannot log in until the server is manually restarted because `ensureDefaultAdmin()` is only invoked at initial server boot (`server/index.js:16`).

---

#### Observation 4: 0-Byte `users.json` Triggers HTTP 500 Unhandled SyntaxError
- **Target File & Lines**: `server/services/jsonDb.js:48-57`
  ```javascript
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw); // Throws SyntaxError if raw is empty string ""
  ```
- **Empirical Execution**:
  ```powershell
  node -e "const fetch = globalThis.fetch; const app = require('./index'); const fs = require('fs'); const p = './data/users.json'; const backup = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, ''); const server = app.listen(5097, async () => { const res = await fetch('http://127.0.0.1:5097/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' }) }); console.log('0-byte login status:', res.status, await res.json()); server.close(); fs.writeFileSync(p, backup, 'utf8'); });"
  ```
- **Verbatim Output**:
  ```
  0-byte login status: 500 { success: false, message: 'Unexpected end of JSON input' }
  ```
- **Impact**: If `users.json` is truncated to 0 bytes, `readData` throws `SyntaxError`, which crashes `POST /api/auth/login` with HTTP 500.

---

#### Observation 5: Validated Passing Functional Areas
The test harness `server/scripts/challenger2-route-protection-test.js` (45 automated test cases across 9 suites) validated the following features:
1. **Public Route Access**:
   - `GET /api/health` returns 200 without token, with malformed token, and with expired token.
   - `POST /api/auth/login` is accessible without token.
   - `POST /api/auth/register` is accessible without token and returns 201 for valid registrations.
   - `POST /api/auth/logout` is accessible without token and returns 200.
2. **Protected Routes With Valid Token**:
   - `GET /api/agents` with `Authorization: Bearer <validToken>` returns 200 and data.
   - `GET /api/ledgers` with `Authorization: Bearer <validToken>` returns 200 and data.
   - `GET /api/reports/receivables`, `/advance-deposits`, `/ksa-exposure`, `/daily-flow` return 200.
   - `GET /api/entries/batch/:id` successfully passes auth and executes lookup.
3. **Protected Routes With Invalid / Malformed / Tampered Tokens**:
   - `Bearer notatoken` returns 401 across all protected routes.
   - Empty Bearer token (`Bearer `) returns 401.
   - Non-Bearer scheme (`Basic xyz`) returns 401.
   - Malformed base64 segments return 401.
   - Expired JWT token returns 401.
   - Fake signature (forged secret key) returns 401.
   - Tampered payload with valid original signature returns 401.
   - Algorithm `none` tokens return 401.
4. **Boot-Time Auto-Seeding**:
   - When called directly or on server restart, `ensureDefaultAdmin()` correctly recovers missing, empty, or syntactically invalid JSON files, auto-seeding the default administrator (`admin`/`admin`, `Super Admin`).

---

## 2. Logic Chain

1. **Requirement Premise (ORIGINAL_REQUEST.md & PROJECT.md)**:
   - Requirement R1 mandates: *"Integrate authentication securely into the frontend and backend, protecting internal routes."*
   - Feature 3 mandates: *"Enforce authentication guards on sensitive financial routes (`/api/entries`, `/api/ledgers`, `/api/agents`, `/api/reports`)."*
   - Acceptance Criteria mandates: *"Unauthenticated users are redirected to the Login screen / denied access."*
2. **Step 1 (Bypass Vulnerability Execution)**:
   - Observation 1 demonstrates that in `server/middleware/authMiddleware.js`, `originalUrl.includes('/api/auth')` and `originalUrl.includes('/api/health')` inspect the raw URL string.
   - By supplying `?bypass=/api/auth` in query arguments, any protected endpoint (`/api/agents`, `/api/ledgers`, etc.) bypasses the authentication middleware entirely.
   - This defect allows unauthenticated users and attackers with invalid tokens to access financial data without authorization.
3. **Step 2 (Default Route Exposure)**:
   - Observation 2 demonstrates that without the environment variable `ENFORCE_AUTH=true`, requests lacking an Authorization header fall through to `next()`, exposing protected data out-of-the-box.
4. **Step 3 (Runtime Fault-Tolerance Breakdown)**:
   - Observations 3 & 4 demonstrate that while boot-time auto-seeding functions as intended, runtime file deletion or truncation causes default admin lockout (returning 401) or unhandled crashes (returning 500) because `readData` initializes an empty array `[]` and fails to invoke `ensureDefaultAdmin()`.
5. **Conclusion from Chain**:
   - Because the backend auth middleware contains a critical authentication bypass vulnerability (`originalUrl.includes`) and fails under runtime file deletion/truncation, Milestone 1 cannot be approved in its current state.

---

## 3. Caveats

- **Scope Adherence**: In accordance with the Review-Only role constraint, Challenger 2 did not modify application code. All tests were executed non-destructively using empirical test scripts.
- **Milestone 2 Integration Boundary**: The frontend integration (`client/`) is reserved for Milestone 2. However, the backend middleware contracts and route protections must be rock-solid before frontend wiring begins.
- **Interim Graceful Fallback**: The worker's rationale for allowing unauthenticated access when `ENFORCE_AUTH` is not set was to accommodate development transitions. However, `authMiddleware` must properly secure routes, or `ENFORCE_AUTH=true` must be the default behavior.

---

## 4. Conclusion & Actionable Mitigations

### Overall Risk Assessment: **CRITICAL**
### Explicit Verdict: **`REJECT`**

Milestone 1 satisfies basic happy path functionality and token cryptography, but contains a **Critical Authentication Bypass Vulnerability** and runtime recovery defects that must be resolved prior to milestone signoff.

### Actionable Remediation Steps for Worker:

1. **Fix Critical Authentication Bypass in `server/middleware/authMiddleware.js`**:
   Replace substring matching on `originalUrl.includes(...)` with strict path prefix matching on `req.path` or `req.baseUrl`:
   ```javascript
   // Public endpoints bypass
   const reqPath = req.path || '';
   if (
     reqPath === '/health' ||
     reqPath.startsWith('/health') ||
     reqPath === '/auth' ||
     reqPath.startsWith('/auth') ||
     req.baseUrl === '/api/health' ||
     req.baseUrl === '/api/auth'
   ) {
     return next();
   }
   ```
   *Never use `.includes()` on `req.originalUrl` for route authorization.*

2. **Default Route Enforcement**:
   Make strict authentication enforcement the default on protected routes, or ensure `ENFORCE_AUTH=true` is enabled in configuration so that sensitive endpoints are guarded out-of-the-box.

3. **Auto-Heal Default Admin on `readData('users')` / `authenticateUser`**:
   In `server/services/authService.js`:
   ```javascript
   let users = await readData('users');
   if (!users.some(u => (u.username || '').toLowerCase() === 'admin')) {
     users = await ensureDefaultAdmin();
   }
   ```

4. **Safely Parse 0-Byte Files in `server/services/jsonDb.js`**:
   In `readData(filename)`:
   ```javascript
   const raw = await fs.readFile(filePath, 'utf8');
   if (!raw || !raw.trim()) {
     const defaultContent = [];
     await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
     return defaultContent;
   }
   return JSON.parse(raw);
   ```

---

## 5. Verification Method

To independently verify these findings and confirm fixes:

1. **Run Challenger 2 Empirical Test Suite (45 tests across 9 suites)**:
   ```powershell
   cd e:\TravelLedger\server
   node --test scripts/challenger2-route-protection-test.js
   ```

2. **Verify Query Parameter Bypass Flaw**:
   ```powershell
   cd e:\TravelLedger\server
   node -e "const app = require('./index'); const server = app.listen(5099, async () => { process.env.ENFORCE_AUTH = 'true'; const res = await fetch('http://127.0.0.1:5099/api/agents?bypass=/api/auth'); console.log('Bypass Status:', res.status, res.status === 200 ? 'VULNERABLE' : 'SECURE'); server.close(); });"
   ```
   - Current outcome: `VULNERABLE` (HTTP 200).
   - Expected outcome after fix: `SECURE` (HTTP 401).

3. **Verify Runtime Deletion Lockout**:
   ```powershell
   cd e:\TravelLedger\server
   node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); const p = path.join(__dirname, 'data/users.json'); const backup = fs.readFileSync(p, 'utf8'); try { fs.unlinkSync(p); const res = authenticateUser('admin', 'admin'); res.then(r => console.log('Status:', r ? 'SUCCESS' : 'LOCKED_OUT')); } finally { setTimeout(() => fs.writeFileSync(p, backup, 'utf8'), 100); }"
   ```
   - Current outcome: `Status: LOCKED_OUT`.
   - Expected outcome after fix: `Status: SUCCESS`.

4. **Verify Existing Unit Tests**:
   ```powershell
   cd e:\TravelLedger\server
   npm test
   ```
   - Expected outcome: All 23 tests pass.
