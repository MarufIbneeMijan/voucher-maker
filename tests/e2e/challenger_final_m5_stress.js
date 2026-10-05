/**
 * tests/e2e/challenger_final_m5_stress.js
 * Adversarial Coverage Hardening & Verification Suite for Milestone 5 (Tier 5)
 *
 * Authored by: challenger_final_m5_1 (Empirical Challenger)
 * Roles: critic, specialist
 *
 * Targets:
 *   R1: users.json seeding, session expiration, token tampering, case-insensitive usernames,
 *       password hygiene, concurrent race conditions.
 *   R2: URL routing for primary views & sub-reports, protected route redirects,
 *       Save Voucher button submission, Logout session destruction.
 *   R3: Absence of max-w-7xl in main container, overflow-x-auto on all tables,
 *       multi-theme switching & dark mode sync.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startTestServer, stopServer, apiRequest } = require('./helpers/serverControl');
const authService = require('../../server/services/authService');
const { readData, writeData } = require('../../server/services/jsonDb');

const ROOT_DIR = path.resolve(__dirname, '../../');
const USERS_FILE = path.join(ROOT_DIR, 'server/data/users.json');

function readFile(relPath) {
  const full = path.join(ROOT_DIR, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

describe('Milestone 5 Tier 5: Final Adversarial Coverage Hardening Suite', () => {
  const DATA_FILES = ['users.json', 'agents.json', 'billing_entries.json', 'ledger_entries.json'];
  const backups = {};

  before(async () => {
    // Backup existing JSON data files for clean state isolation
    DATA_FILES.forEach((f) => {
      const p = path.join(ROOT_DIR, 'server/data', f);
      if (fs.existsSync(p)) {
        backups[f] = fs.readFileSync(p, 'utf8');
      }
    });
    await startTestServer();
  });

  after(async () => {
    // Restore all JSON data files to restore clean state
    Object.keys(backups).forEach((f) => {
      const p = path.join(ROOT_DIR, 'server/data', f);
      fs.writeFileSync(p, backups[f], 'utf8');
    });
    await stopServer();
  });

  // =========================================================================
  // Section 1: R1 - Users JSON Auto-Seeding, Recovery & Self-Healing
  // =========================================================================
  describe('1. R1: users.json Auto-Seeding & Resilience Under Disruption', () => {
    it('ADV-M5-R1-01: Auto-seeds default admin when users.json is unlinked/missing', async () => {
      if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE);
      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded), 'Seeded result must be an array');
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Admin user must exist in seeded result');
      assert.equal(admin.role, 'Super Admin');
      assert.equal(admin.password, 'admin');

      // Verify file on disk
      assert.ok(fs.existsSync(USERS_FILE), 'users.json must be recreated on disk');
      const diskUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      assert.ok(diskUsers.some((u) => u.username === 'admin'), 'users.json on disk must contain admin');
    });

    it('ADV-M5-R1-02: Auto-seeds default admin when users.json is empty string (0-byte file)', async () => {
      fs.writeFileSync(USERS_FILE, '', 'utf8');
      const seeded = await authService.ensureDefaultAdmin();
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Admin user must be seeded when file is 0 bytes');
      assert.equal(admin.role, 'Super Admin');
    });

    it('ADV-M5-R1-03: Auto-seeds default admin when users.json is corrupted invalid JSON syntax', async () => {
      fs.writeFileSync(USERS_FILE, '{"corrupted_data": [unclosed', 'utf8');
      const seeded = await authService.ensureDefaultAdmin();
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Admin user must be recovered even with corrupt JSON on disk');
      assert.equal(admin.role, 'Super Admin');
    });

    it('ADV-M5-R1-04: Preserves existing non-admin users when re-seeding missing admin', async () => {
      const existingUser = {
        _id: 'USER-CUSTOM-99',
        id: 'USER-CUSTOM-99',
        username: 'staff_alice',
        password: 'hashed_pwd_dummy',
        role: 'Staff',
        name: 'Alice Staff'
      };
      // Write array without admin
      fs.writeFileSync(USERS_FILE, JSON.stringify([existingUser], null, 2), 'utf8');

      const result = await authService.ensureDefaultAdmin();
      assert.ok(result.some((u) => u.username === 'staff_alice'), 'Must preserve existing custom user');
      assert.ok(result.some((u) => u.username === 'admin'), 'Must inject default admin');
    });

    it('ADV-M5-R1-05: Case-insensitive detection prevents duplicate admin seeding if ADMIN already exists', async () => {
      const upperAdmin = {
        _id: 'USER-ADMIN-UPPER',
        id: 'USER-ADMIN-UPPER',
        username: 'ADMIN',
        password: 'admin',
        role: 'Super Admin',
        name: 'Upper Admin'
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify([upperAdmin], null, 2), 'utf8');

      const result = await authService.ensureDefaultAdmin();
      const adminMatches = result.filter((u) => (u.username || '').toLowerCase() === 'admin');
      assert.equal(adminMatches.length, 1, 'Must not duplicate admin when uppercase ADMIN exists');
    });
  });

  // =========================================================================
  // Section 2: R1 - Session Expiration, Token Tampering & Schemes
  // =========================================================================
  describe('2. R1: Session Expiration & Cryptographic Token Tampering Defense', () => {
    it('ADV-M5-R1-06: Expired JWT token is strictly rejected by verifyToken()', () => {
      // Create a token expired 60 seconds ago
      const expiredToken = authService.signToken({ id: 'USER-1', username: 'admin', role: 'Super Admin' }, -60);
      const decoded = authService.verifyToken(expiredToken);
      assert.equal(decoded, null, 'verifyToken must return null for expired token');
    });

    it('ADV-M5-R1-07: Expired JWT token returns 401 on GET /api/auth/me', async () => {
      const expiredToken = authService.signToken({ id: 'USER-1', username: 'admin', role: 'Super Admin' }, -10);
      const res = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${expiredToken}`
      });
      assert.equal(res.status, 401, 'Must return 401 Unauthorized for expired token');
      assert.equal(res.data.success, false);
      assert.match(res.data.message, /expired|invalid/i);
    });

    it('ADV-M5-R1-08: Cryptographic signature tampering is strictly rejected with 401', async () => {
      const validToken = authService.signToken({ id: 'USER-1', username: 'admin', role: 'Super Admin' }, 3600);
      const parts = validToken.split('.');
      // Tamper signature by swapping last character
      const tamperedSig = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A');
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      const res = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${tamperedToken}`
      });
      assert.equal(res.status, 401, 'Must return 401 for tampered signature');
      assert.equal(res.data.success, false);
    });

    it('ADV-M5-R1-09: Payload modification without signature regeneration is rejected with 401', async () => {
      const validToken = authService.signToken({ id: 'USER-1', username: 'admin', role: 'Staff' }, 3600);
      const parts = validToken.split('.');
      // Tamper payload to elevate role to 'Super Admin'
      const payloadObj = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      payloadObj.role = 'Super Admin';
      const fakeEncPayload = Buffer.from(JSON.stringify(payloadObj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const forgedToken = `${parts[0]}.${fakeEncPayload}.${parts[2]}`;

      const res = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${forgedToken}`
      });
      assert.equal(res.status, 401, 'Must return 401 for forged payload elevation');
      assert.equal(res.data.success, false);
    });

    it('ADV-M5-R1-10: Token with alg "none" bypass attempt is rejected', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 'USER-1', username: 'admin', role: 'Super Admin', exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${noneToken}`
      });
      assert.equal(res.status, 401, 'Must reject alg "none" token');
    });

    it('ADV-M5-R1-11: Malformed segment counts (1 or 2 parts, or 4 parts) are rejected with 401', async () => {
      const tokens = ['single-token-string', 'part1.part2', 'part1.part2.part3.part4'];
      for (const t of tokens) {
        const res = await apiRequest('GET', '/api/auth/me', null, {
          Authorization: `Bearer ${t}`
        });
        assert.equal(res.status, 401, `Must reject malformed token: ${t}`);
      }
    });

    it('ADV-M5-R1-12: Non-Bearer schemes (Basic, Token, Digest) are rejected with 401', async () => {
      const validToken = authService.signToken({ id: 'USER-1', username: 'admin' }, 3600);
      const schemes = ['Basic', 'Token', 'Digest', 'Custom'];
      for (const s of schemes) {
        const res = await apiRequest('GET', '/api/auth/me', null, {
          Authorization: `${s} ${validToken}`
        });
        assert.equal(res.status, 401, `Must reject non-Bearer scheme: ${s}`);
      }
    });
  });

  // =========================================================================
  // Section 3: R1 - Case-Insensitive Usernames & Duplicate Registration
  // =========================================================================
  describe('3. R1: Case-Insensitive Username Resolution & Collision Prevention', () => {
    it('ADV-M5-R1-13: Rejects duplicate registration differing only by case (e.g. TestUser and testuser)', async () => {
      const baseName = `case_test_${Date.now()}`;
      // Register with mixed case
      const res1 = await apiRequest('POST', '/api/auth/register', {
        username: baseName.toUpperCase(),
        password: 'password123',
        role: 'Staff',
        name: 'Case Test Staff'
      });
      assert.equal(res1.status, 201, 'Initial registration must succeed');

      // Attempt duplicate with lowercase
      const res2 = await apiRequest('POST', '/api/auth/register', {
        username: baseName.toLowerCase(),
        password: 'password123',
        role: 'Staff',
        name: 'Case Test Staff Duplicate'
      });
      assert.equal(res2.status, 409, 'Must reject duplicate username in lowercase with 409 Conflict');
      assert.equal(res2.data.success, false);
      assert.match(res2.data.message, /already exists/i);
    });

    it('ADV-M5-R1-14: Allows login using different casing than registration', async () => {
      const baseName = `login_case_${Date.now()}`;
      // Register lowercase
      const regRes = await apiRequest('POST', '/api/auth/register', {
        username: baseName.toLowerCase(),
        password: 'securePassword99!',
        role: 'Accountant'
      });
      assert.equal(regRes.status, 201);

      // Login uppercase
      const loginRes = await apiRequest('POST', '/api/auth/login', {
        username: baseName.toUpperCase(),
        password: 'securePassword99!'
      });
      assert.equal(loginRes.status, 200, 'Must allow login with uppercase variation of username');
      assert.equal(loginRes.data.success, true);
      assert.ok(loginRes.data.token, 'Must return JWT token');
      assert.equal(loginRes.data.user.role, 'Accountant');
    });

    it('ADV-M5-R1-15: Case-insensitive duplicate registration of admin (e.g. AdMiN) returns 409 Conflict', async () => {
      const res = await apiRequest('POST', '/api/auth/register', {
        username: 'AdMiN',
        password: 'newadminpassword',
        role: 'Super Admin'
      });
      assert.equal(res.status, 409, 'Must reject duplicate registration of admin in mixed-case');
      assert.equal(res.data.success, false);
    });
  });

  // =========================================================================
  // Section 4: R1 - Password Hygiene, Hashing & Information Leaks
  // =========================================================================
  describe('4. R1: Password Hygiene, Cryptographic Hashing & Sanitization Defense', () => {
    it('ADV-M5-R1-16: Newly registered passwords are saved as salted PBKDF2 hashes, never plaintext', async () => {
      const uniqueName = `pwd_hygiene_${Date.now()}`;
      const plainPassword = 'SuperSecretPlainPassword123!';

      const regRes = await apiRequest('POST', '/api/auth/register', {
        username: uniqueName,
        password: plainPassword,
        role: 'Staff'
      });
      assert.equal(regRes.status, 201);

      // Read directly from disk
      const usersOnDisk = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const savedUser = usersOnDisk.find((u) => u.username === uniqueName);
      assert.ok(savedUser, 'User must exist on disk');
      assert.notEqual(savedUser.password, plainPassword, 'Password must NOT be stored in plaintext');
      assert.ok(savedUser.password.includes(':'), 'Stored password must be salt:hash format');
      const [salt, hash] = savedUser.password.split(':');
      assert.equal(salt.length, 32, 'Salt must be 16 bytes hex (32 chars)');
      assert.equal(hash.length, 128, 'Hash must be sha512 hex (128 chars)');
    });

    it('ADV-M5-R1-17: Passwords are NEVER returned in any auth endpoint response', async () => {
      // 1. Login
      const loginRes = await apiRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin'
      });
      assert.equal(loginRes.status, 200);
      assert.strictEqual(loginRes.data.user.password, undefined, 'Login response must not include password');

      // 2. Register
      const regRes = await apiRequest('POST', '/api/auth/register', {
        username: `leak_test_${Date.now()}`,
        password: 'testPassword123',
        role: 'Staff'
      });
      assert.equal(regRes.status, 201);
      assert.strictEqual(regRes.data.user.password, undefined, 'Register response must not include password');

      // 3. GET /api/auth/me
      const meRes = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${loginRes.data.token}`
      });
      assert.equal(meRes.status, 200);
      assert.strictEqual(meRes.data.user.password, undefined, 'GET /api/auth/me must not include password');

      // 4. GET /api/auth/users
      const usersRes = await apiRequest('GET', '/api/auth/users', null, {
        Authorization: `Bearer ${loginRes.data.token}`
      });
      assert.equal(usersRes.status, 200);
      assert.ok(Array.isArray(usersRes.data.data));
      for (const u of usersRes.data.data) {
        assert.strictEqual(u.password, undefined, `User ${u.username} must not leak password`);
      }
    });

    it('ADV-M5-R1-18: Registration rejects empty string or whitespace-only password with 400', async () => {
      const emptyPwd = await apiRequest('POST', '/api/auth/register', {
        username: `empty_pwd_${Date.now()}`,
        password: ''
      });
      assert.equal(emptyPwd.status, 400);

      const whitespacePwd = await apiRequest('POST', '/api/auth/register', {
        username: `ws_pwd_${Date.now()}`,
        password: '     '
      });
      assert.equal(whitespacePwd.status, 400);
    });
  });

  // =========================================================================
  // Section 5: R1 - Concurrency & Race Condition Stress Testing
  // =========================================================================
  describe('5. R1: Concurrency & Race Condition Stress Testing', () => {
    it('ADV-M5-R1-19: Simultaneous duplicate registrations are serialized by atomic mutex (1 win, rest 409)', async () => {
      const raceUsername = `race_user_${Date.now()}`;
      const payload = {
        username: raceUsername,
        password: 'concurrentPassword123',
        role: 'Staff'
      };

      // Fire 6 simultaneous requests in parallel
      const promises = Array.from({ length: 6 }, () =>
        apiRequest('POST', '/api/auth/register', payload)
      );

      const responses = await Promise.all(promises);
      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      assert.equal(successes.length, 1, 'Exactly one registration request must succeed (201)');
      assert.equal(conflicts.length, 5, 'Remaining 5 concurrent requests must receive 409 Conflict');

      // Verify database integrity on disk
      const usersOnDisk = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const occurrences = usersOnDisk.filter((u) => u.username === raceUsername);
      assert.equal(occurrences.length, 1, 'Database must contain exactly 1 instance of race username');
    });
  });

  // =========================================================================
  // Section 6: R2 - URL Routing & Protected Route Redirects
  // =========================================================================
  describe('6. R2: React Router Declarations & Protected Route Guarding', () => {
    it('ADV-M5-R2-01: client/src/main.jsx wraps application in BrowserRouter', () => {
      const content = readFile('client/src/main.jsx');
      assert.ok(content, 'main.jsx must exist');
      assert.match(content, /import\s+.*BrowserRouter.*from\s+['"]react-router-dom['"]/);
      assert.match(content, /<BrowserRouter>\s*<App\s*\/>\s*<\/BrowserRouter>/);
    });

    it('ADV-M5-R2-02: App.jsx declares all required primary and report routes', () => {
      const content = readFile('client/src/App.jsx');
      assert.ok(content, 'App.jsx must exist');
      const requiredRoutes = [
        'path="/dashboard"',
        'path="/agents"',
        'path="/entry"',
        'path="/statements"',
        'path="/tagada"',
        'path="/reports/receivables"',
        'path="/reports/advance-deposits"',
        'path="/reports/ksa-exposure"',
        'path="/reports/daily-flow"',
        'path="/login"'
      ];

      for (const route of requiredRoutes) {
        assert.ok(content.includes(route), `App.jsx must declare route: ${route}`);
      }

      // Root redirect and catch-all
      assert.match(content, /<Route\s+path="\/"\s+element={<Navigate to="\/dashboard" replace \/>}\s*\/>/);
      assert.match(content, /<Route\s+path="\*"\s+element={<Navigate to="\/dashboard" replace \/>}\s*\/>/);
    });

    it('ADV-M5-R2-03: ProtectedRoute redirects unauthenticated users to /login', () => {
      const content = readFile('client/src/components/ProtectedRoute.jsx');
      assert.ok(content, 'ProtectedRoute.jsx must exist');
      assert.match(content, /const storedAuth = localStorage\.getItem\(['"]traveledger_auth['"]\)/);
      assert.match(content, /const isAuthenticated = Boolean\(user \|\| storedAuth\)/);
      assert.match(content, /<Navigate to="\/login" replace \/>/);
    });

    it('ADV-M5-R2-04: App.jsx guards stored auth against corrupted JSON in localStorage', () => {
      const content = readFile('client/src/App.jsx');
      assert.match(content, /try\s*{\s*const stored = localStorage\.getItem\('traveledger_auth'\);\s*return stored \? JSON\.parse\(stored\) : null;\s*}\s*catch\s*\(_\)\s*{\s*return null;\s*}/);
    });
  });

  // =========================================================================
  // Section 7: R2 - Save Voucher Button & Audit Attribution
  // =========================================================================
  describe('7. R2: Save Voucher Button Submission & Audit Attribution', () => {
    it('ADV-M5-R2-05: DataEntryForm destructures user prop and falls back safely', () => {
      const content = readFile('client/src/components/DataEntryForm.jsx');
      assert.ok(content, 'DataEntryForm.jsx must exist');
      assert.match(content, /export default function DataEntryForm\(\{[^}]*\buser\b[^}]*\}\)/, 'Must destructure user prop');
      assert.match(content, /createdBy:\s*user\?\.username\s*\|\|\s*['"]admin['"]/, 'Must evaluate user?.username with admin fallback');
    });

    it('ADV-M5-R2-06: Save Voucher button triggers handleSubmit and is disabled during submitting', () => {
      const content = readFile('client/src/components/DataEntryForm.jsx');
      assert.match(content, /onClick=\{handleSubmit\}/, 'Save button must trigger handleSubmit');
      assert.match(content, /disabled=\{submitting\}/, 'Save button must be disabled while submitting');
    });

    it('ADV-M5-R2-07: End-to-end voucher submission creates billing doc, ledger entries, and audit trail', async () => {
      // Login to get token
      const loginRes = await apiRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin'
      });
      const token = loginRes.data.token;

      // Submit voucher payload
      const voucherPayload = {
        createdBy: 'admin',
        bdAgentId: 'AGENT-BD-101',
        saudiAgentId: 'AGENT-KSA-213',
        date: new Date().toISOString().split('T')[0],
        passengerRef: 'Haji Challenger Stress Test',
        dueAdjustment: 0,
        nowPaying: 50000,
        breakdown: {
          umrahVisa: { pax: 2, costSAR: 1200, rate: 32.5, totalBDT: 39000, details: {} },
          hotel: { makkah: { costSAR: 2000, nights: 4 }, madinah: { costSAR: 1500, nights: 3 }, totalSAR: 3500, rate: 32.5, totalBDT: 113750 },
          transport: { costSAR: 800, rate: 32.5, totalBDT: 26000, details: {} },
          brnCharge: { makkah: { costSAR: 200 }, madinah: { costSAR: 150 }, totalSAR: 350, rate: 32.5, totalBDT: 11375 },
          crnCharge: { makkah: { costSAR: 100 }, madinah: { costSAR: 100 }, totalSAR: 200, rate: 32.5, totalBDT: 6500 },
          naqabaFine: { costSAR: 0, rate: 32.5, totalBDT: 0 },
          escapedFine: { costSAR: 0, rate: 32.5, totalBDT: 0 },
          previousDues: 0
        },
        paymentReceived: { mode: 'Recv IN HAND (BDT)', amountSAR: 0, amountBDT: 50000, trxId: 'TRX-CHALLENGER-999' },
        totals: {
          grossAmountSAR: 6050,
          grossAmountBDT: 196625,
          servicesTotalBDT: 196625,
          paidAmountBDT: 50000,
          netDueAdded: 146625,
          dueAdjustment: 0,
          totalBillable: 196625
        },
        note: 'Empirical Challenger M5 stress test voucher'
      };

      const res = await apiRequest('POST', '/api/entries/batch', voucherPayload, {
        Authorization: `Bearer ${token}`
      });

      assert.equal(res.status, 201, 'Voucher submission must return 201 Created');
      assert.equal(res.data.success, true);
      assert.ok(res.data.data.billingDoc.voucherNo, 'Must return generated voucherNo');
      assert.ok(res.data.data.bdLedger, 'Must return created BD ledger row');
      assert.ok(res.data.data.bdAgent, 'Must return updated BD agent');
    });
  });

  // =========================================================================
  // Section 8: R2 - Logout Session Destruction
  // =========================================================================
  describe('8. R2: Logout Session Destruction Contract', () => {
    it('ADV-M5-R2-08: Navbar receives onLogout callback and binds it to logout button', () => {
      const content = readFile('client/src/components/Navbar.jsx');
      assert.ok(content, 'Navbar.jsx must exist');
      assert.match(content, /export default function Navbar\(\{[^}]*\bonLogout\b[^}]*\}\)/, 'Must receive onLogout prop');
      assert.match(content, /onClick=\{onLogout\}/, 'Must bind onClick to onLogout');
    });

    it('ADV-M5-R2-09: handleLogout in App.jsx destroys localStorage, resets state, and redirects', () => {
      const content = readFile('client/src/App.jsx');
      assert.match(content, /const handleLogout = \(\) =>\s*\{[\s\S]*localStorage\.removeItem\(['"]traveledger_auth['"]\);[\s\S]*setUser\(null\);[\s\S]*navigate\(['"]\/login['"]\);[\s\S]*\};/);
    });

    it('ADV-M5-R2-10: POST /api/auth/logout returns 200 OK with confirmation message', async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.message, 'Logged out');
    });
  });

  // =========================================================================
  // Section 9: R3 - Full-Width Responsiveness & Absence of max-w-7xl
  // =========================================================================
  describe('9. R3: Full-Width Layout & Elimination of Restrictive Container Constraints', () => {
    it('ADV-M5-R3-01: App.jsx main layout container has NO max-w-7xl constraint', () => {
      const content = readFile('client/src/App.jsx');
      assert.ok(!content.includes('max-w-7xl'), 'App.jsx must not contain max-w-7xl constraint');
    });

    it('ADV-M5-R3-02: App.jsx main container uses full width w-full and responsive padding', () => {
      const content = readFile('client/src/App.jsx');
      assert.match(content, /<main className="[^"]*flex-1[^"]*w-full[^"]*px-4 sm:px-6 lg:px-8[^"]*"/);
    });

    it('ADV-M5-R3-03: Navbar container uses full width w-full without max-w-7xl restriction', () => {
      const content = readFile('client/src/components/Navbar.jsx');
      assert.ok(!content.includes('max-w-7xl'), 'Navbar.jsx must not contain max-w-7xl constraint');
      assert.match(content, /<div className="w-full px-4 sm:px-6 lg:px-8">/);
    });
  });

  // =========================================================================
  // Section 10: R3 - Responsive Table Wrappers (overflow-x-auto)
  // =========================================================================
  describe('10. R3: Responsive Table Wrappers (overflow-x-auto) Across All Views', () => {
    it('ADV-M5-R3-04: VoucherModal tables are wrapped in overflow-x-auto', () => {
      const content = readFile('client/src/components/VoucherModal.jsx');
      assert.ok(content, 'VoucherModal.jsx must exist');
      // Breakdown table
      assert.match(content, /<div className="[^"]*overflow-x-auto[^"]*">\s*<table className="w-full/);
      // Settlement table
      assert.match(content, /<div className="overflow-x-auto">\s*<table className="w-full text-left border-collapse">/);
    });

    it('ADV-M5-R3-05: Dashboard recent vouchers table is wrapped in overflow-x-auto', () => {
      const content = readFile('client/src/components/Dashboard.jsx');
      assert.ok(content, 'Dashboard.jsx must exist');
      assert.match(content, /<div className="overflow-x-auto">\s*<table/);
    });

    it('ADV-M5-R3-06: LedgerStatements chronological ledger table is wrapped in overflow-x-auto', () => {
      const content = readFile('client/src/components/LedgerStatements.jsx');
      assert.ok(content, 'LedgerStatements.jsx must exist');
      assert.match(content, /<div className="overflow-x-auto">\s*<table/);
    });

    it('ADV-M5-R3-07: All 4 Financial Report tables are wrapped in overflow-x-auto', () => {
      const reports = [
        'client/src/components/reports/ReceivablesReport.jsx',
        'client/src/components/reports/AdvanceDepositsReport.jsx',
        'client/src/components/reports/KsaExposureReport.jsx',
        'client/src/components/reports/DailyFlowReport.jsx'
      ];

      for (const rep of reports) {
        const content = readFile(rep);
        assert.ok(content, `${rep} must exist`);
        assert.ok(
          content.includes('overflow-x-auto'),
          `${rep} must wrap its table in overflow-x-auto`
        );
      }
    });

    it('ADV-M5-R3-08: Zero tables have unscrollable overflow-hidden wrappers', () => {
      const allFiles = [
        'client/src/components/Dashboard.jsx',
        'client/src/components/LedgerStatements.jsx',
        'client/src/components/VoucherModal.jsx',
        'client/src/components/reports/ReceivablesReport.jsx',
        'client/src/components/reports/AdvanceDepositsReport.jsx',
        'client/src/components/reports/KsaExposureReport.jsx',
        'client/src/components/reports/DailyFlowReport.jsx'
      ];

      for (const f of allFiles) {
        const content = readFile(f);
        // Table container must NOT be <div className="... overflow-hidden ..."><table
        const badWrapper = /<div\s+className="[^"]*\boverflow-hidden\b(?!.*overflow-x-auto)[^"]*">\s*<table/i;
        assert.ok(!badWrapper.test(content), `${f} must not wrap table in overflow-hidden without overflow-x-auto`);
      }
    });
  });

  // =========================================================================
  // Section 11: R3 - Multi-Theme Switcher & Dark Mode Synchronization
  // =========================================================================
  describe('11. R3: Multi-Theme Switcher & DOM Theme Synchronization', () => {
    it('ADV-M5-R3-09: Supports all three specified themes (arafa-teal, midnight-onyx, executive-navy)', () => {
      const content = readFile('client/src/components/Navbar.jsx');
      assert.ok(content.includes('arafa-teal'), 'Navbar must include arafa-teal theme');
      assert.ok(content.includes('midnight-onyx'), 'Navbar must include midnight-onyx theme');
      assert.ok(content.includes('executive-navy'), 'Navbar must include executive-navy theme');
    });

    it('ADV-M5-R3-10: App.jsx synchronizes dark class with midnight-onyx theme', () => {
      const content = readFile('client/src/App.jsx');
      assert.match(content, /if\s*\(currentTheme\s*===\s*['"]midnight-onyx['"]\)\s*\{\s*document\.documentElement\.classList\.add\(['"]dark['"]\);\s*\}\s*else\s*\{\s*document\.documentElement\.classList\.remove\(['"]dark['"]\);\s*\}/);
    });
  });
});
