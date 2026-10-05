/**
 * r1_auth_boundaries.test.js
 * Tier 2: Boundary & Corner Cases for Requirement R1 (User Registration & Authentication)
 * Tests boundary conditions: empty fields, whitespace inputs, case-insensitive collision,
 * malformed headers, tampered tokens, non-existent accounts, and invalid authorization formats.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopServer, apiRequest } = require('../helpers/serverControl');

describe('Tier 2: Boundary & Corner Cases - R1 Authentication', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  it('T2-R1-01: Registration with empty string username returns 400 Bad Request', async () => {
    const res = await apiRequest('POST', '/api/auth/register', {
      username: '',
      password: 'ValidPassword123!',
      role: 'Staff'
    });

    assert.strictEqual(res.status, 400, 'Registration with empty username must return 400');
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R1-02: Registration with empty string password returns 400 Bad Request', async () => {
    const res = await apiRequest('POST', '/api/auth/register', {
      username: `user_nopass_${Date.now()}`,
      password: '',
      role: 'Staff'
    });

    assert.strictEqual(res.status, 400, 'Registration with empty password must return 400');
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R1-03: Registration with whitespace-only username or password returns 400 Bad Request', async () => {
    const res1 = await apiRequest('POST', '/api/auth/register', {
      username: '   ',
      password: 'password123'
    });
    assert.strictEqual(res1.status, 400, 'Whitespace username must return 400');

    const res2 = await apiRequest('POST', '/api/auth/register', {
      username: `user_spaces_${Date.now()}`,
      password: '     '
    });
    assert.strictEqual(res2.status, 400, 'Whitespace password must return 400');
  });

  it('T2-R1-04: Registration with missing payload or null body returns 400 Bad Request', async () => {
    const res = await apiRequest('POST', '/api/auth/register', {});
    assert.strictEqual(res.status, 400, 'Empty JSON body must return 400');
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R1-05: Case-insensitive duplicate registration of admin (e.g. ADMIN, Admin) returns 409 Conflict', async () => {
    const variants = ['ADMIN', 'Admin', 'aDmiN'];

    for (const variant of variants) {
      const res = await apiRequest('POST', '/api/auth/register', {
        username: variant,
        password: 'anyPassword123'
      });
      assert.strictEqual(
        res.status,
        409,
        `Registration with casing variant "${variant}" must return 409 Conflict`
      );
      assert.strictEqual(res.data.success, false);
    }
  });

  it('T2-R1-06: Login with completely non-existent username returns 401 Unauthorized', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      username: `ghost_user_${Date.now()}`,
      password: 'ghostPassword123'
    });

    assert.strictEqual(res.status, 401, 'Non-existent user login must return 401');
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R1-07: GET /api/auth/me with corrupted or tampered JWT token returns 401 Unauthorized', async () => {
    // Generate valid token then tamper with last characters
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    const validToken = loginRes.data.token;
    const tamperedToken = validToken.slice(0, -6) + 'XXXXXX';

    const res = await apiRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${tamperedToken}`
    });

    assert.strictEqual(res.status, 401, 'Tampered token must return 401 Unauthorized');
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R1-08: GET /api/auth/me with non-Bearer authorization scheme returns 401 Unauthorized', async () => {
    const schemes = [
      'Basic YWRtaW46YWRtaW4=',
      'Token some_opaque_token',
      'Digest username="admin"',
      'JustTheTokenStringWithoutScheme'
    ];

    for (const headerValue of schemes) {
      const res = await apiRequest('GET', '/api/auth/me', null, {
        Authorization: headerValue
      });
      assert.strictEqual(
        res.status,
        401,
        `Authorization header "${headerValue}" must return 401 Unauthorized`
      );
      assert.strictEqual(res.data.success, false);
    }
  });
});
