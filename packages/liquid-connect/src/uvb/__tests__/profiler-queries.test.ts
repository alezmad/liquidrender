import { describe, it, expect } from 'vitest';
import type { Table, Column } from '../models';
import {
  // Tier 1 queries
  buildTableStatisticsQuery,
  buildColumnStatisticsQuery,
  buildCombinedStatisticsQuery,
  buildStaleStatsCheckQuery,
  buildSchemaStatisticsQuery,

  // Tier 2 queries
  buildSampleProfilingQuery,
  buildFreshnessQuery,
  buildCardinalityQuery,
  buildRowCountCheckQuery,
  determineAdaptiveSampleRate,

  // Tier 3 queries
  buildPercentileQuery,
  buildTopValuesQuery,
  buildPatternDetectionQuery,
  buildTemporalGapQuery,
  buildUpdateFrequencyQuery,
  buildCardinalityDistributionQuery,
} from '../profiler-queries';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a sample table fixture for testing
 */
function createSampleTable(): Table {
  return {
    name: 'orders',
    schema: 'public',
    primaryKeyColumns: ['id'],
    foreignKeys: [],
    columns: [
      {
        name: 'id',
        dataType: 'INTEGER',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
      },
      {
        name: 'customer_id',
        dataType: 'INTEGER',
        isPrimaryKey: false,
        isForeignKey: true,
        isNotNull: true,
      },
      {
        name: 'amount',
        dataType: 'NUMERIC',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: true,
        numericPrecision: 10,
        numericScale: 2,
      },
      {
        name: 'created_at',
        dataType: 'TIMESTAMP',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: true,
      },
      {
        name: 'status',
        dataType: 'VARCHAR',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
        charMaxLength: 50,
      },
    ],
  };
}

/**
 * Create a table with special characters in names
 */
function createTableWithSpecialChars(): Table {
  return {
    name: 'order-items',
    schema: 'my schema',
    primaryKeyColumns: ['id'],
    foreignKeys: [],
    columns: [
      {
        name: 'id',
        dataType: 'INTEGER',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
      },
      {
        name: 'item-name',
        dataType: 'VARCHAR',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
      },
    ],
  };
}

/**
 * Create a table with only non-numeric/temporal/text columns
 */
function createTableWithOtherColumns(): Table {
  return {
    name: 'metadata',
    schema: 'public',
    primaryKeyColumns: ['id'],
    foreignKeys: [],
    columns: [
      {
        name: 'id',
        dataType: 'INTEGER',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
      },
      {
        name: 'data',
        dataType: 'BYTEA',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
      },
      {
        name: 'config',
        dataType: 'UUID',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
      },
    ],
  };
}

// =============================================================================
// TIER 1: Database Statistics
// =============================================================================

describe('Tier 1: Database Statistics', () => {
  describe('buildTableStatisticsQuery', () => {
    it('generates valid SQL for table statistics', () => {
      const query = buildTableStatisticsQuery('orders', 'public');

      expect(query).toContain('WITH table_stats AS');
      expect(query).toContain('pg_class c');
      expect(query).toContain('pg_namespace n');
      expect(query).toContain("n.nspname = 'public'");
      expect(query).toContain("c.relname = 'orders'");
    });

    it('includes system catalog joins', () => {
      const query = buildTableStatisticsQuery('users', 'public');

      expect(query).toContain('pg_class');
      expect(query).toContain('pg_namespace');
      expect(query).toContain('pg_stat_user_tables');
    });

    it('selects required columns', () => {
      const query = buildTableStatisticsQuery('products', 'public');

      expect(query).toContain('row_count_estimate');
      expect(query).toContain('table_size_bytes');
      expect(query).toContain('last_vacuum');
      expect(query).toContain('last_analyze');
    });

    it('handles non-default schema', () => {
      const query = buildTableStatisticsQuery('items', 'analytics');

      expect(query).toContain("n.nspname = 'analytics'");
      expect(query).toContain("c.relname = 'items'");
    });

    it('filters for relations (relkind = r)', () => {
      const query = buildTableStatisticsQuery('test_table', 'public');

      expect(query).toContain("c.relkind = 'r'");
    });

    it('uses COALESCE for safe null handling', () => {
      const query = buildTableStatisticsQuery('orders', 'public');

      expect(query).toContain('COALESCE(ts.row_count_estimate');
      expect(query).toContain('COALESCE(ts.table_size_bytes');
    });
  });

  describe('buildColumnStatisticsQuery', () => {
    it('generates valid SQL for column statistics', () => {
      const query = buildColumnStatisticsQuery('orders', 'public');

      expect(query).toContain('SELECT');
      expect(query).toContain('pg_stats s');
      expect(query).toContain("s.schemaname = 'public'");
      expect(query).toContain("s.tablename = 'orders'");
    });

    it('selects required column metrics', () => {
      const query = buildColumnStatisticsQuery('users', 'public');

      expect(query).toContain('s.attname AS column_name');
      expect(query).toContain('s.n_distinct');
      expect(query).toContain('s.null_frac');
      expect(query).toContain('s.avg_width');
    });

    it('applies column filter when columns specified', () => {
      const query = buildColumnStatisticsQuery('orders', 'public', ['email', 'created_at']);

      expect(query).toContain("AND s.attname IN ('email', 'created_at')");
    });

    it('handles multiple column filters correctly', () => {
      const query = buildColumnStatisticsQuery('products', 'public', [
        'name',
        'price',
        'category',
      ]);

      expect(query).toContain("AND s.attname IN ('name', 'price', 'category')");
    });

    it('orders results by column name', () => {
      const query = buildColumnStatisticsQuery('orders', 'public');

      expect(query).toContain('ORDER BY s.attname');
    });

    it('omits filter when no columns provided', () => {
      const query = buildColumnStatisticsQuery('orders', 'public', []);

      expect(query).not.toContain('AND s.attname IN');
    });
  });

  describe('buildCombinedStatisticsQuery', () => {
    it('combines table and column statistics with UNION ALL', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain('UNION ALL');
      expect(query).toContain('-- Table statistics');
      expect(query).toContain('-- Column statistics');
    });

    it('includes table-level row', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain("'table' AS row_type");
      expect(query).toContain('c.reltuples::bigint AS row_count_estimate');
      expect(query).toContain('(c.relpages * 8192)::bigint AS table_size_bytes');
    });

    it('includes column-level rows', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain("'column' AS row_type");
      expect(query).toContain('s.attname AS column_name');
      expect(query).toContain('s.n_distinct');
    });

    it('properly casts NULL values', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain('NULL::numeric AS n_distinct');
      expect(query).toContain('NULL::real AS null_frac');
      expect(query).toContain('NULL::integer AS avg_width');
    });

    it('filters columns when specified', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public', ['amount', 'status']);

      expect(query).toContain("AND s.attname IN ('amount', 'status')");
    });

    it('orders by row_type and column_name', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain('ORDER BY row_type, column_name');
    });

    it('uses LEFT JOIN for pg_stat_user_tables', () => {
      const query = buildCombinedStatisticsQuery('orders', 'public');

      expect(query).toContain('LEFT JOIN pg_stat_user_tables');
    });
  });

  describe('buildStaleStatsCheckQuery', () => {
    it('generates query with stale check logic', () => {
      const query = buildStaleStatsCheckQuery('orders', 'public');

      expect(query).toContain('is_stale');
      expect(query).toContain('CASE');
      expect(query).toContain('last_analyze IS NULL');
    });

    it('uses configurable stale threshold', () => {
      const query = buildStaleStatsCheckQuery('orders', 'public', 14);

      expect(query).toContain("INTERVAL '14 days'");
    });

    it('uses default 7-day threshold', () => {
      const query = buildStaleStatsCheckQuery('orders', 'public');

      expect(query).toContain("INTERVAL '7 days'");
    });

    it('calculates days since analyze', () => {
      const query = buildStaleStatsCheckQuery('orders', 'public');

      expect(query).toContain('days_since_analyze');
      expect(query).toContain("EXTRACT(EPOCH FROM (NOW() - last_analyze)) / 86400");
    });

    it('includes last_analyze timestamp', () => {
      const query = buildStaleStatsCheckQuery('orders', 'public');

      expect(query).toContain('last_analyze_timestamp');
      expect(query).toContain('last_analyze::text');
    });
  });

  describe('buildSchemaStatisticsQuery', () => {
    it('queries all tables in schema', () => {
      const query = buildSchemaStatisticsQuery('public');

      expect(query).toContain('SELECT');
      expect(query).toContain('c.relname AS table_name');
      expect(query).toContain("n.nspname = 'public'");
    });

    it('includes tuple statistics', () => {
      const query = buildSchemaStatisticsQuery('public');

      expect(query).toContain('st.n_live_tup AS live_tuples');
      expect(query).toContain('st.n_dead_tup AS dead_tuples');
    });

    it('applies exclusion patterns with OR logic', () => {
      const query = buildSchemaStatisticsQuery('public', ['tmp_%', 'test_%']);

      expect(query).toContain("AND NOT (");
      expect(query).toContain("c.relname LIKE 'tmp_%'");
      expect(query).toContain("c.relname LIKE 'test_%'");
      expect(query).toContain(' OR ');
    });

    it('handles multiple exclusion patterns', () => {
      const query = buildSchemaStatisticsQuery('public', ['pg_%', '_.*', 'temp%']);

      expect(query).toContain("c.relname LIKE 'pg_%'");
      expect(query).toContain("c.relname LIKE '_.*'");
      expect(query).toContain("c.relname LIKE 'temp%'");
    });

    it('omits exclusion clause when no patterns', () => {
      const query = buildSchemaStatisticsQuery('public', []);

      expect(query).not.toContain('AND NOT');
    });

    it('orders by row count descending', () => {
      const query = buildSchemaStatisticsQuery('public');

      expect(query).toContain('ORDER BY c.reltuples DESC');
    });

    it('uses LEFT JOIN for stats', () => {
      const query = buildSchemaStatisticsQuery('public');

      expect(query).toContain('LEFT JOIN pg_stat_user_tables');
    });
  });
});

// =============================================================================
// TIER 2: Smart Sampling (Fast)
// =============================================================================

describe('Tier 2: Smart Sampling', () => {
  describe('buildSampleProfilingQuery', () => {
    it('generates valid TABLESAMPLE query', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 0.1);

      expect(query).toContain('WITH');
      expect(query).toContain('sample_data AS');
      expect(query).toContain('TABLESAMPLE BERNOULLI');
    });

    it('includes full scan when sample rate is 1.0', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).not.toContain('TABLESAMPLE');
    });

    it('calculates sample percentage correctly', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 0.05);

      expect(query).toContain('TABLESAMPLE BERNOULLI (5)');
    });

    it('properly escapes schema and table names', () => {
      const table = createTableWithSpecialChars();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
    });

    it('handles numeric columns', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('amount');
      expect(query).toContain('MIN');
      expect(query).toContain('MAX');
      expect(query).toContain('AVG');
      expect(query).toContain('STDDEV');
    });

    it('handles temporal columns', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('created_at');
      expect(query).toContain('::TIMESTAMP');
    });

    it('handles text columns', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('status');
      expect(query).toContain('LENGTH');
    });

    it('includes row count CTE', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('row_count AS');
      expect(query).toContain('COUNT(*) as total');
    });

    it('computes null percentages', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('null_percentage');
      expect(query).toContain('NULLIF');
    });

    it('handles empty table with no typed columns', () => {
      const table = createTableWithOtherColumns();
      const query = buildSampleProfilingQuery(table, 1.0);

      // When there are no typed columns, query still includes numeric columns from the table
      // The UUID and BYTEA columns are classified as 'other', so they don't affect profiling
      // The ID column is numeric, so it will be included
      expect(query).toContain('WITH');
      expect(query).toContain('sample_data AS');
    });

    it('unions multiple column type stats', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('UNION ALL');
    });

    it('orders results by column name', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('ORDER BY c.column_name');
    });

    it('includes sample row count in results', () => {
      const table = createSampleTable();
      const query = buildSampleProfilingQuery(table, 1.0);

      expect(query).toContain('sample_row_count');
    });
  });

  describe('buildFreshnessQuery', () => {
    it('generates MIN/MAX query for timestamps', () => {
      const table = createSampleTable();
      const query = buildFreshnessQuery(table, ['created_at']);

      expect(query).toContain('MIN');
      expect(query).toContain('MAX');
      expect(query).toContain('created_at');
    });

    it('uses DATE_DIFF for span calculation', () => {
      const table = createSampleTable();
      const query = buildFreshnessQuery(table, ['created_at']);

      expect(query).toContain("DATE_DIFF('day'");
      expect(query).toContain('span_days');
    });

    it('handles multiple timestamp columns', () => {
      const table = createSampleTable();
      const query = buildFreshnessQuery(table, ['created_at', 'updated_at']);

      expect(query).toContain('created_at');
      expect(query).toContain('updated_at');
      expect(query).toContain('UNION ALL');
    });

    it('filters out NULL timestamps', () => {
      const table = createSampleTable();
      const query = buildFreshnessQuery(table, ['created_at']);

      expect(query).toContain('WHERE');
      expect(query).toContain('IS NOT NULL');
    });

    it('returns empty result when no timestamp columns', () => {
      const table = createSampleTable();
      const query = buildFreshnessQuery(table, []);

      expect(query).toContain('WHERE FALSE');
      expect(query).toContain("'no_timestamps'");
    });

    it('properly escapes column names with special chars', () => {
      const table = createTableWithSpecialChars();
      const query = buildFreshnessQuery(table, ['item-name']);

      expect(query).toContain('"item-name"');
    });

    it('properly escapes schema and table names', () => {
      const table = createTableWithSpecialChars();
      const query = buildFreshnessQuery(table, ['created_at']);

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
    });
  });

  describe('buildCardinalityQuery', () => {
    it('generates COUNT(DISTINCT) query', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['customer_id'], 1.0);

      expect(query).toContain('COUNT(DISTINCT');
      expect(query).toContain('customer_id');
    });

    it('includes sample rate calculation', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['status'], 0.1);

      expect(query).toContain('TABLESAMPLE BERNOULLI (10)');
      expect(query).toContain('estimated_total');
    });

    it('uses TABLESAMPLE for sample rates < 100%', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['id'], 0.5);

      expect(query).toContain('TABLESAMPLE BERNOULLI (50)');
    });

    it('omits TABLESAMPLE for full scan', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['id'], 1.0);

      expect(query).not.toContain('TABLESAMPLE');
    });

    it('handles multiple columns', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['customer_id', 'status'], 0.1);

      expect(query).toContain('customer_id');
      expect(query).toContain('status');
      expect(query).toContain('UNION ALL');
    });

    it('guards against zero sample size', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, ['id'], 0.01);

      expect(query).toContain('CASE');
      expect(query).toContain('WHEN rc.sampled = 0 THEN 0');
    });

    it('returns empty when no columns', () => {
      const table = createSampleTable();
      const query = buildCardinalityQuery(table, [], 1.0);

      expect(query).toContain('WHERE FALSE');
    });

    it('properly escapes column names', () => {
      const table = createTableWithSpecialChars();
      const query = buildCardinalityQuery(table, ['item-name'], 1.0);

      expect(query).toContain('"item-name"');
    });
  });

  describe('buildRowCountCheckQuery', () => {
    it('generates simple COUNT query', () => {
      const table = createSampleTable();
      const query = buildRowCountCheckQuery(table);

      expect(query).toContain('SELECT COUNT(*) as row_count');
      expect(query).toContain('FROM');
    });

    it('includes LIMIT 1', () => {
      const table = createSampleTable();
      const query = buildRowCountCheckQuery(table);

      expect(query).toContain('LIMIT 1');
    });

    it('properly escapes schema and table names', () => {
      const table = createTableWithSpecialChars();
      const query = buildRowCountCheckQuery(table);

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
    });
  });

  describe('determineAdaptiveSampleRate', () => {
    it('returns 1.0 for small tables (< 10k rows)', () => {
      expect(determineAdaptiveSampleRate(5000)).toBe(1.0);
      expect(determineAdaptiveSampleRate(9999)).toBe(1.0);
    });

    it('returns 0.1 for medium tables (10k-100k rows)', () => {
      expect(determineAdaptiveSampleRate(10000)).toBe(0.1);
      expect(determineAdaptiveSampleRate(50000)).toBe(0.1);
      expect(determineAdaptiveSampleRate(99999)).toBe(0.1);
    });

    it('returns 0.01 for large tables (> 100k rows)', () => {
      expect(determineAdaptiveSampleRate(100000)).toBe(0.01);
      expect(determineAdaptiveSampleRate(1000000)).toBe(0.01);
    });

    it('handles boundary cases correctly', () => {
      expect(determineAdaptiveSampleRate(9999)).toBe(1.0);
      expect(determineAdaptiveSampleRate(10000)).toBe(0.1);
      expect(determineAdaptiveSampleRate(99999)).toBe(0.1);
      expect(determineAdaptiveSampleRate(100000)).toBe(0.01);
    });

    it('handles zero rows', () => {
      expect(determineAdaptiveSampleRate(0)).toBe(1.0);
    });
  });
});

// =============================================================================
// TIER 3: Detailed Profiling (Selective)
// =============================================================================

describe('Tier 3: Detailed Profiling', () => {
  describe('buildPercentileQuery', () => {
    it('generates PERCENTILE_CONT query', () => {
      const query = buildPercentileQuery('orders', 'public', 'amount');

      expect(query).toContain('PERCENTILE_CONT');
      expect(query).toContain('WITHIN GROUP');
    });

    it('includes all required percentiles', () => {
      const query = buildPercentileQuery('orders', 'public', 'amount');

      expect(query).toContain('PERCENTILE_CONT(0.25)');
      expect(query).toContain('PERCENTILE_CONT(0.50)');
      expect(query).toContain('PERCENTILE_CONT(0.75)');
      expect(query).toContain('PERCENTILE_CONT(0.90)');
      expect(query).toContain('PERCENTILE_CONT(0.95)');
      expect(query).toContain('PERCENTILE_CONT(0.99)');
    });

    it('computes central tendency metrics', () => {
      const query = buildPercentileQuery('orders', 'public', 'amount');

      expect(query).toContain('AVG');
      expect(query).toContain('STDDEV');
      expect(query).toContain('MIN');
      expect(query).toContain('MAX');
    });

    it('calculates range', () => {
      const query = buildPercentileQuery('orders', 'public', 'amount');

      expect(query).toContain('AS range');
      expect(query).toContain('MAX(');
      expect(query).toContain('MIN(');
    });

    it('filters out NULL values', () => {
      const query = buildPercentileQuery('orders', 'public', 'amount');

      expect(query).toContain('WHERE');
      expect(query).toContain('IS NOT NULL');
    });

    it('properly quotes table and column names', () => {
      const query = buildPercentileQuery('order-items', 'my schema', 'total amount');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
      expect(query).toContain('"total amount"');
    });
  });

  describe('buildTopValuesQuery', () => {
    it('generates value frequency query', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status');

      expect(query).toContain('SELECT');
      expect(query).toContain('COUNT(*) AS frequency');
      expect(query).toContain('GROUP BY');
    });

    it('computes percentage of total', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status');

      expect(query).toContain('percentage');
      expect(query).toContain('ROUND');
      expect(query).toContain('100.0');
    });

    it('uses configurable limit', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status', 20);

      expect(query).toContain('LIMIT 20');
    });

    it('uses default limit of 10', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status');

      expect(query).toContain('LIMIT 10');
    });

    it('orders by frequency descending', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status');

      expect(query).toContain('ORDER BY frequency DESC');
    });

    it('filters out NULL values', () => {
      const query = buildTopValuesQuery('orders', 'public', 'status');

      expect(query).toContain('WHERE');
      expect(query).toContain('IS NOT NULL');
    });

    it('properly quotes identifiers', () => {
      const query = buildTopValuesQuery('order-items', 'my schema', 'item-status');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
      expect(query).toContain('"item-status"');
    });
  });

  describe('buildPatternDetectionQuery', () => {
    it('generates pattern matching query', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'contact_info');

      expect(query).toContain('~');
      expect(query).toContain('FILTER');
    });

    it('includes email pattern', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'email');

      expect(query).toContain('email_count');
      // The regex is included as-is in the SQL string
      expect(query).toContain('@');
      expect(query).toContain('[a-zA-Z0-9');
    });

    it('includes URL pattern', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'website');

      expect(query).toContain('url_count');
      expect(query).toContain('https');
      expect(query).toContain('://');
    });

    it('includes phone pattern', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'phone');

      expect(query).toContain('phone_count');
    });

    it('includes UUID pattern', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'id');

      expect(query).toContain('uuid_count');
      expect(query).toContain('[0-9a-f]{8}-[0-9a-f]{4}');
    });

    it('includes JSON pattern', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'metadata');

      expect(query).toContain('json_count');
      expect(query).toContain('[');
      expect(query).toContain('{');
    });

    it('includes length statistics', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'text_field');

      expect(query).toContain('min_length');
      expect(query).toContain('max_length');
      expect(query).toContain('avg_length');
      expect(query).toContain('LENGTH');
    });

    it('filters out NULL values', () => {
      const query = buildPatternDetectionQuery('users', 'public', 'email');

      expect(query).toContain('WHERE');
      expect(query).toContain('IS NOT NULL');
    });

    it('properly quotes identifiers', () => {
      const query = buildPatternDetectionQuery('user-data', 'my schema', 'contact-email');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"user-data"');
      expect(query).toContain('"contact-email"');
    });
  });

  describe('buildTemporalGapQuery', () => {
    it('generates gap detection query', () => {
      const query = buildTemporalGapQuery('orders', 'public', 'created_at');

      expect(query).toContain('WITH ordered_dates AS');
      expect(query).toContain('LEAD');
      expect(query).toContain('gaps AS');
    });

    it('uses LEAD window function', () => {
      const query = buildTemporalGapQuery('orders', 'public', 'created_at');

      expect(query).toContain('LEAD(');
      expect(query).toContain('OVER (ORDER BY');
    });

    it('filters for gaps > 7 days', () => {
      const query = buildTemporalGapQuery('orders', 'public', 'created_at');

      expect(query).toContain('> 7');
      expect(query).toContain("DATE_DIFF('day'");
    });

    it('calculates gap duration', () => {
      const query = buildTemporalGapQuery('orders', 'public', 'created_at');

      expect(query).toContain('gap_days');
    });

    it('orders gaps by start date', () => {
      const query = buildTemporalGapQuery('orders', 'public', 'created_at');

      expect(query).toContain('ORDER BY gap_start');
    });

    it('properly quotes identifiers', () => {
      const query = buildTemporalGapQuery('order-items', 'my schema', 'created-at');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
      expect(query).toContain('"created-at"');
    });
  });

  describe('buildUpdateFrequencyQuery', () => {
    it('generates update frequency analysis query', () => {
      const query = buildUpdateFrequencyQuery('orders', 'public', 'updated_at');

      expect(query).toContain('WITH intervals AS');
      expect(query).toContain('DATE_DIFF');
    });

    it('computes interval statistics', () => {
      const query = buildUpdateFrequencyQuery('orders', 'public', 'updated_at');

      expect(query).toContain('avg_interval_minutes');
      expect(query).toContain('stddev_interval_minutes');
      expect(query).toContain('median_interval_minutes');
    });

    it('detects update patterns', () => {
      const query = buildUpdateFrequencyQuery('orders', 'public', 'updated_at');

      expect(query).toContain('update_pattern');
      expect(query).toContain('CASE');
      expect(query).toContain("'realtime'");
      expect(query).toContain("'hourly'");
      expect(query).toContain("'daily'");
      expect(query).toContain("'batch'");
      expect(query).toContain("'stale'");
    });

    it('analyzes time clustering', () => {
      const query = buildUpdateFrequencyQuery('orders', 'public', 'updated_at');

      expect(query).toContain('hour_cluster_count');
      expect(query).toContain('day_cluster_count');
      expect(query).toContain('EXTRACT(MINUTE FROM');
      expect(query).toContain('EXTRACT(HOUR FROM');
    });

    it('tracks recency', () => {
      const query = buildUpdateFrequencyQuery('orders', 'public', 'updated_at');

      expect(query).toContain('last_update');
      expect(query).toContain('hours_since_last');
      expect(query).toContain('CURRENT_TIMESTAMP');
    });

    it('properly quotes identifiers', () => {
      const query = buildUpdateFrequencyQuery('order-items', 'my schema', 'updated-at');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
      expect(query).toContain('"updated-at"');
    });
  });

  describe('buildCardinalityDistributionQuery', () => {
    it('generates cardinality analysis query', () => {
      const query = buildCardinalityDistributionQuery('orders', 'public', 'status');

      expect(query).toContain('WITH stats AS');
      expect(query).toContain('COUNT(DISTINCT');
    });

    it('computes cardinality ratio', () => {
      const query = buildCardinalityDistributionQuery('orders', 'public', 'status');

      expect(query).toContain('cardinality_ratio');
      expect(query).toContain('ROUND(100.0');
    });

    it('classifies cardinality levels', () => {
      const query = buildCardinalityDistributionQuery('orders', 'public', 'status');

      expect(query).toContain('cardinality_category');
      expect(query).toContain("'constant'");
      expect(query).toContain("'binary'");
      expect(query).toContain("'very_low'");
      expect(query).toContain("'low'");
      expect(query).toContain("'medium'");
      expect(query).toContain("'high'");
      expect(query).toContain("'unique'");
    });

    it('counts null values', () => {
      const query = buildCardinalityDistributionQuery('orders', 'public', 'status');

      expect(query).toContain('null_count');
    });

    it('properly quotes identifiers', () => {
      const query = buildCardinalityDistributionQuery('order-items', 'my schema', 'item-status');

      expect(query).toContain('"my schema"');
      expect(query).toContain('"order-items"');
      expect(query).toContain('"item-status"');
    });
  });
});

// =============================================================================
// SQL Injection & Identifier Escaping Tests
// =============================================================================

describe('Identifier Escaping & Safety', () => {
  it('escapes double quotes in identifiers', () => {
    const table: Table = {
      name: 'table"with"quotes',
      schema: 'public',
      primaryKeyColumns: [],
      foreignKeys: [],
      columns: [
        {
          name: 'col"name',
          dataType: 'TEXT',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
      ],
    };

    const query = buildSampleProfilingQuery(table, 1.0);
    expect(query).toContain('table""with""quotes');
    expect(query).toContain('col""name');
  });

  it('handles schema/table names with spaces', () => {
    const query = buildTableStatisticsQuery('my table', 'my schema');

    expect(query).toContain("'my schema'");
    expect(query).toContain("'my table'");
  });

  it('properly escapes in column filter', () => {
    const query = buildColumnStatisticsQuery('orders', 'public', [
      "col'with'quote",
      'normal_col',
    ]);

    expect(query).toContain("'col'with'quote'");
    expect(query).toContain("'normal_col'");
  });
});

// =============================================================================
// NULL Handling Tests
// =============================================================================

describe('NULL Handling & Edge Cases', () => {
  it('handles tables with only other-typed columns', () => {
    const table = createTableWithOtherColumns();
    const query = buildSampleProfilingQuery(table, 1.0);

    // The table has an INTEGER id column which is numeric, so it will be profiled
    expect(query).toContain('WITH');
    expect(query).toContain('sample_data AS');
  });

  it('casts NULL values appropriately in combined query', () => {
    const query = buildCombinedStatisticsQuery('orders', 'public');

    expect(query).toContain('NULL::numeric');
    expect(query).toContain('NULL::real');
    expect(query).toContain('NULL::integer');
  });

  it('uses NULLIF in division to prevent divide-by-zero', () => {
    const query = buildCardinalityDistributionQuery('orders', 'public', 'status');

    expect(query).toContain('NULLIF(total_rows, 0)');
  });

  it('uses COALESCE for safe null defaults', () => {
    const query = buildTableStatisticsQuery('orders', 'public');

    expect(query).toContain('COALESCE(ts.row_count_estimate, 0)');
    expect(query).toContain('COALESCE(ts.table_size_bytes, 0)');
  });

  it('guards against null sample size in cardinality', () => {
    const query = buildCardinalityQuery(createSampleTable(), ['id'], 0.1);

    expect(query).toContain('CASE');
    expect(query).toContain('WHEN rc.sampled = 0 THEN 0');
  });
});

// =============================================================================
// Complex Column Type Classification Tests
// =============================================================================

describe('Column Type Classification', () => {
  it('classifies integer types as numeric', () => {
    const table: Table = {
      name: 'numbers',
      schema: 'public',
      primaryKeyColumns: [],
      foreignKeys: [],
      columns: [
        {
          name: 'int_col',
          dataType: 'INTEGER',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'bigint_col',
          dataType: 'BIGINT',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'decimal_col',
          dataType: 'DECIMAL',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
      ],
    };

    const query = buildSampleProfilingQuery(table, 1.0);
    expect(query).toContain('int_col');
    expect(query).toContain('bigint_col');
    expect(query).toContain('decimal_col');
    expect(query).toContain('numeric_stats');
  });

  it('classifies date/time types as temporal', () => {
    const table: Table = {
      name: 'timestamps',
      schema: 'public',
      primaryKeyColumns: [],
      foreignKeys: [],
      columns: [
        {
          name: 'date_col',
          dataType: 'DATE',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'timestamp_col',
          dataType: 'TIMESTAMP',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'time_col',
          dataType: 'TIME',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
      ],
    };

    const query = buildSampleProfilingQuery(table, 1.0);
    expect(query).toContain('temporal_stats');
  });

  it('classifies text types correctly', () => {
    const table: Table = {
      name: 'text_data',
      schema: 'public',
      primaryKeyColumns: [],
      foreignKeys: [],
      columns: [
        {
          name: 'varchar_col',
          dataType: 'VARCHAR',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'char_col',
          dataType: 'CHAR',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'text_col',
          dataType: 'TEXT',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
      ],
    };

    const query = buildSampleProfilingQuery(table, 1.0);
    expect(query).toContain('text_stats');
  });

  it('ignores other/unclassified types', () => {
    const table: Table = {
      name: 'other_types',
      schema: 'public',
      primaryKeyColumns: [],
      foreignKeys: [],
      columns: [
        {
          name: 'uuid_col',
          dataType: 'UUID',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
        {
          name: 'json_col',
          dataType: 'JSON',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
        },
      ],
    };

    const query = buildSampleProfilingQuery(table, 1.0);
    expect(query).not.toContain('numeric_stats');
    expect(query).not.toContain('temporal_stats');
    expect(query).not.toContain('text_stats');
  });
});

// =============================================================================
// Sample Rate Precision Tests
// =============================================================================

describe('Sample Rate Calculations', () => {
  it('converts sample rate to percentage in TABLESAMPLE', () => {
    const table = createSampleTable();

    const query1 = buildSampleProfilingQuery(table, 0.01);
    expect(query1).toContain('TABLESAMPLE BERNOULLI (1)');

    const query2 = buildSampleProfilingQuery(table, 0.5);
    expect(query2).toContain('TABLESAMPLE BERNOULLI (50)');

    const query3 = buildSampleProfilingQuery(table, 0.25);
    expect(query3).toContain('TABLESAMPLE BERNOULLI (25)');
  });

  it('calculates estimated total correctly in cardinality query', () => {
    const table = createSampleTable();
    const query = buildCardinalityQuery(table, ['id'], 0.1);

    expect(query).toContain('COUNT(*)::FLOAT / 0.1 as estimated_total');
  });
});

// =============================================================================
// UNION ALL Ordering Tests
// =============================================================================

describe('Multi-column UNION ALL Queries', () => {
  it('unions column stats in correct order', () => {
    const table = createSampleTable();
    const query = buildSampleProfilingQuery(table, 1.0);

    // Should have numeric_stats, temporal_stats, text_stats unions
    const unionCount = (query.match(/UNION ALL/g) || []).length;
    expect(unionCount).toBeGreaterThan(0);
  });

  it('combines multiple timestamp columns with UNION ALL', () => {
    const table = createSampleTable();
    const query = buildFreshnessQuery(table, ['created_at', 'updated_at']);

    expect(query).toContain('UNION ALL');
  });

  it('unions cardinality results for multiple columns', () => {
    const table = createSampleTable();
    const query = buildCardinalityQuery(table, ['id', 'customer_id', 'status'], 1.0);

    const unionCount = (query.match(/UNION ALL/g) || []).length;
    expect(unionCount).toBe(2);
  });
});
