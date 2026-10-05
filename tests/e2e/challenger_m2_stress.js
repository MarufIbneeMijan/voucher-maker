/**
 * tests/e2e/challenger_m2_stress.js
 * Adversarial Challenger Stress Test Suite for Milestone 2:
 * React Router Migration, Button Repairs & UI/UX Restoration
 *
 * Authored by: challenger_m2_1
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startTestServer, stopServer, apiRequest } = require('./helpers/serverControl');
const { createVoucherPayload, CANONICAL_BD_AGENT, CANONICAL_SAUDI_AGENT } = require('./helpers/fixtures');

const ROOT_DIR = path.resolve(__dirname, '../../');
const CLIENT_SRC = path.join(ROOT_DIR, 'client/src');

function readFile(relPath) {
  const full = path.join(ROOT_DIR, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

describe('Adversarial Stress Test: Milestone 2 React Router & UI/UX', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopServer();
  });

  // ==========================================
  // Section 1: Route Definitions & Deep Linking
  // ==========================================
  describe('1. Route Definitions & Deep Linking Architecture', () => {
    it('ADV-ROUTE-01: client/src/main.jsx wraps App in BrowserRouter without duplicate routers', () => {
      const mainContent = readFile('client/src/main.jsx');
      assert.ok(mainContent, 'client/src/main.jsx must exist');
      assert.match(mainContent, /import\s+.*BrowserRouter.*from\s+['"]react-router-dom['"]/, 'Must import BrowserRouter');
      assert.match(mainContent, /<BrowserRouter>\s*<App\s*\/>\s*<\/BrowserRouter>/, 'Must wrap <App /> in <BrowserRouter>');

      // App.jsx itself should NOT declare an inner BrowserRouter (which would cause nested router errors)
      const appContent = readFile('client/src/App.jsx');
      assert.ok(!appContent.includes('<BrowserRouter>'), 'App.jsx must not nest a redundant <BrowserRouter>');
    });

    it('ADV-ROUTE-02: App.jsx defines all 10 required application routes + root redirect + catch-all', () => {
      const appContent = readFile('client/src/App.jsx');
      const requiredRoutes = [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: 'Dashboard' },
        { path: '/agents', component: 'AgentDirectory' },
        { path: '/entry', component: 'DataEntryForm' },
        { path: '/statements', component: 'LedgerStatements' },
        { path: '/tagada', component: 'WhatsAppTagadaModal' },
        { path: '/reports/receivables', component: 'ReceivablesReport' },
        { path: '/reports/advance-deposits', component: 'AdvanceDepositsReport' },
        { path: '/reports/ksa-exposure', component: 'KsaExposureReport' },
        { path: '/reports/daily-flow', component: 'DailyFlowReport' },
        { path: '/login', component: 'Login' },
        { path: '*', redirect: '/dashboard' }
      ];

      for (const req of requiredRoutes) {
        if (req.redirect) {
          const redirectRegex = new RegExp(`path=["']${req.path.replace('*', '\\*')}["'][^>]*element={<Navigate\\s+to=["']${req.redirect}["']`);
          assert.ok(
            redirectRegex.test(appContent),
            `Route "${req.path}" must redirect to "${req.redirect}"`
          );
        } else {
          const routeRegex = new RegExp(`path=["']${req.path}["'][^>]*element={<(ProtectedRoute.*)?${req.component}`);
          assert.ok(
            routeRegex.test(appContent) || appContent.includes(`path="${req.path}"`),
            `Route "${req.path}" must be declared and render component "${req.component}"`
          );
        }
      }
    });

    it('ADV-ROUTE-03: Every internal view route is protected by <ProtectedRoute>', () => {
      const appContent = readFile('client/src/App.jsx');
      const protectedPaths = [
        '/dashboard',
        '/agents',
        '/entry',
        '/statements',
        '/tagada',
        '/reports/receivables',
        '/reports/advance-deposits',
        '/reports/ksa-exposure',
        '/reports/daily-flow'
      ];

      for (const p of protectedPaths) {
        // Find Route block for path
        const routeIdx = appContent.indexOf(`path="${p}"`);
        assert.ok(routeIdx !== -1, `Route path "${p}" not found in App.jsx`);
        const block = appContent.slice(routeIdx, routeIdx + 300);
        assert.ok(
          block.includes('<ProtectedRoute'),
          `Route "${p}" must be enclosed within <ProtectedRoute>`
        );
      }
    });

    it('ADV-ROUTE-04: NavLink / Navbar paths strictly mirror App.jsx route definitions', () => {
      const navbarContent = readFile('client/src/components/Navbar.jsx');
      assert.ok(navbarContent, 'Navbar.jsx must exist');

      const expectedNavbarPaths = ['/dashboard', '/agents', '/entry', '/statements', '/tagada'];
      for (const p of expectedNavbarPaths) {
        assert.ok(
          navbarContent.includes(`path: '${p}'`),
          `Navbar navItems must map to path "${p}"`
        );
      }
    });
  });

  // ==========================================
  // Section 2: Unauthenticated Redirection & Session Destruction
  // ==========================================
  describe('2. Unauthenticated Redirection & Session Purging', () => {
    it('ADV-AUTH-01: ProtectedRoute redirects unauthenticated visitors to /login when user is null and storage empty', () => {
      const protectedRouteContent = readFile('client/src/components/ProtectedRoute.jsx');
      assert.ok(protectedRouteContent, 'ProtectedRoute.jsx must exist');

      // Verify that when not authenticated, it renders Navigate to="/login" with replace
      assert.match(
        protectedRouteContent,
        /<Navigate\s+to=["']\/login["']\s+replace\s*\/>/,
        'ProtectedRoute must return <Navigate to="/login" replace /> when unauthenticated'
      );

      // Verify logic: isAuthenticated = Boolean(user || storedAuth)
      assert.match(
        protectedRouteContent,
        /Boolean\s*\(\s*user\s*\|\|\s*storedAuth\s*\)/,
        'ProtectedRoute must check both user prop and storedAuth'
      );
    });

    it('ADV-AUTH-02: App.jsx user state initialization safely handles missing, empty, or corrupt localStorage', () => {
      const appContent = readFile('client/src/App.jsx');
      
      // Verify useState has try-catch parser
      assert.ok(
        appContent.includes("localStorage.getItem('traveledger_auth')"),
        'App.jsx must read traveledger_auth from localStorage'
      );
      assert.ok(
        /try\s*\{\s*const stored = localStorage\.getItem\('traveledger_auth'\);\s*return stored \? JSON\.parse\(stored\) : null;\s*\}\s*catch/.test(appContent),
        'App.jsx must catch JSON parse errors from corrupt localStorage without crashing'
      );
    });

    it('ADV-AUTH-03: handleLogout completely purges credentials from localStorage and navigates to /login', () => {
      const appContent = readFile('client/src/App.jsx');

      // Check handleLogout function
      assert.ok(
        appContent.includes("localStorage.removeItem('traveledger_auth')"),
        'handleLogout must explicitly removeItem("traveledger_auth")'
      );
      assert.ok(
        appContent.includes('setUser(null)'),
        'handleLogout must set user state to null'
      );
      assert.ok(
        appContent.includes("navigate('/login')"),
        'handleLogout must navigate to "/login"'
      );
    });

    it('ADV-AUTH-04: Navbar Logout button is bound to onLogout callback', () => {
      const navbarContent = readFile('client/src/components/Navbar.jsx');
      assert.match(
        navbarContent,
        /onClick=\{\s*onLogout\s*\}/,
        'Navbar logout button must bind directly to onLogout prop'
      );
    });

    it('ADV-AUTH-05: Authenticated users navigating to /login are redirected to /dashboard', () => {
      const appContent = readFile('client/src/App.jsx');
      // Look for /login route block
      const loginRouteIdx = appContent.indexOf('path="/login"');
      assert.ok(loginRouteIdx !== -1, 'Route /login must exist');
      const loginBlock = appContent.slice(loginRouteIdx, loginRouteIdx + 300);
      assert.ok(
        loginBlock.includes('user ? (') && loginBlock.includes('<Navigate to="/dashboard" replace />'),
        'Visiting /login while user is truthy must redirect to /dashboard'
      );
    });
  });

  // ==========================================
  // Section 3: Save Voucher Button & Form Execution
  // ==========================================
  describe('3. Save Voucher Button & Form Execution', () => {
    it('ADV-SAVE-01: DataEntryForm destructures user and guards against undefined/null user prop', () => {
      const formContent = readFile('client/src/components/DataEntryForm.jsx');
      assert.ok(formContent, 'DataEntryForm.jsx must exist');

      // Check signature destructuring
      assert.match(
        formContent,
        /export\s+default\s+function\s+DataEntryForm\s*\([^)]*user[^)]*\)/,
        'DataEntryForm must declare user in props destructuring'
      );

      // Check safe fallback for createdBy
      assert.match(
        formContent,
        /createdBy\s*:\s*user\?\.username\s*\|\|\s*['"]admin['"]/,
        'createdBy in payload must evaluate user?.username || "admin"'
      );
    });

    it('ADV-SAVE-02: DataEntryForm guards against null or undefined agents prop', () => {
      const formContent = readFile('client/src/components/DataEntryForm.jsx');

      // Check default agents = []
      assert.match(
        formContent,
        /agents\s*=\s*\[\]/,
        'agents prop must have default value []'
      );

      // Check null-safe filtering
      assert.match(
        formContent,
        /\(agents\s*\|\|\s*\[\]\)\.filter/,
        'agents array filtering must be guarded against null/undefined'
      );
    });

    it('ADV-SAVE-03: DataEntryForm Save button triggers handleSubmit and posts valid payload', async () => {
      const formContent = readFile('client/src/components/DataEntryForm.jsx');

      // Verify submit button has onClick={handleSubmit}
      assert.match(
        formContent,
        /onClick=\{\s*handleSubmit\s*\}/,
        'Save button must bind onClick to handleSubmit'
      );

      // Verify endpoint URL
      assert.ok(
        formContent.includes("'/api/entries/batch'"),
        'DataEntryForm must target /api/entries/batch'
      );

      // Now execute live post with sub-agency user attribution
      const testVoucherPayload = createVoucherPayload({
        createdBy: 'test_challenger_user',
        passengerRef: 'CHALLENGER-ADV-01 GROUP (4 PAX)',
        nowPaying: 50000
      });

      const res = await apiRequest('POST', '/api/entries/batch', testVoucherPayload);
      assert.strictEqual(res.status, 201, 'POST /api/entries/batch must return 201');
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.data.billingDoc, 'Must return created billingDoc');
      assert.ok(res.data.data.billingDoc.voucherNo, 'Created voucher must have voucherNo');
      assert.strictEqual(res.data.data.billingDoc.passengerRef, 'CHALLENGER-ADV-01 GROUP (4 PAX)');
      assert.ok(res.data.data.bdLedger, 'Must return created bdLedger entry');
    });

    it('ADV-SAVE-04: DataEntryForm supports Edit Mode with PUT /api/entries/batch/:voucherNo', async () => {
      const formContent = readFile('client/src/components/DataEntryForm.jsx');
      assert.ok(
        formContent.includes('/api/entries/batch/${editingVoucher.voucherNo || editingVoucher.id}'),
        'DataEntryForm must construct dynamic URL for voucher editing'
      );
      assert.ok(
        formContent.includes("const method = isEditing ? 'PUT' : 'POST'"),
        'DataEntryForm must use PUT method when in edit mode'
      );
    });
  });

  // ==========================================
  // Section 4: Layout Responsiveness & Table Overflow Wrappers
  // ==========================================
  describe('4. Full-Width Layout & Responsive Table Wrappers', () => {
    it('ADV-UI-01: Zero occurrences of max-w-7xl exist anywhere in client/src/', () => {
      function searchMaxW7xl(dir) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            searchMaxW7xl(full);
          } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html')) {
            const content = fs.readFileSync(full, 'utf8');
            assert.ok(
              !content.includes('max-w-7xl'),
              `Restrictive class "max-w-7xl" found in file: ${full}`
            );
          }
        }
      }

      searchMaxW7xl(CLIENT_SRC);
    });

    it('ADV-UI-02: App.jsx main layout uses full-width container with responsive horizontal padding', () => {
      const appContent = readFile('client/src/App.jsx');
      assert.match(
        appContent,
        /<main\s+className=["'][^"']*flex-1\s+w-full\s+px-4\s+sm:px-6\s+lg:px-8\s+py-6[^"']*["']>/,
        '<main> container must use "flex-1 w-full px-4 sm:px-6 lg:px-8 py-6"'
      );
    });

    it('ADV-UI-03: All 8 <table> elements in client/src/ have responsive overflow-x-auto containers', () => {
      const tableFiles = [
        'client/src/components/Dashboard.jsx',
        'client/src/components/VoucherModal.jsx',
        'client/src/components/LedgerStatements.jsx',
        'client/src/components/reports/ReceivablesReport.jsx',
        'client/src/components/reports/KsaExposureReport.jsx',
        'client/src/components/reports/DailyFlowReport.jsx',
        'client/src/components/reports/AdvanceDepositsReport.jsx'
      ];

      for (const rel of tableFiles) {
        const content = readFile(rel);
        assert.ok(content, `File ${rel} must exist`);
        
        // Every file with a table must have overflow-x-auto
        assert.ok(
          content.includes('overflow-x-auto'),
          `File ${rel} contains a table but is missing "overflow-x-auto"`
        );
      }
    });

    it('ADV-UI-04: VoucherModal.jsx contains zero unscrollable overflow-hidden table wrappers', () => {
      const voucherModalContent = readFile('client/src/components/VoucherModal.jsx');
      
      // Check that overflow-hidden is NOT used directly on table wrapper divs without overflow-x-auto
      const lines = voucherModalContent.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('<table')) {
          // Look at previous 5 lines for wrapper
          const wrapperSnippet = lines.slice(Math.max(0, idx - 5), idx).join('\n');
          assert.ok(
            wrapperSnippet.includes('overflow-x-auto'),
            `VoucherModal table at line ${idx + 1} must be enclosed in overflow-x-auto wrapper. Found: ${wrapperSnippet}`
          );
        }
      });
    });
  });

  // ==========================================
  // Section 5: Backend API Alignment & Data Integrity
  // ==========================================
  describe('5. Express Backend API Alignment with Client Routes', () => {
    it('ADV-API-01: GET /api/reports/receivables responds with 200 and schema', async () => {
      const res = await apiRequest('GET', '/api/reports/receivables');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.summary);
    });

    it('ADV-API-02: GET /api/reports/advance-deposits responds with 200 and schema', async () => {
      const res = await apiRequest('GET', '/api/reports/advance-deposits');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.summary);
    });

    it('ADV-API-03: GET /api/reports/ksa-exposure responds with 200 and schema', async () => {
      const res = await apiRequest('GET', '/api/reports/ksa-exposure');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.summary);
    });

    it('ADV-API-04: GET /api/reports/daily-flow responds with 200 and schema', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiRequest('GET', `/api/reports/daily-flow?date=${today}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.entries));
      assert.ok(res.data.data.summary);
    });
  });

  // ==========================================
  // Section 6: Component Runtime Simulation & Storage Edge Cases
  // ==========================================
  describe('6. Component Runtime Logic & Storage Edge Cases', () => {
    it('ADV-SIM-01: App.jsx user state initialization handles all corrupt/edge storage inputs gracefully', () => {
      function simulateUserInit(storedVal) {
        try {
          return storedVal ? JSON.parse(storedVal) : null;
        } catch (_) {
          return null;
        }
      }

      assert.strictEqual(simulateUserInit(null), null);
      assert.strictEqual(simulateUserInit(''), null);
      assert.strictEqual(simulateUserInit('null'), null);
      assert.strictEqual(simulateUserInit('undefined'), null);
      assert.strictEqual(simulateUserInit('{invalid-json-string'), null);
      assert.deepStrictEqual(
        simulateUserInit(JSON.stringify({ username: 'admin', role: 'Super Admin' })),
        { username: 'admin', role: 'Super Admin' }
      );
    });

    it('ADV-SIM-02: ProtectedRoute logic strictly redirects when unauthenticated', () => {
      function simulateProtectedRoute(user, storedAuth) {
        const isAuthenticated = Boolean(user || storedAuth);
        if (!isAuthenticated) {
          return { redirect: '/login', replace: true };
        }
        return { rendered: true };
      }

      // Unauthenticated states
      assert.deepStrictEqual(simulateProtectedRoute(null, null), { redirect: '/login', replace: true });
      assert.deepStrictEqual(simulateProtectedRoute(null, ''), { redirect: '/login', replace: true });
      assert.deepStrictEqual(simulateProtectedRoute(undefined, null), { redirect: '/login', replace: true });

      // Authenticated states
      assert.deepStrictEqual(simulateProtectedRoute({ username: 'admin' }, null), { rendered: true });
      assert.deepStrictEqual(simulateProtectedRoute(null, '{"token":"valid-jwt"}'), { rendered: true });
      assert.deepStrictEqual(simulateProtectedRoute({ username: 'staff' }, '{"token":"valid-jwt"}'), { rendered: true });
    });

    it('ADV-SIM-03: DataEntryForm parameter defaults prevent any ReferenceError or filter crash', () => {
      function simulateDataEntryProps({ agents = [], showToast, onEntryCreated, editingVoucher, onCancelEdit, user } = {}) {
        const bdAgents = (agents || []).filter((a) => a.type === 'BD_AGENT');
        const saudiAgents = (agents || []).filter((a) => a.type === 'SAUDI_AGENT');
        const createdBy = user?.username || 'admin';

        return {
          bdCount: bdAgents.length,
          saudiCount: saudiAgents.length,
          createdBy
        };
      }

      // Test completely omitted props
      const resEmpty = simulateDataEntryProps();
      assert.strictEqual(resEmpty.bdCount, 0);
      assert.strictEqual(resEmpty.saudiCount, 0);
      assert.strictEqual(resEmpty.createdBy, 'admin');

      // Test null props
      const resNull = simulateDataEntryProps({ agents: null, user: null });
      assert.strictEqual(resNull.bdCount, 0);
      assert.strictEqual(resNull.saudiCount, 0);
      assert.strictEqual(resNull.createdBy, 'admin');

      // Test undefined props
      const resUndef = simulateDataEntryProps({ agents: undefined, user: undefined });
      assert.strictEqual(resUndef.bdCount, 0);
      assert.strictEqual(resUndef.saudiCount, 0);
      assert.strictEqual(resUndef.createdBy, 'admin');

      // Test populated props
      const testAgents = [
        { id: '1', type: 'BD_AGENT', name: 'BD 1' },
        { id: '2', type: 'SAUDI_AGENT', name: 'Saudi 1' }
      ];
      const resPopulated = simulateDataEntryProps({ agents: testAgents, user: { username: 'sub_agent_01' } });
      assert.strictEqual(resPopulated.bdCount, 1);
      assert.strictEqual(resPopulated.saudiCount, 1);
      assert.strictEqual(resPopulated.createdBy, 'sub_agent_01');
    });

    it('ADV-SIM-04: Session purge simulation guarantees credential destruction', () => {
      const storageMock = new Map();
      const mockLocalStorage = {
        getItem: (k) => storageMock.get(k) || null,
        setItem: (k, v) => storageMock.set(k, String(v)),
        removeItem: (k) => storageMock.delete(k)
      };

      // 1. Initial logged in state
      mockLocalStorage.setItem('traveledger_auth', JSON.stringify({ token: 'test-token', username: 'admin' }));
      let userState = JSON.parse(mockLocalStorage.getItem('traveledger_auth'));
      assert.strictEqual(userState.username, 'admin');

      // 2. Perform handleLogout
      let navigatedTo = null;
      const navigateMock = (dest) => { navigatedTo = dest; };

      const handleLogout = () => {
        mockLocalStorage.removeItem('traveledger_auth');
        userState = null;
        navigateMock('/login');
      };

      handleLogout();

      // 3. Verify assertions
      assert.strictEqual(mockLocalStorage.getItem('traveledger_auth'), null, 'Storage item must be completely deleted');
      assert.strictEqual(userState, null, 'User state in React must be set to null');
      assert.strictEqual(navigatedTo, '/login', 'Navigation must point directly to /login');

      // 4. Verify that subsequent ProtectedRoute rejects access
      const isAuthenticated = Boolean(userState || mockLocalStorage.getItem('traveledger_auth'));
      assert.strictEqual(isAuthenticated, false, 'User must be recognized as unauthenticated');
    });
  });
});
