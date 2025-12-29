// v7 Parameter Feature Tests
// Comprehensive tests for parameter handling in v7 syntax

import { describe, test, expect } from 'vitest';
import { parseToAST } from '../src/compiler';
import type { ParameterNode, ExplicitFilterNode, LimitNode } from '../src/compiler/ast';

// =============================================================================
// PARAMETERS IN FILTER VALUES
// =============================================================================

describe('v7 Parameters in Filter Values', () => {
  test('parses parameter in equality filter: ?:country=$region', () => {
    const ast = parseToAST('Q @revenue ?:country=$region');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');

    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.field).toBe('country');
    expect(filter.value.kind).toBe('Parameter');

    const param = filter.value as ParameterNode;
    expect(param.name).toBe('region');
  });

  test('parses parameter in comparison filter: ?:amount>$minAmount', () => {
    const ast = parseToAST('Q @revenue ?:amount>$minAmount');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');

    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.field).toBe('amount');
    expect(filter.operator).toBe('>');
    expect(filter.value.kind).toBe('Parameter');

    const param = filter.value as ParameterNode;
    expect(param.name).toBe('minAmount');
  });

  test('parses parameter in status filter: ?:status=$status', () => {
    const ast = parseToAST('Q @orders ?:status=$status');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');

    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.field).toBe('status');
    expect(filter.value.kind).toBe('Parameter');

    const param = filter.value as ParameterNode;
    expect(param.name).toBe('status');
  });

  test('parameter node has correct structure', () => {
    const ast = parseToAST('Q @revenue ?:field=$myParam');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;

    expect(param).toMatchObject({
      kind: 'Parameter',
      name: 'myParam'
    });
  });

  test('parses parameter with less-than operator: ?:price<$maxPrice', () => {
    const ast = parseToAST('Q @products ?:price<$maxPrice');

    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.operator).toBe('<');
    expect(filter.value.kind).toBe('Parameter');
    expect((filter.value as ParameterNode).name).toBe('maxPrice');
  });

  test('parses parameter with not-equals operator: ?:type!=$excludedType', () => {
    const ast = parseToAST('Q @items ?:type!=$excludedType');

    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.operator).toBe('!=');
    expect(filter.value.kind).toBe('Parameter');
    expect((filter.value as ParameterNode).name).toBe('excludedType');
  });
});

// =============================================================================
// PARAMETERS IN LIMIT
// =============================================================================

describe('v7 Parameters in Limit', () => {
  test('parses parameter in limit: top:$count', () => {
    const ast = parseToAST('Q @revenue top:$count');

    expect(ast.limit).toBeDefined();
    expect(ast.limit?.kind).toBe('Limit');

    const limit = ast.limit as LimitNode;
    expect(typeof limit.value).not.toBe('number');
    expect(limit.value).toHaveProperty('kind', 'Parameter');

    const param = limit.value as ParameterNode;
    expect(param.name).toBe('count');
  });

  test('limit value is ParameterNode not number', () => {
    const ast = parseToAST('Q @revenue top:$pageSize');

    const limit = ast.limit as LimitNode;

    // Verify it's not a number
    expect(typeof limit.value).toBe('object');

    // Verify it's a ParameterNode
    const param = limit.value as ParameterNode;
    expect(param.kind).toBe('Parameter');
    expect(param.name).toBe('pageSize');
  });

  test('numeric limit still works: top:10', () => {
    const ast = parseToAST('Q @revenue top:10');

    const limit = ast.limit as LimitNode;
    expect(limit.value).toBe(10);
    expect(typeof limit.value).toBe('number');
  });
});

// =============================================================================
// MULTIPLE PARAMETERS
// =============================================================================

describe('v7 Multiple Parameters', () => {
  test('parses multiple parameters in filters: ?:country=$region & ?:status=$status', () => {
    const ast = parseToAST('Q @revenue ?:country=$region & ?:status=$status');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');

    // Check left filter
    const binaryFilter = ast.filter as any;
    expect(binaryFilter.left.kind).toBe('ExplicitFilter');
    expect(binaryFilter.left.field).toBe('country');
    expect(binaryFilter.left.value.kind).toBe('Parameter');
    expect(binaryFilter.left.value.name).toBe('region');

    // Check right filter
    expect(binaryFilter.right.kind).toBe('ExplicitFilter');
    expect(binaryFilter.right.field).toBe('status');
    expect(binaryFilter.right.value.kind).toBe('Parameter');
    expect(binaryFilter.right.value.name).toBe('status');
  });

  test('parses filter param plus limit param: Q @revenue ?:country=$region top:$limit', () => {
    const ast = parseToAST('Q @revenue ?:country=$region top:$limit');

    // Check filter parameter
    expect(ast.filter).toBeDefined();
    const filter = ast.filter as ExplicitFilterNode;
    expect(filter.value.kind).toBe('Parameter');
    expect((filter.value as ParameterNode).name).toBe('region');

    // Check limit parameter
    expect(ast.limit).toBeDefined();
    const limit = ast.limit as LimitNode;
    expect(limit.value).toHaveProperty('kind', 'Parameter');
    expect((limit.value as ParameterNode).name).toBe('limit');
  });

  test('parses three parameters in complex query', () => {
    const ast = parseToAST('Q @revenue ?:country=$region & ?:status=$status top:$limit');

    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.limit).toBeDefined();

    const limit = ast.limit as LimitNode;
    expect((limit.value as ParameterNode).name).toBe('limit');
  });

  test('parses OR combined parameter filters', () => {
    const ast = parseToAST('Q @revenue ?:status=$active | ?:status=$pending');

    expect(ast.filter?.kind).toBe('BinaryFilter');
    const binaryFilter = ast.filter as any;
    expect(binaryFilter.operator).toBe('OR');
  });
});

// =============================================================================
// PARAMETER NAMES
// =============================================================================

describe('v7 Parameter Names', () => {
  test('parses parameter with underscore: $simple_name', () => {
    const ast = parseToAST('Q @revenue ?:field=$simple_name');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('simple_name');
  });

  test('parses parameter with camelCase: $camelCase', () => {
    const ast = parseToAST('Q @revenue ?:field=$camelCase');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('camelCase');
  });

  test('parses parameter with UPPER case: $UPPER', () => {
    const ast = parseToAST('Q @revenue ?:field=$UPPER');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('UPPER');
  });

  test('parses parameter with mixed case and underscore: $My_Param_Name', () => {
    const ast = parseToAST('Q @revenue ?:field=$My_Param_Name');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('My_Param_Name');
  });

  test('parses parameter with numbers: $param123', () => {
    const ast = parseToAST('Q @revenue ?:field=$param123');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('param123');
  });

  test('parses single letter parameter: $x', () => {
    const ast = parseToAST('Q @revenue ?:field=$x');

    const filter = ast.filter as ExplicitFilterNode;
    const param = filter.value as ParameterNode;
    expect(param.name).toBe('x');
  });

  test('parses parameter in limit with underscore: top:$page_size', () => {
    const ast = parseToAST('Q @revenue top:$page_size');

    const limit = ast.limit as LimitNode;
    const param = limit.value as ParameterNode;
    expect(param.name).toBe('page_size');
  });
});
