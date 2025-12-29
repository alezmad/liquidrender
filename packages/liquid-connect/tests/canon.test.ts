// Canon Regression Tests
// These 18 samples were proven during LiquidGym evolution (stages 0-6)
// Each sample was validated against real databases with cross-engine parity

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseToAST } from '../src/compiler';

interface CanonSample {
  id: string;
  stage: number;
  query: string;
  type: string;
  description: string;
  sql?: string;
  sql_duckdb?: string;
  parity?: boolean;
  status: string;
}

// Load canon samples from fixtures
const canonPath = join(__dirname, '../fixtures/canon.jsonl');
const canonLines = readFileSync(canonPath, 'utf-8').trim().split('\n');
const canonSamples: CanonSample[] = canonLines.map(line => JSON.parse(line));

// Group samples by stage
const samplesByStage = canonSamples.reduce((acc, sample) => {
  const stage = sample.stage;
  if (!acc[stage]) acc[stage] = [];
  acc[stage].push(sample);
  return acc;
}, {} as Record<number, CanonSample[]>);

// =============================================================================
// STAGE 0: ATOMS
// =============================================================================

describe('Canon Stage 0: Atoms', () => {
  const stage0 = samplesByStage[0] || [];

  test.each(stage0)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();

    if (sample.type === 'metric') {
      expect(ast.type).toBe('metric');
      expect(ast.metrics).toBeDefined();
      expect(ast.metrics?.length).toBeGreaterThan(0);
    } else if (sample.type === 'entity') {
      expect(ast.type).toBe('entity');
      expect(ast.entity).toBeDefined();
    }
  });
});

// =============================================================================
// STAGE 1: DIMENSIONS
// =============================================================================

describe('Canon Stage 1: Dimensions', () => {
  const stage1 = samplesByStage[1] || [];

  test.each(stage1)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();
    expect(ast.dimensions).toBeDefined();
    expect(ast.dimensions?.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// STAGE 2: FILTERS
// =============================================================================

describe('Canon Stage 2: Filters', () => {
  const stage2 = samplesByStage[2] || [];

  test.each(stage2)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();
    expect(ast.filter).toBeDefined();
  });
});

// =============================================================================
// STAGE 3: TIME
// =============================================================================

describe('Canon Stage 3: Time', () => {
  const stage3 = samplesByStage[3] || [];

  test.each(stage3)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();
    expect(ast.time).toBeDefined();
  });
});

// =============================================================================
// STAGE 4: SORT/LIMIT
// =============================================================================

describe('Canon Stage 4: Sort/Limit', () => {
  const stage4 = samplesByStage[4] || [];

  test.each(stage4)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();

    if (sample.query.includes('top:')) {
      expect(ast.limit).toBeDefined();
    }
    if (sample.query.includes('+') || sample.query.includes('-@') || sample.query.includes('-#')) {
      expect(ast.orderBy).toBeDefined();
    }
  });
});

// =============================================================================
// STAGE 5: COMPARE
// =============================================================================

describe('Canon Stage 5: Compare', () => {
  const stage5 = samplesByStage[5] || [];

  test.each(stage5)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();
    expect(ast.compare).toBeDefined();
  });
});

// =============================================================================
// STAGE 6: JOINS
// =============================================================================

describe('Canon Stage 6: Joins', () => {
  const stage6 = samplesByStage[6] || [];

  test.each(stage6)('$id: $query - $description', (sample) => {
    const ast = parseToAST(sample.query);
    expect(ast).toBeDefined();
    // Join resolution happens in resolver, not parser
    // Just verify the query parses successfully
    expect(ast.dimensions).toBeDefined();
  });
});

// =============================================================================
// ALL CANON: REGRESSION CHECK
// =============================================================================

describe('Canon Regression: All Samples Parse', () => {
  test.each(canonSamples)('$id: $query', (sample) => {
    expect(() => parseToAST(sample.query)).not.toThrow();
  });
});

// =============================================================================
// SUMMARY
// =============================================================================

describe('Canon Summary', () => {
  test('all 18 canon samples loaded', () => {
    expect(canonSamples.length).toBe(18);
  });

  test('stages 0-6 represented', () => {
    const stages = [...new Set(canonSamples.map(s => s.stage))].sort();
    expect(stages).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('all samples have validated status', () => {
    const allValidated = canonSamples.every(s => s.status === 'validated');
    expect(allValidated).toBe(true);
  });
});
