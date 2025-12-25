/**
 * Data Table Verification Report Generator
 *
 * Generates a detailed report of 5 unique LiquidCode data table snippets
 * parsed with parseUI() and verified with roundtripUI()
 */

import { parseUI, roundtripUI, type LiquidSchema } from './src/compiler/compiler';

// =============================================================================
// Snippet Definitions
// =============================================================================

interface TableSnippet {
  id: string;
  name: string;
  description: string;
  source: string;
  expectedColumns: string[];
  expectedSignals: string[];
}

const TABLE_SNIPPETS: TableSnippet[] = [
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
    Bt "Filter" >filter,
    Bt "Clear" >clearAll
  ]
  Tb :analytics [:metric :value :trend :lastUpdate]
  Cn ^r [
    Bt "◀ Prev" >page=prev,
    Tx "Page 1 of 10",
    Bt "Next ▶" >page=next
  ]
]`,
    expectedColumns: ['metric', 'value', 'trend', 'lastUpdate'],
    expectedSignals: ['search', 'filter', 'sort', 'page', 'mode'],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function findTableBlock(schema: LiquidSchema) {
  for (const layer of schema.layers) {
    if (layer.root.type === 'table') {
      return layer.root;
    }
    if (layer.root.children) {
      const table = layer.root.children.find(c => c.type === 'table');
      if (table) return table;
    }
  }
  return null;
}

interface VerificationResult {
  snippetId: string;
  snippetName: string;
  passed: boolean;
  parseError?: string;
  roundtripError?: string;
  signalsPassed: boolean;
  columnsPassed: boolean;
  roundtripEquivalent: boolean;
  roundtripDifferences: string[];
}

function verifySnippet(snippet: TableSnippet): VerificationResult {
  const result: VerificationResult = {
    snippetId: snippet.id,
    snippetName: snippet.name,
    passed: false,
    signalsPassed: false,
    columnsPassed: false,
    roundtripEquivalent: false,
    roundtripDifferences: [],
  };

  // Step 1: Parse
  let schema: LiquidSchema;
  try {
    schema = parseUI(snippet.source);
  } catch (err) {
    result.parseError = String(err);
    return result;
  }

  // Step 2: Verify signals
  const signalNames = schema.signals.map(s => s.name);
  result.signalsPassed = snippet.expectedSignals.every(sig => signalNames.includes(sig));

  // Step 3: Verify columns
  const tableBlock = findTableBlock(schema);
  if (tableBlock && tableBlock.columns) {
    result.columnsPassed = JSON.stringify(tableBlock.columns.sort()) ===
                          JSON.stringify(snippet.expectedColumns.sort());
  }

  // Step 4: Roundtrip
  try {
    const rtResult = roundtripUI(schema);
    result.roundtripEquivalent = rtResult.isEquivalent;
    result.roundtripDifferences = rtResult.differences;
  } catch (err) {
    result.roundtripError = String(err);
  }

  // Determine pass/fail
  result.passed =
    !result.parseError &&
    result.signalsPassed &&
    result.columnsPassed &&
    result.roundtripEquivalent &&
    result.roundtripDifferences.length === 0;

  return result;
}

// =============================================================================
// Report Generation
// =============================================================================

function generateReport(): void {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(18) + 'DATA TABLE VERIFICATION REPORT' + ' '.repeat(30) + '║');
  console.log('║' + ' '.repeat(20) + '5 Unique LiquidCode Snippets' + ' '.repeat(30) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log();

  const results: VerificationResult[] = [];

  // Run all verifications
  for (const snippet of TABLE_SNIPPETS) {
    const result = verifySnippet(snippet);
    results.push(result);
  }

  // Count results
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;

  // Summary line
  console.log(`Overall Results: ${passCount}/${results.length} PASSED`);
  console.log();

  // Detailed results
  for (let i = 0; i < results.length; i++) {
    const snippet = TABLE_SNIPPETS[i];
    const result = results[i];

    console.log(`${'─'.repeat(78)}`);
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${snippet.id}`);
    console.log(`Name: ${snippet.name}`);
    console.log(`Description: ${snippet.description}`);
    console.log();

    // Source code
    console.log(`Source Code:`);
    const sourceLines = snippet.source.split('\n');
    sourceLines.forEach(line => {
      console.log(`  ${line}`);
    });
    console.log();

    // Specifications
    console.log(`Specifications:`);
    console.log(`  Columns: ${snippet.expectedColumns.join(', ')}`);
    console.log(`  Signals: ${snippet.expectedSignals.join(', ')}`);
    console.log();

    // Verification Results
    console.log(`Verification Results:`);

    if (result.parseError) {
      console.log(`  Parse: FAIL - ${result.parseError}`);
    } else {
      console.log(`  Parse: PASS`);
    }

    console.log(`  Signals Verified: ${result.signalsPassed ? 'PASS' : 'FAIL'}`);
    console.log(`  Columns Verified: ${result.columnsPassed ? 'PASS' : 'FAIL'}`);

    if (result.roundtripError) {
      console.log(`  Roundtrip: FAIL - ${result.roundtripError}`);
    } else {
      console.log(`  Roundtrip Equivalence: ${result.roundtripEquivalent ? 'PASS' : 'FAIL'}`);
      if (result.roundtripDifferences.length > 0) {
        console.log(`    Differences found: ${result.roundtripDifferences.length}`);
        result.roundtripDifferences.slice(0, 2).forEach(diff => {
          console.log(`      - ${diff}`);
        });
      }
    }
    console.log();
  }

  // Summary Table
  console.log(`${'═'.repeat(78)}`);
  console.log('Summary Table:');
  console.log(`${'─'.repeat(78)}`);
  console.log('ID            | Name                          | Parse | Signals | Columns | Roundtrip');
  console.log(`${'─'.repeat(78)}`);

  for (const result of results) {
    const id = result.snippetId.padEnd(14);
    const name = result.snippetName.substring(0, 29).padEnd(30);
    const parse = result.parseError ? '✗' : '✓';
    const signals = result.signalsPassed ? '✓' : '✗';
    const columns = result.columnsPassed ? '✓' : '✗';
    const roundtrip = result.roundtripEquivalent ? '✓' : '✗';

    console.log(`${id} | ${name} | ${parse}     | ${signals}       | ${columns}       | ${roundtrip}`);
  }
  console.log(`${'═'.repeat(78)}`);
  console.log();

  // Final Summary
  console.log('Final Summary:');
  console.log(`${'─'.repeat(78)}`);
  console.log(`Total Snippets: ${TABLE_SNIPPETS.length}`);
  console.log(`Tests Passed: ${passCount}`);
  console.log(`Tests Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / TABLE_SNIPPETS.length) * 100).toFixed(1)}%`);
  console.log();

  if (passCount === TABLE_SNIPPETS.length) {
    console.log('Status: ALL TESTS PASSED ✓✓✓');
  } else {
    console.log(`Status: ${failCount} test(s) failed`);
  }
  console.log(`${'═'.repeat(78)}`);
  console.log();
}

// Run the report
generateReport();
