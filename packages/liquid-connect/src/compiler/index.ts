// LiquidConnect Compiler
// Main entry point for compilation

export { Scanner } from './scanner';
export { Parser } from './parser';
export type { Token, TokenType } from './tokens';
export { isSigil, isFilterOperator, isBooleanOperator, isTimeToken } from './tokens';
export type {
  QueryNode,
  MetricNode,
  EntityNode,
  DimensionNode,
  FilterExprNode,
  NamedFilterNode,
  ExplicitFilterNode,
  BinaryFilterNode,
  UnaryFilterNode,
  GroupedFilterNode,
  ValueNode,
  TimeNode,
  DurationNode,
  PeriodNode,
  SpecificDateNode,
  TimeRangeNode,
  LimitNode,
  OrderByNode,
  CompareNode,
} from './ast';
export {
  LiquidError,
  ErrorCode,
  DiagnosticsCollector,
  getErrorCategory,
  type ErrorCategory,
  type Diagnostic,
  type DiagnosticSeverity,
} from './diagnostics';

import { Scanner } from './scanner';
import { Parser } from './parser';
import type { QueryNode } from './ast';
import type { LiquidFlow } from '../liquidflow/types';
import type { SemanticLayer } from '../semantic/types';
import { createRegistry } from '../semantic/registry';
import { Resolver, type ResolverOptions } from '../resolver';

/**
 * Compile LiquidConnect query string to AST
 */
export function parseToAST(source: string): QueryNode {
  const scanner = new Scanner(source);
  const tokens = scanner.scan();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Compile LiquidConnect query to LiquidFlow IR
 * Requires semantic layer for resolution
 */
export function compile(
  source: string,
  semantic: SemanticLayer,
  options?: ResolverOptions
): LiquidFlow {
  // Parse to AST
  const ast = parseToAST(source);

  // Create registry from semantic layer
  const registry = createRegistry(semantic);

  // Resolve AST to LiquidFlow
  const resolver = new Resolver(registry, options);
  const result = resolver.resolve(ast);

  if (!result.success) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`Resolution failed: ${errorMessages}`);
  }

  return result.flow!;
}

/**
 * Compile with full result (includes warnings)
 */
export function compileWithResult(
  source: string,
  semantic: SemanticLayer,
  options?: ResolverOptions
) {
  const ast = parseToAST(source);
  const registry = createRegistry(semantic);
  const resolver = new Resolver(registry, options);
  return {
    ast,
    ...resolver.resolve(ast),
  };
}

/**
 * Parse and validate without resolution
 * Useful for syntax checking
 */
export function validate(source: string): { valid: boolean; errors: string[] } {
  try {
    parseToAST(source);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, errors: [error.message] };
    }
    return { valid: false, errors: ['Unknown error'] };
  }
}
