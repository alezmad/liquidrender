// DEPRECATED: Use packer.ts instead
// ============================================================================
// The orchestrator was over-engineered. The correct approach is:
//   - index.json (always loaded, tiny)
//   - slices/<domain>.json (lazy-loaded, few)
//   - packer.ts (deterministic selection + pruning)
//
// See packer.ts for the minimal, testable implementation.
// ============================================================================

export * from './packer';

// Legacy re-exports for compatibility
export { pack as getContextForQuery } from './packer';
export { formatForLLM as contextToLLMFormat } from './packer';
