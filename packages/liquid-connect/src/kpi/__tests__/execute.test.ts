// KPI Execution Pipeline Tests
// Verifies Phase 3: Recipe → LiquidFlow → SQL

import { describe, it, expect } from 'vitest';
import {
  compileRecipeToSQL,
  compileRecipesToSQL,
  previewRecipeSQL,
  buildLiquidFlowFromRecipe,
  validateRecipeForFlow,
  type CalculatedMetricRecipe,
} from '../index';

/**
 * Sample SaaS MRR recipe
 */
const mrrRecipe: CalculatedMetricRecipe = {
  name: 'Monthly Recurring Revenue (MRR)',
  description: 'Total recurring revenue per month from active subscriptions',
  category: 'revenue',
  businessType: ['saas'],
  confidence: 0.95,
  feasible: true,
  semanticDefinition: {
    type: 'simple',
    expression: 'amount',
    aggregation: 'SUM',
    entity: 'subscriptions',
    timeField: 'created_at',
    timeGranularity: 'month',
    filters: [
      { field: 'status', operator: '=', value: 'active' },
    ],
    format: {
      type: 'currency',
      currency: 'USD',
    },
  },
};

/**
 * Sample E-commerce AOV recipe
 */
const aovRecipe: CalculatedMetricRecipe = {
  name: 'Average Order Value (AOV)',
  description: 'Average value of completed orders',
  category: 'revenue',
  businessType: ['ecommerce'],
  confidence: 0.92,
  feasible: true,
  semanticDefinition: {
    type: 'simple',
    expression: 'total_amount',
    aggregation: 'AVG',
    entity: 'orders',
    timeField: 'created_at',
    timeGranularity: 'day',
    filters: [
      { field: 'status', operator: '=', value: 'completed' },
    ],
    format: {
      type: 'currency',
      currency: 'USD',
    },
  },
};

/**
 * Sample infeasible recipe (missing data)
 */
const infeasibleRecipe: CalculatedMetricRecipe = {
  name: 'Customer Lifetime Value',
  description: 'Predicted total revenue from a customer',
  category: 'growth',
  businessType: ['saas'],
  confidence: 0.3,
  feasible: false,
  infeasibilityReason: 'Missing customer lifetime data',
  semanticDefinition: {
    type: 'derived',
    expression: 'revenue / churn_rate',
    entity: 'customers',
    dependencies: ['arpu', 'churn_rate'],
  },
};

describe('KPI Execution Pipeline', () => {
  describe('buildLiquidFlowFromRecipe', () => {
    it('should build LiquidFlow from MRR recipe', () => {
      const flow = buildLiquidFlowFromRecipe(mrrRecipe);

      expect(flow.version).toBe('0.1.0');
      expect(flow.type).toBe('metric');
      expect(flow.metrics).toHaveLength(1);
      expect(flow.metrics![0].aggregation).toBe('SUM');
      expect(flow.metrics![0].expression).toBe('amount');
      expect(flow.metrics![0].sourceEntity).toBe('subscriptions');
      expect(flow.sources).toHaveLength(1);
      expect(flow.sources[0].table).toBe('subscriptions');
      expect(flow.filters).toHaveLength(1);
      expect(flow.filters![0].field).toBe('status');
      expect(flow.filters![0].value).toBe('active');
    });

    it('should include time constraint when timeRange provided', () => {
      const flow = buildLiquidFlowFromRecipe(mrrRecipe, {
        timeRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      });

      expect(flow.time).toBeDefined();
      expect(flow.time!.field).toBe('subscriptions.created_at');
      expect(flow.time!.start).toBe('2024-01-01');
      expect(flow.time!.end).toBe('2024-12-31');
    });

    it('should apply schema prefix when provided', () => {
      const flow = buildLiquidFlowFromRecipe(mrrRecipe, {
        schema: 'analytics',
      });

      expect(flow.sources[0].schema).toBe('analytics');
    });
  });

  describe('validateRecipeForFlow', () => {
    it('should validate feasible recipe', () => {
      const result = validateRecipeForFlow(mrrRecipe);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for infeasible recipe', () => {
      const result = validateRecipeForFlow(infeasibleRecipe);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Verify at least one error mentions the recipe being infeasible
      expect(result.errors.some(e => e.toLowerCase().includes('infeasible'))).toBe(true);
    });
  });

  describe('compileRecipeToSQL', () => {
    it('should compile MRR recipe to PostgreSQL', () => {
      const compiled = compileRecipeToSQL(mrrRecipe, {
        dialect: 'postgres',
      });

      expect(compiled.name).toBe('Monthly Recurring Revenue (MRR)');
      expect(compiled.sql).toBeTruthy();
      expect(compiled.sql).toContain('SELECT');
      expect(compiled.sql).toContain('SUM');
      expect(compiled.sql).toContain('subscriptions');
      expect(compiled.flow).toBeDefined();
      expect(compiled.emitResult).toBeDefined();
    });

    it('should compile AOV recipe to DuckDB', () => {
      const compiled = compileRecipeToSQL(aovRecipe, {
        dialect: 'duckdb',
      });

      expect(compiled.sql).toContain('AVG');
      expect(compiled.sql).toContain('orders');
    });

    it('should handle schema prefix', () => {
      const compiled = compileRecipeToSQL(mrrRecipe, {
        dialect: 'postgres',
        schema: 'production',
      });

      expect(compiled.flow.sources[0].schema).toBe('production');
    });
  });

  describe('compileRecipesToSQL', () => {
    it('should compile multiple recipes', () => {
      const compiled = compileRecipesToSQL([mrrRecipe, aovRecipe], {
        dialect: 'postgres',
      });

      expect(compiled).toHaveLength(2);
      expect(compiled[0].name).toBe('Monthly Recurring Revenue (MRR)');
      expect(compiled[1].name).toBe('Average Order Value (AOV)');
    });

    it('should filter out infeasible recipes', () => {
      const compiled = compileRecipesToSQL([mrrRecipe, infeasibleRecipe], {
        dialect: 'postgres',
      });

      expect(compiled).toHaveLength(1);
      expect(compiled[0].name).toBe('Monthly Recurring Revenue (MRR)');
    });
  });

  describe('previewRecipeSQL', () => {
    it('should preview SQL without full compilation', () => {
      const preview = previewRecipeSQL(mrrRecipe, 'postgres');

      expect(preview.sql).toBeTruthy();
      expect(preview.flow).toBeDefined();
      expect(preview.warnings).toEqual([]);
    });

    it('should include warnings for invalid recipes', () => {
      const preview = previewRecipeSQL(infeasibleRecipe, 'postgres');

      expect(preview.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('SQL Output Verification', () => {
  it('should generate valid PostgreSQL syntax for SUM aggregation', () => {
    const compiled = compileRecipeToSQL(mrrRecipe, { dialect: 'postgres' });

    // Verify SQL structure
    expect(compiled.sql).toMatch(/SELECT/i);
    expect(compiled.sql).toMatch(/SUM\s*\(/i);
    expect(compiled.sql).toMatch(/FROM/i);
  });

  it('should generate valid DuckDB syntax', () => {
    const compiled = compileRecipeToSQL(mrrRecipe, { dialect: 'duckdb' });

    expect(compiled.sql).toBeTruthy();
    expect(compiled.sql).toMatch(/SELECT/i);
  });

  it('should include filter conditions in WHERE clause', () => {
    const compiled = compileRecipeToSQL(mrrRecipe, { dialect: 'postgres' });

    expect(compiled.sql).toMatch(/WHERE/i);
    expect(compiled.sql).toContain('status');
  });
});
