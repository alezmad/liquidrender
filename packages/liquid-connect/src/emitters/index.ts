// Emitters - Main Entry Point
// SQL generation for multiple database dialects

export {
  BaseEmitter,
  type EmitResult,
  type EmitDebug,
  type SQLParts,
  type EmitterOptions,
  type DialectTraits,
  type DateFunctions,
  type AggregateFunctions,
} from './base';

export { DuckDBEmitter, createDuckDBEmitter } from './duckdb';
export { TrinoEmitter, createTrinoEmitter } from './trino';
export { PostgresEmitter, createPostgresEmitter } from './postgres';

import type { LiquidFlow } from '../liquidflow/types';
import type { EmitResult, EmitterOptions } from './base';
import { DuckDBEmitter } from './duckdb';
import { TrinoEmitter } from './trino';
import { PostgresEmitter } from './postgres';

/**
 * Supported dialects
 */
export type Dialect = 'duckdb' | 'trino' | 'postgres';

/**
 * Create an emitter for the specified dialect
 */
export function createEmitter(dialect: Dialect, options?: EmitterOptions) {
  switch (dialect) {
    case 'duckdb':
      return new DuckDBEmitter(options);
    case 'trino':
      return new TrinoEmitter(options);
    case 'postgres':
      return new PostgresEmitter(options);
    default:
      throw new Error(`Unsupported dialect: ${dialect}`);
  }
}

/**
 * Emit SQL for the specified dialect
 */
export function emit(flow: LiquidFlow, dialect: Dialect, options?: EmitterOptions): EmitResult {
  const emitter = createEmitter(dialect, options);
  return emitter.emit(flow);
}

/**
 * Emit SQL for all supported dialects
 */
export function emitAll(flow: LiquidFlow, options?: EmitterOptions): Record<Dialect, EmitResult> {
  return {
    duckdb: emit(flow, 'duckdb', options),
    trino: emit(flow, 'trino', options),
    postgres: emit(flow, 'postgres', options),
  };
}
