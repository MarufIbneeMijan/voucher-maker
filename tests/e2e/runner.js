#!/usr/bin/env node
/**
 * runner.js
 * TravelLedger Comprehensive E2E Test Suite Runner
 *
 * Single command test runner executing opaque-box test suites across Tiers 1-4:
 *   Tier 1: Feature Coverage (R1 Auth, R2 Routing & Buttons, R3 UI/UX)
 *   Tier 2: Boundary & Corner Cases (R1, R2, R3)
 *   Tier 3: Cross-Feature Pairwise Combinations
 *   Tier 4: Real-World Application Workflows
 *
 * Usage:
 *   node tests/e2e/runner.js
 *   node tests/e2e/runner.js --tier=1
 *   node tests/e2e/runner.js --milestone=m1
 */

const path = require('path');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');

const ALL_TEST_FILES = [
  path.join(__dirname, 'tier1_features/r1_auth_features.test.js'),
  path.join(__dirname, 'tier1_features/r2_routing_buttons.test.js'),
  path.join(__dirname, 'tier1_features/r3_ui_styling.test.js'),
  path.join(__dirname, 'tier2_boundaries/r1_auth_boundaries.test.js'),
  path.join(__dirname, 'tier2_boundaries/r2_routing_boundaries.test.js'),
  path.join(__dirname, 'tier2_boundaries/r3_ui_boundaries.test.js'),
  path.join(__dirname, 'tier3_combinations/cross_feature.test.js'),
  path.join(__dirname, 'tier4_real_world/real_world_scenarios.test.js')
];

function parseArgs() {
  const args = process.argv.slice(2);
  let filterTier = null;
  let filterMilestone = null;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      filterTier = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--milestone=')) {
      filterMilestone = arg.split('=')[1].toLowerCase();
    }
  }

  return { filterTier, filterMilestone };
}

function selectTestFiles({ filterTier, filterMilestone }) {
  let files = [...ALL_TEST_FILES];

  if (filterTier) {
    if (filterTier === 1) {
      files = files.filter((f) => f.includes('tier1_features'));
    } else if (filterTier === 2) {
      files = files.filter((f) => f.includes('tier2_boundaries'));
    } else if (filterTier === 3) {
      files = files.filter((f) => f.includes('tier3_combinations'));
    } else if (filterTier === 4) {
      files = files.filter((f) => f.includes('tier4_real_world'));
    }
  }

  if (filterMilestone) {
    if (filterMilestone === 'm1') {
      files = files.filter((f) => f.includes('r1_auth') || f.includes('cross_feature') || f.includes('real_world'));
    } else if (filterMilestone === 'm2') {
      files = files.filter((f) => f.includes('r2_routing'));
    } else if (filterMilestone === 'm3') {
      files = files.filter((f) => f.includes('r3_ui'));
    }
  }

  return files;
}

async function main() {
  console.log('========================================================================');
  console.log('   TravelLedger Opaque-Box E2E Test Suite Runner');
  console.log('   Specification: ORIGINAL_REQUEST.md (R1, R2, R3) | Tiers: 1 - 4');
  console.log('========================================================================');

  const options = parseArgs();
  const selectedFiles = selectTestFiles(options);

  console.log(`\nDiscovered ${selectedFiles.length} test suite file(s) to execute:`);
  selectedFiles.forEach((file, idx) => {
    console.log(`  [${idx + 1}] ${path.relative(path.resolve(__dirname, '../..'), file)}`);
  });
  console.log('\nStarting test run...\n');

  let passedTests = 0;
  let failedTests = 0;
  let totalTests = 0;
  const failureDetails = [];

  const testStream = run({
    files: selectedFiles,
    concurrency: 1
  });

  // Track results
  testStream.on('test:pass', (t) => {
    if (t.nesting > 0) {
      passedTests++;
      totalTests++;
    }
  });

  testStream.on('test:fail', (t) => {
    if (t.nesting > 0) {
      failedTests++;
      totalTests++;
      failureDetails.push({
        name: t.name,
        file: t.file ? path.basename(t.file) : 'unknown',
        error: t.details?.error?.message || 'Assertion failed'
      });
    }
  });

  // Pipe to standard spec reporter
  testStream.compose(spec).pipe(process.stdout);

  testStream.on('end', () => {
    console.log('\n========================================================================');
    console.log('                        TEST RUN SUMMARY');
    console.log('========================================================================');
    console.log(`  Total Tests Run:    ${totalTests}`);
    console.log(`  Total Passed:       ${passedTests}`);
    console.log(`  Total Failed:       ${failedTests}`);
    console.log('------------------------------------------------------------------------');

    if (failedTests > 0) {
      console.log('\nIdentified Failures / Outstanding Implementation Targets:');
      failureDetails.forEach((fail, idx) => {
        console.log(`  ${idx + 1}. [${fail.file}] ${fail.name}`);
        console.log(`     Reason: ${fail.error.split('\n')[0]}`);
      });
      console.log('\nNote: Failures in R2 / R3 reflect milestones in progress by implementing agents.');
      console.log('========================================================================\n');
      process.exitCode = 1;
    } else {
      console.log('\n🎉 ALL EXECUTED E2E TESTS PASSED CLEANLY (100% PASS RATE)!');
      console.log('========================================================================\n');
      process.exitCode = 0;
    }
  });
}

main().catch((err) => {
  console.error('[Runner Fatal Error]:', err);
  process.exit(1);
});
