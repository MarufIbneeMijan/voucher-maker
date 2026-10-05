/**
 * r2_routing_boundaries.test.js
 * Tier 2: Boundary & Corner Cases for Requirement R2 (Routing & Button Repairs)
 * Tests boundary conditions: null user prop evaluation, missing agent IDs in batch entry,
 * non-existent agent IDs, zero-cost breakdown matrices, and catch-all route fallbacks.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopServer, apiRequest } = require('../helpers/serverControl');
const {
  readProjectFile,
  inspectRouterSetup
} = require('../helpers/staticInspect');
const { createVoucherPayload, CANONICAL_BD_AGENT, CANONICAL_SAUDI_AGENT } = require('../helpers/fixtures');

describe('Tier 2: Boundary & Corner Cases - R2 Routing & Buttons', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  it('T2-R2-01: DataEntryForm evaluates user prop safely with fallback when user is null or undefined', () => {
    const code = readProjectFile('client/src/components/DataEntryForm.jsx') || '';

    // Verify code uses optional chaining or fallback user?.username || 'admin'
    const hasSafeFallback = /user\?\.username\s*\|\|\s*['"]admin['"]/.test(code)
      || /user\s*\?\s*user\.username\s*:\s*['"]admin['"]/.test(code);

    assert.ok(
      hasSafeFallback,
      'Requirement R2: DataEntryForm must evaluate user?.username || "admin" safely'
    );
  });

  it('T2-R2-02: POST /api/entries/batch rejects submission missing bdAgentId with 400 Bad Request', async () => {
    const payload = createVoucherPayload({
      bdAgentId: ''
    });

    const res = await apiRequest('POST', '/api/entries/batch', payload);

    assert.strictEqual(res.status, 400, 'Missing bdAgentId must return HTTP 400 Bad Request');
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('BD Sub-Agency'), 'Error message must mention BD Sub-Agency');
  });

  it('T2-R2-03: POST /api/entries/batch rejects submission missing saudiAgentId with 400 Bad Request', async () => {
    const payload = createVoucherPayload({
      saudiAgentId: ''
    });

    const res = await apiRequest('POST', '/api/entries/batch', payload);

    assert.strictEqual(res.status, 400, 'Missing saudiAgentId must return HTTP 400 Bad Request');
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('Saudi Supplier'), 'Error message must mention Saudi Supplier');
  });

  it('T2-R2-04: POST /api/entries/batch returns error when supplied non-existent BD agent ID', async () => {
    const payload = createVoucherPayload({
      bdAgentId: 'AGENT-NON-EXISTENT-99999'
    });

    const res = await apiRequest('POST', '/api/entries/batch', payload);

    assert.ok(
      res.status >= 400,
      `Non-existent agent ID must return error status >= 400. Got ${res.status}`
    );
    assert.strictEqual(res.data.success, false);
  });

  it('T2-R2-05: POST /api/entries/batch handles zero-amount breakdown matrix cleanly without NaN', async () => {
    const zeroPayload = {
      createdBy: 'admin',
      bdAgentId: CANONICAL_BD_AGENT.id,
      saudiAgentId: CANONICAL_SAUDI_AGENT.id,
      date: '2026-10-02',
      passengerRef: 'ZERO AMOUNT BOUNDARY TEST',
      dueAdjustment: 0,
      nowPaying: 0,
      breakdown: {
        umrahVisa: { pax: 0, costSAR: 0, rate: 32.5, totalBDT: 0 },
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
        amountSAR: 0,
        amountBDT: 0,
        trxId: 'ZERO-001'
      },
      totals: {
        grossAmountSAR: 0,
        grossAmountBDT: 0,
        paidAmountBDT: 0,
        netDueAdded: 0,
        dueAdjustment: 0,
        totalBillable: 0
      },
      note: 'Zero breakdown boundary test'
    };

    const res = await apiRequest('POST', '/api/entries/batch', zeroPayload);

    assert.strictEqual(res.status, 201, 'Zero amount voucher should post successfully');
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.billingDoc.totalBillable, 0);
  });

  it('T2-R2-06: React Router configuration includes catch-all or fallback route to prevent dead ends', () => {
    const router = inspectRouterSetup();
    const appCode = readProjectFile('client/src/App.jsx') || '';

    // Check for Route path="*" or Navigate to fallback
    const hasCatchAll = router.declaredRoutes.includes('*')
      || /path=["']\*["']/.test(appCode)
      || /Navigate\s+to=/.test(appCode);

    assert.ok(
      hasCatchAll,
      'Requirement R2: Router configuration must include a catch-all route (path="*") or redirect fallback'
    );
  });

  it('T2-R2-07: DataEntryForm code guards against undefined agents prop', () => {
    const code = readProjectFile('client/src/components/DataEntryForm.jsx') || '';

    // Code should either default agents = [] or safely filter
    const hasSafeAgentsGuard = /agents\s*=\s*\[\]/.test(code)
      || /agents\?\.filter/.test(code)
      || /\(agents\s*\|\|\s*\[\]\)\.filter/.test(code)
      || /Array\.isArray\(agents\)/.test(code);

    assert.ok(
      hasSafeAgentsGuard,
      'DataEntryForm should guard against undefined agents array (e.g. agents = [] or (agents || []).filter)'
    );
  });
});
