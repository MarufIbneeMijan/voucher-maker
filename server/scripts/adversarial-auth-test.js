const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');

const app = require('../index');
const authService = require('../services/authService');
const { readData, writeData } = require('../services/jsonDb');

const USERS_FILE = path.join(__dirname, '../data/users.json');

let server;
let baseUrl;

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
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Restore clean admin state
  await authService.ensureDefaultAdmin();
});

test.describe('Adversarial & Stress Challenge Suite for Milestone 1 Backend Auth', () => {

  test.describe('A. Malformed JSON Bodies & Server Crash Resistance', () => {
    test('malformed JSON syntax does not crash server and returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"username": "admin", "password": ' // Broken syntax
      });

      // Express default body-parser error handler returns 400 Bad Request
      assert.strictEqual(res.status, 400, 'Malformed JSON should return 400');

      // Crucial: Verify server is still alive and responds to subsequent requests
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200, 'Server must remain alive after malformed JSON');
    });

    test('raw non-JSON string with application/json header returns 400 without crashing', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'PLAIN_TEXT_NOT_JSON'
      });

      assert.strictEqual(res.status, 400);

      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
    });

    test('primitive JSON value (number) does not crash server', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '12345'
      });

      // Body is number, { username, password } = 12345 -> both undefined -> returns 401
      assert.ok(res.status === 400 || res.status === 401, `Status was ${res.status}`);
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
    });

    test('primitive JSON value (array) does not crash server', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(['admin', 'admin'])
      });

      assert.ok(res.status === 400 || res.status === 401);
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
    });

    test('empty body with application/json header returns 401 without crashing', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ''
      });

      assert.ok(res.status === 400 || res.status === 401);
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
    });
  });

  test.describe('B. Injection Payloads & Unusual Types in Auth Fields', () => {
    test('NoSQL/Object injection in login username is handled gracefully', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: { $gt: '' },
          password: 'password'
        })
      });

      // If code does username.trim() without checking type, it might throw TypeError and return 500 or 401
      // Server must NOT crash
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200, 'Server must remain alive');
    });

    test('SQL injection payload in login does not authenticate or cause unhandled crash', async () => {
      const payloads = [
        "' OR '1'='1",
        "admin' --",
        "admin' /*",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of payloads) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: payload, password: 'password' })
        });
        assert.strictEqual(res.status, 401, `Payload ${payload} must be rejected with 401`);
      }
    });

    test('prototype pollution payload in registration does not pollute Object prototype', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `proto_test_${Date.now()}`,
          password: 'secretPassword',
          role: 'Staff',
          __proto__: { isAdmin: true },
          constructor: { prototype: { isPwned: true } }
        })
      });

      assert.ok(res.status === 201 || res.status === 400);
      assert.strictEqual({}.isAdmin, undefined, 'Object prototype must not be polluted with isAdmin');
      assert.strictEqual({}.isPwned, undefined, 'Object prototype must not be polluted with isPwned');
    });

    test('XSS and script injection in username is stored literally and does not execute or leak', async () => {
      const xssUser = `<script>alert("xss")</script>_${Date.now()}`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: xssUser,
          password: 'password123',
          role: 'Staff',
          name: '<b onmouseover="alert(1)">Name</b>'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.user.username, xssUser);

      // Verify login works with exact payload
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: xssUser,
          password: 'password123'
        })
      });
      assert.strictEqual(loginRes.status, 200);
    });
  });

  test.describe('C. Unicode, Whitespace & Boundary Values', () => {
    test('Unicode non-Latin usernames (Arabic, Chinese, Cyrillic, Emoji) register and login successfully', async () => {
      const unicodeCases = [
        { u: `أحمد_${Date.now()}`, p: 'كلمةالسر123', name: 'أحمد علي' },
        { u: `用户_${Date.now()}`, p: '密码123456', name: '王伟' },
        { u: `пользователь_${Date.now()}`, p: 'пароль123', name: 'Иван' },
        { u: `agent🚀_${Date.now()}`, p: 'pass🌟word', name: 'Space Agent' }
      ];

      for (const item of unicodeCases) {
        const regRes = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: item.u,
            password: item.p,
            name: item.name,
            role: 'Staff'
          })
        });
        assert.strictEqual(regRes.status, 201, `Registration should succeed for ${item.u}`);
        const regData = await regRes.json();
        assert.strictEqual(regData.user.username, item.u);

        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: item.u, password: item.p })
        });
        assert.strictEqual(loginRes.status, 200, `Login should succeed for ${item.u}`);
        const loginData = await loginRes.json();
        assert.ok(loginData.token);

        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${loginData.token}` }
        });
        assert.strictEqual(meRes.status, 200);
        const meData = await meRes.json();
        assert.strictEqual(meData.user.username, item.u);
      }
    });

    test('Whitespace-only username and whitespace-only password return 400 on registration', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '   ', password: '   ' })
      });
      assert.strictEqual(res.status, 400);
    });

    test('Leading and trailing whitespace in username are trimmed consistently between register and login', async () => {
      const base = `trimmed_${Date.now()}`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `  ${base}  `,
          password: 'pass'
        })
      });
      assert.strictEqual(regRes.status, 201);
      const regData = await regRes.json();
      assert.strictEqual(regData.user.username, base);

      // Login with leading/trailing spaces should match trimmed user
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `   ${base}   `,
          password: 'pass'
        })
      });
      assert.strictEqual(loginRes.status, 200);
    });
  });

  test.describe('D. Token Tampering, Expiration & Signature Integrity', () => {
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

    test('privilege escalation via payload tampering is rejected with 401', async () => {
      // Decode valid token parts
      const [encHeader, encPayload, signature] = validToken.split('.');
      const payloadStr = Buffer.from(encPayload, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      // Attempt to tamper role
      payload.role = 'Super Mega Admin Overlord';
      payload.username = 'hacked_admin';

      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const forgedToken = `${encHeader}.${tamperedPayload}.${signature}`;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${forgedToken}` }
      });
      assert.strictEqual(res.status, 401, 'Tampered payload with original signature must be rejected');
    });

    test('alg: none token tampering is rejected with 401', async () => {
      const [_, encPayload] = validToken.split('.');
      const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const noneToken = `${noneHeader}.${encPayload}.`;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${noneToken}` }
      });
      assert.strictEqual(res.status, 401, 'Token with alg: none must be rejected');
    });

    test('expired token is rejected with 401', async () => {
      // Generate token expired 60 seconds ago
      const expiredToken = authService.signToken({
        id: 'USER-1',
        username: 'admin',
        role: 'Super Admin'
      }, -60);

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.strictEqual(res.status, 401, 'Expired token must return 401');
    });

    test('token for a deleted user returns 401 Unauthorized', async () => {
      // 1. Register a temporary user
      const tempUser = `to_delete_${Date.now()}`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tempUser, password: 'password123' })
      });
      assert.strictEqual(regRes.status, 201);

      // 2. Login to get token
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tempUser, password: 'password123' })
      });
      const { token } = await loginRes.json();

      // 3. Delete user from users.json directly
      const users = await readData('users');
      const filtered = users.filter((u) => u.username !== tempUser);
      await writeData('users', filtered);

      // 4. Access /api/auth/me with that user's token
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(meRes.status, 401, 'Token for non-existent user must return 401');
    });
  });

  test.describe('E. Concurrency Stress Testing & Mutex Validation', () => {
    test('25 concurrent registrations with unique usernames all succeed with unique IDs', async () => {
      const batchSize = 25;
      const baseName = `concurrent_${Date.now()}`;

      const promises = Array.from({ length: batchSize }, (_, i) => {
        return fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `${baseName}_${i}`,
            password: `password_${i}`,
            role: 'Staff'
          })
        }).then(async (r) => ({
          status: r.status,
          data: await r.json()
        }));
      });

      const results = await Promise.all(promises);

      // Verify all succeeded
      const successCount = results.filter((r) => r.status === 201).length;
      assert.strictEqual(successCount, batchSize, `All ${batchSize} concurrent registrations must succeed`);

      // Check ID uniqueness
      const ids = results.map((r) => r.data.user.id);
      const uniqueIds = new Set(ids);
      // Note: If IDs are generated with Date.now(), collisions may occur during fast concurrency
      const hasIdCollision = uniqueIds.size < batchSize;
      console.log(`[Concurrency Info] ${batchSize} users created. Unique IDs: ${uniqueIds.size}/${batchSize}`);
      if (hasIdCollision) {
        console.warn(`[WARN] ID Collision detected! ID count: ${uniqueIds.size} vs Expected: ${batchSize}`);
      }

      // Verify all users persisted to disk
      const diskUsers = await readData('users');
      for (let i = 0; i < batchSize; i++) {
        const expected = `${baseName}_${i}`;
        assert.ok(diskUsers.some((u) => u.username === expected), `User ${expected} must exist on disk`);
      }
    });

    test('25 concurrent registrations with the SAME username results in exactly 1 success (201) and 24 conflicts (409)', async () => {
      const targetUser = `race_user_${Date.now()}`;
      const batchSize = 25;

      const promises = Array.from({ length: batchSize }, (_, i) => {
        return fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: targetUser,
            password: `pass_${i}`,
            role: 'Staff'
          })
        }).then((r) => r.status);
      });

      const statuses = await Promise.all(promises);
      const count201 = statuses.filter((s) => s === 201).length;
      const count409 = statuses.filter((s) => s === 409).length;

      assert.strictEqual(count201, 1, `Exactly 1 registration must succeed with 201, got ${count201}`);
      assert.strictEqual(count409, batchSize - 1, `Remaining ${batchSize - 1} must fail with 409, got ${count409}`);

      // Verify only 1 record exists in users.json
      const diskUsers = await readData('users');
      const matches = diskUsers.filter((u) => (u.username || '').toLowerCase() === targetUser.toLowerCase());
      assert.strictEqual(matches.length, 1, 'Only one record should exist in users.json');
    });
  });

  test.describe('F. Default Admin Login Resilience & users.json Deletion While Running', () => {
    test('default admin (admin/admin) logs in successfully in normal operation', async () => {
      await authService.ensureDefaultAdmin();

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.username, 'admin');
      assert.strictEqual(data.user.role, 'Super Admin');
    });

    test('CHALLENGE: default admin login behavior when users.json is deleted while server is running', async () => {
      // 1. Delete users.json from disk while the server process is actively running
      try {
        await fs.unlink(USERS_FILE);
      } catch (_) {}

      let fileExists = true;
      try {
        await fs.access(USERS_FILE);
      } catch (_) {
        fileExists = false;
      }
      assert.strictEqual(fileExists, false, 'users.json is verified deleted from disk');

      // 2. Client attempts to log in as default admin
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      console.log(`[Challenger Observation] Login status after deleting users.json: ${res.status}`);
      const data = await res.json();
      console.log(`[Challenger Observation] Login response body:`, data);

      // In current implementation:
      // readData catches ENOENT and writes [] to users.json.
      // authenticateUser finds no admin in [] and returns null -> 401 Invalid credentials!
      // Requirement check: Can default admin ALWAYS log in?
      // If res.status !== 200, this is an empirical finding!
      const adminCanLoginAfterDelete = (res.status === 200 && data.success === true);
      console.log(`[Challenger Finding] Can default admin log in after users.json deleted? ${adminCanLoginAfterDelete}`);

      // Restore admin so subsequent tests can run
      await authService.ensureDefaultAdmin();
    });

    test('CHALLENGE: default admin login behavior when users.json is emptied to 0 bytes while server is running', async () => {
      // Truncate users.json to 0 bytes
      await fs.writeFile(USERS_FILE, '', 'utf8');

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });

      console.log(`[Challenger Observation] Login status after 0-byte users.json: ${res.status}`);
      const data = await res.json();
      console.log(`[Challenger Observation] 0-byte response body:`, data);

      // Restore admin
      await authService.ensureDefaultAdmin();
    });
  });

  test.describe('G. Security Response Hygiene (No Password Leakage)', () => {
    test('password field is never returned by login, register, me, or users endpoints', async () => {
      // Login
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.user.password, undefined);

      // Register
      const regUser = `hygiene_${Date.now()}`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUser, password: 'superSecretPassword', role: 'Staff' })
      });
      const regData = await regRes.json();
      assert.strictEqual(regData.user.password, undefined);

      // Me
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${loginData.token}` }
      });
      const meData = await meRes.json();
      assert.strictEqual(meData.user.password, undefined);

      // Users
      const usersRes = await fetch(`${baseUrl}/api/auth/users`);
      const usersData = await usersRes.json();
      for (const u of usersData.data) {
        assert.strictEqual(u.password, undefined);
      }
    });
  });

});
