# Orchestration Plan — TravelLedger

## Objective
Fulfill all requirements in `ORIGINAL_REQUEST.md`:
1. R1: User Registration & Authentication (`server/data/users.json`, default admin pre-seeded, auth integration frontend & backend).
2. R2: React Router Migration & Button Repairs (`react-router-dom` for primary views, backend API alignment, fix Save and Logout buttons).
3. R3: UI/UX Restoration (restore Tailwind CSS styling, enforce full-width responsiveness, responsive table wrappers).

## Architecture & Dual Track Strategy
1. **Survey Phase (Phase 0)**:
   - Dispatch 3 parallel Explorers:
     - Explorer 1 (Spec Miner): Map exact requirements, acceptance criteria, and API/data contracts.
     - Explorer 2 (Backend & Auth Specialist): Map server structure, `server/data/`, auth middlewares, routes, and DB/JSON files.
     - Explorer 3 (Frontend, Routing & UI Specialist): Map React components, router setup, Tailwind config, activeTab usage, Save/Logout buttons, and responsive styles.
2. **Decomposition & Specification (Phase 1)**:
   - Merge findings into `PROJECT.md` at root, enumerating Feature Inventory, Milestones, and Interface Contracts.
3. **Execution & Dual-Track Verification (Phase 2 & 3)**:
   - E2E Testing Track: Design independent opaque-box tests covering Tiers 1-4.
   - Implementation Track:
     - Milestone 1: Server Authentication & users.json (Backend engine, seeding, token/session endpoints)
     - Milestone 2: Frontend Routing & Button Repairs (react-router-dom, Protected Routes, Save/Logout handlers)
     - Milestone 3: UI/UX Restoration & Responsive Layouts (Tailwind fixes, full-width layouts, table overflow wrappers)
     - Milestone 4: Final Integration & 100% E2E Test Suite Pass + Adversarial Coverage Hardening
4. **Final Gate & Reporting (Phase 4)**:
   - Strict audit verification (no cheats, binary veto).
   - Multi-agent review and challenger confirmation.
   - Final completion report to Sentinel.
