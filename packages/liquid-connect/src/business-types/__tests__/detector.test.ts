/**
 * Business Type Detector Tests
 */

import { describe, it, expect } from 'vitest';
import { detectBusinessType } from '../detector';
import type { ExtractedSchema, Table } from '../../uvb/models';

/**
 * Helper to create mock schema for testing
 */
function createMockSchema(tableNames: string[], extraColumns: Record<string, string[]> = {}): ExtractedSchema {
  const tables: Table[] = tableNames.map((name) => ({
    name,
    schema: 'public',
    columns: [
      {
        name: 'id',
        dataType: 'integer',
        isPrimaryKey: true,
        isForeignKey: false,
        isNotNull: true,
      },
      ...(extraColumns[name] || []).map((colName) => ({
        name: colName,
        dataType: 'varchar',
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: false,
      })),
    ],
    primaryKeyColumns: ['id'],
    foreignKeys: [],
  }));

  return {
    database: 'test_db',
    type: 'postgres',
    schema: 'public',
    tables,
    extractedAt: new Date().toISOString(),
  };
}

describe('detectBusinessType', () => {
  it('detects SaaS from subscriptions table', () => {
    const schema = createMockSchema(['subscriptions', 'plans', 'users']);
    const result = detectBusinessType(schema);

    expect(result.primary?.type).toBe('saas');
    expect(result.primary?.confidence).toBeGreaterThanOrEqual(50);
    expect(result.primary?.signals.length).toBeGreaterThan(0);
    expect(result.primary?.signals.some((s) => s.signal.includes('subscriptions'))).toBe(true);
  });

  it('detects e-commerce from orders and products', () => {
    const schema = createMockSchema(['orders', 'products', 'customers']);
    const result = detectBusinessType(schema);

    expect(result.primary?.type).toBe('ecommerce');
    expect(result.primary?.confidence).toBeGreaterThanOrEqual(50);
    expect(result.primary?.signals.some((s) => s.signal.includes('orders'))).toBe(true);
    expect(result.primary?.signals.some((s) => s.signal.includes('products'))).toBe(true);
  });

  it('detects marketplace from sellers and buyers', () => {
    const schema = createMockSchema(['sellers', 'buyers', 'listings']);
    const result = detectBusinessType(schema);

    expect(result.primary?.type).toBe('marketplace');
    expect(result.primary?.confidence).toBeGreaterThanOrEqual(50);
  });

  it('returns ambiguous when signals are mixed', () => {
    const schema = createMockSchema(['subscriptions', 'orders']);
    const result = detectBusinessType(schema);

    // Both SaaS (subscriptions=30) and E-commerce (orders=30) should be detected
    expect(result.matches.length).toBeGreaterThan(1);

    // Check if ambiguous flag is set (both within 15 points)
    if (result.matches.length >= 2) {
      const delta = Math.abs(result.matches[0].confidence - result.matches[1].confidence);
      expect(result.ambiguous).toBe(delta <= 15);
    }
  });

  it('detects column patterns for SaaS', () => {
    const schema = createMockSchema(['billing'], {
      billing: ['mrr', 'arr', 'churn_rate'],
    });
    const result = detectBusinessType(schema);

    expect(result.primary?.type).toBe('saas');
    expect(result.primary?.signals.some((s) => s.signal.includes('mrr'))).toBe(true);
    expect(result.primary?.signals.some((s) => s.signal.includes('arr'))).toBe(true);
  });

  it('detects column patterns for e-commerce', () => {
    const schema = createMockSchema(['inventory'], {
      inventory: ['sku', 'quantity', 'shipping_cost'],
    });
    const result = detectBusinessType(schema);

    expect(result.primary?.type).toBe('ecommerce');
    expect(result.primary?.signals.some((s) => s.signal.includes('sku'))).toBe(true);
  });

  it('returns no primary match when confidence is too low', () => {
    const schema = createMockSchema(['random_table', 'another_table']);
    const result = detectBusinessType(schema);

    expect(result.primary).toBeNull();
    expect(result.matches.length).toBeGreaterThanOrEqual(0);
  });

  it('sorts matches by confidence descending', () => {
    const schema = createMockSchema(['subscriptions', 'plans', 'orders'], {
      subscriptions: ['mrr', 'plan_id'],
    });
    const result = detectBusinessType(schema);

    // Should have multiple matches
    expect(result.matches.length).toBeGreaterThan(1);

    // Should be sorted descending
    for (let i = 0; i < result.matches.length - 1; i++) {
      expect(result.matches[i].confidence).toBeGreaterThanOrEqual(result.matches[i + 1].confidence);
    }
  });
});
