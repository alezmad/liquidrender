import { describe, it, expect } from 'vitest';
import { compileKPIFormula, compileMultipleKPIs } from '../compiler';
import type {
  SimpleKPIDefinition,
  RatioKPIDefinition,
  DerivedKPIDefinition,
  FilteredAggregationKPIDefinition,
  WindowKPIDefinition,
  CaseKPIDefinition,
  CompositeKPIDefinition,
  MovingAverageKPIDefinition,
  RankingKPIDefinition,
  ConditionalKPIDefinition,
} from '../types';
import { DuckDBEmitter } from '../../emitters/duckdb';

const emitter = new DuckDBEmitter();

describe('KPI Compiler v2.0', () => {
  describe('Simple KPI', () => {
    it('compiles basic SUM aggregation', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'amount',
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toBe('SUM(amount)');
      expect(result.sql).toContain('SELECT SUM(amount) AS value FROM "orders"');
    });

    it('compiles COUNT_DISTINCT', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'COUNT_DISTINCT',
        expression: 'customer_id',
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toBe('COUNT(DISTINCT customer_id)');
    });
  });

  describe('Ratio KPI', () => {
    it('compiles average order value', () => {
      const def: RatioKPIDefinition = {
        type: 'ratio',
        numerator: { aggregation: 'SUM', expression: 'amount' },
        denominator: { aggregation: 'COUNT_DISTINCT', expression: 'order_id' },
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      // Should have proper division with type casting for decimal result
      expect(result.expression).toContain('SUM(amount)');
      expect(result.expression).toContain('NULLIF(COUNT(DISTINCT order_id), 0)');
      expect(result.expression).toMatch(/::(float|DOUBLE)| \* 1\.0/); // Dialect-specific cast
    });

    it('applies multiplier for percentage', () => {
      const def: RatioKPIDefinition = {
        type: 'ratio',
        numerator: { aggregation: 'SUM', expression: 'discount' },
        denominator: { aggregation: 'SUM', expression: 'amount' },
        multiplier: 100,
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('* 100');
    });
  });

  describe('Derived KPI', () => {
    it('compiles with metric references', () => {
      const def: DerivedKPIDefinition = {
        type: 'derived',
        expression: '(@revenue - @cost) / @revenue * 100',
        dependencies: ['revenue', 'cost'],
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter, {
        metricExpressions: {
          revenue: 'SUM(amount)',
          cost: 'SUM(cost)',
        },
      });

      expect(result.success).toBe(true);
      expect(result.expression).toContain('(SUM(amount))');
      expect(result.expression).toContain('(SUM(cost))');
    });

    it('fails on unresolved reference', () => {
      const def: DerivedKPIDefinition = {
        type: 'derived',
        expression: '@revenue - @missing',
        dependencies: ['revenue', 'missing'],
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter, {
        metricExpressions: { revenue: 'SUM(amount)' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing expression');
    });
  });

  describe('Filtered KPI', () => {
    it('compiles repeat purchase rate', () => {
      const def: FilteredAggregationKPIDefinition = {
        type: 'filtered',
        aggregation: 'COUNT_DISTINCT',
        expression: 'customer_id',
        subquery: {
          groupBy: 'customer_id',
          having: 'COUNT(*) > 1',
        },
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      // Filtered KPI uses CASE WHEN to conditionally count matching records
      expect(result.expression).toContain('CASE WHEN customer_id IN');
      expect(result.expression).toContain('GROUP BY customer_id HAVING COUNT(*) > 1');
      expect(result.expression).toContain('THEN customer_id END');
      expect(result.sql).toContain('SELECT');
    });

    it('compiles with array groupBy', () => {
      const def: FilteredAggregationKPIDefinition = {
        type: 'filtered',
        aggregation: 'COUNT_DISTINCT',
        expression: 'customer_id',
        subquery: {
          groupBy: ['customer_id', 'product_id'],
          having: 'COUNT(*) > 2',
        },
        entity: 'order_items',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('GROUP BY customer_id, product_id');
    });

    it('compiles with percentOf for percentage calculation', () => {
      const def: FilteredAggregationKPIDefinition = {
        type: 'filtered',
        aggregation: 'COUNT_DISTINCT',
        expression: 'customer_id',
        subquery: {
          groupBy: 'customer_id',
          having: 'COUNT(*) > 1',
        },
        percentOf: 'customer_id',
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      // Should calculate (filtered / total) * 100 with dialect-specific cast
      expect(result.expression).toMatch(/::(float|DOUBLE)| \* 1\.0/); // PostgreSQL, DuckDB, or Trino
      expect(result.expression).toContain('NULLIF');
      expect(result.expression).toContain('* 100');
      // Should have both filtered count and total count
      expect(result.expression).toContain('CASE WHEN customer_id IN');
      expect(result.expression).toContain('COUNT(DISTINCT customer_id)');
    });
  });

  describe('Window KPI', () => {
    it('compiles running total', () => {
      const def: WindowKPIDefinition = {
        type: 'window',
        aggregation: 'SUM',
        expression: 'revenue',
        window: {
          partitionBy: [],
          orderBy: [{ field: 'date', direction: 'asc' }],
          frame: 'ROWS_UNBOUNDED_PRECEDING',
        },
        entity: 'daily_sales',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('SUM(revenue) OVER');
      expect(result.expression).toContain('ORDER BY date ASC');
      expect(result.expression).toContain('ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW');
    });

    it('compiles MoM growth with LAG', () => {
      const def: WindowKPIDefinition = {
        type: 'window',
        aggregation: 'SUM',
        expression: 'revenue',
        window: {
          partitionBy: [],
          orderBy: [{ field: 'month', direction: 'asc' }],
          lag: { offset: 1, default: 0 },
        },
        outputExpression: '(current - lag) / NULLIF(lag, 0) * 100',
        entity: 'monthly_revenue',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('LAG(SUM(revenue), 1, 0)');
      expect(result.expression).toContain('NULLIF');
      expect(result.columns).toContain('lag_value');
    });

    it('compiles with partition', () => {
      const def: WindowKPIDefinition = {
        type: 'window',
        aggregation: 'SUM',
        expression: 'revenue',
        window: {
          partitionBy: ['region'],
          orderBy: [{ field: 'date', direction: 'asc' }],
        },
        entity: 'daily_sales',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('PARTITION BY region');
    });
  });

  describe('Case KPI', () => {
    it('compiles revenue by category', () => {
      const def: CaseKPIDefinition = {
        type: 'case',
        aggregation: 'SUM',
        cases: [
          { when: "category = 'electronics'", then: 'amount' },
          { when: "category = 'clothing'", then: 'amount * 0.9' },
          { else: '0' },
        ],
        entity: 'order_details',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('CASE WHEN');
      expect(result.expression).toContain("category = 'electronics'");
      expect(result.expression).toContain('ELSE 0 END');
    });
  });

  describe('Composite KPI', () => {
    it('compiles revenue per segment with JOIN', () => {
      const def: CompositeKPIDefinition = {
        type: 'composite',
        aggregation: 'SUM',
        expression: 'o.amount',
        sources: [
          { alias: 'o', table: 'orders' },
          { alias: 'c', table: 'customers', join: { type: 'LEFT', on: 'o.customer_id = c.id' } },
        ],
        groupBy: ['c.segment'],
        entity: 'orders',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('LEFT JOIN');
      expect(result.sql).toContain('ON o.customer_id = c.id');
      expect(result.sql).toContain('GROUP BY c.segment');
      expect(result.joinedTables).toContain('customers');
    });

    it('compiles with multiple joins', () => {
      const def: CompositeKPIDefinition = {
        type: 'composite',
        aggregation: 'SUM',
        expression: 'oi.amount',
        sources: [
          { alias: 'oi', table: 'order_items' },
          { alias: 'o', table: 'orders', join: { type: 'INNER', on: 'oi.order_id = o.id' } },
          { alias: 'c', table: 'customers', join: { type: 'LEFT', on: 'o.customer_id = c.id' } },
        ],
        groupBy: ['c.region'],
        entity: 'order_items',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('INNER JOIN');
      expect(result.sql).toContain('LEFT JOIN');
      expect(result.joinedTables).toHaveLength(2);
    });
  });

  describe('Filters', () => {
    it('compiles simple filter', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'amount',
        entity: 'orders',
        filters: [
          { field: 'status', operator: '=', value: 'completed' },
        ],
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain("WHERE \"status\" = 'completed'");
    });

    it('compiles compound filter', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'amount',
        entity: 'orders',
        filters: [
          {
            type: 'compound',
            operator: 'OR',
            conditions: [
              { field: 'status', operator: '=', value: 'completed' },
              { field: 'status', operator: '=', value: 'shipped' },
            ],
          },
        ],
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('OR');
    });
  });

  describe('compileMultipleKPIs', () => {
    it('combines multiple KPIs in one query', () => {
      const definitions = [
        {
          slug: 'total_revenue',
          definition: {
            type: 'simple' as const,
            aggregation: 'SUM' as const,
            expression: 'amount',
            entity: 'orders',
          },
        },
        {
          slug: 'order_count',
          definition: {
            type: 'simple' as const,
            aggregation: 'COUNT' as const,
            expression: '*',
            entity: 'orders',
          },
        },
      ];

      const result = compileMultipleKPIs(definitions, emitter);

      expect(result.sql).toContain('SUM(amount) AS "total_revenue"');
      expect(result.sql).toContain('COUNT(*) AS "order_count"');
      expect(result.columns).toEqual(['total_revenue', 'order_count']);
    });

    it('fails on different entities', () => {
      const definitions = [
        {
          slug: 'revenue',
          definition: { type: 'simple' as const, aggregation: 'SUM' as const, expression: 'amount', entity: 'orders' },
        },
        {
          slug: 'products',
          definition: { type: 'simple' as const, aggregation: 'COUNT' as const, expression: '*', entity: 'products' },
        },
      ];

      expect(() => compileMultipleKPIs(definitions, emitter)).toThrow('different tables');
    });
  });

  describe('Moving Average KPI', () => {
    it('compiles 7-day moving average', () => {
      const def: MovingAverageKPIDefinition = {
        type: 'moving_average',
        aggregation: 'AVG',
        expression: 'revenue',
        periods: 7,
        periodUnit: 'day',
        orderBy: 'date',
        entity: 'daily_sales',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('AVG(revenue) OVER');
      expect(result.expression).toContain('ORDER BY date');
      expect(result.expression).toContain('ROWS BETWEEN 6 PRECEDING AND CURRENT ROW');
    });

    it('compiles with partition', () => {
      const def: MovingAverageKPIDefinition = {
        type: 'moving_average',
        aggregation: 'SUM',
        expression: 'sales',
        periods: 30,
        periodUnit: 'day',
        partitionBy: ['product_id'],
        orderBy: 'date',
        entity: 'product_sales',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('PARTITION BY product_id');
    });
  });

  describe('Ranking KPI', () => {
    it('compiles RANK by revenue', () => {
      const def: RankingKPIDefinition = {
        type: 'ranking',
        rankFunction: 'RANK',
        rankBy: 'revenue',
        rankDirection: 'desc',
        entity: 'customers',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('RANK() OVER');
      expect(result.expression).toContain('ORDER BY revenue DESC');
    });

    it('compiles DENSE_RANK with partition', () => {
      const def: RankingKPIDefinition = {
        type: 'ranking',
        rankFunction: 'DENSE_RANK',
        rankBy: 'sales',
        rankDirection: 'desc',
        partitionBy: ['region'],
        entity: 'sales_reps',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('DENSE_RANK() OVER');
      expect(result.expression).toContain('PARTITION BY region');
    });

    it('compiles NTILE for quartiles', () => {
      const def: RankingKPIDefinition = {
        type: 'ranking',
        rankFunction: 'NTILE',
        ntileBuckets: 4,
        rankBy: 'score',
        rankDirection: 'desc',
        entity: 'students',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('NTILE(4) OVER');
    });

    it('compiles ROW_NUMBER', () => {
      const def: RankingKPIDefinition = {
        type: 'ranking',
        rankFunction: 'ROW_NUMBER',
        rankBy: 'created_at',
        rankDirection: 'asc',
        entity: 'transactions',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('ROW_NUMBER() OVER');
      expect(result.expression).toContain('ORDER BY created_at ASC');
    });
  });

  describe('Conditional KPI', () => {
    it('compiles conditional COUNT', () => {
      const def: ConditionalKPIDefinition = {
        type: 'conditional',
        aggregation: 'COUNT',
        expression: '*',
        condition: "status = 'active'",
        entity: 'users',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('COUNT');
      expect(result.expression).toContain("CASE WHEN status = 'active'");
    });

    it('compiles conditional SUM', () => {
      const def: ConditionalKPIDefinition = {
        type: 'conditional',
        aggregation: 'SUM',
        expression: 'amount',
        condition: "type = 'sale'",
        entity: 'transactions',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('SUM');
      expect(result.expression).toContain("CASE WHEN type = 'sale' THEN amount END");
    });
  });

  describe('nullFallback', () => {
    it('wraps expression with COALESCE for numeric fallback', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'amount',
        entity: 'orders',
        nullFallback: 0,
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain('COALESCE(SUM(amount), 0)');
    });

    it('wraps expression with COALESCE for string fallback', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'MAX',
        expression: 'name',
        entity: 'products',
        nullFallback: 'N/A',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.expression).toContain("COALESCE(MAX(name), 'N/A')");
    });
  });

  describe('Date Range Filters', () => {
    it('applies last_30_days date range', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'amount',
        entity: 'orders',
        timeField: 'created_at',
        dateRange: 'last_30_days',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('created_at');
      expect(result.sql).toContain('-30');
    });

    it('applies this_month date range', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'COUNT',
        expression: '*',
        entity: 'users',
        timeField: 'signup_date',
        dateRange: 'this_month',
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain("DATE_TRUNC('month'");
    });
  });

  describe('Period Comparison', () => {
    it('generates comparison query with YoY', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'revenue',
        entity: 'sales',
        timeField: 'sale_date',
        comparison: {
          period: 'previous_year',
        },
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('WITH current_period');
      expect(result.sql).toContain('previous_period');
      expect(result.sql).toContain('current_value');
      expect(result.sql).toContain('delta');
      expect(result.sql).toContain('pct_change');
    });

    it('generates comparison query with MoM', () => {
      const def: SimpleKPIDefinition = {
        type: 'simple',
        aggregation: 'SUM',
        expression: 'revenue',
        entity: 'monthly_sales',
        timeField: 'month_date',
        comparison: {
          period: 'previous_month',
        },
      };

      const result = compileKPIFormula(def, emitter);

      expect(result.success).toBe(true);
      expect(result.sql).toContain('WITH current_period');
      expect(result.sql).toContain('previous_period');
      // DuckDB uses INTERVAL '-1' month format
      expect(result.sql).toMatch(/month/i);
    });
  });
});
