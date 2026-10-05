/**
 * r1_auth_features.test.js
 * Tier 1: Feature Coverage for Requirement R1 (User Registration & Authentication)
 * Tests auto-seeding, login, registration, me endpoint, logout, and unauthenticated protection.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startTestServer, stopServer, apiRequest } = require('../helpers/serverControl');
const { DEFAULT_ADMIN } = require('../helpers/fixtures');

describe('Tier 1: Feature Coverage - R1 User Registration & Authentication', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  it('T1-R1-01: server/data/users.json exists and contains pre-seeded default admin user', () => {
    const usersFilePath = path.resolve(__dirname, '../../../server/data/users.json');
    assert.ok(fs.existsSync(usersFilePath), 'users.json must exist in server/data/');

    const content = fs.readFileSync(usersFilePath, 'utf8');
    const users = JSON.parse(content);
    assert.ok(Array.isArray(users), 'users.json content must be an array');
    assert.ok(users.length >= 1, 'users.json must contain at least one user record');

    const admin = users.find((u) => u.username === 'admin');
    assert.ok(admin, 'Default user "admin" must exist in users.json');
    assert.strictEqual(admin.role, 'Super Admin', 'Admin user role must strictly be "Super Admin"');
    assert.strictEqual(admin.username, 'admin', 'Admin username must be "admin"');
    assert.ok(admin.id || admin._id, 'Admin must have a unique identifier');
  });

  it('T1-R1-02: POST /api/auth/login authenticates default admin and returns 200, JWT token, and sanitized user', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      username: DEFAULT_ADMIN.username,
      password: DEFAULT_ADMIN.password
    });

    assert.strictEqual(res.status, 200, 'Login with valid credentials must return HTTP 200');
    assert.strictEqual(res.data.success, true, 'Response success flag must be true');
    assert.ok(typeof res.data.token === 'string' && res.data.token.length > 20, 'Response must include JWT token string');
    assert.ok(res.data.user, 'Response must include user object');
    assert.strictEqual(res.data.user.username, 'admin', 'User username must be admin');
    assert.strictEqual(res.data.user.role, 'Super Admin', 'User role must be Super Admin');
    assert.strictEqual(res.data.user.password, undefined, 'Sensitive password field must never be returned in response');
  });

  it('T1-R1-03: POST /api/auth/register creates a new user account with 201 Created and sanitized user', async () => {
    const uniqueUsername = `agent_t1_${Date.now()}`;
    const res = await apiRequest('POST', '/api/auth/register', {
      username: uniqueUsername,
      password: 'StrongPassword123!',
      role: 'Staff',
      name: 'Test Staff User'
    });

    assert.strictEqual(res.status, 201, 'Registration of new user must return HTTP 201 Created');
    assert.strictEqual(res.data.success, true, 'Response success flag must be true');
    assert.ok(res.data.user, 'Response must include created user object');
    assert.strictEqual(res.data.user.username, uniqueUsername, 'Created user username must match');
    assert.strictEqual(res.data.user.role, 'Staff', 'Created user role must match');
    assert.strictEqual(res.data.user.name, 'Test Staff User', 'Created user name must match');
    assert.strictEqual(res.data.user.password, undefined, 'Password must not be returned');
  });

  it('T1-R1-04: GET /api/auth/me returns authenticated user profile when Bearer token is provided', async () => {
    // First login to get a fresh token
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: DEFAULT_ADMIN.username,
      password: DEFAULT_ADMIN.password
    });
    const token = loginRes.data.token;

    const meRes = await apiRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(meRes.status, 200, 'GET /api/auth/me with valid token must return HTTP 200');
    assert.strictEqual(meRes.data.success, true, 'Success flag must be true');
    assert.ok(meRes.data.user, 'Must return authenticated user object');
    assert.strictEqual(meRes.data.user.username, 'admin', 'Must return admin username');
    assert.strictEqual(meRes.data.user.role, 'Super Admin', 'Must return Super Admin role');
    assert.strictEqual(meRes.data.user.password, undefined, 'Password must not be exposed');
  });

  it('T1-R1-05: POST /api/auth/login rejects invalid password with 401 Unauthorized', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'definitely_wrong_password_99'
    });

    assert.strictEqual(res.status, 401, 'Invalid password must return HTTP 401 Unauthorized');
    assert.strictEqual(res.data.success, false, 'Success flag must be false');
    assert.ok(res.data.message, 'Must return an error message');
  });

  it('T1-R1-06: POST /api/auth/register rejects duplicate username with 409 Conflict', async () => {
    const duplicateUser = `dup_user_${Date.now()}`;
    // Register once
    const firstRes = await apiRequest('POST', '/api/auth/register', {
      username: duplicateUser,
      password: 'password123',
      role: 'Staff',
      name: 'Duplicate Test User'
    });
    assert.strictEqual(firstRes.status, 201, 'Initial registration must succeed');

    // Register again with exact same username
    const secondRes = await apiRequest('POST', '/api/auth/register', {
      username: duplicateUser,
      password: 'anotherPassword456',
      role: 'Staff',
      name: 'Duplicate Test User'
    });

    assert.strictEqual(secondRes.status, 409, 'Duplicate username registration must return HTTP 409 Conflict');
    assert.strictEqual(secondRes.data.success, false, 'Success flag must be false');
  });

  it('T1-R1-07: POST /api/auth/logout successfully acknowledges logout request with HTTP 200', async () => {
    const res = await apiRequest('POST', '/api/auth/logout');
    assert.strictEqual(res.status, 200, 'Logout request must return HTTP 200');
    assert.strictEqual(res.data.success, true, 'Success flag must be true');
    assert.ok(res.data.message, 'Logout message must be returned');
  });

  it('T1-R1-08: GET /api/auth/me rejects request when Authorization header is absent with 401', async () => {
    const res = await apiRequest('GET', '/api/auth/me');
    assert.strictEqual(res.status, 401, 'Request without token must return HTTP 401 Unauthorized');
    assert.strictEqual(res.data.success, false, 'Success flag must be false');
  });
});
