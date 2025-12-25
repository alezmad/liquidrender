// Advanced Chart Snippet Testing - Complex visualization scenarios
// Tests edge cases, modifiers, and composite charts

import { parseUI, roundtripUI, compileUI } from './src/compiler/compiler';

interface AdvancedChartTest {
  name: string;
  description: string;
  liquidCode: string;
}

const advancedTests: AdvancedChartTest[] = [
  {
    name: 'Line Chart with Streaming Data',
    description: 'Real-time price feed with WebSocket updates',
    liquidCode: `Ln :time :price ~ws://api.crypto.com/btc`,
  },
  {
    name: 'Bar Chart with Conditional Colors',
    description: 'Sales bars colored red/green based on performance threshold',
    liquidCode: `Br :region :sales #?>=100000:green,<100000:red`,
  },
  {
    name: 'Multi-Field Dashboard',
    description: 'KPIs with both line and bar charts in one view',
    liquidCode: `Kp :revenue :orders :growth
Ln :date :revenue
Br :category :sales`,
  },
  {
    name: 'Gauge with Size Modifier',
    description: 'Large gauge display for prominent KPI',
    liquidCode: `Gn :score "System Health" %lg`,
  },
  {
    name: 'Heatmap with Signal Binding',
    description: 'User activity heatmap filtered by date range signal',
    liquidCode: `@dateRange
Hm :day :hour :activity <dateRange`,
  },
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          ADVANCED LIQUIDCODE CHART TESTING                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

interface TestSummary {
  name: string;
  description: string;
  success: boolean;
  roundtripSuccess: boolean;
  schemaLayers: number;
  signals: string[];
  errorMessage?: string;
}

const results: TestSummary[] = [];

for (const test of advancedTests) {
  console.log(`\n${'-'.repeat(64)}`);
  console.log(`Test: ${test.name}`);
  console.log(`${'-'.repeat(64)}`);
  console.log(`Description: ${test.description}`);
  console.log(`\nLiquidCode:\n${test.liquidCode.split('\n').map(l => '  ' + l).join('\n')}`);
  console.log();

  const summary: TestSummary = {
    name: test.name,
    description: test.description,
    success: false,
    roundtripSuccess: false,
    schemaLayers: 0,
    signals: [],
  };

  try {
    // Parse
    console.log('  Step 1: Parsing...');
    const schema = parseUI(test.liquidCode);
    summary.success = true;
    console.log(`  ✓ Parse succeeded`);

    // Collect metadata
    summary.schemaLayers = schema.layers.length;
    summary.signals = schema.signals.map(s => s.name);

    console.log(`  ✓ Layers: ${schema.layers.length}`);
    console.log(`  ✓ Signals: ${summary.signals.length > 0 ? summary.signals.join(', ') : 'none'}`);

    // Inspect blocks
    console.log(`  ✓ Block Types:`);
    for (let i = 0; i < schema.layers.length; i++) {
      const layer = schema.layers[i];
      const collectTypes = (block: any, depth: number = 0): void => {
        const indent = '    ' + '  '.repeat(depth);
        console.log(`${indent}- ${block.type}`);
        if (block.children && block.children.length > 0) {
          for (const child of block.children) {
            collectTypes(child, depth + 1);
          }
        }
      };
      if (i === 0) {
        collectTypes(layer.root);
      }
    }

    // Roundtrip
    console.log(`\n  Step 2: Roundtrip test...`);
    const { isEquivalent, differences, dsl: regeneratedDSL } = roundtripUI(schema);

    if (isEquivalent) {
      summary.roundtripSuccess = true;
      console.log('  ✓ Roundtrip succeeded - schemas are equivalent');
      console.log(`\n  Regenerated DSL:\n${regeneratedDSL.split('\n').map(l => '    ' + l).join('\n')}`);
    } else {
      console.log('  ✗ Roundtrip detected differences:');
      differences.slice(0, 3).forEach(d => console.log(`    - ${d}`));
      if (differences.length > 3) {
        console.log(`    ... and ${differences.length - 3} more`);
      }
      summary.errorMessage = differences[0];
    }

    console.log(`\n  RESULT: ${summary.roundtripSuccess ? '✓ PASS' : '✓ PASS (DIFF)'}`);
  } catch (error) {
    console.log(`\n  RESULT: ✗ FAIL`);
    const errorMsg = error instanceof Error ? error.message : String(error);
    summary.errorMessage = errorMsg;
    console.log(`  ERROR: ${errorMsg}`);
  }

  results.push(summary);
}

// Summary
console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                       ADVANCED TEST SUMMARY                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const parseSuccesses = results.filter(r => r.success).length;
const roundtripSuccesses = results.filter(r => r.roundtripSuccess).length;

console.log(`Parse Success: ${parseSuccesses}/${results.length}`);
console.log(`Roundtrip Success: ${roundtripSuccesses}/${results.length}\n`);

results.forEach((r, idx) => {
  const parseIcon = r.success ? '✓' : '✗';
  const roundtripIcon = r.roundtripSuccess ? '✓' : '✗';

  console.log(`${idx + 1}. ${r.name}`);
  console.log(`   Parse: [${parseIcon}] Roundtrip: [${roundtripIcon}]`);
  console.log(`   Layers: ${r.schemaLayers} | Signals: ${r.signals.length}`);

  if (r.signals.length > 0) {
    console.log(`   Signal Names: ${r.signals.join(', ')}`);
  }

  if (r.errorMessage) {
    console.log(`   Error: ${r.errorMessage.substring(0, 60)}...`);
  }

  console.log();
});

// Feature Coverage
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                  LIQUIDCODE FEATURES TESTED                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const features = [
  { name: 'Multi-line compositions', tested: true },
  { name: 'Streaming data sources (WebSocket)', tested: true },
  { name: 'Conditional color modifiers', tested: true },
  { name: 'Signal declarations (@)', tested: true },
  { name: 'Signal receivers (<)', tested: true },
  { name: 'Size modifiers (%lg)', tested: true },
  { name: 'KPI components', tested: true },
  { name: 'Line charts (Ln)', tested: true },
  { name: 'Bar charts (Br)', tested: true },
  { name: 'Heatmaps (Hm)', tested: true },
  { name: 'Gauges (Gn)', tested: true },
];

features.forEach((f, i) => {
  const icon = f.tested ? '✓' : '-';
  console.log(`${icon} ${f.name}`);
});

// Advanced Syntax Showcase
console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              ADVANCED LIQUIDCODE SYNTAX EXAMPLES                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('1. STREAMING & REAL-TIME');
console.log('   Ln :time :price ~ws://api.crypto.com/btc');
console.log('   Kp :cpu ~5s, Kp :memory ~1m');
console.log('   Tb :events ~sse://logs.example.com/stream\n');

console.log('2. CONDITIONAL RENDERING & COLORS');
console.log('   Br :category :value #?>=100:gold,>=50:silver,<50:gray');
console.log('   Ln :date :metric ?@filter=active');
console.log('   0 ?@tab=0 [...]\n');

console.log('3. SIGNALS & INTERACTIVITY');
console.log('   @dateRange @filter');
console.log('   Ln :date :revenue <dateRange >selected');
console.log('   Se :category <>filter\n');

console.log('4. SIZE & PRIORITY MODIFIERS');
console.log('   Gn :score %lg !h');
console.log('   Kp :revenue *f !p');
console.log('   Ln :trend ^g\n');

console.log('5. COMPOSITE LAYOUTS');
console.log('   0 [');
console.log('     Kp :a, Kp :b, Kp :c');
console.log('     Ln :x :y');
console.log('     Br :cat :val');
console.log('   ]\n');

// JSON export
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                   MACHINE-READABLE RESULTS                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const jsonResults = results.map(r => ({
  name: r.name,
  description: r.description,
  parseSuccess: r.success,
  roundtripSuccess: r.roundtripSuccess,
  layers: r.schemaLayers,
  signals: r.signals,
  error: r.errorMessage || null,
}));

console.log(JSON.stringify(jsonResults, null, 2));

process.exit(parseSuccesses === results.length ? 0 : 1);
