// LiquidCode UI Emitter - Code Generation
// Converts AST to LiquidSchema or back to LiquidCode DSL

import type { UIAST, BlockAST, LayerAST, ModifierAST, BindingAST, SignalDeclaration } from './ui-parser';
import { UI_TYPE_TO_CODE, UI_TYPE_TO_INDEX } from './constants';

// ============================================================================
// Output Schema Types (LiquidSchema)
// ============================================================================

export interface LiquidSchema {
  version: '1.0';
  signals: Signal[];
  layers: Layer[];
  surveys?: EmbeddedSurvey[];
}

export interface Signal {
  name: string;
}

export interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

export interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  action?: string;
  children?: Block[];
  survey?: unknown; // GraphSurvey when parsed
}

export interface Binding {
  kind: 'indexed' | 'field' | 'computed' | 'literal' | 'iterator' | 'indexRef';
  value: string | number[];
  indices?: number[];
}

export interface Layout {
  priority?: number | string;
  flex?: string;
  span?: number | string;
}

export interface SignalBinding {
  emit?: SignalEmit;
  receive?: string;
  both?: string;
  layer?: number;
}

export interface SignalEmit {
  name?: string;
  value?: string;
  layer?: number;
}

export interface Condition {
  state?: string;
  expression?: string;
}

export interface Style {
  color?: string;
  colorCondition?: string;
  size?: string;
}

export interface EmbeddedSurvey {
  raw: string;
  startLine: number;
  endLine: number;
}

// ============================================================================
// Emitter Options
// ============================================================================

export interface UIEmitOptions {
  format: 'liquidschema' | 'liquidcode';
  pretty?: boolean;
}

// ============================================================================
// Emitter
// ============================================================================

export class UIEmitter {
  private options: UIEmitOptions;

  constructor(options: UIEmitOptions = { format: 'liquidschema' }) {
    this.options = options;
  }

  emit(ast: UIAST): LiquidSchema | string {
    if (this.options.format === 'liquidschema') {
      return this.emitLiquidSchema(ast);
    } else {
      return this.emitLiquidCode(ast);
    }
  }

  // ============================================================================
  // Emit to LiquidSchema
  // ============================================================================

  private emitLiquidSchema(ast: UIAST): LiquidSchema {
    const schema: LiquidSchema = {
      version: '1.0',
      signals: ast.signals.map(s => ({ name: s.name })),
      layers: [],
    };

    // Layer 0 = main content
    if (ast.mainBlocks.length > 0) {
      // Wrap multiple main blocks in a container
      const root: Block = ast.mainBlocks.length === 1
        ? this.emitBlock(ast.mainBlocks[0]!)
        : {
            uid: 'root',
            type: 'container',
            children: ast.mainBlocks.map(b => this.emitBlock(b)),
          };

      schema.layers.push({
        id: 0,
        visible: true,
        root,
      });
    }

    // Other layers
    for (const layer of ast.layers) {
      schema.layers.push({
        id: layer.id,
        visible: false,
        root: this.emitBlock(layer.root),
      });
    }

    // Embedded surveys
    if (ast.surveys.length > 0) {
      schema.surveys = ast.surveys.map(s => ({
        raw: s.raw,
        startLine: s.startLine,
        endLine: s.endLine,
      }));
    }

    return schema;
  }

  private emitBlock(astBlock: BlockAST): Block {
    const block: Block = {
      uid: astBlock.uid,
      type: astBlock.type,
    };

    // Bindings
    if (astBlock.bindings.length > 0) {
      const firstBinding = astBlock.bindings[0]!;
      block.binding = this.emitBinding(firstBinding);

      // Literal binding becomes label
      if (firstBinding.kind === 'literal') {
        block.label = firstBinding.value;
      }
    }

    // Layout modifiers
    const layout = this.extractLayout(astBlock.modifiers);
    if (Object.keys(layout).length > 0) {
      block.layout = layout;
    }

    // Signal modifiers
    const signals = this.extractSignals(astBlock.modifiers);
    if (Object.keys(signals).length > 0) {
      block.signals = signals;
    }

    // Style modifiers
    const style = this.extractStyle(astBlock.modifiers);
    if (Object.keys(style).length > 0) {
      block.style = style;
    }

    // State conditions
    const stateModifier = astBlock.modifiers.find(m => m.kind === 'state');
    if (stateModifier) {
      block.condition = { state: stateModifier.value as string };
    }

    // Action
    const actionModifier = astBlock.modifiers.find(m => m.kind === 'action');
    if (actionModifier) {
      block.action = actionModifier.value as string;
    }

    // Children
    if (astBlock.children && astBlock.children.length > 0) {
      block.children = astBlock.children.map(c => this.emitBlock(c));
    }

    // Embedded survey
    if (astBlock.survey) {
      block.survey = {
        raw: astBlock.survey.raw,
        startLine: astBlock.survey.startLine,
        endLine: astBlock.survey.endLine,
      };
    }

    return block;
  }

  private emitBinding(binding: BindingAST): Binding {
    switch (binding.kind) {
      case 'index':
        return {
          kind: 'indexed',
          value: binding.indices || [],
          indices: binding.indices,
        };
      case 'field':
        return {
          kind: 'field',
          value: binding.value,
        };
      case 'expr':
        return {
          kind: 'computed',
          value: binding.value,
        };
      case 'literal':
        return {
          kind: 'literal',
          value: binding.value,
        };
      case 'iterator':
        return {
          kind: 'iterator',
          value: binding.value || '',
        };
      case 'indexRef':
        return {
          kind: 'indexRef',
          value: '#',
        };
      default:
        return { kind: 'literal', value: binding.value };
    }
  }

  private extractLayout(modifiers: ModifierAST[]): Layout {
    const layout: Layout = {};

    for (const mod of modifiers) {
      if (mod.kind === 'priority') {
        layout.priority = mod.value;
      } else if (mod.kind === 'flex') {
        layout.flex = mod.value as string;
      } else if (mod.kind === 'span') {
        layout.span = mod.value;
      }
    }

    return layout;
  }

  private extractSignals(modifiers: ModifierAST[]): SignalBinding {
    const signals: SignalBinding = {};

    for (const mod of modifiers) {
      if (mod.kind === 'emit') {
        if (mod.layerId !== undefined) {
          signals.layer = mod.layerId;
        } else {
          signals.emit = {
            name: mod.target,
            value: mod.value as string | undefined,
          };
        }
      } else if (mod.kind === 'receive') {
        signals.receive = mod.target;
      } else if (mod.kind === 'both') {
        signals.both = mod.target;
      }
    }

    return signals;
  }

  private extractStyle(modifiers: ModifierAST[]): Style {
    const style: Style = {};

    for (const mod of modifiers) {
      if (mod.kind === 'color') {
        if (mod.condition) {
          style.colorCondition = mod.condition;
        } else {
          style.color = mod.value as string;
        }
      } else if (mod.kind === 'size') {
        style.size = mod.value as string;
      }
    }

    return style;
  }

  // ============================================================================
  // Emit to LiquidCode DSL
  // ============================================================================

  private emitLiquidCode(ast: UIAST): string {
    const lines: string[] = [];

    // Signal declarations
    if (ast.signals.length > 0) {
      lines.push(ast.signals.map(s => `@${s.name}`).join(' '));
    }

    // Main blocks
    for (const block of ast.mainBlocks) {
      lines.push(this.emitBlockDSL(block));
    }

    // Layers
    for (const layer of ast.layers) {
      lines.push('');
      lines.push(`/${layer.id} ${this.emitBlockDSL(layer.root)}`);
    }

    return lines.join('\n').trim();
  }

  private emitBlockDSL(block: BlockAST): string {
    const parts: string[] = [];

    // Type (prefer index if available)
    const typeIndex = UI_TYPE_TO_INDEX[block.type];
    if (typeIndex !== undefined && typeIndex >= 0 && typeIndex <= 9) {
      parts.push(String(typeIndex));
    } else {
      const typeCode = UI_TYPE_TO_CODE[block.type] || block.typeCode || 'Cn';
      parts.push(typeCode);
    }

    // Bindings
    for (const binding of block.bindings) {
      parts.push(this.emitBindingDSL(binding));
    }

    // Modifiers
    for (const mod of block.modifiers) {
      parts.push(this.emitModifierDSL(mod));
    }

    // Children
    if (block.children && block.children.length > 0) {
      const childrenDSL = block.children.map(c => this.emitBlockDSL(c)).join(', ');
      parts.push(`[${childrenDSL}]`);
    }

    // Embedded survey
    if (block.survey) {
      parts.push(`Survey { ${block.survey.raw} }`);
    }

    return parts.join(' ');
  }

  private emitBindingDSL(binding: BindingAST): string {
    switch (binding.kind) {
      case 'index':
        return binding.value;
      case 'field':
        return `:${binding.value}`;
      case 'expr':
        return `=${binding.value}`;
      case 'literal':
        return `"${this.escapeString(binding.value)}"`;
      case 'iterator':
        return binding.value ? `:.${binding.value}` : ':.';
      case 'indexRef':
        return ':#';
      default:
        return binding.value;
    }
  }

  private emitModifierDSL(mod: ModifierAST): string {
    // Use raw value if available (preserves original format)
    if (mod.raw) return mod.raw;

    switch (mod.kind) {
      case 'priority':
        return `!${mod.value}`;
      case 'flex':
        return `^${mod.value}`;
      case 'span':
        return `*${mod.value}`;
      case 'emit':
        if (mod.layerId !== undefined) {
          return mod.layerId === 0 ? '/<' : `>/${mod.layerId}`;
        }
        return mod.value ? `>${mod.target}=${mod.value}` : `>${mod.target}`;
      case 'receive':
        return `<${mod.target}`;
      case 'both':
        return `<>${mod.target}`;
      case 'color':
        return mod.condition ? `#${mod.condition}` : `#${mod.value}`;
      case 'size':
        return `%${mod.value}`;
      case 'state':
        return `:${mod.value}`;
      case 'action':
        return `!${mod.value}`;
      default:
        return '';
    }
  }

  private escapeString(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

// ============================================================================
// Conversion: LiquidSchema -> UIAST (for roundtrip)
// ============================================================================

export function liquidSchemaToAST(schema: LiquidSchema): UIAST {
  const ast: UIAST = {
    signals: schema.signals.map((s, i) => ({ name: s.name, line: i + 1 })),
    layers: [],
    mainBlocks: [],
    surveys: [],
    comments: [],
  };

  let uidCounter = 0;

  function convertBlock(block: Block): BlockAST {
    const astBlock: BlockAST = {
      uid: block.uid || `b${++uidCounter}`,
      type: block.type,
      bindings: [],
      modifiers: [],
      line: 0,
    };

    // Binding
    if (block.binding) {
      astBlock.bindings.push(convertBinding(block.binding));
    }

    // Label as literal binding
    if (block.label && !block.binding) {
      astBlock.bindings.push({
        kind: 'literal',
        value: block.label,
      });
    }

    // Layout
    if (block.layout) {
      if (block.layout.priority !== undefined) {
        astBlock.modifiers.push({
          kind: 'priority',
          raw: `!${block.layout.priority}`,
          value: block.layout.priority,
        });
      }
      if (block.layout.flex) {
        astBlock.modifiers.push({
          kind: 'flex',
          raw: `^${block.layout.flex.charAt(0)}`,
          value: block.layout.flex,
        });
      }
      if (block.layout.span !== undefined) {
        astBlock.modifiers.push({
          kind: 'span',
          raw: `*${block.layout.span}`,
          value: block.layout.span,
        });
      }
    }

    // Signals
    if (block.signals) {
      if (block.signals.emit) {
        astBlock.modifiers.push({
          kind: 'emit',
          raw: block.signals.emit.value
            ? `>${block.signals.emit.name}=${block.signals.emit.value}`
            : `>${block.signals.emit.name}`,
          target: block.signals.emit.name,
          value: block.signals.emit.value,
        });
      }
      if (block.signals.receive) {
        astBlock.modifiers.push({
          kind: 'receive',
          raw: `<${block.signals.receive}`,
          target: block.signals.receive,
        });
      }
      if (block.signals.both) {
        astBlock.modifiers.push({
          kind: 'both',
          raw: `<>${block.signals.both}`,
          target: block.signals.both,
        });
      }
      if (block.signals.layer !== undefined) {
        astBlock.modifiers.push({
          kind: 'emit',
          raw: block.signals.layer === 0 ? '/<' : `>/${block.signals.layer}`,
          layerId: block.signals.layer,
        });
      }
    }

    // Style
    if (block.style) {
      if (block.style.color) {
        astBlock.modifiers.push({
          kind: 'color',
          raw: `#${block.style.color}`,
          value: block.style.color,
        });
      }
      if (block.style.colorCondition) {
        astBlock.modifiers.push({
          kind: 'color',
          raw: `#${block.style.colorCondition}`,
          condition: block.style.colorCondition,
        });
      }
      if (block.style.size) {
        astBlock.modifiers.push({
          kind: 'size',
          raw: `%${block.style.size}`,
          value: block.style.size,
        });
      }
    }

    // Condition
    if (block.condition?.state) {
      astBlock.modifiers.push({
        kind: 'state',
        raw: `:${block.condition.state}`,
        value: block.condition.state,
      });
    }

    // Action
    if (block.action) {
      astBlock.modifiers.push({
        kind: 'action',
        raw: `!${block.action}`,
        value: block.action,
      });
    }

    // Children
    if (block.children) {
      astBlock.children = block.children.map(convertBlock);
    }

    // Survey
    if (block.survey) {
      astBlock.survey = block.survey as any;
    }

    return astBlock;
  }

  function convertBinding(binding: Binding): BindingAST {
    switch (binding.kind) {
      case 'indexed':
        return {
          kind: 'index',
          value: Array.isArray(binding.value) ? (binding.value as number[]).join('') : String(binding.value),
          indices: binding.indices,
        };
      case 'field':
        return { kind: 'field', value: String(binding.value) };
      case 'computed':
        return { kind: 'expr', value: String(binding.value) };
      case 'literal':
        return { kind: 'literal', value: String(binding.value) };
      case 'iterator':
        return { kind: 'iterator', value: String(binding.value) };
      case 'indexRef':
        return { kind: 'indexRef', value: '#' };
      default:
        return { kind: 'literal', value: String(binding.value) };
    }
  }

  // Process layers
  for (const layer of schema.layers) {
    if (layer.id === 0) {
      // Main layer - extract blocks
      if (layer.root.type === 'container' && layer.root.children && layer.root.uid === 'root') {
        ast.mainBlocks = layer.root.children.map(convertBlock);
      } else {
        ast.mainBlocks = [convertBlock(layer.root)];
      }
    } else {
      ast.layers.push({
        id: layer.id,
        root: convertBlock(layer.root),
        line: 0,
      });
    }
  }

  // Surveys
  if (schema.surveys) {
    ast.surveys = schema.surveys.map(s => ({
      raw: s.raw,
      startLine: s.startLine,
      endLine: s.endLine,
    }));
  }

  return ast;
}
