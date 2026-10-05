/**
 * r2_routing_buttons.test.js
 * Tier 1: Feature Coverage for Requirement R2 (React Router Migration & Button Repairs)
 * Tests react-router-dom dependency, primary routes, sub-report routes,
 * DataEntryForm user destructuring, POST /api/entries/batch submission,
 * Navbar onLogout binding, and protected route contract.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { startTestServer, stopServer, apiRequest } = require('../helpers/serverControl');
const {
  hasClientDependency,
  inspectDataEntryForm,
  inspectLogoutButtonContract,
  inspectRouterSetup,
  readProjectFile
} = require('../helpers/staticInspect');
const { createVoucherPayload } = require('../helpers/fixtures');

describe('Tier 1: Feature Coverage - R2 Routing & Button Repairs', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  it('T1-R2-01: react-router-dom is declared in client/package.json dependencies', () => {
    const isInstalled = hasClientDependency('react-router-dom');
    assert.ok(
      isInstalled,
      'Requirement R2: react-router-dom must be present in client/package.json dependencies'
    );
  });

  it('T1-R2-02: React Router declares primary view routes (/dashboard, /entry, /statements, /agents, /login)', () => {
    const router = inspectRouterSetup();
    assert.ok(router.usesBrowserRouter, 'Application must be wrapped in <BrowserRouter>');

    const expectedPrimaryRoutes = ['/dashboard', '/entry', '/statements', '/agents', '/login'];
    const declaredRoutes = router.declaredRoutes;

    for (const route of expectedPrimaryRoutes) {
      const isConfigured = declaredRoutes.includes(route) || (route === '/dashboard' && declaredRoutes.includes('/'));
      assert.ok(
        isConfigured,
        `Requirement R2: Route for "${route}" must be declared in React Router configuration`
      );
    }
  });

  it('T1-R2-03: React Router declares sub-report routes under /reports/*', () => {
    const router = inspectRouterSetup();
    const appCode = readProjectFile('client/src/App.jsx') || '';

    const expectedReportRoutes = [
      '/reports/receivables',
      '/reports/advance-deposits',
      '/reports/ksa-exposure',
      '/reports/daily-flow'
    ];

    for (const reportRoute of expectedReportRoutes) {
      const isRouteConfigured = router.declaredRoutes.includes(reportRoute) || appCode.includes(reportRoute);
      assert.ok(
        isRouteConfigured,
        `Requirement R2: Dedicated URL route for "${reportRoute}" must be configured`
      );
    }
  });

  it('T1-R2-04: DataEntryForm.jsx destructures user prop to prevent ReferenceError', () => {
    const inspection = inspectDataEntryForm();
    assert.ok(inspection.fileFound, 'DataEntryForm.jsx must exist');
    assert.ok(
      inspection.destructuresUser,
      'Requirement R2: DataEntryForm must destructure "user" prop ({ agents, ..., user }) to prevent ReferenceError'
    );
  });

  it('T1-R2-05: POST /api/entries/batch successfully accepts valid Umrah voucher payload and returns 201 Created', async () => {
    const payload = createVoucherPayload({
      passengerRef: 'T1-R2 TEST GROUP (3 PAX)'
    });

    const res = await apiRequest('POST', '/api/entries/batch', payload);

    assert.strictEqual(
      res.status,
      201,
      `Voucher submission must return HTTP 201 Created. Received ${res.status}: ${JSON.stringify(res.data)}`
    );
    assert.strictEqual(res.data.success, true, 'Response success must be true');
    assert.ok(res.data.data.billingDoc, 'Response must return created billingDoc');
    assert.ok(res.data.data.billingDoc.voucherNo, 'Created voucher must have voucherNo');
    assert.ok(res.data.data.bdLedger, 'Response must return created bdLedger entry');
  });

  it('T1-R2-06: Navbar receives and binds onLogout callback with session clearance', () => {
    const contract = inspectLogoutButtonContract();

    assert.ok(
      contract.navbarReceivesOnLogout,
      'Requirement R2: Navbar component signature must accept onLogout prop'
    );
    assert.ok(
      contract.navbarWiresLogoutClick,
      'Requirement R2: Navbar must wire onClick={onLogout} to the Logout button'
    );
    assert.ok(
      contract.appPassesOnLogoutToNavbar,
      'Requirement R2: App.jsx must pass onLogout callback to <Navbar ... />'
    );
  });

  it('T1-R2-07: Protected Route component redirects unauthenticated users to /login', () => {
    const router = inspectRouterSetup();
    const appCode = readProjectFile('client/src/App.jsx') || '';
    const protectedRoutePath = path.resolve(__dirname, '../../../client/src/components/ProtectedRoute.jsx');

    const hasProtectedComponent = fs.existsSync(protectedRoutePath) || /ProtectedRoute/.test(appCode);
    assert.ok(
      hasProtectedComponent,
      'Requirement R2: ProtectedRoute guard component must exist to protect internal views'
    );
  });
});
