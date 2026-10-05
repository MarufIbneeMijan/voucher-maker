/**
 * r3_ui_boundaries.test.js
 * Tier 2: Boundary & Corner Cases for Requirement R3 (UI/UX Restoration)
 * Tests boundary conditions: table overflow wrapper combinations, container responsive padding,
 * theme storage fallback, dark mode class toggling, and table responsive sizing.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  readProjectFile,
  inspectLayoutWidth,
  inspectThemes
} = require('../helpers/staticInspect');

describe('Tier 2: Boundary & Corner Cases - R3 UI/UX', () => {
  it('T2-R3-01: Table containers do not trap content in overflow-hidden without overflow-x-auto', () => {
    const modalCode = readProjectFile('client/src/components/VoucherModal.jsx') || '';

    // Check if table parent has overflow-x-auto
    const tableDivMatches = [...modalCode.matchAll(/<div\s+className=["']([^"']*)["'][^>]*>\s*<table/g)];
    for (const match of tableDivMatches) {
      const cls = match[1];
      const hasAuto = cls.includes('overflow-x-auto');
      const hasHiddenOnly = cls.includes('overflow-hidden') && !hasAuto;
      assert.strictEqual(
        hasHiddenOnly,
        false,
        `Table container has "overflow-hidden" without "overflow-x-auto", causing table clipping: "${cls}"`
      );
    }
  });

  it('T2-R3-02: Main layout container maintains responsive padding across screen breakpoints', () => {
    const layout = inspectLayoutWidth();
    assert.ok(layout.fileFound, 'App.jsx must exist');

    const hasResponsivePadding = layout.mainClasses.includes('px-4')
      && layout.mainClasses.includes('sm:px-6')
      && layout.mainClasses.includes('lg:px-8');

    assert.ok(
      hasResponsivePadding,
      `Main container must maintain responsive padding (px-4 sm:px-6 lg:px-8). Found: "${layout.mainClasses}"`
    );
  });

  it('T2-R3-03: Theme initialization provides fallback to arafa-teal when storage is empty or corrupt', () => {
    const appCode = readProjectFile('client/src/App.jsx') || '';

    const hasThemeFallback = appCode.includes("|| 'arafa-teal'")
      || appCode.includes('|| "arafa-teal"');

    assert.ok(
      hasThemeFallback,
      'Theme initialization must fall back safely to "arafa-teal" when localStorage is empty'
    );
  });

  it('T2-R3-04: Dark mode class toggling is strictly synchronized between themes', () => {
    const themes = inspectThemes();
    assert.ok(themes.handlesDarkMode, 'Dark mode class management must be implemented');

    const appCode = readProjectFile('client/src/App.jsx') || '';
    assert.ok(
      appCode.includes("currentTheme === 'midnight-onyx'"),
      'Dark mode must strictly activate only for midnight-onyx theme'
    );
  });

  it('T2-R3-05: Table elements utilize w-full fluid layout rather than rigid fixed pixel widths', () => {
    const files = [
      'client/src/components/Dashboard.jsx',
      'client/src/components/LedgerStatements.jsx',
      'client/src/components/VoucherModal.jsx'
    ];

    for (const file of files) {
      const code = readProjectFile(file) || '';
      const tableTagMatches = [...code.matchAll(/<table\s+className=["']([^"']*)["']/g)];
      for (const match of tableTagMatches) {
        const cls = match[1];
        assert.ok(
          cls.includes('w-full'),
          `Table in ${file} must have "w-full" class for fluid responsiveness. Found: "${cls}"`
        );
      }
    }
  });
});
