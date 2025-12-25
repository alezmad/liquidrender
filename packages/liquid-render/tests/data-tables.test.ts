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

import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI, type LiquidSchema } from '../src/compiler/compiler';

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
// Helper function to find table block
// =============================================================================

function findTableBlock(schema: LiquidSchema) {
  for (const layer of schema.layers) {
    if (layer.root.type === 'table') {
      return layer.root;
    }
    // Look for table in children
    if (layer.root.children) {
      const table = layer.root.children.find(c => c.type === 'table');
      if (table) return table;
    }
  }
  return null;
}

// =============================================================================
// Individual Test Cases
// =============================================================================

describe('Data Table Verification Test Suite - 5 Unique Snippets', () => {
  describe('TABLE_001: Basic Sortable Table with Filter', () => {
    const snippet = TABLE_SNIPPETS[0];

    it('should parse TABLE_001 without errors', () => {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.layers).toHaveLength(1);
    });

    it('should parse TABLE_001 signals correctly', () => {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      expect(signalNames).toContain('filter');
      expect(signalNames).toContain('sort');
    });

    it('should parse TABLE_001 columns correctly', () => {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.type).toBe('table');
      expect(tableBlock?.columns).toEqual(['name', 'email', 'status']);
    });

    it('should roundtrip TABLE_001 with equivalence', () => {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
      expect(result.differences.length).toBe(0);
    });
  });

  describe('TABLE_002: Table with Pagination Signals', () => {
    const snippet = TABLE_SNIPPETS[1];

    it('should parse TABLE_002 without errors', () => {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.layers.length).toBeGreaterThan(0);
    });

    it('should parse TABLE_002 signals correctly', () => {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      expect(signalNames).toContain('pageNum');
      expect(signalNames).toContain('pageSize');
      expect(signalNames).toContain('sort');
    });

    it('should parse TABLE_002 columns correctly', () => {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.columns).toEqual(['sku', 'description', 'quantity', 'price']);
    });

    it('should roundtrip TABLE_002 with equivalence', () => {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
      expect(result.differences.length).toBe(0);
    });
  });

  describe('TABLE_003: Table with Complex Filter Bindings', () => {
    const snippet = TABLE_SNIPPETS[2];

    it('should parse TABLE_003 without errors', () => {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.layers.length).toBeGreaterThan(0);
    });

    it('should parse TABLE_003 signals correctly', () => {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      expect(signalNames).toContain('filter');
      expect(signalNames).toContain('sort');
      expect(signalNames).toContain('page');
    });

    it('should parse TABLE_003 columns correctly', () => {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.columns).toEqual(['orderID', 'customerName', 'date', 'totalAmount', 'status']);
    });

    it('should roundtrip TABLE_003 with equivalence', () => {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
      expect(result.differences.length).toBe(0);
    });
  });

  describe('TABLE_004: Table with Multi-Column Sort', () => {
    const snippet = TABLE_SNIPPETS[3];

    it('should parse TABLE_004 without errors', () => {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.layers.length).toBeGreaterThan(0);
    });

    it('should parse TABLE_004 signals correctly', () => {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      expect(signalNames).toContain('sortColumn');
      expect(signalNames).toContain('sortDir');
      expect(signalNames).toContain('page');
      expect(signalNames).toContain('pageSize');
    });

    it('should parse TABLE_004 columns correctly', () => {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.columns).toEqual(['txnID', 'type', 'amount', 'timestamp', 'status']);
    });

    it('should roundtrip TABLE_004 with equivalence', () => {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
      expect(result.differences.length).toBe(0);
    });
  });

  describe('TABLE_005: Interactive Table Dashboard', () => {
    const snippet = TABLE_SNIPPETS[4];

    it('should parse TABLE_005 without errors', () => {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.layers.length).toBeGreaterThan(0);
    });

    it('should parse TABLE_005 signals correctly', () => {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      expect(signalNames).toContain('search');
      expect(signalNames).toContain('filter');
      expect(signalNames).toContain('sort');
      expect(signalNames).toContain('page');
      expect(signalNames).toContain('mode');
    });

    it('should parse TABLE_005 columns correctly', () => {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.columns).toEqual(['metric', 'value', 'trend', 'lastUpdate']);
    });

    it('should roundtrip TABLE_005 with equivalence', () => {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
      expect(result.differences.length).toBe(0);
    });
  });
});

// =============================================================================
// Summary Tests
// =============================================================================

describe('Data Tables - Summary Statistics', () => {
  it('should have 5 unique snippets defined', () => {
    expect(TABLE_SNIPPETS).toHaveLength(5);
  });

  it('should all snippets be parseable', () => {
    for (const snippet of TABLE_SNIPPETS) {
      const schema = parseUI(snippet.source);
      expect(schema).toBeDefined();
      expect(schema.signals).toBeDefined();
      expect(schema.layers).toBeDefined();
    }
  });

  it('should all snippets roundtrip equivalently', () => {
    for (const snippet of TABLE_SNIPPETS) {
      const schema = parseUI(snippet.source);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    }
  });

  it('should all snippets have expected columns', () => {
    for (const snippet of TABLE_SNIPPETS) {
      const schema = parseUI(snippet.source);
      const tableBlock = findTableBlock(schema);
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.columns).toEqual(snippet.expectedColumns);
    }
  });

  it('should all snippets have expected signals', () => {
    for (const snippet of TABLE_SNIPPETS) {
      const schema = parseUI(snippet.source);
      const signalNames = schema.signals.map(s => s.name);
      for (const expectedSig of snippet.expectedSignals) {
        expect(signalNames).toContain(expectedSig);
      }
    }
  });
});
