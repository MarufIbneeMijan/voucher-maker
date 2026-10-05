# TravelLedger E2E Test Infrastructure Specification

**Document Path**: `TEST_INFRA.md`  
**Standard**: Teamwork Project Pattern Test Specification  
**System**: TravelLedger B2B Umrah & Travel Ledger Management Platform  
**Target Environment**: Node.js v20+ / Windows PowerShell / Vite 6 + React 18  

---

## 1. Test Philosophy

### 1.1 Opaque-Box & Requirement-Driven
The testing framework adopts an **opaque-box** (black-box) testing methodology. Tests interact with the TravelLedger platform solely through its public interfaces, REST API contracts, filesystem state, and rendered client-side source contracts. Internal implementation details (private helper variables, in-memory closures) are not monkey-patched or assumed.

All test expectations and assertions are strictly derived from:
1. **User Requirements**: `ORIGINAL_REQUEST.md` (Requirements R1, R2, R3).
2. **Project Specification & Architecture**: `PROJECT.md` interface contracts and feature inventory.
3. **Specification Survey**: `.agents/teamwork/spec_miner_survey_1/handoff.md`.

### 1.2 Deterministic Output Derivation
Every test case specifies an authoritative expected output:
- **HTTP APIs**: Status codes (200, 201, 400, 401, 404, 409), JSON structure, schema validation, omission of sensitive fields (e.g., password omitted from auth responses), and idempotent side effects.
- **Persistence**: File state changes in `server/data/users.json`, `agents.json`, `billing_entries.json`, and `ledger_entries.json`.
- **Client Routing & UI Contracts**: AST/regex inspection of package dependencies (`react-router-dom`), route definitions (`<BrowserRouter>`, `<Routes>`, `<Route>`), component prop signatures (`user` destructuring, `onLogout` wiring), and responsive layout classes (`overflow-x-auto`, omission of `max-w-7xl mx-auto`).

### 1.3 Progressive Testability & Self-Containment
- Each test suite is isolated and cleans up temporary state.
- Automated server lifecycle management: The test runner automatically detects if a live backend is active; if not, it launches an ephemeral test server on an isolated port and performs graceful teardown on exit.
- Tests support progressive verification across implementation milestones (M1 Backend Auth, M2 Router & Buttons, M3 UI/UX Restoration).

---

## 2. Testing Methodology

The test suite is structured around four rigorous testing methodologies:

### 2.1 Category-Partition Testing
Input domains, application states, and HTTP parameters are categorized into discrete partitions, with test cases systematically sampled from each partition:
- **Authentication**: Valid pre-seeded credentials, freshly registered credentials, invalid password, non-existent user, duplicate username, case-variant username, malformed payload.
- **Token Verification**: Valid Bearer token, missing header, invalid signature, expired/corrupted token, missing "Bearer " prefix.
- **Routing**: Unauthenticated navigation, authenticated navigation, direct URL deep-linking, invalid route fallback.
- **Billing Entries & Ledger**: Valid multi-service Umrah voucher, partial payment, zero payment, missing mandatory agent IDs, invalid exchange rates.

### 2.2 Boundary Value Analysis (BVA)
Tests probe system limits and edge conditions:
- **Empty / Null Values**: Empty string username/password, whitespace-only inputs, null `user` prop, empty `agents` array.
- **Data Persistence**: Empty `users.json` array `[]`, missing `users.json` file on disk, auto-seeding idempotency on multiple server reboots.
- **Financial Bounds**: Zero amounts, boundary exchange rates, floating-point balance consistency.
- **Responsive Layout**: Screen width breakpoints (mobile 375px, tablet 768px, desktop 1280px+), full-width container expansion beyond 1280px (`max-w-7xl`).

### 2.3 Pairwise Combinatorial Testing
Two-way interactions between distinct features are validated to ensure emergent system behavior is defect-free:
- **Registration ⨉ Login**: Register account -> immediately authenticate with new credentials.
- **Authentication ⨉ Voucher Creation**: Authenticate as Super Admin -> post voucher -> verify `createdBy` attribution in audit trail.
- **Authentication ⨉ Logout ⨉ Route Guard**: Login -> retrieve profile -> logout -> verify session clearance and rejection on `/api/auth/me`.
- **Agent Creation ⨉ Voucher Entry ⨉ Ledger Reconciliation**: Create BD Agent -> post batch voucher with partial payment -> verify double-entry ledger rows (VOUCHER_BILL debit + PAYMENT_RECEIVED credit) -> verify running balance matches.
- **Theme Selection ⨉ DOM Class Sync**: Toggle between Arafa Teal, Midnight Onyx, Executive Navy -> verify `data-theme` attribute and `dark` class toggling.

### 2.4 Real-World Application Workloads
Tier 4 executes complete end-to-end user workflows simulating actual B2B Umrah travel operations:
- **Scenario A: Complete Umrah Package Billing Cycle**: Super Admin login -> Agent directory check -> Voucher composition (Umrah Visa, Makkah Hotel, Madinah Hotel, Transport, BRN charge) -> Submission -> Double-entry ledger generation -> Statement query and balance verification.
- **Scenario B: User Lifecycle & Role-Based Operation**: Staff account registration -> Login -> Batch entry submission with user attribution -> Session termination.
- **Scenario C: Multi-Agent Ledger Statement Audit**: Creation of BD sub-agency & Saudi supplier -> Sequential voucher posting -> Ledger balance calculation audit.

---

## 3. Feature Inventory & Coverage Mapping

| Feature ID | Requirement | Description | Primary Verification Target | Minimum Cases |
|------------|-------------|-------------|-----------------------------|---------------|
| **F-R1.1** | R1: Auth & Data | `server/data/users.json` Auto-Seeding | Pre-seeds admin user (`admin`/`admin`, role: "Super Admin") on startup | 5 |
| **F-R1.2** | R1: Auth & Data | User Login API (`POST /api/auth/login`) | Authenticates valid credentials, returns JWT/Bearer token & user object | 5 |
| **F-R1.3** | R1: Auth & Data | User Registration API (`POST /api/auth/register`) | Creates new accounts, validates required fields, enforces uniqueness | 5 |
| **F-R1.4** | R1: Auth & Data | Profile / Me API (`GET /api/auth/me`) | Validates Bearer token and returns authenticated user metadata | 5 |
| **F-R1.5** | R1: Auth & Data | Logout API & Session Clearance (`POST /api/auth/logout`) | Terminates session, clears client token/localStorage | 5 |
| **F-R1.6** | R1: Auth & Data | Unauthenticated Access Protection | Rejects unauthorized API access (401) and redirects unauthenticated UI users to `/login` | 5 |
| **F-R2.1** | R2: Routing | `react-router-dom` Dependency | Package installed in `client/package.json` | 5 |
| **F-R2.2** | R2: Routing | Root Router Setup & Primary Routes | `<BrowserRouter>`, `<Routes>`, `/dashboard`, `/entry`, `/statements`, `/agents`, `/reports/*`, `/login` | 5 |
| **F-R2.3** | R2: Routing | Protected Route Guard | `<ProtectedRoute>` redirects unauthenticated users to `/login` | 5 |
| **F-R2.4** | R2: Routing | Direct URL Navigation & Deep Linking | Direct URL access loads corresponding component | 5 |
| **F-R2.5** | R2: Buttons | Save Voucher Button Repair | `DataEntryForm.jsx` destructures `user` prop, prevents `ReferenceError`, posts to `/api/entries/batch` | 5 |
| **F-R2.6** | R2: Buttons | Logout Button Repair | `Navbar.jsx` receives `onLogout` prop, clears session and redirects | 5 |
| **F-R3.1** | R3: UI/UX | Full-Width Main Container | Absence of restrictive `max-w-7xl mx-auto` on main layout container | 5 |
| **F-R3.2** | R3: UI/UX | Modal Table Responsiveness | `VoucherModal.jsx` table wrappers use `overflow-x-auto` | 5 |
| **F-R3.3** | R3: UI/UX | Global Table Responsiveness | Dashboard, Ledger Statements, and Reports tables use `overflow-x-auto` | 5 |
| **F-R3.4** | R3: UI/UX | Multi-Theme Switching | Support for Arafa Teal, Midnight Onyx, Executive Navy with `data-theme` and `dark` mode | 5 |
| **F-R3.5** | R3: UI/UX | Mobile Responsiveness & Breakpoints | Mobile navigation and responsive flex/grid layouts on small viewports | 5 |

---

## 4. Test Tier Architecture & Thresholds

```
tests/e2e/
├── runner.js                         # Single-command orchestrator & test reporter
├── helpers/
│   ├── serverControl.js              # Server lifecycle & HTTP test client
│   ├── staticInspect.js              # Client source code, AST, CSS & prop contract inspectors
│   └── fixtures.js                   # Canonical Umrah vouchers, test users, payload fixtures
├── tier1_features/
│   ├── r1_auth_features.test.js      # Feature Coverage for R1: Auth & Data (7+ tests)
│   ├── r2_routing_buttons.test.js    # Feature Coverage for R2: Routing & Buttons (6+ tests)
│   └── r3_ui_styling.test.js         # Feature Coverage for R3: UI/UX Restoration (5+ tests)
├── tier2_boundaries/
│   ├── r1_auth_boundaries.test.js    # Boundary & Corner cases for Auth (7+ tests)
│   ├── r2_routing_boundaries.test.js # Boundary & Corner cases for Routing & Buttons (6+ tests)
│   └── r3_ui_boundaries.test.js      # Boundary & Corner cases for UI/UX (5+ tests)
├── tier3_combinations/
│   └── cross_feature.test.js         # Pairwise combinatorial integration tests (6+ tests)
└── tier4_real_world/
    └── real_world_scenarios.test.js  # End-to-end B2B Umrah agency workflows (3+ scenarios)
```

### Coverage Thresholds
- **Tier 1 (Feature Coverage)**: Minimum 5 test cases per requirement domain (R1, R2, R3). Total >= 18 tests.
- **Tier 2 (Boundary & Corner Cases)**: Minimum 5 test cases per requirement domain. Total >= 18 tests.
- **Tier 3 (Cross-Feature Combinations)**: Minimum 5 pairwise integration test cases. Total >= 6 tests.
- **Tier 4 (Real-World Application Scenarios)**: Minimum 3 end-to-end workflows with full assertion trees.
- **Total Test Suite**: >= 45 automated test cases.
- **Pass Criterion**: 100% pass rate on all implemented features.

---

## 5. Execution & Tooling Requirements

- **Test Framework**: Node.js built-in test runner (`node:test`, `node:assert`).
- **Dependencies**: Native Node.js standard library (`http`, `fs`, `path`, `child_process`, `crypto`). Zero external test runner bloat.
- **Single Command**: `node tests/e2e/runner.js`
- **Exit Codes**:
  - `0`: All executed tests passed cleanly.
  - `1`: One or more tests failed.
