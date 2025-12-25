/**
 * Data Table Verification Test Suite
 *
 * Tests 5 NEW unique LiquidCode snippets for data tables with:
 * - Column definitions [:col1, :col2, etc.]
 * - Sortable columns
 * - Filter bindings
 * - Pagination signals
 *
 * Each snippet is parsed with parseUI() and verified with roundtripUI()
 */

import { parseUI, roundtripUI, type LiquidSchema } from './src/compiler/compiler';

// =============================================================================
// Test Fixtures: 5 Unique Data Table Snippets
// =============================================================================

const TABLE_SNIPPETS = [
  {
    id: 'TABLE_001_BASIC_SORTABLE',
    name: 'Basic Sortable Table with Filter',
    description: 'Simple user table with sortable columns and filter signal',
    source: `@filter @sort
Tb :users [:name :email :status]
Bt "Reset Filter" >clearFilter`,
    expectedColumns: ['name', 'email', 'status'],
    expectedSignals: ['filter', 'sort'],
  },

  {
    id: 'TABLE_002_PAGINATION_SIGNAL',
    name: 'Table with Pagination Signals',
    description: 'Product inventory table with pagination and sort signals',
    source: `@pageNum @pageSize @sort
Tb :products [:sku :description :quantity :price]
Bt "First" >pageNum=1
Bt "Next" >pageNum=next
Bt "Last" >pageNum=last`,
    expectedColumns: ['sku', 'description', 'quantity', 'price'],
    expectedSignals: ['pageNum', 'pageSize', 'sort'],
  },

  {
    id: 'TABLE_003_COMPLEX_FILTERS',
    name: 'Table with Complex Filter Bindings',
    description: 'Orders table with multiple filter inputs and pagination',
    source: `@filter @sort @page
In :searchTerm "Search Orders" <filter
Tb :orders [:orderID :customerName :date :totalAmount :status]
Bt "Apply Filters" >filter`,
    expectedColumns: ['orderID', 'customerName', 'date', 'totalAmount', 'status'],
    expectedSignals: ['filter', 'sort', 'page'],
  },

  {
    id: 'TABLE_004_MULTI_COLUMN_SORT',
    name: 'Table with Multi-Column Sort',
    description: 'Transaction table with sortable columns and interactive pagination',
    source: `@sortColumn @sortDir @page @pageSize
Tb :transactions [:txnID :type :amount :timestamp :status]
Cn ^r [
  Bt "Sort Name" >sortColumn=name,
  Bt "Sort Date" >sortColumn=timestamp,
  Bt "Sort Amount" >sortColumn=amount
]
Cn ^r [
  Bt "Ascending" >sortDir=asc,
  Bt "Descending" >sortDir=desc
]`,
    expectedColumns: ['txnID', 'type', 'amount', 'timestamp', 'status'],
    expectedSignals: ['sortColumn', 'sortDir', 'page', 'pageSize'],
  },

  {
    id: 'TABLE_005_INTERACTIVE_DASHBOARD',
    name: 'Interactive Table Dashboard',
    description: 'Analytics table with filters, search, sort, and pagination controls',
    source: `@search @filter @sort @page @mode
0 [
  Cn ^r [
    In :search "Search..." <search,
    Bn "Filter" >filter,
    Bn "Clear" >clearAll
  ]
  Tb :analytics [:metric :value :trend :lastUpdate]
  Cn ^r [
    Bn "◀ Prev" >page=prev,
    Tx "Page 1 of 10",
    Bn "Next ▶" >page=next
  ]
]`,
    expectedColumns: ['metric', 'value', 'trend', 'lastUpdate'],
    expectedSignals: ['search', 'filter', 'sort', 'page', 'mode'],
  },
];

// =============================================================================
// Test Results Interface
// =============================================================================

interface TestResult {
  snippetId: string;
  snippetName: string;
  passed: boolean;
  parseResult: {
    success: boolean;
    error?: string;
    schema?: LiquidSchema;
  };
  roundtripResult: {
    success: boolean;
    isEquivalent: boolean;
    error?: string;
    differences: string[];
  };
  validations: {
    columnsMatch: boolean;
    signalsMatch: boolean;
    schemaStructure: boolean;
  };
}

// =============================================================================
// Test Runner
// =============================================================================

function runDataTableTests(): TestResult[] {
  const results: TestResult[] = [];

  for (const snippet of TABLE_SNIPPETS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${snippet.id}`);
    console.log(`Name: ${snippet.name}`);
    console.log(`Description: ${snippet.description}`);
    console.log(`${'='.repeat(80)}`);

    const result: TestResult = {
      snippetId: snippet.id,
      snippetName: snippet.name,
      passed: false,
      parseResult: { success: false },
      roundtripResult: { success: false, isEquivalent: false, differences: [] },
      validations: {
        columnsMatch: false,
        signalsMatch: false,
        schemaStructure: false,
      },
    };

    // Step 1: Parse the snippet
    console.log('\n[STEP 1] Parsing with parseUI()...');
    let schema: LiquidSchema | undefined;
    try {
      schema = parseUI(snippet.source);
      result.parseResult.success = true;
      console.log('  ✓ Parse successful');
      console.log(`  - Signals parsed: ${schema.signals.length}`);
      console.log(`  - Layers parsed: ${schema.layers.length}`);
    } catch (err) {
      result.parseResult.error = String(err);
      console.log(`  ✗ Parse failed: ${err}`);
      results.push(result);
      continue;
    }

    result.parseResult.schema = schema;

    // Step 2: Validate structure
    console.log('\n[STEP 2] Validating schema structure...');
    try {
      // Check signals
      const signalNames = schema.signals.map(s => s.name);
      const signalsMatch = snippet.expectedSignals.every(sig => signalNames.includes(sig));
      result.validations.signalsMatch = signalsMatch;
      console.log(`  - Expected signals: ${snippet.expectedSignals.join(', ')}`);
      console.log(`  - Parsed signals: ${signalNames.join(', ')}`);
      console.log(`  ${signalsMatch ? '✓' : '✗'} Signals match: ${signalsMatch}`);

      // Check table columns (find table block)
      let tableBlock = null;
      for (const layer of schema.layers) {
        if (layer.root.type === 'table') {
          tableBlock = layer.root;
          break;
        }
        // Look for table in children
        if (layer.root.children) {
          tableBlock = layer.root.children.find(c => c.type === 'table');
          if (tableBlock) break;
        }
      }

      if (tableBlock && tableBlock.columns) {
        const columnsMatch = JSON.stringify(tableBlock.columns.sort()) ===
                            JSON.stringify(snippet.expectedColumns.sort());
        result.validations.columnsMatch = columnsMatch;
        console.log(`  - Expected columns: ${snippet.expectedColumns.join(', ')}`);
        console.log(`  - Parsed columns: ${tableBlock.columns.join(', ')}`);
        console.log(`  ${columnsMatch ? '✓' : '✗'} Columns match: ${columnsMatch}`);
      } else {
        console.log(`  ✗ No table block with columns found in schema`);
        result.validations.columnsMatch = false;
      }

      result.validations.schemaStructure = true;
      console.log(`  ✓ Schema structure valid`);
    } catch (err) {
      console.log(`  ✗ Validation error: ${err}`);
      result.validations.schemaStructure = false;
    }

    // Step 3: Roundtrip test
    console.log('\n[STEP 3] Running roundtrip test...');
    try {
      const roundtripResult = roundtripUI(schema);
      result.roundtripResult.success = true;
      result.roundtripResult.isEquivalent = roundtripResult.isEquivalent;
      result.roundtripResult.differences = roundtripResult.differences;

      console.log(`  ✓ Roundtrip execution successful`);
      console.log(`  ${roundtripResult.isEquivalent ? '✓' : '✗'} Equivalence: ${roundtripResult.isEquivalent}`);
      if (roundtripResult.differences.length > 0) {
        console.log(`  - Differences (${roundtripResult.differences.length}):`);
        roundtripResult.differences.slice(0, 3).forEach(diff => {
          console.log(`    • ${diff}`);
        });
        if (roundtripResult.differences.length > 3) {
          console.log(`    ... and ${roundtripResult.differences.length - 3} more`);
        }
      } else {
        console.log(`  - No differences found`);
      }
    } catch (err) {
      result.roundtripResult.error = String(err);
      console.log(`  ✗ Roundtrip failed: ${err}`);
    }

    // Determine overall pass/fail
    result.passed =
      result.parseResult.success &&
      result.roundtripResult.success &&
      result.roundtripResult.isEquivalent &&
      result.validations.signalsMatch &&
      result.validations.columnsMatch;

    console.log(`\n[RESULT] ${result.passed ? '✓ PASS' : '✗ FAIL'}`);
    results.push(result);
  }

  return results;
}

// =============================================================================
// Summary Report
// =============================================================================

function generateSummaryReport(results: TestResult[]): void {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('SUMMARY REPORT: DATA TABLE VERIFICATION TEST SUITE');
  console.log(`${'='.repeat(80)}\n`);

  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passCount / totalCount) * 100).toFixed(1);

  console.log(`Overall Results: ${passCount}/${totalCount} PASSED (${passRate}%)\n`);

  // Table format results
  console.log('Snippet Results:');
  console.log('-'.repeat(80));
  console.log('ID                        | Name                              | Parse | Roundtrip | Signals | Columns');
  console.log('-'.repeat(80));

  for (const result of results) {
    const id = result.snippetId.padEnd(25);
    const name = result.snippetName.substring(0, 32).padEnd(33);
    const parse = result.parseResult.success ? '✓' : '✗';
    const roundtrip = result.roundtripResult.isEquivalent ? '✓' : '✗';
    const signals = result.validations.signalsMatch ? '✓' : '✗';
    const columns = result.validations.columnsMatch ? '✓' : '✗';

    console.log(`${id} | ${name} | ${parse}     | ${roundtrip}         | ${signals}       | ${columns}`);
  }
  console.log('-'.repeat(80));

  // Detailed results
  console.log('\nDetailed Results:\n');
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${result.snippetId}`);
    console.log(`  - Parse: ${result.parseResult.success ? 'Success' : `Failed - ${result.parseResult.error}`}`);
    console.log(`  - Roundtrip: ${result.roundtripResult.isEquivalent ? 'Equivalent' : 'Not equivalent'}`);
    if (!result.roundtripResult.isEquivalent && result.roundtripResult.differences.length > 0) {
      console.log(`    First difference: ${result.roundtripResult.differences[0]}`);
    }
    console.log(`  - Signals matched: ${result.validations.signalsMatch}`);
    console.log(`  - Columns matched: ${result.validations.columnsMatch}`);
    console.log();
  }

  // Snippets tested
  console.log('\nSnippets Tested:');
  console.log('-'.repeat(80));
  for (const snippet of TABLE_SNIPPETS) {
    const result = results.find(r => r.snippetId === snippet.id);
    const status = result?.passed ? '✓' : '✗';
    console.log(`${status} ${snippet.id}`);
    console.log(`   ${snippet.description}`);
    console.log(`   Columns: ${snippet.expectedColumns.join(', ')}`);
    console.log(`   Signals: ${snippet.expectedSignals.join(', ')}`);
    console.log();
  }

  // Final summary
  console.log('='.repeat(80));
  console.log(`FINAL SCORE: ${passCount}/${totalCount} tests PASSED`);
  if (passCount === totalCount) {
    console.log('Status: ALL TESTS PASSED ✓');
  } else {
    const failCount = totalCount - passCount;
    console.log(`Status: ${failCount} test(s) failed`);
  }
  console.log('='.repeat(80));
}

// =============================================================================
// Main Execution
// =============================================================================

console.log('\n');
console.log('╔' + '═'.repeat(78) + '╗');
console.log('║' + ' '.repeat(15) + 'DATA TABLE VERIFICATION TEST SUITE' + ' '.repeat(29) + '║');
console.log('║' + ' '.repeat(20) + '5 Unique LiquidCode Snippets' + ' '.repeat(30) + '║');
console.log('╚' + '═'.repeat(78) + '╝');

const results = runDataTableTests();
generateSummaryReport(results);

// Export for testing frameworks
export { runDataTableTests, generateSummaryReport, TABLE_SNIPPETS, type TestResult };
