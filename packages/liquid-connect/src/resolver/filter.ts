// Resolver - Filter Resolution
// Converts filter AST nodes to resolved filters

import type {
  FilterExprNode,
  NamedFilterNode,
  ExplicitFilterNode,
  BinaryFilterNode,
  UnaryFilterNode,
  GroupedFilterNode,
  ValueNode,
} from '../compiler/ast';
import type { ResolvedFilter } from '../liquidflow/types';
import type { SemanticRegistry } from '../semantic/registry';
import type { FilterDefinition } from '../semantic/types';
import type { DslOperator, SqlOperator } from '../types';
import type { ResolverContext, ResolverError, SourceTracker } from './types';

/**
 * Resolve a filter expression to ResolvedFilter
 */
export function resolveFilter(
  node: FilterExprNode,
  registry: SemanticRegistry,
  context: ResolverContext,
  sourceTracker: SourceTracker
): { filter?: ResolvedFilter; error?: ResolverError } {
  switch (node.kind) {
    case 'NamedFilter':
      return resolveNamedFilter(node, registry, sourceTracker);

    case 'ExplicitFilter':
      return resolveExplicitFilter(node, context, sourceTracker);

    case 'BinaryFilter':
      return resolveBinaryFilter(node, registry, context, sourceTracker);

    case 'UnaryFilter':
      return resolveUnaryFilter(node, registry, context, sourceTracker);

    case 'GroupedFilter':
      return resolveFilter(node.expression, registry, context, sourceTracker);

    default:
      return {
        error: {
          code: 'E204',
          message: `Unknown filter kind: ${(node as FilterExprNode).kind}`,
          span: (node as FilterExprNode).span,
        },
      };
  }
}

/**
 * Resolve named filter: ?enterprise
 */
function resolveNamedFilter(
  node: NamedFilterNode,
  registry: SemanticRegistry,
  sourceTracker: SourceTracker
): { filter?: ResolvedFilter; error?: ResolverError } {
  const result = registry.resolveFilter(node.name);

  if (!result.success) {
    return {
      error: {
        code: 'E204',
        message: `Unknown filter: ?${node.name}`,
        reference: `?${node.name}`,
        span: node.span,
        suggestions: result.error?.suggestions,
      },
    };
  }

  const filterDef = result.value!;
  const condition = filterDef.condition;

  // Track source if entity is specified
  if (condition.entity) {
    sourceTracker.sources.add(condition.entity);
  }

  // Build the resolved filter
  let filter: ResolvedFilter = {
    type: 'predicate',
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
    namedFilter: node.name,
  };

  // Handle negation
  if (node.negated) {
    filter = negateFilter(filter);
  }

  return { filter };
}

/**
 * Resolve explicit filter: ?:segment="ENT"
 */
function resolveExplicitFilter(
  node: ExplicitFilterNode,
  context: ResolverContext,
  sourceTracker: SourceTracker
): { filter?: ResolvedFilter; error?: ResolverError } {
  const value = resolveValue(node.value, context);

  if (value.error) {
    return { error: value.error };
  }

  let operator = node.operator;
  let resolvedValue = value.value;

  // Handle special operators
  if (operator === 'range' && Array.isArray(resolvedValue) && resolvedValue.length === 2) {
    // Convert range to BETWEEN
    operator = 'range';
  }

  let filter: ResolvedFilter = {
    type: 'predicate',
    field: node.field,
    operator: mapOperator(operator),
    value: resolvedValue,
  };

  // Handle negation
  if (node.negated) {
    filter = negateFilter(filter);
  }

  return { filter };
}

/**
 * Resolve binary filter: filter1 & filter2
 */
function resolveBinaryFilter(
  node: BinaryFilterNode,
  registry: SemanticRegistry,
  context: ResolverContext,
  sourceTracker: SourceTracker
): { filter?: ResolvedFilter; error?: ResolverError } {
  const leftResult = resolveFilter(node.left, registry, context, sourceTracker);
  if (leftResult.error) return leftResult;

  const rightResult = resolveFilter(node.right, registry, context, sourceTracker);
  if (rightResult.error) return rightResult;

  return {
    filter: {
      type: 'compound',
      booleanOp: node.operator,
      left: leftResult.filter!,
      right: rightResult.filter!,
    },
  };
}

/**
 * Resolve unary filter: !filter
 */
function resolveUnaryFilter(
  node: UnaryFilterNode,
  registry: SemanticRegistry,
  context: ResolverContext,
  sourceTracker: SourceTracker
): { filter?: ResolvedFilter; error?: ResolverError } {
  const operandResult = resolveFilter(node.operand, registry, context, sourceTracker);
  if (operandResult.error) return operandResult;

  return {
    filter: negateFilter(operandResult.filter!),
  };
}

/**
 * Negate a filter
 */
function negateFilter(filter: ResolvedFilter): ResolvedFilter {
  if (filter.type === 'predicate') {
    // Negate the operator
    const negatedOp = negateOperator(filter.operator!);
    return {
      ...filter,
      operator: negatedOp,
    };
  }

  // For compound filters, wrap in NOT or flip AND/OR
  if (filter.type === 'compound') {
    // Apply De Morgan's law
    if (filter.booleanOp === 'AND') {
      return {
        type: 'compound',
        booleanOp: 'OR',
        left: negateFilter(filter.left!),
        right: negateFilter(filter.right!),
      };
    } else if (filter.booleanOp === 'OR') {
      return {
        type: 'compound',
        booleanOp: 'AND',
        left: negateFilter(filter.left!),
        right: negateFilter(filter.right!),
      };
    }
  }

  return filter;
}

/**
 * Negate a SQL operator
 */
function negateOperator(op: SqlOperator): SqlOperator {
  switch (op) {
    case '=': return '!=';
    case '!=': return '=';
    case '>': return '<=';
    case '>=': return '<';
    case '<': return '>=';
    case '<=': return '>';
    case 'LIKE': return 'NOT LIKE';
    case 'NOT LIKE': return 'LIKE';
    case 'IN': return 'NOT IN';
    case 'NOT IN': return 'IN';
    case 'IS NULL': return 'IS NOT NULL';
    case 'IS NOT NULL': return 'IS NULL';
    case 'BETWEEN': return 'NOT IN'; // Approximation for NOT BETWEEN
    default:
      const _exhaustive: never = op;
      throw new Error(`Unknown SQL operator: ${_exhaustive}`);
  }
}

/**
 * Map DSL operator to SQL operator
 * Converts token-efficient LLM syntax to standard SQL
 */
function mapOperator(op: DslOperator): SqlOperator {
  switch (op) {
    // Direct mappings (same in DSL and SQL)
    case '=':
    case '!=':
    case '>':
    case '>=':
    case '<':
    case '<=':
      return op;

    // DSL → SQL conversions
    case '~':
      return 'LIKE';
    case '!~':
      return 'NOT LIKE';
    case 'in':
      return 'IN';
    case '!in':
      return 'NOT IN';
    case 'null':
      return 'IS NULL';
    case '!null':
      return 'IS NOT NULL';
    case 'range':
      return 'BETWEEN';

    default:
      // Type safety - should never reach here if all DslOperator cases handled
      const _exhaustive: never = op;
      throw new Error(`Unknown DSL operator: ${_exhaustive}`);
  }
}

/**
 * Resolve a value node to concrete value
 */
function resolveValue(
  node: ValueNode,
  context: ResolverContext
): { value?: unknown; error?: ResolverError } {
  switch (node.kind) {
    case 'StringValue':
      return { value: node.value };

    case 'NumberValue':
      return { value: node.value };

    case 'BooleanValue':
      return { value: node.value };

    case 'ArrayValue': {
      const values: unknown[] = [];
      for (const v of node.values) {
        const resolved = resolveValue(v, context);
        if (resolved.error) return resolved;
        values.push(resolved.value);
      }
      return { value: values };
    }

    case 'RangeValue': {
      const from = resolveValue(node.from, context);
      if (from.error) return from;
      const to = resolveValue(node.to, context);
      if (to.error) return to;
      return { value: [from.value, to.value] };
    }

    case 'Parameter': {
      const paramValue = context.parameters[node.name];
      if (paramValue === undefined) {
        return {
          error: {
            code: 'E501',
            message: `Missing required parameter: ${node.name}`,
            reference: node.name,
            span: node.span,
          },
        };
      }
      return { value: paramValue };
    }

    default:
      return {
        error: {
          code: 'E502',
          message: `Unknown value kind: ${(node as ValueNode).kind}`,
          span: (node as ValueNode).span,
        },
      };
  }
}

/**
 * Resolve multiple filter nodes to a single combined filter
 */
export function combineFilters(filters: ResolvedFilter[]): ResolvedFilter | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];

  // Combine with AND
  return filters.reduce((acc, filter) => ({
    type: 'compound',
    booleanOp: 'AND',
    left: acc,
    right: filter,
  }));
}
