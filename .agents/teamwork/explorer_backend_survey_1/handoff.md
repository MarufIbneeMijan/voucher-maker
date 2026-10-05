# Backend Specialist Survey Report — TravelLedger

**Author:** teamwork_preview_explorer (Backend Specialist)  
**Date:** 2026-10-01T22:40:00Z  
**Target Project:** TravelLedger (`e:\TravelLedger`)  
**Scope:** Read-Only Codebase Investigation & Architecture Survey

---

## 1. Observation

### 1.1 Server Architecture and Entry Point
- **File:** `server/index.js`
- **Framework & Port:** Express 4.21.2 listening on `process.env.PORT || 5000` (Lines 8-9).
- **Startup Command:** 
  - `npm start` -> `node index.js` (`server/package.json` Line 7)
  - `npm run dev` -> `node --watch index.js` (`server/package.json` Line 8)
- **Initialization Lifecycle:**
  - `ensureDataDir()` is called from `./services/jsonDb` on Line 12 to ensure `server/data/` exists.
  - Middlewares: `cors()` (Line 17), `express.json({ limit: '10mb' })` (Line 18), `express.urlencoded({ extended: true, limit: '10mb' })` (Line 19), dev logger (Lines 22-25).
  - Routes mounted:
    - Line 28: `app.use('/api/dashboard', require('./routes/dashboardRoutes'));`
    - Line 29: `app.use('/api/agents', require('./routes/agentRoutes'));`
    - Line 30: `app.use('/api/ledgers', require('./routes/ledgerRoutes'));`
    - Line 31: `app.use('/api/entries', require('./routes/entryRoutes'));`
    - Line 32: `app.use('/api/payments', require('./routes/paymentRoutes'));`
    - Line 33: `app.use('/api/reports', require('./routes/reportRoutes'));`
  - Health check endpoint: `GET /api/health` (Lines 36-42).
  - Catch-all 404 handler (Lines 45-47).
- **MongoDB / Mongoose Status:**
  - `server/package.json` lists `"mongoose": "^8.9.5"`, and `server/config/db.js` provides `connectDB()`.
  - However, `connectDB` is **never imported or invoked** in `server/index.js` or anywhere in the application.
  - The runtime database engine is 100% local JSON file storage via `server/services/jsonDb.js`.

### 1.2 State of `server/data/` and Storage Engine
- **Directory:** `server/data/`
- **Existing Files:**
  - `agents.json` (38,530 bytes, 95 agent records)
  - `billing_entries.json` (26,347 bytes, 11 voucher billing records)
  - `ledger_entries.json` (18,765 bytes, 26 financial transaction entries)
- **Missing File:**
  - `server/data/users.json` **DOES NOT EXIST**.
- **Storage Engine Mechanism (`server/services/jsonDb.js`):**
  - Path resolver: `resolveFilePath(filename)` automatically appends `.json` (Lines 35-38).
  - Auto-initialization: `readData(filename)` initializes missing files with an empty array `[]` (Lines 51-56).
  - Concurrency & Atomicity:
    - Write serialization via in-memory promise mutex map `fileLocks` (Lines 7-23).
    - Writes to temporary file `${filePath}.tmp.${Date.now()}_...` before executing `fs.rename` (Lines 61-71).
    - Multi-file updates with deadlock prevention via sorted key acquisition (`atomicMultiUpdate`, Lines 98-134).

### 1.3 Authentication Gaps
- **Current State:** Zero backend authentication routes or controllers exist.
  - No `server/routes/authRoutes.js`.
  - No `server/controllers/authController.js`.
  - No authentication middleware (`server/middleware/auth.js`).
- **Frontend Observation:**
  - `client/src/components/Login.jsx` (Lines 9-18) previously performed hardcoded client-side validation:
    ```javascript
    if (username === 'admin' && password === 'admin') {
      const user = { username: 'admin', role: 'Administrator' };
      localStorage.setItem('traveledger_auth', JSON.stringify(user));
      onLogin(user);
    }
    ```
  - No API call is made to any backend auth endpoint.
- **Missing Endpoints Required:**
  - `POST /api/auth/login` (verifies credentials against `users.json`, returns user session/token)
  - `POST /api/auth/register` (creates user, enforces unique username, writes to `users.json`)
  - `POST /api/auth/logout` (session invalidation)
  - `GET /api/auth/me` (session verification)
  - Pre-seeding on server start: `server/data/users.json` must be seeded with `username: "admin"`, `password: "admin"`, `role: "Super Admin"` when missing or empty.

### 1.4 API Endpoints Audit vs Frontend Expectations
All existing business endpoints called by the client match backend controllers:
| Frontend Call (`client/src`) | Backend Endpoint | Backend Route & Controller | Match Status |
| :--- | :--- | :--- | :--- |
| `GET /api/agents` (`App.jsx:68`) | `GET /api/agents` | `agentRoutes.js` -> `agentController.getAgents` | ✅ MATCH |
| `POST /api/agents` (`AddAgentModal.jsx:24`) | `POST /api/agents` | `agentRoutes.js` -> `agentController.createAgent` | ✅ MATCH |
| `GET /api/dashboard/summary` (`Dashboard.jsx:58`) | `GET /api/dashboard/summary` | `dashboardRoutes.js` -> `dashboardController.getDashboardSummary` | ✅ MATCH |
| `POST /api/entries/batch` (`DataEntryForm.jsx:470`) | `POST /api/entries/batch` | `entryRoutes.js` -> `entryController.createBatchBillingEntry` | ✅ MATCH |
| `PUT /api/entries/batch/:id` (`DataEntryForm.jsx:470`) | `PUT /api/entries/batch/:id` | `entryRoutes.js` -> `entryController.updateBatchBillingEntry` | ✅ MATCH |
| `GET /api/entries/batch/:id` (`LedgerStatements.jsx:124`)| `GET /api/entries/batch/:id` | `entryRoutes.js` -> `entryController.getBillingEntryById` | ✅ MATCH |
| `DELETE /api/entries/batch/:id` (`LedgerStatements:171`)| `DELETE /api/entries/batch/:id` | `entryRoutes.js` -> `entryController.deleteBatchBillingEntry` | ✅ MATCH |
| `POST /api/ledgers/recalculate-all` (`LedgerStatements:76`)| `POST /api/ledgers/recalculate-all` | `ledgerRoutes.js` -> `ledgerController.recalculateAll` | ✅ MATCH |
| `GET /api/ledgers` (`LedgerStatements.jsx:101`) | `GET /api/ledgers` | `ledgerRoutes.js` -> `ledgerController.getLedgerEntries` | ✅ MATCH |
| `GET /api/reports/advance-deposits` (`AdvanceDepositsReport.jsx:17`)| `GET /api/reports/advance-deposits`| `reportRoutes.js` -> `reportController.getAdvanceDeposits` | ✅ MATCH |
| `GET /api/reports/daily-flow` (`DailyFlowReport.jsx:16`) | `GET /api/reports/daily-flow` | `reportRoutes.js` -> `reportController.getDailyFlow` | ✅ MATCH |
| `GET /api/reports/ksa-exposure` (`KsaExposureReport.jsx:15`) | `GET /api/reports/ksa-exposure` | `reportRoutes.js` -> `reportController.getKsaExposure` | ✅ MATCH |
| `GET /api/reports/receivables` (`ReceivablesReport.jsx:18`) | `GET /api/reports/receivables` | `reportRoutes.js` -> `reportController.getReceivables` | ✅ MATCH |

#### Root Cause of Non-Functional Save & Logout Buttons Found:
1. **Logout Button Failure:**
   - In `client/src/components/Navbar.jsx` (Line 15, 138-144), `Navbar` expects `user` and `onLogout` props:
     ```jsx
     export default function Navbar({ activeTab, setActiveTab, ..., user, onLogout })
     ```
   - In `client/src/App.jsx` (Lines 113-123), `Navbar` is invoked **WITHOUT** passing `user` or `onLogout`.
   - Result: Clicking "Logout" calls `undefined()` and does nothing.
2. **Save Button Failure:**
   - In `client/src/components/DataEntryForm.jsx` (Line 23):
     ```javascript
     export default function DataEntryForm({ agents, showToast, onEntryCreated, editingVoucher, onCancelEdit })
     ```
   - On Line 355 of `handleSubmit`:
     ```javascript
     createdBy: user?.username || 'admin',
     ```
   - Because `user` is NOT listed in the parameter destructuring on Line 23, evaluating `user?.username` throws `ReferenceError: user is not defined`!
   - Result: Form submission crashes immediately into the catch block without sending any API request.

### 1.5 Dependencies Audit
- **In `server/package.json`:**
  - Installed: `cors` (^2.8.5), `dotenv` (^16.4.7), `express` (^4.21.2), `mongoose` (^8.9.5).
  - Missing Auth Libraries: `bcryptjs` (or `bcrypt`), `jsonwebtoken`, `express-session`.
  - Built-in Alternative: Node.js native `crypto` module (`crypto.pbkdf2Sync`, `crypto.randomBytes`, `crypto.createHash`, `crypto.timingSafeEqual`) is available without installing external packages.
- **In `client/package.json`:**
  - Installed: `lucide-react` (^0.469.0), `react` (^18.3.1), `react-dom` (^18.3.1), `tailwindcss` (^3.4.17), `vite` (^6.0.7).
  - Missing: `react-router-dom` (needed for R2 URL migration).

### 1.6 Test Framework & Verification Setup
- Neither Jest, Mocha, Vitest, nor Supertest is present in `server/package.json`.
- `server/package.json` lacks any `"test"` script.
- **Discovery:** Node.js native test runner (`node:test` and `node:assert`) is built-in and verified functional in the environment (`node -e "const test = require('node:test'); ..."` executed in 1.7ms).

---

## 2. Logic Chain

1. **Storage Choice (jsonDb vs Mongoose):**
   - Observations show all active controllers (`agentController`, `ledgerController`, `entryController`, etc.) import and utilize `readData`, `writeData`, `atomicUpdate`, and `atomicMultiUpdate` from `server/services/jsonDb.js`.
   - No active controller or script connects to MongoDB.
   - Therefore, the user authentication engine must directly use `jsonDb.js` to manage `server/data/users.json`.

2. **Seeding Strategy for `users.json`:**
   - `ORIGINAL_REQUEST.md` specifies: "Pre-seed the file with default `admin` credentials (username: `admin`, password: `admin`, role: `Super Admin`) if it is empty."
   - In `server/index.js`, during startup (right after `ensureDataDir()`), an initialization routine `ensureDefaultAdmin()` must read `users.json`.
   - If `users.json` does not exist or has `length === 0`, it writes the default record:
     `{ id: "USER-1001", username: "admin", password: "<hash-or-plaintext>", role: "Super Admin", createdAt: "...", updatedAt: "..." }`.

3. **Authentication Strategy & Token Management:**
   - Because `bcryptjs` and `jsonwebtoken` are currently missing from `server/package.json`:
     - **Option 1 (Recommended):** Install `bcryptjs` and `jsonwebtoken` in `server` (`npm install bcryptjs jsonwebtoken`), which provides standard JWT tokens and industry-grade password salting/hashing.
     - **Option 2 (Zero-dependency):** Use Node.js built-in `crypto` module for hashing (PBKDF2 / SHA-256) and signed token verification (HMAC-SHA256).
   - In either case, the password verification should support matching the default `"admin"` password seamlessly while securing newly registered users.

4. **API Route Blueprint:**
   - Create `server/routes/authRoutes.js` and mount it in `server/index.js` as `app.use('/api/auth', require('./routes/authRoutes'));`.
   - Create `server/controllers/authController.js` exporting `login`, `register`, `logout`, `getMe`, and optional `getUsers`.
   - Create `server/middleware/authMiddleware.js` to parse `Bearer <token>` or session headers and attach `req.user`.

5. **Client-Backend Contract Alignment:**
   - `client/src/components/Login.jsx` must be updated to make a real `POST /api/auth/login` request.
   - `client/src/App.jsx` must pass `user` and `onLogout` to `<Navbar />`.
   - `client/src/components/DataEntryForm.jsx` must accept `user` in props on Line 23.
   - Removing `max-w-7xl mx-auto` on Line 126 in `client/src/App.jsx` will fulfill the full-width UI restoration requirement.

---

## 3. Caveats

1. **Mongoose / MongoDB Dead Code:**
   - `server/models/` and `server/config/db.js` contain legacy Mongoose schemas. They are unused but harmless. Removing them is outside the strict scope of R1-R3, but keeping them does not interfere with `jsonDb.js`.
2. **Password Hashing Compatibility:**
   - If external packages (`bcryptjs`) are installed, ensure `npm install` runs cleanly in the Windows environment without native compilation errors (`bcryptjs` is pure JS, avoiding Windows C++ build tools issues).
3. **Frontend Network Port Configuration:**
   - `client/vite.config.js` proxies `/api` to `http://localhost:5000`. Therefore, backend auth endpoints under `/api/auth` will automatically proxy without modifying Vite configs.

---

## 4. Conclusion

The TravelLedger backend is a lightweight, responsive Express application powered entirely by an atomic JSON file storage engine (`server/services/jsonDb.js`).

To satisfy Requirement R1 and support R2/R3:
1. **Database:** Implement an auto-seeding routine in `server/services/authService.js` or `server/index.js` that creates `server/data/users.json` with the default admin user (`username: "admin"`, `password: "admin"`, `role: "Super Admin"`).
2. **Endpoints:** Implement `server/routes/authRoutes.js` and `server/controllers/authController.js` providing:
   - `POST /api/auth/login`
   - `POST /api/auth/register`
   - `POST /api/auth/logout`
   - `GET /api/auth/me`
3. **Middleware:** Implement `server/middleware/authMiddleware.js` to protect backend routes and attach authenticated user context to request payloads.
4. **Dependencies:** Install `bcryptjs` and `jsonwebtoken` in `server/`, or utilize Node's built-in `crypto` for zero external dependencies.
5. **Testing:** Implement automated test suite using Node.js 18+ native `node:test` (`server/scripts/test-auth.js` or `npm test`) for reproducible verification.

---

## 5. Verification Method

### 5.1 Verification Commands
Once implemented, the backend changes can be independently verified via the following commands in `e:\TravelLedger\server`:

1. **Verify users.json Creation and Default Admin Seeding:**
   ```powershell
   node -e "const { readData } = require('./services/jsonDb'); (async () => { const users = await readData('users'); console.log('Users count:', users.length); console.log('Admin user:', users.find(u => u.username === 'admin')); })();"
   ```
   *Expected Result:* Displays users count >= 1, and shows the admin user record with `username: "admin"` and `role: "Super Admin"`.

2. **Verify Server Boot and Health:**
   ```powershell
   # Start server and query health endpoint
   curl http://localhost:5000/api/health
   ```
   *Expected Result:* HTTP 200 with `{ status: "OK", system: "TravelLedger B2B Financial Management Engine (Local JSON DB)", ... }`.

3. **Verify Authentication Endpoints (Login & Register):**
   ```powershell
   # Test Admin Login
   curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"username\":\"admin\",\"password\":\"admin\"}'

   # Test Registration
   curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{\"username\":\"teststaff\",\"password\":\"pass123\",\"role\":\"Staff\"}'

   # Test Session Verification (/me)
   curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <TOKEN>"
   ```

4. **Automated Test Command:**
   Add `"test": "node --test scripts/test-auth.js"` to `server/package.json` and run:
   ```powershell
   npm test
   ```

### 5.2 Invalidation Conditions
- `server/data/users.json` is not automatically created upon starting the server if missing.
- Default admin credentials (`admin`/`admin`) fail authentication.
- Password hashes or credentials are leaked in API responses.
- Existing ledger, entry, or report endpoints break or return schema changes that disrupt frontend components.
