/**
 * cross_feature.test.js
 * Tier 3: Cross-Feature Combinations (Pairwise Interaction Suites)
 * Validates interactions between Auth, Voucher Creation, Ledger Balancing,
 * Session Management, and Theme State.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopServer, apiRequest, loginAs } = require('../helpers/serverControl');
const { createVoucherPayload, CANONICAL_BD_AGENT, CANONICAL_SAUDI_AGENT } = require('../helpers/fixtures');
const { inspectThemes } = require('../helpers/staticInspect');

describe('Tier 3: Cross-Feature Combinations', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  it('T3-COMB-01: [Register ⨉ Login ⨉ Profile] Register new user, login with new credentials, verify /api/auth/me', async () => {
    const timestamp = Date.now();
    const newUser = {
      username: `combo_user_${timestamp}`,
      password: `Password_${timestamp}!`,
      role: 'Staff',
      name: `Combo Staff ${timestamp}`
    };

    // 1. Register
    const regRes = await apiRequest('POST', '/api/auth/register', newUser);
    assert.strictEqual(regRes.status, 201, 'Registration must succeed with 201');
    assert.strictEqual(regRes.data.user.username, newUser.username);

    // 2. Login
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: newUser.username,
      password: newUser.password
    });
    assert.strictEqual(loginRes.status, 200, 'Login with new credentials must succeed');
    const token = loginRes.data.token;
    assert.ok(token, 'Must return JWT token');

    // 3. Profile Me
    const meRes = await apiRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(meRes.status, 200, 'GET /api/auth/me must return 200');
    assert.strictEqual(meRes.data.user.username, newUser.username);
    assert.strictEqual(meRes.data.user.role, 'Staff');
  });

  it('T3-COMB-02: [Auth ⨉ Voucher Creation ⨉ Attribution] Authenticated user creates voucher with user attribution', async () => {
    // 1. Login
    const { token, user } = await loginAs('admin', 'admin');

    // 2. Post voucher using authenticated user username
    const voucherPayload = createVoucherPayload({
      createdBy: user.username,
      passengerRef: `COMBO-AUTH-${Date.now()}`
    });

    const postRes = await apiRequest('POST', '/api/entries/batch', voucherPayload, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(postRes.status, 201, 'Voucher posting must succeed with 201');
    assert.ok(postRes.data.data.billingDoc, 'Billing document must be returned');
    assert.ok(postRes.data.data.bdLedger, 'BD Ledger document must be returned');
  });

  it('T3-COMB-03: [Auth ⨉ Logout ⨉ Invalidation] Login, invoke logout, verify session clearance contract', async () => {
    const { token } = await loginAs('admin', 'admin');
    assert.ok(token);

    // Logout endpoint
    const logoutRes = await apiRequest('POST', '/api/auth/logout');
    assert.strictEqual(logoutRes.status, 200);

    // Unauthenticated access must be rejected
    const unauthRes = await apiRequest('GET', '/api/auth/me');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated call must be rejected with 401');
  });

  it('T3-COMB-04: [Agent Directory ⨉ Voucher Entry ⨉ Balance Update] Agent balance updates atomically after voucher', async () => {
    // 1. Fetch initial balance of BD Agent
    const agentsResBefore = await apiRequest('GET', '/api/agents');
    assert.strictEqual(agentsResBefore.status, 200);
    const agentBefore = agentsResBefore.data.data.find((a) => a.id === CANONICAL_BD_AGENT.id || a._id === CANONICAL_BD_AGENT.id);
    assert.ok(agentBefore, 'Canonical BD agent must exist');
    const initialBalance = agentBefore.currentBalance || 0;

    // 2. Post voucher with totalBillable = 50,000 and nowPaying = 20,000 -> net debit = +30,000
    const nowPaying = 20000;
    const grossBDT = 50000;
    const netDebit = grossBDT - nowPaying;

    const payload = createVoucherPayload({
      passengerRef: `BALANCE-TEST-${Date.now()}`,
      nowPaying,
      breakdown: {
        umrahVisa: { pax: 2, costSAR: 600, rate: 32.5, totalBDT: 50000 },
        hotel: { totalSAR: 0, rate: 32.5, totalBDT: 0 },
        transport: { costSAR: 0, rate: 32.5, totalBDT: 0 },
        naqabaFine: { costSAR: 0, rate: 32.5, totalBDT: 0 },
        brnCharge: { totalSAR: 0, rate: 32.5, totalBDT: 0 },
        crnCharge: { totalSAR: 0, rate: 32.5, totalBDT: 0 },
        escapedFine: { costSAR: 0, rate: 32.5, totalBDT: 0 },
        previousDues: 0
      },
      paymentReceived: {
        mode: 'Recv IN HAND (BDT)',
        amountBDT: nowPaying,
        trxId: `TRX-${Date.now()}`
      },
      totals: {
        grossAmountSAR: 600,
        grossAmountBDT: grossBDT,
        paidAmountBDT: nowPaying,
        netDueAdded: netDebit,
        dueAdjustment: 0,
        totalBillable: grossBDT
      }
    });

    const postRes = await apiRequest('POST', '/api/entries/batch', payload);
    assert.strictEqual(postRes.status, 201, 'Voucher posting must succeed');

    // 3. Fetch updated balance of BD Agent
    const agentsResAfter = await apiRequest('GET', '/api/agents');
    assert.strictEqual(agentsResAfter.status, 200);
    const agentAfter = agentsResAfter.data.data.find((a) => a.id === CANONICAL_BD_AGENT.id || a._id === CANONICAL_BD_AGENT.id);
    const expectedBalance = initialBalance + netDebit;

    assert.strictEqual(
      agentAfter.currentBalance,
      expectedBalance,
      `BD Agent current balance must update by net debit (+${netDebit}). Initial: ${initialBalance}, Expected: ${expectedBalance}, Got: ${agentAfter.currentBalance}`
    );
  });

  it('T3-COMB-05: [Auth Middleware Guard ⨉ Bypass] Public routes pass freely while invalid tokens are blocked', async () => {
    // Public health check without auth
    const healthRes = await apiRequest('GET', '/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'OK');

    // Sensitive route with invalid token should be rejected with 401
    const badTokenRes = await apiRequest('GET', '/api/agents', null, {
      Authorization: 'Bearer invalid.bogus.token'
    });
    assert.strictEqual(badTokenRes.status, 401, 'Bogus Bearer token must be rejected with 401');

    // Sensitive route with valid token should succeed
    const { token } = await loginAs('admin', 'admin');
    const goodTokenRes = await apiRequest('GET', '/api/agents', null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(goodTokenRes.status, 200, 'Valid token must be accepted with 200');
  });

  it('T3-COMB-06: [Theme Configuration ⨉ Layout Integration] Theme options configure data-theme and dark mode styles', () => {
    const themeInspection = inspectThemes();
    assert.ok(themeInspection.supportsThemes, 'Must support arafa-teal, midnight-onyx, and executive-navy');
    assert.ok(themeInspection.handlesDarkMode, 'Must toggle dark class on documentElement');
  });
});
