# TravelLedger Specification Survey & Feature Catalog

**Document Path**: `e:\TravelLedger\.agents\teamwork\spec_miner_survey_1\handoff.md`  
**Author**: `spec_miner_survey_1` (Specification Miner)  
**Parent Agent**: Orchestrator (`f6e16f1f-50a4-4525-ab41-c30e78b1bc45`)  
**Date**: 2026-10-01T22:50:00Z  
**Scope**: Read-Only Requirement Mining for R1, R2, R3  

---

## 1. Executive Summary

A comprehensive architectural and code-level specification survey of TravelLedger was conducted across `ORIGINAL_REQUEST.md`, `client/` (React/Vite), and `server/` (Express/Node JSON DB Engine). 

The survey established exact root causes for all reported bugs, detailed missing dependencies, identified required API endpoints, and formulated full data schemas and verification rubrics for three target requirement areas:
- **R1: User Registration & Authentication**
- **R2: React Router Migration & Button Repairs**
- **R3: UI/UX Restoration (Full-width containers & Responsive styling)**

---

## 2. Observations

### 2.1 R1: User Registration & Authentication
1. **Missing Data File**: `server/data/users.json` does not exist in `server/data/`. `server/data/` contains only `agents.json`, `billing_entries.json`, and `ledger_entries.json`.
2. **Missing Backend Auth Modules**:
   - `server/index.js` (lines 28–33) mounts routes for `/api/dashboard`, `/api/agents`, `/api/ledgers`, `/api/entries`, `/api/payments`, `/api/reports`. There is **no** `/api/auth` route mounted.
   - There are no `authRoutes.js`, `authController.js`, or `authMiddleware.js` in `server/routes`, `server/controllers`, or `server/`.
   - Express API endpoints currently lack session or JWT/Bearer token authentication guards, leaving all financial endpoints unprotected.
3. **Hardcoded Frontend Login & Role Mismatch**:
   - `client/src/components/Login.jsx` (lines 11–17) hardcodes client-side credential verification:
     ```javascript
     if (username === 'admin' && password === 'admin') {
       const user = { username: 'admin', role: 'Administrator' };
       localStorage.setItem('traveledger_auth', JSON.stringify(user));
       onLogin(user);
     } else {
       setError('Invalid username or password');
     }
     ```
   - **Role Discrepancy**: `Login.jsx` assigns `role: 'Administrator'`, whereas `ORIGINAL_REQUEST.md` (line 20) explicitly specifies `role: 'Super Admin'`.
   - **No Registration UI**: `Login.jsx` provides no registration tab or submission mechanism to register new accounts.
   - **No Network Request**: `Login.jsx` does not invoke any backend API endpoint.

### 2.2 R2: React Router Migration & Button Repairs
1. **Missing Package Dependency**:
   - `client/package.json` lines 11–15 shows dependencies:
     ```json
     "dependencies": {
       "lucide-react": "^0.469.0",
       "react": "^18.3.1",
       "react-dom": "^18.3.1"
     }
     ```
   - `react-router-dom` is **not installed** in `client/package.json` nor present in `client/node_modules/`.
2. **Legacy `activeTab` Navigation**:
   - `client/src/App.jsx` line 19 defines:
     ```javascript
     const [activeTab, setActiveTab] = useState('dashboard');
     ```
   - Main content views (Dashboard, Agents, Entry, Statements, Tagada, Reports) are rendered conditionally based on `activeTab === '...'` rather than URL routes (`<Routes>`, `<Route>`).
   - Browser URL navigation, deep-linking, and back/forward browser history buttons are currently inoperable.
3. **Save Button Failure Root Cause**:
   - In `client/src/components/DataEntryForm.jsx` line 1545:
     ```jsx
     <button type="button" onClick={handleSubmit} disabled={submitting} ...>
       <span>{submitting ? 'সংরক্ষণ হচ্ছে...' : editingVoucher ? `Update Voucher (...)` : 'ভাউচার পোস্ট করুন (Save Voucher)'}</span>
     </button>
     ```
   - Line 355 within `handleSubmit` accesses `user`:
     ```javascript
     const payload = {
       createdBy: user?.username || 'admin',
       ...
     ```
   - In `DataEntryForm.jsx` line 23, the component signature is:
     ```javascript
     export default function DataEntryForm({ agents, showToast, onEntryCreated, editingVoucher, onCancelEdit }) {
     ```
   - `user` is **omitted from the component parameter destructuring**. Because `user` is neither defined as a local variable nor in props, evaluating `user?.username` throws a runtime `ReferenceError: user is not defined`.
   - This error is trapped by the `catch (err)` block at line 489:
     ```javascript
     } catch (err) {
       showToast('Server connection error', 'error');
     }
     ```
   - As a result, clicking the Save Voucher button fails silently or emits a false "Server connection error" toast without ever initiating a network request to `POST /api/entries/batch`.
4. **Logout Button Failure Root Cause**:
   - In `client/src/components/Navbar.jsx` lines 15 & 139:
     ```jsx
     export default function Navbar({ activeTab, setActiveTab, onQuickEntryClick, onTagadaClick, currentTheme, onThemeChange, user, onLogout }) {
     ...
     <button onClick={onLogout} ...>লগআউট / Logout</button>
     ```
   - In `client/src/App.jsx` lines 114–123, `<Navbar>` is rendered as:
     ```jsx
     <Navbar
       activeTab={activeTab}
       setActiveTab={setActiveTab}
       onQuickEntryClick={() => { setEditingVoucher(null); setActiveTab('entry'); }}
       onTagadaClick={() => setIsTagadaModalOpen(true)}
       currentTheme={currentTheme}
       onThemeChange={setCurrentTheme}
     />
     ```
   - `user` and `onLogout` are **never passed** to `<Navbar />`.
   - `onLogout` is therefore `undefined`, causing the Logout button click to do nothing.

### 2.3 R3: UI/UX Restoration
1. **Restrictive Container Constraints**:
   - In `client/src/App.jsx` line 126:
     ```jsx
     <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
     ```
   - The class `max-w-7xl mx-auto` enforces a maximum width of 80rem (1280px), preventing full-width / edge-to-edge layout across ultra-wide and standard desktop viewports.
2. **Table Responsiveness Audit**:
   - `Dashboard.jsx` (line 345): `<div className="overflow-x-auto">` is present.
   - `LedgerStatements.jsx` (line 530): `<div className="overflow-x-auto">` is present.
   - `ReceivablesReport.jsx` (line 191): `<div className="overflow-x-auto">` is present.
   - `AdvanceDepositsReport.jsx` (line 167): `<div className="overflow-x-auto">` is present.
   - `DailyFlowReport.jsx` (line 178): `<div className="overflow-x-auto">` is present.
   - `KsaExposureReport.jsx` (line 206): `<div className="overflow-x-auto">` is present.
   - `VoucherModal.jsx` (line 191): `<div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">` lacks `overflow-x-auto`, risking horizontal table clipping on smaller viewports.
   - `VoucherModal.jsx` (line 365): `<div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs shadow-sm">` lacks `overflow-x-auto`.
3. **Tailwind and CSS Audit**:
   - `client/tailwind.config.js` properly configures `content`, `darkMode: 'class'`, and custom emerald tones.
   - `client/src/index.css` correctly declares `@tailwind base; @tailwind components; @tailwind utilities;` and custom CSS theme selectors (`[data-theme="arafa-teal"]`, `[data-theme="midnight-onyx"]`, `[data-theme="executive-navy"]`).
   - Fonts (`Plus Jakarta Sans` and `Hind Siliguri`) are imported in `index.html` and configured in `index.css`.

---

## 3. Logic Chain

1. **R1 Logic**:
   - `server/index.js` already employs `ensureDataDir()` from `server/services/jsonDb.js`.
   - `jsonDb.readData('users')` automatically initializes an empty `[]` file if missing, but does not seed credentials.
   - Therefore, a dedicated initialization check or function in backend startup (`ensureAdminUser()`) must detect whether `server/data/users.json` is missing or empty, and seed the default user: `username: 'admin'`, `password: 'admin'`, `role: 'Super Admin'`.
   - To securely maintain users, a dedicated `/api/auth` router with `POST /login`, `POST /register`, `POST /logout`, and `GET /me` must be created.
   - Protected Express routes require an `authMiddleware` checking `Authorization: Bearer <token>` or session header.

2. **R2 Logic**:
   - `react-router-dom` must be added to `client/package.json` dependencies and installed.
   - `App.jsx` or `main.jsx` must wrap routes in `<BrowserRouter>`.
   - `Navbar.jsx` must replace button click handlers with React Router `<NavLink>` or `useNavigate()` triggers for:
     - `/dashboard` (or `/`)
     - `/agents`
     - `/entry`
     - `/statements`
     - `/tagada`
     - `/reports/receivables`, `/reports/advance-deposits`, `/reports/ksa-exposure`, `/reports/daily-flow`
   - In `DataEntryForm.jsx`, destructuring `user` in `DataEntryForm({ agents, showToast, onEntryCreated, editingVoucher, onCancelEdit, user })` immediately eliminates `ReferenceError: user is not defined`, enabling `handleSubmit` to execute cleanly and dispatch `POST /api/entries/batch` or `PUT /api/entries/batch/:id`.
   - In `App.jsx`, passing `user={user}` and `onLogout={() => { localStorage.removeItem('traveledger_auth'); setUser(null); navigate('/login'); }}` to `<Navbar />` immediately restores the Logout button functionality.

3. **R3 Logic**:
   - Removing `max-w-7xl mx-auto` from `<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">` and replacing with `<main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">` satisfies the requirement for full-width edge-to-edge layout without restrictive maximum widths.
   - Adding `overflow-x-auto` to `VoucherModal.jsx` table containers ensures 100% compliance across all tables and modals for mobile responsiveness.

---

## 4. Caveats

1. **Read-Only Protocol**: As a specification miner, no source code, dependencies, or data files were modified during this survey.
2. **Password Storage Format**: `ORIGINAL_REQUEST.md` specifies default admin credentials as `username: 'admin'`, `password: 'admin'`. For production security, hashing (via Node built-in `crypto` HMAC-SHA256 / SHA256 or bcrypt) should be supported while ensuring the pre-seeded admin user matches credentials upon startup.
3. **Modal Navigation**: WhatsApp Tagada is implemented both as a standalone tab (`/tagada`) and as modal triggers from `Dashboard` and `LedgerStatements`. Both entry points must remain functional.

---

## 5. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Auth | Admin Pre-Seeding | Pre-seed `server/data/users.json` with admin on server start if missing or empty | Server startup event | `server/data/users.json` populated with default admin record | Graceful fallback if file lock active | `ORIGINAL_REQUEST.md`, `server/services/jsonDb.js` |
| 2 | R1: Auth | User Registration API | Endpoint to create new user accounts in `users.json` | `POST /api/auth/register` with `{ username, password, role, name }` | `201 Created` with user payload (excluding password) | `400` if missing fields; `409` if username exists | Spec Survey R1 |
| 3 | R1: Auth | User Authentication API | Endpoint to verify credentials against `users.json` | `POST /api/auth/login` with `{ username, password }` | `200 OK` with auth token & user object | `401 Unauthorized` on credential mismatch | Spec Survey R1 |
| 4 | R1: Auth | User Profile / Me API | Validates current token/session and returns user info | `GET /api/auth/me` with `Bearer <token>` | `200 OK` with `{ user }` | `401 Unauthorized` if invalid token | Spec Survey R1 |
| 5 | R1: Auth | Backend Route Protection | Protect `/api/entries`, `/api/agents`, `/api/ledgers`, `/api/reports` | `Authorization` header | Next middleware if valid | `401 Unauthorized` if missing/invalid token | Spec Survey R1 |
| 6 | R1: Auth | In-App Registration UI | Toggle/tab in `Login.jsx` allowing users to register directly | Form fields: Username, Password, Role, Name | Trigger `POST /api/auth/register`, notify user | Form validation & error message banner | Spec Survey R1 |
| 7 | R1: Auth | Protected Route Guard | Client-side route wrapper preventing unauthenticated access | Route path + auth state in `localStorage` | Child view or `<Navigate to="/login" />` | Immediate redirect to `/login` | `ORIGINAL_REQUEST.md` |
| 8 | R2: Routing | React Router Root Setup | Replaces state tabs with standard URL routing | Browser URL changes | Renders routed component | 404 / Catch-all redirect to `/dashboard` | `ORIGINAL_REQUEST.md` |
| 9 | R2: Routing | Primary View URL Paths | Direct navigation for Dashboard, Entry, Statements, Agents, Reports | `/dashboard`, `/entry`, `/statements`, `/agents`, `/reports/*` | Loads target component directly on page reload | Fallback to `/dashboard` | `ORIGINAL_REQUEST.md` |
| 10 | R2: Routing | Sub-Report URL Paths | Direct URL navigation for 4 specialized financial reports | `/reports/receivables`, `/reports/advance-deposits`, `/reports/ksa-exposure`, `/reports/daily-flow` | Target report view | 404 / redirect | `client/src/components/reports/` |
| 11 | R2: Buttons | Save Voucher Button Repair | Restores voucher posting by passing and destructuring `user` prop | Form inputs (BD Agent, Saudi Agent, breakdown, payments) | `POST /api/entries/batch` or `PUT /api/entries/batch/:id` | Validates agent selection; emits error toast if invalid | `client/src/components/DataEntryForm.jsx:355, 1545` |
| 12 | R2: Buttons | Logout Button Repair | Restores logout by passing `onLogout` prop and wiring session cleanup | Logout button click in `Navbar` | Clears `traveledger_auth`, resets state, navigates to `/login` | None | `client/src/components/Navbar.jsx:139`, `App.jsx:114` |
| 13 | R3: Styling | Full-Width Main Container | Eliminates `max-w-7xl mx-auto` for true edge-to-edge layout | Viewport width | Full-width container (`w-full px-4 sm:px-6 lg:px-8 py-6`) | None | `ORIGINAL_REQUEST.md:44`, `App.jsx:126` |
| 14 | R3: Styling | Responsive Table Wrappers | Wraps all tables in `overflow-x-auto` to prevent horizontal breakage on mobile | Small/mobile screen width | Horizontally scrollable table container | None | `ORIGINAL_REQUEST.md:45`, `VoucherModal.jsx` |
| 15 | R3: Styling | Multi-Theme Switcher | Preserves support for Arafa Teal, Midnight Onyx (dark), Executive Navy | Theme selector dropdown in `Navbar` | Switches `data-theme` attribute and `dark` class | Persists to `localStorage` | `client/src/App.jsx:36–57`, `Navbar.jsx:78` |

---

## 6. Acceptance Criteria Breakdown & Verification Rubrics

### Rubric R1: Authentication & Data
| Criteria | Status Before Fix | Expected After Fix | Verification Check |
|---|---|---|---|
| `server/data/users.json` created upon server start | ❌ File does not exist | `server/data/users.json` exists with pre-seeded admin user | Inspect disk: `Test-Path server/data/users.json` and verify content contains `admin` |
| Default admin seeded if empty | ❌ Not implemented | `{ "username": "admin", "password": "...", "role": "Super Admin" }` | Read `server/data/users.json` and verify username `admin`, role `Super Admin` |
| Unauthenticated users redirected to Login | ⚠️ Partial (App.jsx conditional only, no router) | Navigating to `/`, `/dashboard`, `/entry`, `/statements` without auth redirects to `/login` | Open browser without auth token, navigate to `/dashboard` -> redirected to `/login` |
| Logout clears session and redirects | ❌ Logout button onClick is undefined | Clicking Logout removes auth from `localStorage`, redirects to `/login` | Click Logout button -> verify `localStorage.getItem('traveledger_auth')` is null, URL is `/login` |

### Rubric R2: Routing & Button Repairs
| Criteria | Status Before Fix | Expected After Fix | Verification Check |
|---|---|---|---|
| `react-router-dom` in `package.json` | ❌ Not installed | Present in `dependencies` and `node_modules` | Check `client/package.json` dependencies |
| Standard URL routing for primary views | ❌ Legacy `activeTab` state | `<BrowserRouter>`, `<Routes>`, `<Route>` handles `/dashboard`, `/entry`, `/statements`, `/agents`, `/reports/*` | Check `App.jsx` structure and navigate to `/statements` directly in browser |
| Direct URL navigation loads correct component | ❌ Reloading resets to `dashboard` | Direct URL `/reports/receivables` loads Receivables Report | Enter `/reports/receivables` in browser address bar -> loads report |
| Save Voucher button triggers API | ❌ Throws `ReferenceError: user is not defined` | Submits `POST /api/entries/batch`, updates ledger, emits success toast | Fill entry form, click Save Voucher -> inspect network payload and toast notification |

### Rubric R3: UI & Styling
| Criteria | Status Before Fix | Expected After Fix | Verification Check |
|---|---|---|---|
| Full-width containers without `max-w-7xl` | ❌ `App.jsx:126` has `max-w-7xl mx-auto` | `<main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">` | Grep `max-w-7xl mx-auto` in `client/src` -> 0 matches |
| Tables use responsive `overflow-x-auto` | ⚠️ Missing on `VoucherModal.jsx` tables | All tables inside `overflow-x-auto` wrappers | Inspect tables in `Dashboard`, `LedgerStatements`, `Reports`, and `VoucherModal` on mobile viewport |

---

## 7. Data Schemas & API Contracts

### 7.1 `server/data/users.json` Schema
```json
[
  {
    "id": "USER-1",
    "username": "admin",
    "password": "admin",
    "role": "Super Admin",
    "name": "Super Admin",
    "createdAt": "2026-10-01T00:00:00.000Z",
    "updatedAt": "2026-10-01T00:00:00.000Z"
  }
]
```

### 7.2 Auth API Contracts

#### `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "USER-1",
      "username": "admin",
      "role": "Super Admin",
      "name": "Super Admin"
    }
  }
  ```
- **Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Invalid username or password"
  }
  ```

#### `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "username": "staff1",
    "password": "password123",
    "role": "Staff",
    "name": "Mohammad Staff"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": "USER-1727824982",
      "username": "staff1",
      "role": "Staff",
      "name": "Mohammad Staff"
    }
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Username and password are required"
  }
  ```
- **Response (409 Conflict)**:
  ```json
  {
    "success": false,
    "message": "Username already exists"
  }
  ```

#### `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "USER-1",
      "username": "admin",
      "role": "Super Admin",
      "name": "Super Admin"
    }
  }
  ```

### 7.3 Save Voucher API Contract (`POST /api/entries/batch`)
- **Target Endpoint**: `POST /api/entries/batch` (or `PUT /api/entries/batch/:id` if editing)
- **Request Payload**:
  ```json
  {
    "createdBy": "admin",
    "bdAgentId": "AGENT-BD-101",
    "saudiAgentId": "AGENT-SAUDI-201",
    "date": "2026-10-01",
    "passengerRef": "MR RAHIM & 4 PAX",
    "dueAdjustment": 0,
    "nowPaying": 50000,
    "breakdown": {
      "umrahVisa": { "pax": 4, "costSAR": 1200, "rate": 32.5, "totalBDT": 39000 },
      "hotel": { "totalSAR": 2000, "rate": 32.5, "totalBDT": 65000 },
      "transport": { "costSAR": 500, "rate": 32.5, "totalBDT": 16250 },
      "naqabaFine": { "costSAR": 0, "rate": 32.5, "totalBDT": 0 },
      "brnCharge": { "totalSAR": 200, "rate": 32.5, "totalBDT": 6500 },
      "crnCharge": { "totalSAR": 0, "rate": 32.5, "totalBDT": 0 },
      "escapedFine": { "costSAR": 0, "rate": 32.5, "totalBDT": 0 },
      "previousDues": 0
    },
    "paymentReceived": {
      "mode": "Recv IN HAND (BDT)",
      "amountSAR": 0,
      "amountBDT": 50000,
      "trxId": "TRX-9982"
    },
    "totals": {
      "grossAmountSAR": 3900,
      "grossAmountBDT": 126750,
      "servicesTotalBDT": 126750,
      "paidAmountBDT": 50000,
      "netDueAdded": 76750,
      "dueAdjustment": 0,
      "totalBillable": 126750
    },
    "note": "Complete Umrah package billing"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Sub-Agency batch billing voucher posted successfully.",
    "data": {
      "billingDoc": { "voucherNo": "VOUCHER-1005", "totalBillable": 126750 },
      "bdLedger": { "entryId": "LEDGER-BD-1005", "runningBalance": 67822 }
    }
  }
  ```

---

## 8. Edge Cases

| # | Feature | Input | Observed Behavior | Required Behavior |
|---|---------|-------|-------------------|-------------------|
| 1 | `users.json` Seeding | Server starts when `server/data/users.json` does not exist | File not created; auth routes not present | Automatically create `users.json` and insert pre-seeded `admin` user |
| 2 | `users.json` Seeding | `server/data/users.json` exists but contains empty array `[]` | No admin available | Detect empty array and re-seed default admin credentials |
| 3 | User Registration | Duplicate username registration (e.g. username `admin` with different casing `ADMIN`) | Unhandled | Case-insensitive duplicate check returning `409 Conflict` |
| 4 | User Registration | Registration with missing password or empty username string | Unhandled | Return `400 Bad Request` with descriptive validation error |
| 5 | Login API | User supplies wrong password or non-existent username | Throws unhandled error if not guarded | Return `401 Unauthorized` with generic "Invalid username or password" message |
| 6 | Protected Routes | Unauthenticated user navigates directly to `/entry` or `/statements` | Renders view or fails | Redirect immediately to `/login` via `<ProtectedRoute>` |
| 7 | Protected Routes | Authenticated user visits `/login` | Displays login form redundantly | Redirect to `/dashboard` |
| 8 | Save Voucher | User prop is missing/undefined in `DataEntryForm` | Throws `ReferenceError: user is not defined`, blocks submission | Properly destructured with fallback `user?.username || 'admin'` |
| 9 | Save Voucher | User submits without selecting BD Agent or Saudi Agent | Form toast warning | Validation check alerts user before network request |
| 10 | Logout Button | User clicks Logout when session is active | Nothing happens (`onLogout` undefined) | Clear `traveledger_auth` from `localStorage`, set user to null, navigate to `/login` |
| 11 | Direct URL Navigation | User reloads `/reports/daily-flow` | Resets to Dashboard tab | Directly mounts `DailyFlowReport` at `/reports/daily-flow` |
| 12 | Screen Resize (Mobile) | Table rendered on mobile screen 375px wide | Layout clipping on un-wrapped modal tables | `overflow-x-auto` wrapper allows smooth horizontal scrolling |

---

## 9. Conclusion & Actionable Implementation Roadmap

The survey has isolated the exact modifications required for each requirement:

1. **R1 (Backend & Frontend Auth)**:
   - Create `server/routes/authRoutes.js` and `server/controllers/authController.js`.
   - Add initialization check in `server/index.js` (or via `jsonDb`) to seed `server/data/users.json` with admin (`admin`/`admin`, role: `Super Admin`).
   - Add authentication middleware `server/middleware/authMiddleware.js`.
   - Upgrade `client/src/components/Login.jsx` to support API-based login, error display, and user registration tab.
   - Implement `<ProtectedRoute>` in React Router.

2. **R2 (Router Migration & Button Repairs)**:
   - Install `react-router-dom` in `client/package.json`.
   - Refactor `client/src/App.jsx` and `client/src/main.jsx` to use `<BrowserRouter>`, `<Routes>`, `<Route>`, `<NavLink>`.
   - Map routes: `/dashboard`, `/entry`, `/statements`, `/agents`, `/tagada`, `/reports/receivables`, `/reports/advance-deposits`, `/reports/ksa-exposure`, `/reports/daily-flow`, `/login`.
   - In `client/src/components/DataEntryForm.jsx`, add `user` to destructured props at line 23 to fix `ReferenceError: user is not defined`.
   - In `client/src/components/Navbar.jsx`, wire `onLogout` and `user` passed from `App.jsx` to clear session and navigate to `/login`.

3. **R3 (UI/UX Restoration)**:
   - In `client/src/App.jsx` line 126, change `<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">` to `<main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">`.
   - In `client/src/components/VoucherModal.jsx`, add `overflow-x-auto` to table wrapper divs at lines 191 and 365.
   - Ensure all responsive tables have `overflow-x-auto`.

---

## 10. Verification Method

Once implemented, the verification judge should execute the following test sequence:

1. **Verify `users.json` Creation & Seeding**:
   - Start the server (`node index.js`).
   - Inspect `server/data/users.json`: verify file exists, contains `username: "admin"`, `role: "Super Admin"`.
2. **Verify Backend Auth API**:
   - Test `POST http://localhost:5000/api/auth/login` with `{ "username": "admin", "password": "admin" }` -> returns `200` with user object & token.
   - Test `POST http://localhost:5000/api/auth/register` with new user -> returns `201` and user is saved to `users.json`.
   - Test invalid login -> returns `401`.
3. **Verify Routing & Navigation**:
   - Start client (`npm run dev`).
   - Open browser at `http://localhost:5173/` without token -> verify redirection to `/login`.
   - Login with `admin`/`admin` -> redirected to `/dashboard`.
   - Navigate directly to `http://localhost:5173/statements` -> loads `LedgerStatements`.
   - Navigate directly to `http://localhost:5173/reports/receivables` -> loads `ReceivablesReport`.
4. **Verify Button Repairs**:
   - On `/entry`, select BD Agent and Saudi Supplier, enter voucher details, and click `ভাউচার পোস্ট করুন (Save Voucher)` -> verify success toast and new voucher in ledger.
   - Click `লগআউট / Logout` in Navbar -> verify session is removed from `localStorage` and browser redirects to `/login`.
5. **Verify UI & Responsiveness**:
   - Inspect `<main>` container in browser DOM: verify absence of `max-w-7xl mx-auto`.
   - Resize viewport to 375px width (mobile): verify all tables in Dashboard, Ledger Statements, Reports, and VoucherModal scroll horizontally via `overflow-x-auto` without clipping.
