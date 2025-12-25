#!/usr/bin/env node
/**
 * Interactive LiquidCode Modal & Layer Verification Script
 *
 * Usage: npx tsx verify-modal-layers.ts
 *
 * Tests 5 unique modal/layer snippets:
 * 1. Modal with button trigger and layer 1
 * 2. Drawer panel with close trigger
 * 3. Multi-layer modal cascade
 * 4. Modal with signal control and layer close
 * 5. Sheet-style modal with content and close button
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

interface TestResult {
  id: number;
  name: string;
  snippet: string;
  parseSuccess: boolean;
  roundtripSuccess: boolean;
  error?: string;
  differences?: string[];
  stats?: {
    layerCount: number;
    signalCount: number;
    blockCount: number;
  };
}

const SNIPPETS = [
  {
    id: 1,
    name: 'Modal with button trigger and layer 1',
    snippet: 'Bt "Open Modal" >/1 /1 9 "Confirm Action" [Bt "Yes" !submit, Bt "Cancel" /<]',
    description: 'Button trigger (>/1) + Modal definition (/1) + Close trigger (/<)',
  },
  {
    id: 2,
    name: 'Drawer panel with close trigger (layer 2)',
    snippet: 'Bt "Show Drawer" >/2 /2 Cn [Tx "Drawer Content", Bt "Close" /<]',
    description: 'Drawer pattern with container and close button',
  },
  {
    id: 3,
    name: 'Multi-layer modal cascade (layer 1 and 2)',
    snippet: '/1 Cn [Tx "Modal 1", Bt "Nested" >/2] /2 9 "Modal 2" [Bt "Back" /<]',
    description: 'Nested modal layers - layer 1 triggers layer 2',
  },
  {
    id: 4,
    name: 'Modal with signal control and layer close',
    snippet: '@modal Bt "Edit" >modal=open /1 Cn <modal [Tx "Edit Form", Bt "Save" !submit]',
    description: 'Signal-driven reactive modal with emit/receive bindings',
  },
  {
    id: 5,
    name: 'Sheet-style modal with content and close button (layer 3)',
    snippet: 'Bt "Show Sheet" >/3 /3 Cn ^r [Tx "Sheet Title", Tx "Content", Bt "Dismiss" /<]',
    description: 'Bottom sheet pattern with row layout and hierarchical close',
  },
];

function countBlocks(block: any): number {
  let count = 1;
  if (block.children && Array.isArray(block.children)) {
    count += block.children.reduce((sum: number, child: any) => sum + countBlocks(child), 0);
  }
  return count;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m');
  console.log('\x1b[1m\x1b[36mLiquidCode Modal & Layer Snippet Verification\x1b[0m');
  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');

  for (const { id, name, snippet, description } of SNIPPETS) {
    const result: TestResult = { id, name, snippet, parseSuccess: false, roundtripSuccess: false };

    console.log(`\x1b[1m\x1b[33m[Snippet ${id}] ${name}\x1b[0m`);
    console.log(`\x1b[90m${description}\x1b[0m`);
    console.log(`\x1b[90mDSL: ${snippet}\x1b[0m\n`);

    try {
      // STEP 1: Parse with parseUI()
      console.log('  \x1b[34mStep 1:\x1b[0m Parsing with parseUI()...');
      const schema = parseUI(snippet);
      result.parseSuccess = true;

      // Collect stats
      const layerCount = schema.layers.length;
      const signalCount = schema.signals.length;
      const blockCount = schema.layers.reduce((sum, layer) => sum + countBlocks(layer.root), 0);

      result.stats = { layerCount, signalCount, blockCount };

      console.log(`    ✓ Parse successful`);
      console.log(`    - Layers: ${layerCount}`);
      console.log(`    - Signals: ${signalCount}`);
      console.log(`    - Total blocks: ${blockCount}`);

      // STEP 2: Verify roundtrip with roundtripUI()
      console.log('\n  \x1b[34mStep 2:\x1b[0m Verifying roundtrip with roundtripUI()...');
      const { isEquivalent, differences, reconstructed } = roundtripUI(schema);
      result.roundtripSuccess = isEquivalent;
      result.differences = differences;

      if (isEquivalent) {
        console.log(`    ✓ Roundtrip successful (0 differences)`);
        console.log(`    - Reconstructed schema matches original`);
      } else {
        console.log(`    ✗ Roundtrip failed with ${differences.length} difference(s)`);
        differences.forEach(diff => console.log(`      - ${diff}`));
      }

      // STEP 3: Overall result
      const overallPass = result.parseSuccess && result.roundtripSuccess;
      console.log('\n  \x1b[' + (overallPass ? '32m✓' : '31m✗') + ' RESULT: ' + (overallPass ? 'PASS' : 'FAIL') + '\x1b[0m\n');

      results.push(result);
    } catch (error) {
      result.error = (error as Error).message;
      console.log(`    \x1b[31m✗ ERROR: ${result.error}\x1b[0m\n`);
      results.push(result);
    }

    console.log('\x1b[90m' + '-'.repeat(80) + '\x1b[0m\n');
  }

  return results;
}

function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.parseSuccess && r.roundtripSuccess).length;
  const failed = results.length - passed;

  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m');
  console.log('\x1b[1m\x1b[36mTest Summary\x1b[0m');
  console.log('\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');

  results.forEach((r, idx) => {
    const status = r.parseSuccess && r.roundtripSuccess ? '✓ PASS' : '✗ FAIL';
    const color = r.parseSuccess && r.roundtripSuccess ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    const parse = r.parseSuccess ? '✓' : '✗';
    const roundtrip = r.roundtripSuccess ? '✓' : '✗';

    console.log(`  ${color}${status}${reset} Snippet ${r.id}: ${r.name}`);
    console.log(`        Parse: ${parse}  Roundtrip: ${roundtrip}`);

    if (r.stats) {
      console.log(`        Stats: ${r.stats.layerCount} layers, ${r.stats.signalCount} signals, ${r.stats.blockCount} blocks`);
    }

    if (r.error) {
      console.log(`        Error: ${r.error}`);
    }
  });

  console.log('\n\x1b[1m\x1b[33mResults:\x1b[0m');
  console.log(`  Total: ${results.length} snippets`);
  console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`  Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  console.log('\n\x1b[36m' + '='.repeat(80) + '\x1b[0m\n');
}

// Main execution
runTests().then(results => {
  printSummary(results);
  const allPassed = results.every(r => r.parseSuccess && r.roundtripSuccess);
  process.exit(allPassed ? 0 : 1);
}).catch(error => {
  console.error('\x1b[31mFatal error:\x1b[0m', error);
  process.exit(1);
});
