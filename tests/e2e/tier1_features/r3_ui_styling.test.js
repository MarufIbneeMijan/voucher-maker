/**
 * r3_ui_styling.test.js
 * Tier 1: Feature Coverage for Requirement R3 (UI/UX Restoration)
 * Tests full-width container layout (absence of max-w-7xl mx-auto),
 * responsive table wrappers (overflow-x-auto) across modals and reports,
 * and multi-theme configuration.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  inspectLayoutWidth,
  inspectTableWrappers,
  inspectThemes,
  readProjectFile
} = require('../helpers/staticInspect');

describe('Tier 1: Feature Coverage - R3 UI/UX Restoration', () => {
  it('T1-R3-01: Main container eliminates restrictive max-w-7xl mx-auto for full-width layout', () => {
    const layout = inspectLayoutWidth();
    assert.ok(layout.fileFound, 'App.jsx must exist');
    assert.strictEqual(
      layout.hasRestrictiveMaxWidth,
      false,
      `Requirement R3: Main container must not contain "max-w-7xl mx-auto". Current classes: "${layout.mainClasses}"`
    );
  });

  it('T1-R3-02: VoucherModal tables are wrapped in overflow-x-auto to prevent horizontal clipping', () => {
    const tableWrappers = inspectTableWrappers();
    const modalCode = readProjectFile('client/src/components/VoucherModal.jsx') || '';

    // Check if table wrappers in VoucherModal have overflow-x-auto
    const hasModalTable = /<table/i.test(modalCode);
    assert.ok(hasModalTable, 'VoucherModal must contain data tables');

    const hasOverflowXAuto = /overflow-x-auto/.test(modalCode);
    assert.ok(
      hasOverflowXAuto,
      'Requirement R3: VoucherModal tables must be wrapped in containers with "overflow-x-auto"'
    );
  });

  it('T1-R3-03: Financial reports utilize responsive overflow-x-auto table containers', () => {
    const reportFiles = [
      'client/src/components/reports/ReceivablesReport.jsx',
      'client/src/components/reports/AdvanceDepositsReport.jsx',
      'client/src/components/reports/KsaExposureReport.jsx',
      'client/src/components/reports/DailyFlowReport.jsx'
    ];

    for (const file of reportFiles) {
      const code = readProjectFile(file);
      assert.ok(code, `${file} must exist`);
      assert.ok(
        code.includes('overflow-x-auto'),
        `Requirement R3: ${file} must wrap table in "overflow-x-auto" container`
      );
    }
  });

  it('T1-R3-04: Multi-theme switching supports Arafa Teal, Midnight Onyx, and Executive Navy', () => {
    const themes = inspectThemes();
    assert.ok(
      themes.supportsThemes,
      `Requirement R3: Application must support all 3 themes (arafa-teal, midnight-onyx, executive-navy). Detected: ${themes.themeNames.join(', ')}`
    );
    assert.ok(
      themes.handlesDarkMode,
      'Requirement R3: Application must synchronize dark class on documentElement for Midnight Onyx'
    );
  });

  it('T1-R3-05: Dashboard and ledger views contain responsive utility classes for mobile viewports', () => {
    const dashboardCode = readProjectFile('client/src/components/Dashboard.jsx') || '';
    const ledgersCode = readProjectFile('client/src/components/LedgerStatements.jsx') || '';

    assert.ok(
      dashboardCode.includes('overflow-x-auto'),
      'Dashboard table must have overflow-x-auto wrapper'
    );
    assert.ok(
      ledgersCode.includes('overflow-x-auto'),
      'Ledger statements table must have overflow-x-auto wrapper'
    );
    assert.ok(
      dashboardCode.includes('grid-cols-1') || dashboardCode.includes('sm:grid-cols'),
      'Dashboard must use responsive grid breakpoints'
    );
  });
});
