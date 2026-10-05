/**
 * staticInspect.js
 * Opaque-box file and source code inspection helpers for TravelLedger E2E tests.
 * Inspects package.json dependencies, component prop interfaces,
 * React Router structures, and responsive CSS class configurations.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const SERVER_DIR = path.join(ROOT_DIR, 'server');

/**
 * Safely reads a file as UTF-8 string or returns null if not found.
 * @param {string} relativePath - Path relative to project root
 * @returns {string|null}
 */
function readProjectFile(relativePath) {
  const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Reads and parses client/package.json.
 * @returns {object|null}
 */
function getClientPackageJson() {
  const content = readProjectFile('client/package.json');
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (_) {
    return null;
  }
}

/**
 * Checks if a specific dependency is present in client package dependencies.
 * @param {string} depName - e.g. 'react-router-dom'
 * @returns {boolean}
 */
function hasClientDependency(depName) {
  const pkg = getClientPackageJson();
  if (!pkg) return false;
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  return Boolean(deps[depName] || devDeps[depName]);
}

/**
 * Reads users.json from server data directory.
 * @returns {Array|null}
 */
function getUsersData() {
  const content = readProjectFile('server/data/users.json');
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (_) {
    return null;
  }
}

/**
 * Inspects DataEntryForm.jsx to verify user prop destructuring contract.
 * @returns {{
 *   fileFound: boolean,
 *   destructuresUser: boolean,
 *   hasUserParam: boolean,
 *   usesUserInPayload: boolean
 * }}
 */
function inspectDataEntryForm() {
  const code = readProjectFile('client/src/components/DataEntryForm.jsx');
  if (!code) {
    return { fileFound: false, destructuresUser: false, hasUserParam: false, usesUserInPayload: false };
  }

  // Check component function signature parameter list
  const signatureMatch = code.match(/export\s+default\s+function\s+DataEntryForm\s*\(\s*\{([^}]*)\}\s*\)/);
  let destructuresUser = false;
  if (signatureMatch) {
    const propsList = signatureMatch[1].split(',').map((p) => p.trim());
    destructuresUser = propsList.includes('user');
  }

  const usesUserInPayload = /createdBy\s*:\s*user\??\./.test(code);

  return {
    fileFound: true,
    destructuresUser,
    hasUserParam: destructuresUser,
    usesUserInPayload
  };
}

/**
 * Inspects Navbar.jsx and App.jsx to verify logout button contract.
 * @returns {{
 *   navbarReceivesOnLogout: boolean,
 *   navbarWiresLogoutClick: boolean,
 *   appPassesOnLogoutToNavbar: boolean,
 *   appClearsLocalStorageOnLogout: boolean
 * }}
 */
function inspectLogoutButtonContract() {
  const appCode = readProjectFile('client/src/App.jsx') || '';
  const navbarCode = readProjectFile('client/src/components/Navbar.jsx') || '';

  // Does Navbar accept onLogout prop in signature?
  const navbarReceivesOnLogout = /function\s+Navbar\s*\(\s*\{[^}]*\bonLogout\b[^}]*\}\s*\)/.test(navbarCode);

  // Does Navbar bind onClick={onLogout} to a button?
  const navbarWiresLogoutClick = /<button[^>]*onClick=\{onLogout\}[^>]*>[\s\S]*?(?:Logout|লগআউট)/i.test(navbarCode)
    || /onClick=\{onLogout\}/.test(navbarCode);

  // Does App.jsx pass onLogout to <Navbar ... />?
  const appPassesOnLogoutToNavbar = /<Navbar[\s\S]*?\bonLogout\s*=\s*\{/.test(appCode);

  // Does logout handler in App clear localStorage?
  const appClearsLocalStorageOnLogout = /localStorage\.removeItem\(\s*['"]traveledger_auth['"]\s*\)/.test(appCode);

  return {
    navbarReceivesOnLogout,
    navbarWiresLogoutClick,
    appPassesOnLogoutToNavbar,
    appClearsLocalStorageOnLogout
  };
}

/**
 * Inspects App.jsx for full-width layout constraints.
 * @returns {{
 *   fileFound: boolean,
 *   hasRestrictiveMaxWidth: boolean,
 *   mainClasses: string
 * }}
 */
function inspectLayoutWidth() {
  const code = readProjectFile('client/src/App.jsx');
  if (!code) return { fileFound: false, hasRestrictiveMaxWidth: false, mainClasses: '' };

  const mainMatch = code.match(/<main\s+className=["']([^"']*)["']/);
  const mainClasses = mainMatch ? mainMatch[1] : '';

  // Restrictive if contains max-w-7xl mx-auto
  const hasRestrictiveMaxWidth = /max-w-7xl/.test(mainClasses) && /mx-auto/.test(mainClasses);

  return {
    fileFound: true,
    hasRestrictiveMaxWidth,
    mainClasses
  };
}

/**
 * Inspects table wrappers in VoucherModal.jsx and report components.
 * @returns {{
 *   voucherModalTableWrappers: Array<{ hasOverflowXAuto: boolean, hasOverflowHidden: boolean, rawClass: string }>
 * }}
 */
function inspectTableWrappers() {
  const modalCode = readProjectFile('client/src/components/VoucherModal.jsx') || '';

  // Find divs that wrap tables in VoucherModal
  const divTableMatches = [...modalCode.matchAll(/<div\s+className=["']([^"']*)["'][^>]*>\s*<table/g)];
  const voucherModalTableWrappers = divTableMatches.map((m) => {
    const rawClass = m[1];
    return {
      hasOverflowXAuto: rawClass.includes('overflow-x-auto'),
      hasOverflowHidden: rawClass.includes('overflow-hidden'),
      rawClass
    };
  });

  return {
    voucherModalTableWrappers
  };
}

/**
 * Inspects React Router configuration across App.jsx and main.jsx.
 * @returns {{
 *   usesBrowserRouter: boolean,
 *   usesRoutes: boolean,
 *   declaredRoutes: string[],
 *   hasProtectedRoute: boolean
 * }}
 */
function inspectRouterSetup() {
  const appCode = readProjectFile('client/src/App.jsx') || '';
  const mainCode = readProjectFile('client/src/main.jsx') || '';
  const combined = appCode + '\n' + mainCode;

  const usesBrowserRouter = /BrowserRouter/.test(combined);
  const usesRoutes = /<Routes>/.test(appCode);
  const hasProtectedRoute = /ProtectedRoute/.test(appCode) || fs.existsSync(path.join(CLIENT_DIR, 'src/components/ProtectedRoute.jsx'));

  // Extract path="..." from <Route path="..." />
  const routeMatches = [...appCode.matchAll(/<Route\s+[^>]*path=["']([^"']+)["']/g)];
  const declaredRoutes = routeMatches.map((m) => m[1]);

  return {
    usesBrowserRouter,
    usesRoutes,
    declaredRoutes,
    hasProtectedRoute
  };
}

/**
 * Inspects theme switching capability in App.jsx and Navbar.jsx.
 * @returns {{
 *   supportsThemes: boolean,
 *   themeNames: string[],
 *   handlesDarkMode: boolean
 * }}
 */
function inspectThemes() {
  const appCode = readProjectFile('client/src/App.jsx') || '';
  const navbarCode = readProjectFile('client/src/components/Navbar.jsx') || '';

  const expectedThemes = ['arafa-teal', 'midnight-onyx', 'executive-navy'];
  const foundThemes = expectedThemes.filter((t) => appCode.includes(t) && navbarCode.includes(t));

  const handlesDarkMode = appCode.includes("classList.add('dark')") && appCode.includes("classList.remove('dark')");

  return {
    supportsThemes: foundThemes.length === expectedThemes.length,
    themeNames: foundThemes,
    handlesDarkMode
  };
}

module.exports = {
  readProjectFile,
  getClientPackageJson,
  hasClientDependency,
  getUsersData,
  inspectDataEntryForm,
  inspectLogoutButtonContract,
  inspectLayoutWidth,
  inspectTableWrappers,
  inspectRouterSetup,
  inspectThemes
};
