const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');

const app = require('../index');
const authService = require('../services/authService');
const { readData, writeData } = require('../services/jsonDb');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Helper to run server on ephemeral port
let server;
let baseUrl;

test.before(async () => {
  // Ensure default admin seeded
  await authService.ensureDefaultAdmin();

  // Start HTTP server on dynamic port
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Reset users.json to clean state with default admin
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

test.describe('Milestone 1: Backend User Authentication & users.json Engine', () => {

  test.describe('1. Auto-seeding users.json', () => {
    test('auto-seeds default admin when users.json is missing', async () => {
      // Backup users
      let backup = [];
      try {
        backup = await readData('users');
        await fs.unlink(USERS_FILE);
      } catch (_) {}

      // Verify file does not exist
      let exists = true;
      try {
        await fs.access(USERS_FILE);
      } catch (_) {
        exists = false;
      }
      assert.strictEqual(exists, false, 'users.json should be removed for test');

      // Trigger seeding
      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(Array.isArray(seeded), 'Seeded users should be an array');
      assert.ok(seeded.length >= 1, 'Should contain at least 1 user');

      const adminUser = seeded.find((u) => u.username === 'admin');
      assert.ok(adminUser, 'admin user must exist in seeded data');
      assert.strictEqual(adminUser.username, 'admin');
      assert.strictEqual(adminUser.password, 'admin');
      assert.strictEqual(adminUser.role, 'Super Admin');
      assert.strictEqual(adminUser.name, 'Super Admin');
      assert.ok(adminUser.id, 'admin must have an id');
      assert.ok(adminUser.createdAt, 'admin must have createdAt');
      assert.ok(adminUser.updatedAt, 'admin must have updatedAt');

      // Verify file now exists on disk
      const onDisk = await readData('users');
      assert.ok(onDisk.some((u) => u.username === 'admin'));
    });

    test('auto-seeds default admin when users.json is an empty array', async () => {
      await writeData('users', []);
      const emptyCheck = await readData('users');
      assert.strictEqual(emptyCheck.length, 0);

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(seeded.length >= 1);
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin);
      assert.strictEqual(admin.role, 'Super Admin');
    });

    test('auto-seeds default admin when users.json is an empty 0-byte file', async () => {
      await fs.writeFile(USERS_FILE, '', 'utf8');

      const seeded = await authService.ensureDefaultAdmin();
      assert.ok(seeded.length >= 1);
      const admin = seeded.find((u) => u.username === 'admin');
      assert.ok(admin);
      assert.strictEqual(admin.username, 'admin');
      assert.strictEqual(admin.password, 'admin');
    });

    test('runtime file deletion recovery: admin can log in even after users.json is unlinked', async () => {
      try {
        await fs.unlink(USERS_FILE);
      } catch (_) {}

      // Call login endpoint directly while users.json is unlinked
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      assert.strictEqual(res.status, 200, 'Admin must be able to log in even after users.json is unlinked');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.username, 'admin');

      // Verify users.json is auto-healed on disk
      const onDisk = await readData('users');
      assert.ok(onDisk.some((u) => u.username === 'admin'));
    });

    test('0-byte users.json recovery: admin can log in even when users.json is an empty 0-byte file', async () => {
      await fs.writeFile(USERS_FILE, '', 'utf8');

      // Call login endpoint directly while users.json is 0-byte
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      assert.strictEqual(res.status, 200, 'Admin must be able to log in when users.json is 0-byte');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.username, 'admin');

      // Verify file now contains valid JSON array with admin
      const onDisk = await readData('users');
      assert.ok(onDisk.some((u) => u.username === 'admin'));
    });
  });

  test.describe('2. POST /api/auth/login', () => {
    test('successful login with admin/admin returns 200, JWT token, and sanitized user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token, 'Should return a JWT token string');
      assert.strictEqual(typeof data.token, 'string');
      assert.ok(data.token.split('.').length === 3, 'Token must have 3 JWT segments');

      assert.ok(data.user, 'Should return user object');
      assert.strictEqual(data.user.username, 'admin');
      assert.strictEqual(data.user.role, 'Super Admin');
      assert.strictEqual(data.user.name, 'Super Admin');
      assert.ok(data.user.id, 'User must have an id');
      assert.strictEqual(data.user.password, undefined, 'Password MUST NOT be returned in response');
    });

    test('login with wrong password returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'incorrect_password' })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Invalid'));
      assert.strictEqual(data.token, undefined);
    });

    test('login with non-existent user returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'non_existent_user_999', password: 'any' })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('login with missing credentials returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('non-string login inputs return 401 instead of throwing 500 TypeError', async () => {
      const invalidPayloads = [
        { username: 12345, password: 'password' },
        { username: { $gt: '' }, password: 'password' },
        { username: ['admin'], password: 'password' },
        { username: 'admin', password: 12345 },
        { username: 'admin', password: { secret: true } },
        { username: true, password: false },
        { username: null, password: null },
        { username: '   ', password: 'password' }
      ];

      for (const payload of invalidPayloads) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        assert.strictEqual(
          res.status,
          401,
          `Payload ${JSON.stringify(payload)} must return 401 Unauthorized`
        );
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.message, 'Invalid username or password');
      }
    });
  });

  test.describe('3. POST /api/auth/register', () => {
    const testUsername = `tester_${Date.now()}`;

    test('successful registration returns 201 with sanitized user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: 'securePass123',
          role: 'Staff',
          name: 'Jane Staff'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.user);
      assert.strictEqual(data.user.username, testUsername);
      assert.strictEqual(data.user.role, 'Staff');
      assert.strictEqual(data.user.name, 'Jane Staff');
      assert.ok(data.user.id);
      assert.strictEqual(data.user.password, undefined, 'Password MUST NOT be returned in register response');

      // Verify the user can immediately log in
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: 'securePass123'
        })
      });
      assert.strictEqual(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.success, true);
      assert.strictEqual(loginData.user.username, testUsername);
    });

    test('duplicate registration with exact username returns 409', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: 'anotherPassword',
          role: 'Staff'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.toLowerCase().includes('already exists'));
    });

    test('duplicate registration with case-insensitive username returns 409', async () => {
      const upperUsername = testUsername.toUpperCase();
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: upperUsername,
          password: 'anotherPassword',
          role: 'Staff'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.toLowerCase().includes('already exists'));
    });

    test('duplicate registration of admin in uppercase (ADMIN) returns 409', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ADMIN',
          password: 'password',
          role: 'Super Admin'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('registration missing username returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'somePassword',
          role: 'Staff'
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Username'));
    });

    test('registration missing password returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'valid_user_no_pass'
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Password'));
    });

    test('registration with empty whitespace strings returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '   ',
          password: '   '
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('newly registered user passwords are saved as hashes', async () => {
      const hashTestUsername = `hash_user_${Date.now()}`;
      const plainPassword = 'SuperSecretPlainPassword123!';

      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: hashTestUsername,
          password: plainPassword,
          role: 'Staff',
          name: 'Hashed User'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.password, undefined);

      // Inspect persisted users.json directly on disk
      const usersOnDisk = await readData('users');
      const persistedUser = usersOnDisk.find((u) => u.username === hashTestUsername);
      assert.ok(persistedUser, 'Persisted user must be present in users.json');
      assert.notStrictEqual(
        persistedUser.password,
        plainPassword,
        'Password must NOT be stored in plaintext'
      );
      assert.ok(
        persistedUser.password.includes(':'),
        'Password hash must be in salt:hash format'
      );

      // Authenticate with plaintext password to confirm verifyPassword handles hashed passwords
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: hashTestUsername,
          password: plainPassword
        })
      });
      assert.strictEqual(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.success, true);

      // Verify wrong password fails
      const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: hashTestUsername,
          password: 'wrong_password_attempt'
        })
      });
      assert.strictEqual(wrongPassRes.status, 401);
    });
  });

  test.describe('4. GET /api/auth/me', () => {
    let validToken;

    test.before(async () => {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });
      const data = await loginRes.json();
      validToken = data.token;
    });

    test('returns 200 with user profile when valid Bearer token provided', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${validToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.user);
      assert.strictEqual(data.user.username, 'admin');
      assert.strictEqual(data.user.role, 'Super Admin');
      assert.strictEqual(data.user.password, undefined);
    });

    test('returns 401 when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('returns 401 when Authorization header is invalid or tampered', async () => {
      const tampered = validToken.slice(0, -6) + 'xxxxxx';
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${tampered}`
        }
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('returns 401 when Authorization header has wrong scheme (not Bearer)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Basic dXNlcjpwYXNz`
        }
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

  test.describe('5. POST /api/auth/logout', () => {
    test('returns 200 with logged out message', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST'
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Logged out');
    });
  });

  test.describe('6. Public endpoints and Auth Middleware', () => {
    test('/api/health is accessible without authorization token', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'OK');
      assert.ok(data.system);
    });

    test('protected route allows access when valid token is supplied', async () => {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });
      const { token } = await loginRes.json();

      const res = await fetch(`${baseUrl}/api/agents`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test('protected route rejects invalid token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/agents`, {
        headers: {
          Authorization: 'Bearer invalid.fake.token'
        }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('protected route enforces 401 when ENFORCE_AUTH is enabled and no token is sent', async () => {
      const originalEnforce = process.env.ENFORCE_AUTH;
      process.env.ENFORCE_AUTH = 'true';
      try {
        const res = await fetch(`${baseUrl}/api/agents`);
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.success, false);
      } finally {
        if (originalEnforce === undefined) {
          delete process.env.ENFORCE_AUTH;
        } else {
          process.env.ENFORCE_AUTH = originalEnforce;
        }
      }
    });

    test('query parameter bypass attempt (/api/agents?ref=/api/auth) returns 401 without token', async () => {
      const originalEnforce = process.env.ENFORCE_AUTH;
      process.env.ENFORCE_AUTH = 'true';
      try {
        const bypassUrls = [
          '/api/agents?ref=/api/auth',
          '/api/agents?bypass=/api/auth',
          '/api/ledgers?tag=/api/health',
          '/api/reports/receivables?filter=/api/auth'
        ];

        for (const ep of bypassUrls) {
          const res = await fetch(`${baseUrl}${ep}`);
          assert.strictEqual(
            res.status,
            401,
            `Bypass attempt URL ${ep} must return 401 when unauthenticated`
          );
          const data = await res.json();
          assert.strictEqual(data.success, false);
        }
      } finally {
        if (originalEnforce === undefined) {
          delete process.env.ENFORCE_AUTH;
        } else {
          process.env.ENFORCE_AUTH = originalEnforce;
        }
      }
    });

    test('query parameter bypass attempt (/api/ledgers?tag=/api/health) rejects invalid token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/ledgers?tag=/api/health`, {
        headers: {
          Authorization: 'Bearer invalid.bogus.token'
        }
      });
      assert.strictEqual(res.status, 401, 'Invalid token must be rejected with 401 even with bypass query');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

});
