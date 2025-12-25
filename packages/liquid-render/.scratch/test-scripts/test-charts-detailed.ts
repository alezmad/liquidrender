// Detailed Chart Snippet Testing with Schema Analysis
// Tests 5 unique visualization types with comprehensive reporting

import { parseUI, roundtripUI } from './src/compiler/compiler';

interface ChartSnippetTest {
  name: string;
  snippet: string;
  description: string;
  expectedType: string;
}

const chartSnippets: ChartSnippetTest[] = [
  {
    name: 'Line Chart - Dual Axes',
    snippet: `Ln :month :revenue :orders`,
    description: 'Line chart showing revenue and orders over time (dual Y axes)',
    expectedType: '3',
  },
  {
    name: 'Bar Chart - Colored by Category',
    snippet: `Br :region :sales #region`,
    description: 'Bar chart showing sales by region with color mapping',
    expectedType: '2',
  },
  {
    name: 'Pie Chart - Market Share',
    snippet: `Pi :segment :share "Market Share"`,
    description: 'Pie chart displaying market share segments with labels',
    expectedType: '4',
  },
  {
    name: 'Heatmap - 2D Grid',
    snippet: `Hm :day :hour :intensity`,
    description: 'Heatmap showing intensity values across day/hour dimensions',
    expectedType: 'Hm',
  },
  {
    name: 'Gauge - Performance Metric',
    snippet: `Gn :score "Performance Score"`,
    description: 'Gauge chart displaying a single performance metric',
    expectedType: 'Gn',
  },
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║       LIQUIDCODE CHART SNIPPET VERIFICATION REPORT              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

type TestResult = {
  name: string;
  snippet: string;
  parseSuccess: boolean;
  roundtripSuccess: boolean;
  schemaType: string | null;
  regeneratedDSL: string | null;
  errorMessage: string | null;
  schemaDetails: string;
};

const allResults: TestResult[] = [];

for (const test of chartSnippets) {
  console.log(`\n${'-'.repeat(64)}`);
  console.log(`Test: ${test.name}`);
  console.log(`${'-'.repeat(64)}`);
  console.log(`Description: ${test.description}`);
  console.log(`DSL Snippet: "${test.snippet}"`);
  console.log(`Expected Type: ${test.expectedType}`);
  console.log();

  const result: TestResult = {
    name: test.name,
    snippet: test.snippet,
    parseSuccess: false,
    roundtripSuccess: false,
    schemaType: null,
    regeneratedDSL: null,
    errorMessage: null,
    schemaDetails: '',
  };

  try {
    // STEP 1: Parse
    console.log('  Step 1: Parsing DSL with parseUI()...');
    const schema = parseUI(test.snippet);
    result.parseSuccess = true;
    console.log('  ✓ Parse succeeded');

    // Get schema type from first layer's root block
    if (schema.layers[0] && schema.layers[0].root) {
      result.schemaType = schema.layers[0].root.type;
      console.log(`  ✓ Schema type: ${result.schemaType}`);

      // Capture schema details
      const root = schema.layers[0].root;
      const bindingInfo = root.binding
        ? `${root.binding.kind}(${root.binding.value})`
        : 'none';
      const childrenInfo = root.children ? ` + ${root.children.length} children` : '';
      result.schemaDetails = `Type: ${root.type}, Binding: ${bindingInfo}${childrenInfo}`;
      console.log(`  ✓ Binding: ${bindingInfo}`);

      // Log modifiers if present
      if (root.layout) {
        console.log(`  ✓ Layout: Priority=${root.layout.priority}`);
      }
    }

    console.log('\n  Step 2: Roundtrip test (DSL → Schema → DSL)...');
    const { isEquivalent, differences, dsl: regeneratedDSL, reconstructed } = roundtripUI(schema);

    result.regeneratedDSL = regeneratedDSL;

    if (isEquivalent) {
      console.log('  ✓ Roundtrip successful - schemas are equivalent');
      console.log(`  ✓ Regenerated DSL: "${regeneratedDSL}"`);
      result.roundtripSuccess = true;
    } else {
      console.log('  ✗ Roundtrip failed - semantic differences detected:');
      differences.forEach(diff => {
        console.log(`    - ${diff}`);
      });
      result.roundtripSuccess = false;
      result.errorMessage = differences.join('; ');
    }

    // Verify reconstructed schema maintains structure
    console.log('\n  Step 3: Schema integrity verification...');
    if (reconstructed.layers[0]?.root.type === result.schemaType) {
      console.log('  ✓ Reconstructed schema type matches');
    } else {
      console.log(`  ✗ Type mismatch: ${result.schemaType} vs ${reconstructed.layers[0]?.root.type}`);
    }

    console.log('\n  RESULT: ✓ PASS');
  } catch (error) {
    console.log('\n  RESULT: ✗ FAIL');
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errorMessage = errorMsg;
    console.log(`  ERROR: ${errorMsg}`);
    if (error instanceof Error && error.stack) {
      console.log('  Stack:');
      error.stack.split('\n').slice(0, 3).forEach(line => {
        console.log(`    ${line}`);
      });
    }
  }

  allResults.push(result);
}

// SUMMARY REPORT
console.log('\n\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                          SUMMARY REPORT                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const parseSuccesses = allResults.filter(r => r.parseSuccess).length;
const roundtripSuccesses = allResults.filter(r => r.roundtripSuccess).length;

console.log(`Parse Results:    ${parseSuccesses}/${allResults.length} passed`);
console.log(`Roundtrip Results: ${roundtripSuccesses}/${allResults.length} passed\n`);

console.log('Detailed Results:\n');

allResults.forEach((result, idx) => {
  const parseIcon = result.parseSuccess ? '✓' : '✗';
  const roundtripIcon = result.roundtripSuccess ? '✓' : '✗';

  console.log(`${idx + 1}. ${result.name}`);
  console.log(`   Parse:     [${parseIcon}] ${result.parseSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`   Roundtrip: [${roundtripIcon}] ${result.roundtripSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`   DSL: "${result.snippet}"`);

  if (result.schemaType) {
    console.log(`   Schema Type: ${result.schemaType}`);
  }

  if (result.regeneratedDSL) {
    console.log(`   Regenerated: "${result.regeneratedDSL}"`);
  }

  if (result.errorMessage) {
    console.log(`   Error: ${result.errorMessage}`);
  }

  console.log();
});

// CHART SNIPPET SHOWCASE
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║              LIQUIDCODE CHART SYNTAX REFERENCE                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('1. LINE CHARTS (Type: 3 or Ln)');
console.log('   - Ln :x :y');
console.log('   - Ln :x :y1 :y2 (dual axes)');
console.log('   Example: Ln :month :revenue :orders');
console.log();

console.log('2. BAR CHARTS (Type: 2 or Br)');
console.log('   - Br :category :value');
console.log('   - Br :category :value #colorField');
console.log('   Example: Br :region :sales #region');
console.log();

console.log('3. PIE CHARTS (Type: 4 or Pi)');
console.log('   - Pi :label :value');
console.log('   - Pi :label :value "Title"');
console.log('   Example: Pi :segment :share "Market Share"');
console.log();

console.log('4. HEATMAPS (Type: Hm)');
console.log('   - Hm :x :y :intensity');
console.log('   - Hm :row :column :value');
console.log('   Example: Hm :day :hour :intensity');
console.log();

console.log('5. GAUGES (Type: Gn)');
console.log('   - Gn :value');
console.log('   - Gn :value "Label"');
console.log('   - Gn :value "Label" %size');
console.log('   Example: Gn :score "Performance Score"');
console.log();

// JSON Export
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                    MACHINE-READABLE OUTPUT                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const jsonResults = allResults.map(r => ({
  name: r.name,
  snippet: r.snippet,
  parsePass: r.parseSuccess,
  roundtripPass: r.roundtripSuccess,
  schemaType: r.schemaType,
  regeneratedDSL: r.regeneratedDSL,
  passed: r.parseSuccess && r.roundtripSuccess,
  error: r.errorMessage || null,
}));

console.log(JSON.stringify(jsonResults, null, 2));

// Exit code based on results
const allPassed = allResults.every(r => r.parseSuccess && r.roundtripSuccess);
process.exit(allPassed ? 0 : 1);
