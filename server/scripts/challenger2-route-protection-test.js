const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const app = require('../index');
const authService = require('../services/authService');
const { readData, writeData } = require('../services/jsonDb');

const USERS_FILE = path.join(__dirname, '../data/users.json');

let server;
let baseUrl;
let validToken;

// Helper to craft tokens with custom payload/signatures
function createCustomToken(payload, secret = authService.JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${encHeader}.${encPayload}`;

  const sig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  return `${data}.${sig}`;
}

test.before(async () => {
  await authService.ensureDefaultAdmin();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Obtain valid token from /api/auth/login
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const data = await res.json();
  validToken = data.token;
  assert.ok(validToken, 'Valid token must be acquired for tests');
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Restore users.json to clean admin state
  await writeData('users', [{
    _id: 'USER-1',
    id: 'USER-1',
    username: 'admin',
    password: 'admin',
    role: 'Super Admin',
    name: 'Super Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]);
});

test.describe('Milestone 1 Challenger 2: Route Protection & Auto-Seeding Resilience', () => {

  test.describe('Suite 1: Auto-Seeding Resilience Under Corrupted / Wiped Filesystem States', () => {
    let backupUsers;

    test.before(async () => {
      try {
        backupUsers = await fs.readFile(USERS_FILE, 'utf8');
      } catch (_) {
        backupUsers = JSON.stringify([{
          _id: 'USER-1', id: 'USER-1', username: 'admin', password: 'admin',
          role: 'Super Admin', name: 'Super Admin',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }]);
      }
    });

    test.afterEach(async () => {
      if (backupUsers) {
        await fs.writeFile(USERS_FILE, backupUsers, 'utf8');
      }
    });

    test('1.1 Auto-seeding when users.json is completely missing (unlinked)', async () => {
      try {
        await fs.unlink(USERS_FILE);
      } catch (_) {}

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded), 'Must return array of users');
      assert.ok(seeded.length >= 1, 'Must contain at least 1 user');
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Default admin must be seeded');
      assert.strictEqual(admin.password, 'admin');

      // Verify login immediately works
      const auth = await authService.authenticateUser('admin', 'admin');
      assert.ok(auth && auth.token, 'Admin must be able to authenticate after file missing');
    });

    test('1.2 Auto-seeding when users.json is an empty 0-byte file', async () => {
      await fs.writeFile(USERS_FILE, '', 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded));
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Default admin must be seeded for 0-byte file');

      const auth = await authService.authenticateUser('admin', 'admin');
      assert.ok(auth && auth.token, 'Admin must be able to authenticate after 0-byte file');
    });

    test('1.3 Auto-seeding when users.json contains invalid/corrupted JSON syntax', async () => {
      await fs.writeFile(USERS_FILE, '{"corrupted": true, incomplete_json_array: [', 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded), 'Must recover gracefully and return array');
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Default admin must be re-seeded');

      const auth = await authService.authenticateUser('admin', 'admin');
      assert.ok(auth && auth.token, 'Admin must be able to authenticate after corrupt JSON');
    });

    test('1.4 Auto-seeding when users.json contains non-array JSON (e.g. object, number, string)', async () => {
      await fs.writeFile(USERS_FILE, JSON.stringify({ notAnArray: true, someKey: "value" }), 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded));
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin, 'Default admin must be re-seeded over non-array JSON');

      const auth = await authService.authenticateUser('admin', 'admin');
      assert.ok(auth && auth.token);
    });

    test('1.5 Auto-seeding when users.json contains empty array []', async () => {
      await fs.writeFile(USERS_FILE, '[]', 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded));
      assert.ok(seeded.length >= 1);
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin);
    });

    test('1.6 Auto-seeding preserves existing users when adding missing admin', async () => {
      const existing = [{
        id: 'USER-STAFF-1',
        _id: 'USER-STAFF-1',
        username: 'existing_staff',
        password: 'staffPassword',
        role: 'Staff',
        name: 'Staff Member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
      await fs.writeFile(USERS_FILE, JSON.stringify(existing, null, 2), 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded));
      assert.strictEqual(seeded.length, 2, 'Must contain existing user + seeded admin');
      const staff = seeded.find((u) => u.username === 'existing_staff');
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(staff, 'Existing staff user must be preserved');
      assert.ok(admin, 'Default admin must be added');

      const staffAuth = await authService.authenticateUser('existing_staff', 'staffPassword');
      const adminAuth = await authService.authenticateUser('admin', 'admin');
      assert.ok(staffAuth, 'Staff must be able to log in');
      assert.ok(adminAuth, 'Admin must be able to log in');
    });
  });

  test.describe('Suite 2: Public Route Accessibility Without Tokens', () => {
    test('2.1 /api/health returns 200 without token', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'OK');
      assert.ok(data.system);
    });

    test('2.2 /api/health returns 200 with malformed token', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Authorization: 'Bearer notatoken' }
      });
      assert.strictEqual(res.status, 200);
    });

    test('2.3 /api/health returns 200 with fake token', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Authorization: 'Bearer fake.jwt.signature' }
      });
      assert.strictEqual(res.status, 200);
    });

    test('2.4 /api/auth/login is accessible without token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('2.5 /api/auth/register is accessible without token', async () => {
      const regUser = `pub_test_${Date.now()}`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUser, password: 'password123', role: 'Staff' })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('2.6 /api/auth/logout is accessible without token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
    });
  });

  test.describe('Suite 3: Protected Routes with Valid Token Obtained from /api/auth/login', () => {
    test('3.1 GET /api/agents with valid token returns 200 and agents data', async () => {
      const res = await fetch(`${baseUrl}/api/agents`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    test('3.2 GET /api/ledgers with valid token returns 200 and ledger entries', async () => {
      const res = await fetch(`${baseUrl}/api/ledgers`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    test('3.3 GET /api/reports/receivables with valid token returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/reports/receivables`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('3.4 GET /api/reports/advance-deposits with valid token returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/reports/advance-deposits`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('3.5 GET /api/reports/ksa-exposure with valid token returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/reports/ksa-exposure`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('3.6 GET /api/reports/daily-flow with valid token returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/reports/daily-flow`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('3.7 GET /api/entries/batch/:id with valid token passes auth guard (returns 404 for non-existent)', async () => {
      const res = await fetch(`${baseUrl}/api/entries/batch/non_existent_entry_id`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      // 404 means auth was passed and controller executed lookup
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('not found') || data.message.includes('Billing entry'));
    });
  });

  test.describe('Suite 4: Protected Routes with Malformed Tokens', () => {
    const endpoints = [
      { name: '/api/agents', url: '/api/agents' },
      { name: '/api/ledgers', url: '/api/ledgers' },
      { name: '/api/reports/receivables', url: '/api/reports/receivables' },
      { name: '/api/entries/batch/test-id', url: '/api/entries/batch/test-id' }
    ];

    for (const ep of endpoints) {
      test(`4.1 ${ep.name} with malformed token "Bearer notatoken" returns 401`, async () => {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: 'Bearer notatoken' }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must return 401 for malformed token`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      });

      test(`4.2 ${ep.name} with empty token "Bearer " returns 401`, async () => {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: 'Bearer ' }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must return 401 for empty token`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      });

      test(`4.3 ${ep.name} with non-Bearer header "Basic xyz" returns 401`, async () => {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: 'Basic dXNlcjpwYXNz' }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must return 401 for non-Bearer scheme`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      });

      test(`4.4 ${ep.name} with malformed base64 segments returns 401`, async () => {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: 'Bearer !@#$.%^&*.(())' }
        });
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      });
    }
  });

  test.describe('Suite 5: Protected Routes with Expired / Fake / Tampered JWT Signatures', () => {
    const endpoints = [
      { name: '/api/agents', url: '/api/agents' },
      { name: '/api/ledgers', url: '/api/ledgers' },
      { name: '/api/reports/receivables', url: '/api/reports/receivables' },
      { name: '/api/entries/batch/test-id', url: '/api/entries/batch/test-id' }
    ];

    test('5.1 Expired token returns 401 across all protected endpoints', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = createCustomToken({
        id: 'USER-1',
        username: 'admin',
        role: 'Super Admin',
        iat: now - 7200,
        exp: now - 3600 // Expired 1 hour ago
      });

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: `Bearer ${expiredToken}` }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must reject expired token with 401`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      }
    });

    test('5.2 Token with fake/forged signature returns 401 across all protected endpoints', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fakeToken = createCustomToken(
        { id: 'USER-1', username: 'admin', role: 'Super Admin', iat: now, exp: now + 3600 },
        'malicious-attacker-secret-key-1234'
      );

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: `Bearer ${fakeToken}` }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must reject fake signature with 401`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      }
    });

    test('5.3 Tampered token payload with original signature returns 401', async () => {
      const parts = validToken.split('.');
      // Tamper with payload segment
      const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      originalPayload.role = 'AttackerElevatedRole';
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(originalPayload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: `Bearer ${tamperedToken}` }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must reject tampered payload with 401`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      }
    });

    test('5.4 Algorithm none attack token returns 401', async () => {
      const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 'USER-1', username: 'admin', role: 'Super Admin' })).toString('base64url');
      const noneToken = `${noneHeader}.${payload}.`;

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          headers: { Authorization: `Bearer ${noneToken}` }
        });
        assert.strictEqual(res.status, 401, `${ep.name} must reject alg:none token with 401`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      }
    });
  });

  test.describe('Suite 6: Protected Routes with NO TOKEN', () => {
    const endpoints = [
      { name: '/api/agents', url: '/api/agents' },
      { name: '/api/ledgers', url: '/api/ledgers' },
      { name: '/api/reports/receivables', url: '/api/reports/receivables' },
      { name: '/api/entries/batch/test-id', url: '/api/entries/batch/test-id' }
    ];

    test('6.1 When ENFORCE_AUTH=true, all endpoints reject no-token requests with 401', async () => {
      const originalEnforce = process.env.ENFORCE_AUTH;
      process.env.ENFORCE_AUTH = 'true';

      try {
        for (const ep of endpoints) {
          const res = await fetch(`${baseUrl}${ep.url}`);
          assert.strictEqual(res.status, 401, `${ep.name} must return 401 when ENFORCE_AUTH=true and no token`);
          const data = await res.json();
          assert.strictEqual(data.success, false);
          assert.strictEqual(data.message, 'Unauthorized: Authentication token required');
        }
      } finally {
        if (originalEnforce === undefined) {
          delete process.env.ENFORCE_AUTH;
        } else {
          process.env.ENFORCE_AUTH = originalEnforce;
        }
      }
    });

    test('6.2 When ENFORCE_AUTH is unset (default runtime), unauthenticated access is permitted (backward compatibility finding)', async () => {
      const originalEnforce = process.env.ENFORCE_AUTH;
      delete process.env.ENFORCE_AUTH;

      try {
        const resAgents = await fetch(`${baseUrl}/api/agents`);
        assert.strictEqual(resAgents.status, 200, 'Under default unset ENFORCE_AUTH, /api/agents allows access');

        const resLedgers = await fetch(`${baseUrl}/api/ledgers`);
        assert.strictEqual(resLedgers.status, 200, 'Under default unset ENFORCE_AUTH, /api/ledgers allows access');

        const resReports = await fetch(`${baseUrl}/api/reports/receivables`);
        assert.strictEqual(resReports.status, 200, 'Under default unset ENFORCE_AUTH, /api/reports/receivables allows access');
      } finally {
        if (originalEnforce !== undefined) {
          process.env.ENFORCE_AUTH = originalEnforce;
        }
      }
    });
  });

  test.describe('Suite 7: Adversarial Authentication Bypass Vulnerability Assessment', () => {
    test('7.1 Query string substring bypass: ?bypass=/api/auth bypasses authMiddleware even when ENFORCE_AUTH=true', async () => {
      const originalEnforce = process.env.ENFORCE_AUTH;
      process.env.ENFORCE_AUTH = 'true';

      try {
        // Without bypass query param -> 401
        const blockedRes = await fetch(`${baseUrl}/api/agents`);
        assert.strictEqual(blockedRes.status, 401, 'Normal request must be blocked');

        // With bypass query param -> 200 (VULNERABILITY)
        const bypassRes = await fetch(`${baseUrl}/api/agents?bypass=/api/auth`);
        const isBypassed = (bypassRes.status === 200);

        // Record finding: originalUrl.includes('/api/auth') allows substring bypass
        assert.strictEqual(isBypassed, true, 'VULNERABILITY DEMONSTRATED: originalUrl.includes bypass allows unauthenticated access');
      } finally {
        if (originalEnforce === undefined) {
          delete process.env.ENFORCE_AUTH;
        } else {
          process.env.ENFORCE_AUTH = originalEnforce;
        }
      }
    });

    test('7.2 Query string substring bypass: ?bypass=/api/health allows malformed token through', async () => {
      // With malformed token on normal url -> 401
      const blockedRes = await fetch(`${baseUrl}/api/ledgers`, {
        headers: { Authorization: 'Bearer notatoken' }
      });
      assert.strictEqual(blockedRes.status, 401);

      // With ?bypass=/api/health -> 200 (VULNERABILITY)
      const bypassRes = await fetch(`${baseUrl}/api/ledgers?tag=/api/health`, {
        headers: { Authorization: 'Bearer notatoken' }
      });
      const isBypassed = (bypassRes.status === 200);
      assert.strictEqual(isBypassed, true, 'VULNERABILITY DEMONSTRATED: originalUrl.includes(/api/health) bypasses invalid token rejection');
    });
  });

  test.describe('Suite 8: Runtime Deletion and 0-Byte State Under Live Server HTTP Requests', () => {
    let backupUsers;

    test.before(async () => {
      try {
        backupUsers = await fs.readFile(USERS_FILE, 'utf8');
      } catch (_) {}
    });

    test.afterEach(async () => {
      if (backupUsers) {
        await fs.writeFile(USERS_FILE, backupUsers, 'utf8');
      }
    });

    test('8.1 Live POST /api/auth/login fails (returns 401) when users.json is unlinked while server runs', async () => {
      try {
        await fs.unlink(USERS_FILE);
      } catch (_) {}

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      // Empirical check: because readData initializes empty [] instead of healing default admin,
      // admin login fails with 401
      assert.strictEqual(res.status, 401, 'Admin cannot log in after users.json deleted at runtime');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('8.2 Live POST /api/auth/login returns 500 when users.json is 0-byte file while server runs', async () => {
      await fs.writeFile(USERS_FILE, '', 'utf8');

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      // Empirical check: readData throws SyntaxError on empty file, resulting in 500
      assert.strictEqual(res.status, 500, '0-byte file causes readData to throw SyntaxError, resulting in 500');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('JSON') || data.message.includes('end of JSON input'));
    });
  });

});
