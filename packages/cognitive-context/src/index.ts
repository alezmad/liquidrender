/**
 * Cognitive Context System
 *
 * Production-ready context management for AI coding assistants.
 *
 * @packageDocumentation
 */

// Types
export * from './types.js';

// Configuration
export * from './config.schema.js';
export * from './config.js';

// Core modules (to be implemented in Wave 1-3)
export * from './extractor.js';
export * from './watcher.js';
export * from './tokens.js';
export * from './validator.js';
export * from './sync.js';
export * from './drift.js';

// Adapters
export * from './adapters/index.js';

// Hooks
export * from './hooks/index.js';

// CLI (exported for programmatic use)
export { createProgram } from './cli.js';

// Version
export const VERSION = '0.1.0';
