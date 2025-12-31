// @repo/liquid-render - Unified LiquidSurvey Package
// Combines DSL compiler, schema types, validation, and runtime engine

// Types
export * from './types';

// Theme System
export * from './types/theme';
export { LiquidProvider, useLiquidTheme, useLiquidComponent } from './context/theme-context';
export { defaultTheme } from './themes/default';
export { turbostarterTheme } from './themes/turbostarter';
export { mergeThemes, createThemeOverride } from './types/theme';

// Constants
export * from './constants';

// Validation
export {
  validateSurvey,
  getValidationMessages,
  printValidationResults,
  type ExtendedValidationResult,
  type ExtendedValidationError,
  type ExtendedValidationErrorCode,
} from './validator';

// Engine
export { SurveyEngine } from './engine';

// Analytics
export * from './analytics';

// Utils
export * from './utils';
export * from './review-utils';

// Token Generator
export * from './token-generator';

// Compiler
export {
  compile,
  parse,
  roundtrip,
} from './compiler';

// UI Compiler (for LiquidCode DSL → LiquidSchema)
export { parseUI, compileUI, parseUIToAST, roundtripUI } from './compiler/ui-compiler';

// Renderer
export { LiquidUI, type LiquidUIProps, useLiquidContext, useSignals } from './renderer/LiquidUI';
export { resolveBinding, type DataContext } from './renderer/data-context';
export type { LiquidSchema, Block, Layer, Signal, Binding } from './compiler/ui-emitter';

// Component Manifest (Intelligence Layer)
export * from './manifest';

// Re-export compiler internals for advanced usage
export { SurveyScanner, type Token, type TokenType } from './compiler/scanner';
export { SurveyParser, type SurveyAST, type NodeAST } from './compiler/parser';
export { SurveyEmitter, type EmitOptions, type GraphSurvey, type GraphSurveyNode } from './compiler/emitter';
export { QUESTION_TYPE_CODES, NODE_TYPE_SYMBOLS, CONDITION_OPERATORS } from './compiler/constants';
