# Adversarial Challenge & Stress Test Report: Milestone 1 Backend Auth

**Agent**: `challenger_m1_1` (teamwork_preview_challenger)  
**Parent Agent**: `orchestrator` (`f6e16f1f-50a4-4525-ab41-c30e78b1bc45`)  
**Timestamp**: 2026-10-01T22:52:00Z  
**Target Milestone**: Milestone 1: Backend User Authentication & users.json Engine  
**Verdict**: **`REJECT`** (Requires 2 critical/high bug fixes before production signoff)

---

## 1. Observation

### 1.1 Direct Observations & Verbatim Empirical Outputs

#### Observation 1: Deleting `server/data/users.json` while server runs locks out default admin
- **Command executed**:
  ```powershell
  node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); (async () => { const p = path.join(__dirname, 'data/users.json'); if (fs.existsSync(p)) fs.unlinkSync(p); const res = await authenticateUser('admin', 'admin'); console.log('Login after delete users.json:', res); })();"
  ```
- **Output observed**:
  ```
  Login after delete users.json: null
  ```
- **Disk state observed**:
  ```powershell
  node -e "const fs = require('fs'); console.log('users.json content:', fs.readFileSync('data/users.json', 'utf8'));"
  ```
  Output:
  ```
  users.json content: []
  ```
- **File & line reference**: `server/services/jsonDb.js:51-56` and `server/services/authService.js:289-312`.
  When `users.json` is missing, `readData('users')` catches `ENOENT` and writes `[]` (empty array) to disk. In `authenticateUser('admin', 'admin')`, it finds no users in `[]` and returns `null`. The HTTP controller then returns `401 Unauthorized`. Default admin (`admin`/`admin`) **cannot log in** until the entire Node process is restarted, directly violating the prompt mandate: *"Verify that default admin (`admin`/`admin`, `Super Admin`) can always log in... testing deleting users.json while server runs."*

#### Observation 2: 0-byte `users.json` crashes authentication with HTTP 500
- **Command executed**:
  ```powershell
  node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); (async () => { const p = path.join(__dirname, 'data/users.json'); fs.writeFileSync(p, ''); try { const res = await authenticateUser('admin', 'admin'); console.log('Login after 0-byte users.json:', res); } catch (e) { console.log('Caught error:', e.message); } })();"
  ```
- **Output observed**:
  ```
  Caught error: Unexpected end of JSON input
  ```
- **File & line reference**: `server/services/jsonDb.js:48-57`.
  `readData` calls `JSON.parse(raw)`. When `raw === ''`, `JSON.parse` throws `SyntaxError`. The catch block only checks for `err.code === 'ENOENT'`, re-throwing `SyntaxError`. In `authController.login` (line 34), this is caught as an unhandled error and returned to client as `500 Internal Server Error`.

#### Observation 3: Non-string username in login triggers 500 `TypeError`
- **File & line reference**: `server/controllers/authController.js:10-18` and `server/services/authService.js:289-293`.
  ```javascript
  // authController.js:13
  if (!username || !password) { ... }
  ```
  ```javascript
  // authService.js:292
  const lower = username.trim().toLowerCase();
  ```
  When a client sends JSON with a non-string username (e.g. `{ "username": { "$gt": "" }, "password": "any" }` or `{ "username": 12345, "password": "any" }`), `authController.login` allows it through because `{ $gt: '' }` is truthy. In `authService.js:292`, `username.trim` is invoked on an object/number, throwing `TypeError: username.trim is not a function`. The API returns `500 Internal Server Error` with stack text, whereas `register` explicitly guards with `typeof username !== 'string'`.

#### Observation 4: Weak user ID generation under concurrency
- **File & line reference**: `server/services/authService.js:267`:
  ```javascript
  const id = `USER-${Date.now()}`;
  ```
  In high-throughput environments or rapid concurrent registrations, `Date.now()` (millisecond resolution) can produce identical IDs for different user records.

#### Observation 5: Validated passing areas
- **Malformed JSON crash resistance**: Verified that malformed JSON payloads (e.g. `{ "username": `) are caught by Express `body-parser` and return HTTP 400 without crashing the Node process.
- **JWT Tampering & Expiration**: `verifyToken` uses `crypto.timingSafeEqual`, validates signatures, enforces expiration, and properly handles length mismatches without throwing.
- **Response Hygiene**: Verified that `password` is never included in the JSON payload of `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, or `/api/auth/users`.
- **Unicode Support**: UTF-8 characters (Arabic, Chinese, Cyrillic, Emoji) register and authenticate without corruption.

---

## 2. Logic Chain

1. **Premise 1 (Prompt Contract)**: The dispatch instructions state:
   - *"Verify that default admin (`admin`/`admin`, `Super Admin`) can always log in."*
   - *"testing deleting users.json while server runs."*
2. **Step 2 (Execution & Failure)**:
   - Observation 1 proves that deleting `users.json` while the server runs causes `readData('users')` to write `[]` to disk and return `[]`.
   - `authenticateUser('admin', 'admin')` looks for `admin` in `[]`, finds nothing, and returns `null`.
   - The user receives HTTP 401. Default admin cannot log in.
   - The default admin is NOT restored unless the Node process is killed and restarted, because `ensureDefaultAdmin()` is only called in `server/index.js` upon initial startup.
3. **Step 3 (Truncation & Corruption)**:
   - Observation 2 proves that if `users.json` is 0 bytes, `readData` throws `SyntaxError: Unexpected end of JSON input`, returning HTTP 500 and completely disabling login and registration.
4. **Step 4 (Type Robustness Failure)**:
   - Observation 3 proves that `POST /api/auth/login` crashes with `TypeError: username.trim is not a function` (returning 500) if `username` is not a string, unlike `POST /api/auth/register` which validates types.
5. **Conclusion from Chain**:
   - Because the system fails the mandatory requirement that default admin can always log in when `users.json` is deleted while the server runs, and crashes with 500 on non-string login input or 0-byte data files, Milestone 1 cannot be approved as-is.

---

## 3. Caveats

- **No Caveats on Bug Reproducibility**: Both the `users.json` deletion lockout and the `username.trim` type crash were reproduced empirically via direct execution against the live service code.
- **Scope Restriction**: In accordance with the Review-Only constraint, Challenger 1 does not modify the source code; the fixes must be applied by a worker.
- **Concurrency Rate**: Under ordinary low-volume testing, `Date.now()` collisions are rare, but it remains a latent defect in high-concurrency environments.

---

## 4. Conclusion & Actionable Mitigations

### Overall Risk Assessment: **HIGH**
### Final Verdict: **`REJECT`**

Milestone 1 auth engine is functional in basic happy paths (23/23 worker unit tests pass), but fails under adversarial stress conditions (runtime file deletion, 0-byte corruption, non-string login payloads).

### Required Worker Fixes:

1. **Auto-heal Default Admin in `authenticateUser` and `readData`**:
   In `server/services/authService.js`:
   ```javascript
   async function authenticateUser(username, password) {
     if (typeof username !== 'string' || typeof password !== 'string') return null;
     if (!username.trim() || !password) return null;

     let users = await readData('users');
     // Auto-heal: If users is empty or lacks admin, ensure default admin is restored
     if (!users.some(u => (u.username || '').toLowerCase() === 'admin')) {
       users = await ensureDefaultAdmin();
     }

     const lower = username.trim().toLowerCase();
     const user = users.find((u) => (u.username || '').toLowerCase() === lower);
     if (!user) return null;
     ...
   ```
2. **Handle 0-byte and empty files in `server/services/jsonDb.js`**:
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
3. **Type-validate inputs in `authController.login`**:
   In `server/controllers/authController.js`:
   ```javascript
   const { username, password } = req.body || {};
   if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
     return res.status(401).json({
       success: false,
       message: 'Invalid username or password'
     });
   }
   ```
4. **Add entropy to User ID generation**:
   In `server/services/authService.js`:
   ```javascript
   const id = `USER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
   ```

---

## 5. Verification Method

To verify these findings and confirm any subsequent fixes:

1. **Verify Default Admin Login After File Deletion**:
   ```powershell
   node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); (async () => { const p = path.join(__dirname, 'data/users.json'); if (fs.existsSync(p)) fs.unlinkSync(p); const res = await authenticateUser('admin', 'admin'); console.log('Login result:', res ? 'SUCCESS' : 'FAILED'); process.exit(res ? 0 : 1); })();"
   ```
   - Current outcome: `FAILED` (Exit code 1).
   - Expected outcome after fix: `SUCCESS` (Exit code 0).

2. **Verify 0-byte File Resilience**:
   ```powershell
   node -e "const { authenticateUser } = require('./services/authService'); const fs = require('fs'); const path = require('path'); (async () => { const p = path.join(__dirname, 'data/users.json'); fs.writeFileSync(p, ''); const res = await authenticateUser('admin', 'admin'); console.log('Login result:', res ? 'SUCCESS' : 'FAILED'); process.exit(res ? 0 : 1); })();"
   ```
   - Current outcome: `Caught error: Unexpected end of JSON input`.
   - Expected outcome after fix: `SUCCESS`.

3. **Verify Non-String Type Safety**:
   ```powershell
   node -e "const { authenticateUser } = require('./services/authService'); (async () => { try { const res = await authenticateUser({ $gt: '' }, 'pass'); console.log('Result:', res); } catch (e) { console.error('CRASH:', e.message); process.exit(1); } })();"
   ```
   - Current outcome: `CRASH: username.trim is not a function`.
   - Expected outcome after fix: `Result: null` (graceful rejection, no crash).

4. **Verify Full Adversarial Test Suite**:
   ```powershell
   node scripts/adversarial-auth-test.js
   ```
