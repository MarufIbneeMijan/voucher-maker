## 2026-10-01T22:41:00Z
You are teamwork_preview_worker for Milestone 1: Backend User Authentication & users.json Engine.
Your working directory is: e:\TravelLedger\.agents\teamwork\worker_m1_backend_auth_1
Your parent is: orchestrator (conversation ID: f6e16f1f-50a4-4525-ab41-c30e78b1bc45)

INPUTS (Read these files first):
- MANDATORY User Request: e:\TravelLedger\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope: e:\TravelLedger\PROJECT.md
- Backend Architecture Survey: e:\TravelLedger\.agents\teamwork\explorer_backend_survey_1\handoff.md
- Specification Survey: e:\TravelLedger\.agents\teamwork\spec_miner_survey_1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You exclusively own and may edit or create:
- `server/data/users.json`
- `server/services/authService.js`
- `server/controllers/authController.js`
- `server/routes/authRoutes.js`
- `server/middleware/authMiddleware.js`
- `server/index.js`
- `server/package.json`
- `server/scripts/test-auth.js`
DO NOT modify client files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. `server/data/users.json` must be created upon server start if missing or empty, pre-seeded with default `admin` credentials:
   - username: `admin`
   - password: `admin`
   - role: `Super Admin`
   - name: `Super Admin`
   - id: unique string (e.g. `USER-1` or `USER-1001`)
   - createdAt, updatedAt timestamps
2. Implement backend auth engine (using `server/services/jsonDb.js` or dedicated service with Node native `crypto` or standard hashing/token signing):
   - `POST /api/auth/login`: verifies username and password against `server/data/users.json`. Returns 200 with `{ success: true, token, user: { id, username, role, name } }` (never return password). Returns 401 on invalid credentials.
   - `POST /api/auth/register`: accepts `{ username, password, role, name }`. Enforces required fields (400), checks case-insensitive username uniqueness (409), writes new user record, returns 201 with `{ success: true, user: { id, username, role, name } }`.
   - `POST /api/auth/logout`: returns 200 with `{ success: true, message: "Logged out" }`.
   - `GET /api/auth/me`: parses `Authorization: Bearer <token>`, validates token, returns 200 with `{ success: true, user: { id, username, role, name } }`. Returns 401 if token is missing or invalid.
3. In `server/index.js`:
   - Ensure the seeding check runs on startup after `ensureDataDir()`.
   - Mount auth routes at `app.use('/api/auth', authRoutes);`.
   - Add auth middleware guarding sensitive routes while ensuring `/api/health` and `/api/auth/*` are public. For backward compatibility with existing frontend calls that may not yet send tokens, allow requests with a valid token or fallback gracefully if an optional token is provided, or support Authorization header checking.
4. Implement automated test suite in `server/scripts/test-auth.js` using Node.js built-in `node:test` and `node:assert`:
   - Test auto-seeding when users.json is missing or empty
   - Test login with admin/admin -> 200
   - Test login with bad password -> 401
   - Test registration of new user -> 201
   - Test duplicate registration -> 409
   - Test missing fields in registration -> 400
   - Test GET /api/auth/me with valid and invalid tokens
   - Add `"test": "node --test scripts/test-auth.js"` to `server/package.json`.
5. Execute `npm test` or `node --test scripts/test-auth.js` in `server/` to verify all tests pass.
6. Write your completion report to `e:\TravelLedger\.agents\teamwork\worker_m1_backend_auth_1\handoff.md`. Include test commands, outputs, and verified facts.
7. Send a message to parent when complete.
