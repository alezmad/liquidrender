// LiquidFlow - Portable Intermediate Representation
// The heart of LiquidConnect's universal query abstraction

export type {
  LiquidFlow,
  ResolvedMetric,
  ResolvedEntity,
  ResolvedDimension,
  ResolvedFilter,
  ResolvedTime,
  ResolvedOrderBy,
  ResolvedCompare,
  ResolvedSource,
  ResolvedJoin,
  ResolvedField,
  FlowMetadata,
  FlowValidation,
  FlowValidationError,
  FlowValidationWarning,
} from './types';

export { LiquidFlowBuilder } from './builder';
export { validateFlow, isValidFlow } from './validator';

/**
 * Current LiquidFlow IR version
 */
export const LIQUIDFLOW_VERSION = '0.1.0';

/**
 * Serialize LiquidFlow to JSON string
 */
export function serializeFlow(flow: import('./types').LiquidFlow): string {
  return JSON.stringify(flow, null, 2);
}

/**
 * Deserialize LiquidFlow from JSON string
 */
export function deserializeFlow(json: string): import('./types').LiquidFlow {
  return JSON.parse(json);
}
