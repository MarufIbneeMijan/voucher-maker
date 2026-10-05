## 2026-10-01T22:41:00Z
You are teamwork_preview_test_writer for Milestone 4: E2E Testing Track.
Your working directory is: e:\TravelLedger\.agents\teamwork\test_writer_m4_e2e_1
Your parent is: orchestrator (conversation ID: f6e16f1f-50a4-4525-ab41-c30e78b1bc45)

INPUTS (Read these files first):
- MANDATORY User Request: e:\TravelLedger\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope: e:\TravelLedger\PROJECT.md
- Specification Survey: e:\TravelLedger\.agents\teamwork\spec_miner_survey_1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You exclusively own and may edit or create:
- `TEST_INFRA.md` (at project root `e:\TravelLedger\TEST_INFRA.md`)
- `TEST_READY.md` (at project root `e:\TravelLedger\TEST_READY.md`)
- `tests/e2e/` directory (all files within)
DO NOT modify `server/` implementation code or `client/src` source code.

TASK:
1. Design and create `TEST_INFRA.md` at project root (`e:\TravelLedger\TEST_INFRA.md`) according to the Project Pattern template:
   - Test philosophy: Opaque-box, requirement-driven. Derived from ORIGINAL_REQUEST.md and user specs.
   - Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workloads.
   - Feature Inventory and coverage thresholds across Tiers 1-4.
2. Implement an automated, opaque-box E2E test runner and test suite under `e:\TravelLedger\tests\e2e\`:
   - Use Node.js built-in test runner (`node:test`, `node:assert`, and standard HTTP / file inspection) so it runs cleanly without heavy external framework dependencies.
   - Test runner script: e.g. `tests/e2e/runner.js` or `npm --prefix tests run e2e` / `node --test tests/e2e/*.test.js`.
   - The test suite must independently verify all requirements from ORIGINAL_REQUEST.md:
     * R1: Authentication & Data
       - `server/data/users.json` auto-seeding upon server start (contains admin, role "Super Admin")
       - Login authentication flow (`/api/auth/login`)
       - User registration flow (`/api/auth/register`)
       - Token / session verification (`/api/auth/me`)
       - Invalid credentials rejection (401), duplicate registration rejection (409)
       - Logout flow & session clearance
       - Unauthenticated access redirection to Login
     * R2: Routing & Button Repairs
       - Presence of `react-router-dom` in `client/package.json`
       - Primary view routes: `/dashboard`, `/entry`, `/statements`, `/agents`, `/reports/*`, `/login`
       - Save voucher button: verification of `user` prop destructuring and API payload submission (`/api/entries/batch`)
       - Logout button: verification of `onLogout` prop binding and session clearing
     * R3: UI/UX Restoration
       - Absence of restrictive `max-w-7xl mx-auto` on the main container (full-width layout)
       - Table wrappers using `overflow-x-auto` across all data tables and modals (including VoucherModal)
       - Multi-theme support
   - Test Tiers:
     * Tier 1: Feature Coverage (>= 5 test cases per feature across R1, R2, R3)
     * Tier 2: Boundary & Corner Cases (>= 5 test cases per feature: empty inputs, missing fields, duplicate users, edge cases)
     * Tier 3: Cross-Feature Combinations (pairwise interactions: e.g., register then login, login then access entry route, direct navigation with auth token, etc.)
     * Tier 4: Real-World Application Scenarios (end-to-end user workflows: complete Umrah voucher billing cycle, agent creation to voucher to statement)
3. Ensure the test suite can be run via a single command (e.g. `node tests/e2e/runner.js`).
4. Publish `e:\TravelLedger\TEST_READY.md` summarizing the test runner command, tier breakdown, and coverage checklist.
5. Write your handoff report to `e:\TravelLedger\.agents\teamwork\test_writer_m4_e2e_1\handoff.md`.
6. Send a message to parent when complete.
