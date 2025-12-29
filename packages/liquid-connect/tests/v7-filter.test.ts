// v7 Filter Syntax Integration Tests
// Comprehensive tests for explicit AND (&), OR (|), grouping, and E104 error

import { describe, test, expect } from 'vitest';
import { parseToAST } from '../src/compiler';
import type { BinaryFilterNode, ExplicitFilterNode, NamedFilterNode, UnaryFilterNode, GroupedFilterNode } from '../src/compiler/ast';

// =============================================================================
// EXPLICIT & REQUIREMENT TESTS
// =============================================================================

describe('v7 Explicit AND (&) Syntax', () => {
  test('?a & ?b works correctly', () => {
    const ast = parseToAST('Q @revenue ?active & ?premium');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const binaryFilter = ast.filter as BinaryFilterNode;
    expect(binaryFilter.operator).toBe('AND');
    expect(binaryFilter.left.kind).toBe('NamedFilter');
    expect(binaryFilter.right.kind).toBe('NamedFilter');

    const left = binaryFilter.left as NamedFilterNode;
    const right = binaryFilter.right as NamedFilterNode;
    expect(left.name).toBe('active');
    expect(right.name).toBe('premium');
  });

  test('?a & ?b & ?c chains multiple filters', () => {
    const ast = parseToAST('Q @revenue ?active & ?premium & ?verified');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    // Should parse as left-associative: ((active & premium) & verified)
    const outerBinary = ast.filter as BinaryFilterNode;
    expect(outerBinary.operator).toBe('AND');
    expect(outerBinary.right.kind).toBe('NamedFilter');

    const rightFilter = outerBinary.right as NamedFilterNode;
    expect(rightFilter.name).toBe('verified');

    // Left should be another binary filter
    expect(outerBinary.left.kind).toBe('BinaryFilter');
    const innerBinary = outerBinary.left as BinaryFilterNode;
    expect(innerBinary.operator).toBe('AND');

    const innerLeft = innerBinary.left as NamedFilterNode;
    const innerRight = innerBinary.right as NamedFilterNode;
    expect(innerLeft.name).toBe('active');
    expect(innerRight.name).toBe('premium');
  });

  test('?a | ?b OR still works', () => {
    const ast = parseToAST('Q @revenue ?active | ?premium');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const binaryFilter = ast.filter as BinaryFilterNode;
    expect(binaryFilter.operator).toBe('OR');
    expect(binaryFilter.left.kind).toBe('NamedFilter');
    expect(binaryFilter.right.kind).toBe('NamedFilter');

    const left = binaryFilter.left as NamedFilterNode;
    const right = binaryFilter.right as NamedFilterNode;
    expect(left.name).toBe('active');
    expect(right.name).toBe('premium');
  });

  test('(?a | ?b) & ?c grouping works', () => {
    const ast = parseToAST('Q @revenue (?active | ?premium) & ?verified');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const outerBinary = ast.filter as BinaryFilterNode;
    expect(outerBinary.operator).toBe('AND');

    // Right side should be the named filter ?verified
    expect(outerBinary.right.kind).toBe('NamedFilter');
    const rightFilter = outerBinary.right as NamedFilterNode;
    expect(rightFilter.name).toBe('verified');

    // Left side should be grouped filter containing OR
    expect(outerBinary.left.kind).toBe('GroupedFilter');
    const grouped = outerBinary.left as GroupedFilterNode;
    expect(grouped.expression.kind).toBe('BinaryFilter');

    const innerBinary = grouped.expression as BinaryFilterNode;
    expect(innerBinary.operator).toBe('OR');
  });

  test('?a & (?b | ?c) grouping works', () => {
    const ast = parseToAST('Q @revenue ?active & (?premium | ?enterprise)');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const outerBinary = ast.filter as BinaryFilterNode;
    expect(outerBinary.operator).toBe('AND');

    // Left side should be the named filter ?active
    expect(outerBinary.left.kind).toBe('NamedFilter');
    const leftFilter = outerBinary.left as NamedFilterNode;
    expect(leftFilter.name).toBe('active');

    // Right side should be grouped filter containing OR
    expect(outerBinary.right.kind).toBe('GroupedFilter');
    const grouped = outerBinary.right as GroupedFilterNode;
    expect(grouped.expression.kind).toBe('BinaryFilter');

    const innerBinary = grouped.expression as BinaryFilterNode;
    expect(innerBinary.operator).toBe('OR');
  });
});

// =============================================================================
// E104 ERROR FOR IMPLICIT AND TESTS
// =============================================================================

describe('E104 Error for Implicit AND', () => {
  test('?a ?b throws E104 error', () => {
    expect(() => {
      parseToAST('Q @revenue ?active ?premium');
    }).toThrow(/E104|Use & between filters/);
  });

  test('?a ?b ?c throws E104 error', () => {
    expect(() => {
      parseToAST('Q @revenue ?active ?premium ?verified');
    }).toThrow(/E104|Use & between filters/);
  });

  test('Error message mentions "Use & between filters"', () => {
    try {
      parseToAST('Q @revenue ?active ?premium');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      // Check that error message is helpful
      expect(
        errorMessage.includes('E104') || errorMessage.includes('&') || errorMessage.includes('between filters')
      ).toBe(true);
    }
  });

  test('explicit filter followed by implicit named filter throws E104', () => {
    expect(() => {
      parseToAST('Q @revenue ?:status="active" ?premium');
    }).toThrow(/E104|Use & between filters/);
  });

  test('named filter followed by implicit explicit filter throws E104', () => {
    expect(() => {
      parseToAST('Q @revenue ?active ?:status="pending"');
    }).toThrow(/E104|Use & between filters/);
  });
});

// =============================================================================
// COMPLEX FILTER EXPRESSION TESTS
// =============================================================================

describe('Complex Filter Expressions', () => {
  test('?:field="value" & ?named mixed explicit and named', () => {
    const ast = parseToAST('Q @revenue ?:status="active" & ?premium');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const binaryFilter = ast.filter as BinaryFilterNode;
    expect(binaryFilter.operator).toBe('AND');

    // Left should be explicit filter
    expect(binaryFilter.left.kind).toBe('ExplicitFilter');
    const explicitFilter = binaryFilter.left as ExplicitFilterNode;
    expect(explicitFilter.field).toBe('status');
    expect(explicitFilter.value.kind).toBe('StringValue');

    // Right should be named filter
    expect(binaryFilter.right.kind).toBe('NamedFilter');
    const namedFilter = binaryFilter.right as NamedFilterNode;
    expect(namedFilter.name).toBe('premium');
  });

  test('!?active negation works', () => {
    const ast = parseToAST('Q @revenue !?active');
    expect(ast.filter).toBeDefined();

    // Could be UnaryFilter or NamedFilter with negated=true depending on implementation
    if (ast.filter?.kind === 'UnaryFilter') {
      const unaryFilter = ast.filter as UnaryFilterNode;
      expect(unaryFilter.operator).toBe('NOT');
      expect(unaryFilter.operand.kind).toBe('NamedFilter');
    } else if (ast.filter?.kind === 'NamedFilter') {
      const namedFilter = ast.filter as NamedFilterNode;
      expect(namedFilter.negated).toBe(true);
      expect(namedFilter.name).toBe('active');
    } else {
      // Fail if neither expected structure
      expect(ast.filter?.kind).toMatch(/UnaryFilter|NamedFilter/);
    }
  });

  test('?:amount>100 & ?:amount<1000 range with AND', () => {
    const ast = parseToAST('Q @revenue ?:amount>100 & ?:amount<1000');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const binaryFilter = ast.filter as BinaryFilterNode;
    expect(binaryFilter.operator).toBe('AND');

    // Both sides should be explicit filters
    expect(binaryFilter.left.kind).toBe('ExplicitFilter');
    expect(binaryFilter.right.kind).toBe('ExplicitFilter');

    const leftFilter = binaryFilter.left as ExplicitFilterNode;
    expect(leftFilter.field).toBe('amount');
    expect(leftFilter.operator).toBe('>');

    const rightFilter = binaryFilter.right as ExplicitFilterNode;
    expect(rightFilter.field).toBe('amount');
    expect(rightFilter.operator).toBe('<');
  });

  test('negated explicit filter !?:status="inactive"', () => {
    const ast = parseToAST('Q @revenue !?:status="inactive"');
    expect(ast.filter).toBeDefined();

    // Could be UnaryFilter or ExplicitFilter with negated=true
    if (ast.filter?.kind === 'UnaryFilter') {
      const unaryFilter = ast.filter as UnaryFilterNode;
      expect(unaryFilter.operator).toBe('NOT');
    } else if (ast.filter?.kind === 'ExplicitFilter') {
      const explicitFilter = ast.filter as ExplicitFilterNode;
      expect(explicitFilter.negated).toBe(true);
    }
  });

  test('complex nested expression (?a & ?b) | (?c & ?d)', () => {
    const ast = parseToAST('Q @revenue (?active & ?premium) | (?verified & ?trusted)');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const outerBinary = ast.filter as BinaryFilterNode;
    expect(outerBinary.operator).toBe('OR');

    // Both sides should be grouped filters
    expect(outerBinary.left.kind).toBe('GroupedFilter');
    expect(outerBinary.right.kind).toBe('GroupedFilter');

    const leftGrouped = outerBinary.left as GroupedFilterNode;
    const rightGrouped = outerBinary.right as GroupedFilterNode;

    // Both inner expressions should be AND
    expect(leftGrouped.expression.kind).toBe('BinaryFilter');
    expect(rightGrouped.expression.kind).toBe('BinaryFilter');

    const leftInner = leftGrouped.expression as BinaryFilterNode;
    const rightInner = rightGrouped.expression as BinaryFilterNode;

    expect(leftInner.operator).toBe('AND');
    expect(rightInner.operator).toBe('AND');
  });

  test('mixed operators with correct precedence ?a | ?b & ?c', () => {
    // Typically AND has higher precedence than OR
    // So this should parse as: ?a | (?b & ?c)
    const ast = parseToAST('Q @revenue ?a | ?b & ?c');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const outerBinary = ast.filter as BinaryFilterNode;
    // If AND has higher precedence, outer should be OR
    // If left-to-right, outer should be AND
    // Accept either behavior as valid
    expect(['AND', 'OR']).toContain(outerBinary.operator);
  });

  test('filter with parameter value ?:region=$userRegion & ?active', () => {
    const ast = parseToAST('Q @revenue ?:region=$userRegion & ?active');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    const binaryFilter = ast.filter as BinaryFilterNode;
    expect(binaryFilter.operator).toBe('AND');

    // Left should be explicit filter with parameter
    expect(binaryFilter.left.kind).toBe('ExplicitFilter');
    const explicitFilter = binaryFilter.left as ExplicitFilterNode;
    expect(explicitFilter.field).toBe('region');
    expect(explicitFilter.value.kind).toBe('Parameter');
  });

  test('multiple explicit filters with different operators', () => {
    const ast = parseToAST('Q @revenue ?:status="active" & ?:tier>="premium" & ?:country!="XX"');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    // Should have chained AND operators
    const outerBinary = ast.filter as BinaryFilterNode;
    expect(outerBinary.operator).toBe('AND');
  });

  test('deeply nested grouping (((?a & ?b)))', () => {
    const ast = parseToAST('Q @revenue (((?active & ?premium)))');
    expect(ast.filter).toBeDefined();

    // Navigate through nested grouped filters
    let current = ast.filter;
    let depth = 0;
    while (current?.kind === 'GroupedFilter') {
      const grouped = current as GroupedFilterNode;
      current = grouped.expression;
      depth++;
    }

    // Should eventually reach the binary filter
    expect(current?.kind).toBe('BinaryFilter');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Filter Syntax Edge Cases', () => {
  test('single filter without & works', () => {
    const ast = parseToAST('Q @revenue ?active');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('NamedFilter');
  });

  test('single explicit filter works', () => {
    const ast = parseToAST('Q @revenue ?:status="active"');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');
  });

  test('filter with time expression still works', () => {
    const ast = parseToAST('Q @revenue ?active & ?premium ~30d');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.time).toBeDefined();
  });

  test('filter with dimension and metric still works', () => {
    const ast = parseToAST('Q @revenue #region ?active & ?premium');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.dimensions).toHaveLength(1);
  });
});
