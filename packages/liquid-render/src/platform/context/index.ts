// LiquidConnect Context Module
// ============================================================================
// Deterministic context delivery: index + slices + packer
// ============================================================================

// Core types
export * from './types';

// Introspection (sync-time, not query-time)
export * from './introspector';

// Context packing (query-time, deterministic)
export * from './packer';
