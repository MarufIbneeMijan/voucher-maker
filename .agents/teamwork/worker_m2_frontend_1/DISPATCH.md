## 2026-10-01T23:02:43Z

You are teamwork_preview_worker for Milestone 2: React Router Migration, Button Repairs & UI/UX Restoration (R2 + R3).
Your working directory is: e:\TravelLedger\.agents\teamwork\worker_m2_frontend_1
Your parent is: orchestrator (conversation ID: f6e16f1f-50a4-4525-ab41-c30e78b1bc45)

INPUTS (Read these files first):
- MANDATORY User Request: e:\TravelLedger\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope: e:\TravelLedger\PROJECT.md
- Frontend Architecture Survey: e:\TravelLedger\.agents\teamwork\explorer_frontend_survey_1\handoff.md
- Specification Survey: e:\TravelLedger\.agents\teamwork\spec_miner_survey_1\handoff.md
- E2E Test Suite & Runner: e:\TravelLedger\TEST_READY.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You exclusively own and may edit or create files under `client/`:
- `client/package.json`
- `client/src/main.jsx`
- `client/src/App.jsx`
- `client/src/components/ProtectedRoute.jsx`
- `client/src/components/Navbar.jsx`
- `client/src/components/Login.jsx`
- `client/src/components/DataEntryForm.jsx`
- `client/src/components/VoucherModal.jsx`
DO NOT modify server files or tests/ directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. React Router Installation:
   - Install `react-router-dom` in `client/package.json` (e.g. `npm install react-router-dom` in `client/`).
2. Router Setup & Navigation Architecture:
   - Wrap application in `<BrowserRouter>` in `main.jsx` or `App.jsx`.
   - In `client/src/App.jsx`, replace legacy `activeTab` conditional state machine with `<Routes>` and `<Route>`.
   - Setup routes for:
     * `/` -> `<Navigate to="/dashboard" replace />`
     * `/dashboard` -> `<ProtectedRoute user={user}><Dashboard ... /></ProtectedRoute>`
     * `/entry` -> `<ProtectedRoute user={user}><DataEntryForm ... user={user} /></ProtectedRoute>`
     * `/statements` -> `<ProtectedRoute user={user}><LedgerStatements ... /></ProtectedRoute>`
     * `/agents` -> `<ProtectedRoute user={user}><AgentDirectory ... /></ProtectedRoute>`
     * `/tagada` -> `<ProtectedRoute user={user}><WhatsAppTagadaModal ... /></ProtectedRoute>`
     * `/reports/receivables` -> `<ProtectedRoute user={user}><ReceivablesReport ... /></ProtectedRoute>`
     * `/reports/advance-deposits` -> `<ProtectedRoute user={user}><AdvanceDepositsReport ... /></ProtectedRoute>`
     * `/reports/ksa-exposure` -> `<ProtectedRoute user={user}><KsaExposureReport ... /></ProtectedRoute>`
     * `/reports/daily-flow` -> `<ProtectedRoute user={user}><DailyFlowReport ... /></ProtectedRoute>`
     * `/login` -> `<Login onLogin={(u) => { setUser(u); navigate('/dashboard'); }} />`
     * `*` -> `<Navigate to="/dashboard" replace />`
   - In `client/src/components/Navbar.jsx`: Use `<NavLink>` or `useNavigate` for primary views and sub-reports so navigation updates the browser URL bar.
3. Protected Routes:
   - Create `client/src/components/ProtectedRoute.jsx`.
   - If user is not authenticated (`!user` and no valid auth in `localStorage.getItem('traveledger_auth')`), redirect to `<Navigate to="/login" replace />`.
4. Fix Logout Button:
   - In `client/src/App.jsx`, implement `handleLogout`:
     ```javascript
     const handleLogout = () => {
       localStorage.removeItem('traveledger_auth');
       setUser(null);
       navigate('/login');
     };
     ```
   - Pass `user={user}` and `onLogout={handleLogout}` to `<Navbar />`.
   - In `client/src/components/Navbar.jsx`, ensure the logout button invokes `onClick={onLogout}`.
5. Fix Save Voucher Button:
   - In `client/src/components/DataEntryForm.jsx`, line 23, add `user` to the destructured props:
     `export default function DataEntryForm({ agents, showToast, onEntryCreated, editingVoucher, onCancelEdit, user })`
     This eliminates `ReferenceError: user is not defined` on line 355 when setting `createdBy: user?.username || 'admin'`.
   - Ensure `handleSubmit` successfully executes `POST /api/entries/batch` (or `PUT /api/entries/batch/:id`).
6. Login & Registration UI Integration:
   - In `client/src/components/Login.jsx`:
     * Make real API call to `POST /api/auth/login`. On 200, save user and token to `localStorage.setItem('traveledger_auth', JSON.stringify({ ...data.user, token: data.token }))` and call `onLogin(data.user)`. On 401, display error message.
     * Add registration tab/form allowing users to register new accounts via `POST /api/auth/register` with fields `{ username, password, role, name }`.
7. UI/UX Restoration (Full-Width & Responsive Tables):
   - In `client/src/App.jsx`, line 126: ELIMINATE `max-w-7xl mx-auto`! Use:
     `<main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">`
     This allows edge-to-edge full-width responsiveness without restrictive 1280px containers.
   - In `client/src/components/VoucherModal.jsx`: Replace `overflow-hidden` with `overflow-x-auto` on table wrappers at lines 191 and 365.
   - Verify all table wrappers in Dashboard, Statements, Reports, and Modals have `overflow-x-auto`.
8. Verification:
   - Run `npm run build` in `client/` to verify production build succeeds without errors.
   - Run `node tests/e2e/runner.js` from project root to verify all 49 E2E test cases pass (100% pass rate).
9. Output:
   - Write comprehensive report to `e:\TravelLedger\.agents\teamwork\worker_m2_frontend_1\handoff.md`.
10. Send a message to parent when complete.
