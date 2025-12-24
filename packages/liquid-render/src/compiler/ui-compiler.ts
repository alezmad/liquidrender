// LiquidCode UI Compiler - Main Entry Point
// Provides compile, parse, and roundtrip functions for UI components

import { UIScanner } from './ui-scanner';
import { UIParser, type UIAST } from './ui-parser';
import { UIEmitter, liquidSchemaToAST, type LiquidSchema, type UIEmitOptions } from './ui-emitter';

/**
 * Compile LiquidSchema to LiquidCode DSL
 */
export function compileUI(schema: LiquidSchema, options?: Partial<UIEmitOptions>): string {
  // Convert LiquidSchema to AST
  const ast = liquidSchemaToAST(schema);

  // Emit as LiquidCode DSL
  const emitter = new UIEmitter({ format: 'liquidcode', ...options });
  return emitter.emit(ast) as string;
}

/**
 * Parse LiquidCode DSL to LiquidSchema
 */
export function parseUI(source: string): LiquidSchema {
  // Tokenize
  const scanner = new UIScanner(source);
  const tokens = scanner.scan();

  // Parse to AST (pass source for Survey content extraction)
  const parser = new UIParser(tokens, source);
  const ast = parser.parse();

  // Emit as LiquidSchema
  const emitter = new UIEmitter({ format: 'liquidschema' });
  return emitter.emit(ast) as LiquidSchema;
}

/**
 * Parse LiquidCode DSL to AST (for debugging/inspection)
 */
export function parseUIToAST(source: string): UIAST {
  const scanner = new UIScanner(source);
  const tokens = scanner.scan();
  const parser = new UIParser(tokens, source);
  return parser.parse();
}

/**
 * Roundtrip: LiquidSchema -> DSL -> LiquidSchema
 * Returns both the DSL string and reconstructed schema
 */
export function roundtripUI(schema: LiquidSchema): {
  dsl: string;
  reconstructed: LiquidSchema;
  isEquivalent: boolean;
  differences: string[];
} {
  const dsl = compileUI(schema);
  const reconstructed = parseUI(dsl);

  const { isEquivalent, differences } = compareUISchemas(schema, reconstructed);

  return {
    dsl,
    reconstructed,
    isEquivalent,
    differences,
  };
}

/**
 * Compare two LiquidSchema for semantic equivalence
 */
function compareUISchemas(
  original: LiquidSchema,
  reconstructed: LiquidSchema
): { isEquivalent: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare version
  if (original.version !== reconstructed.version) {
    differences.push(`Version mismatch: ${original.version} vs ${reconstructed.version}`);
  }

  // Compare signals
  if (original.signals.length !== reconstructed.signals.length) {
    differences.push(`Signal count mismatch: ${original.signals.length} vs ${reconstructed.signals.length}`);
  } else {
    for (let i = 0; i < original.signals.length; i++) {
      if (original.signals[i]?.name !== reconstructed.signals[i]?.name) {
        differences.push(`Signal ${i} mismatch: ${original.signals[i]?.name} vs ${reconstructed.signals[i]?.name}`);
      }
    }
  }

  // Compare layers
  if (original.layers.length !== reconstructed.layers.length) {
    differences.push(`Layer count mismatch: ${original.layers.length} vs ${reconstructed.layers.length}`);
  } else {
    for (let i = 0; i < original.layers.length; i++) {
      const origLayer = original.layers[i];
      const reconLayer = reconstructed.layers[i];
      if (origLayer && reconLayer) {
        if (origLayer.id !== reconLayer.id) {
          differences.push(`Layer ${i} ID mismatch: ${origLayer.id} vs ${reconLayer.id}`);
        }
        compareBlocks(origLayer.root, reconLayer.root, `layer${origLayer.id}`, differences);
      }
    }
  }

  return {
    isEquivalent: differences.length === 0,
    differences,
  };
}

/**
 * Convert field name to human-readable label
 * e.g., totalRevenue -> "Total Revenue", user_name -> "User Name"
 */
function fieldToLabel(field: string): string {
  const name = field.split('.').pop() || field;
  let result = name.replace(/_/g, ' ');
  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
  result = result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return result;
}

function compareBlocks(
  original: import('./ui-emitter').Block,
  reconstructed: import('./ui-emitter').Block,
  path: string,
  differences: string[]
): void {
  if (original.type !== reconstructed.type) {
    differences.push(`${path}.type mismatch: ${original.type} vs ${reconstructed.type}`);
  }

  // Compare binding - handle case where label becomes literal binding
  const origBindingKind = original.binding?.kind;
  const reconBindingKind = reconstructed.binding?.kind;

  // Allow equivalence: no binding + label === literal binding with same value
  const origIsLabelOnly = !original.binding && original.label;
  const reconIsLiteralWithLabel = reconBindingKind === 'literal' &&
    reconstructed.binding?.value === reconstructed.label;

  if (origBindingKind !== reconBindingKind) {
    // Check if this is the label-to-literal-binding case
    if (!(origIsLabelOnly && reconIsLiteralWithLabel)) {
      differences.push(`${path}.binding.kind mismatch: ${origBindingKind} vs ${reconBindingKind}`);
    }
  }

  // Compare label - handle auto-label equivalence
  // If original has no label but reconstructed has auto-generated label from field, they're equivalent
  if (original.label !== reconstructed.label) {
    const isAutoLabelEquivalent = !original.label &&
      reconstructed.label &&
      original.binding?.kind === 'field' &&
      fieldToLabel(original.binding.value as string) === reconstructed.label;

    if (!isAutoLabelEquivalent) {
      differences.push(`${path}.label mismatch: ${original.label} vs ${reconstructed.label}`);
    }
  }

  // Compare action
  if (original.action !== reconstructed.action) {
    differences.push(`${path}.action mismatch: ${original.action} vs ${reconstructed.action}`);
  }

  // Compare children count
  const origChildCount = original.children?.length ?? 0;
  const reconChildCount = reconstructed.children?.length ?? 0;
  if (origChildCount !== reconChildCount) {
    differences.push(`${path}.children count mismatch: ${origChildCount} vs ${reconChildCount}`);
  } else if (original.children && reconstructed.children) {
    for (let i = 0; i < original.children.length; i++) {
      compareBlocks(original.children[i]!, reconstructed.children[i]!, `${path}[${i}]`, differences);
    }
  }
}

// Re-export types and classes
export type { LiquidSchema, Block, Layer, Signal, Binding, Layout, SignalBinding, Style } from './ui-emitter';
export type { UIAST, BlockAST, LayerAST, ModifierAST, BindingAST } from './ui-parser';
export { LiquidCodeError } from './ui-scanner';
