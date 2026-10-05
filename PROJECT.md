# Project: TravelLedger

## Architecture
TravelLedger is a B2B travel accounting and ledger management platform for Umrah & Hajj travel agencies.
- **Backend**: Node.js / Express 4 listening on port 5000 with atomic JSON file persistence (`server/services/jsonDb.js`) storing data under `server/data/`.
- **Frontend**: React 18 / Vite 6 on port 3000 (proxying `/api` to port 5000), styled with Tailwind CSS 3.
- **Routing**: `react-router-dom` URL-based routing (`<BrowserRouter>`, `<Routes>`, `<Route>`) replacing legacy in-memory `activeTab` state.
- **Authentication**: Local JSON database (`server/data/users.json`) with auto-seeding of default `admin` on boot, REST auth endpoints (`/api/auth/*`), token/session validation, and protected routes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Auto-Seed `users.json` | Initialize `server/data/users.json` if missing or empty with default admin user (`admin`/`admin`, role: `Super Admin`) | M1 | ORIGINAL_REQUEST R1 |
| 2 | Backend Auth Endpoints | Implement `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me` | M1 | ORIGINAL_REQUEST R1 |
| 3 | Backend Auth Middleware | Enforce authentication guards on sensitive financial routes (`/api/entries`, `/api/ledgers`, `/api/agents`, `/api/reports`) | M1 | ORIGINAL_REQUEST R1 |
| 4 | Frontend Auth Integration | Wire `Login.jsx` to `/api/auth/login`, store session/token, handle registration via `/api/auth/register` | M2 | ORIGINAL_REQUEST R1 |
| 5 | Protected Route Guard | Client-side `<ProtectedRoute>` redirecting unauthenticated users to `/login` | M2 | ORIGINAL_REQUEST R1 |
| 6 | React Router Installation & Root Setup | Install `react-router-dom` in `client/package.json` and wrap application in `<BrowserRouter>` | M2 | ORIGINAL_REQUEST R2 |
| 7 | Primary URL Routes | Route `/dashboard`, `/entry`, `/statements`, `/agents`, `/tagada`, and `/reports/*` to respective views | M2 | ORIGINAL_REQUEST R2 |
| 8 | Direct URL Navigation | Ensure direct navigation and browser refresh on any primary or report URL loads the exact component | M2 | ORIGINAL_REQUEST R2 |
| 9 | Repair Save Voucher Button | Fix `ReferenceError: user is not defined` in `DataEntryForm.jsx` by properly destructuring `user` prop | M2 | ORIGINAL_REQUEST R2 |
| 10 | Repair Logout Button | Pass `user` and `onLogout` callback to `Navbar.jsx`, clearing session storage and redirecting to `/login` | M2 | ORIGINAL_REQUEST R2 |
| 11 | Full-Width Responsiveness | Eliminate `max-w-7xl mx-auto` constraint from `App.jsx` main container, providing full edge-to-edge layout | M2 | ORIGINAL_REQUEST R3 |
| 12 | Responsive Table Wrappers | Replace `overflow-hidden` with `overflow-x-auto` on modal tables in `VoucherModal.jsx` and ensure all tables scroll cleanly | M2 | ORIGINAL_REQUEST R3 |
| 13 | Multi-Theme Styling | Maintain Tailwind styling and support for themes (`arafa-teal`, `midnight-onyx`, `executive-navy`) across all screens | M2 | ORIGINAL_REQUEST R3 |
| 14 | E2E Testing Infrastructure & Suite | Comprehensive opaque-box test suite across Tiers 1-4 verifying Auth, Routing, Buttons, and Responsive Layout | M4 | ORIGINAL_REQUEST Verification |
| 15 | Final Verification & Hardening | Pass 100% E2E tests, execute Tier 5 adversarial stress testing, and obtain clean Forensic Audit verdict | M5 | Project Pattern Final Milestone |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend User Authentication & users.json Engine | `server/data/users.json` seeding, auth routes, controller, auth middleware, and automated auth unit tests | none | DONE (29 unit tests, 25 E2E tests passing) |
| M2 | React Router Migration, Button Repairs & UI/UX Restoration | Install `react-router-dom`, `<Routes>`, `<Route>`, `<ProtectedRoute>`, fix Save & Logout buttons, API-backed Login & Register, full-width edge-to-edge layout, responsive table wrappers | M1 | DONE (build passed, 49/49 E2E tests passed) |
| M4 | E2E Testing Track | Independent opaque-box test harness covering Tiers 1-4 for R1, R2, R3; publish `TEST_READY.md` | none (opaque-box) | DONE (TEST_READY.md published, 49 tests) |
| M5 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Pass 100% of E2E test suite, adversarial coverage hardening (Tier 5), Forensic Audit | M1, M2, M4 | DONE (100% E2E passed, Tier 5 stress passed, audit CLEAN) |

## Interface Contracts

### Backend Auth ↔ Frontend Client
- **Base URL**: `/api/auth`
- **POST `/api/auth/login`**:
  - Request: `{ "username": string, "password": string }`
  - Response (200): `{ "success": true, "token": string, "user": { "id": string, "username": string, "role": string, "name": string } }`
  - Response (401): `{ "success": false, "message": "Invalid username or password" }`
- **POST `/api/auth/register`**:
  - Request: `{ "username": string, "password": string, "role": string, "name": string }`
  - Response (201): `{ "success": true, "message": string, "user": { "id": string, "username": string, "role": string, "name": string } }`
  - Response (400/409): `{ "success": false, "message": string }`
- **GET `/api/auth/me`**:
  - Header: `Authorization: Bearer <token>`
  - Response (200): `{ "success": true, "user": { "id": string, "username": string, "role": string, "name": string } }`
  - Response (401): `{ "success": false, "message": "Unauthorized" }`
- **POST `/api/auth/logout`**:
  - Response (200): `{ "success": true, "message": "Logged out" }`

### Client Navigation ↔ Views
- `/login` -> `Login` component
- `/` or `/dashboard` -> `Dashboard` component (Protected)
- `/entry` -> `DataEntryForm` component (Protected)
- `/statements` -> `LedgerStatements` component (Protected)
- `/agents` -> `AgentDirectory` component (Protected)
- `/tagada` -> `WhatsAppTagadaModal` component (Protected)
- `/reports/receivables` -> `ReceivablesReport` component (Protected)
- `/reports/advance-deposits` -> `AdvanceDepositsReport` component (Protected)
- `/reports/ksa-exposure` -> `KsaExposureReport` component (Protected)
- `/reports/daily-flow` -> `DailyFlowReport` component (Protected)

### Component Props Contract for Fixed Buttons
- `Navbar`: `{ user, onLogout, onQuickEntryClick, onTagadaClick, currentTheme, onThemeChange }`
  - `onLogout`: clears `localStorage.removeItem('traveledger_auth')`, sets `user = null`, navigates to `/login`.
- `DataEntryForm`: `{ agents, showToast, onEntryCreated, editingVoucher, onCancelEdit, user }`
  - `user`: object `{ username, role, name }` or null, fallback `user?.username || 'admin'` evaluated safely.

## Code Layout
- `server/data/users.json` — Local user storage
- `server/services/authService.js` — User CRUD, password verification, hashing, token management
- `server/controllers/authController.js` — Auth HTTP handlers
- `server/routes/authRoutes.js` — `/api/auth` Express route definitions
- `server/middleware/authMiddleware.js` — Bearer token authentication middleware
- `server/scripts/test-auth.js` — Automated backend auth test suite
- `client/src/App.jsx` — React Router root, route definitions, layout container
- `client/src/components/ProtectedRoute.jsx` — Route authentication guard
- `client/src/components/Navbar.jsx` — NavLinks, Logout button trigger
- `client/src/components/Login.jsx` — Login & Registration forms with API integration
- `client/src/components/DataEntryForm.jsx` — Form with user prop destructuring
- `client/src/components/VoucherModal.jsx` — Responsive table wrappers (`overflow-x-auto`)
- `tests/e2e/` — Opaque-box E2E test runner and test cases
