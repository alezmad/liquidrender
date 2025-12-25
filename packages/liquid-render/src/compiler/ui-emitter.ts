// LiquidCode UI Emitter - Code Generation
// Converts AST to LiquidSchema or back to LiquidCode DSL

import type { UIAST, BlockAST, LayerAST, ModifierAST, BindingAST, SignalDeclaration, EmbeddedSurveyAST } from './ui-parser';
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
  stream?: StreamConfig;       // Real-time data source
  fidelity?: FidelityLevel;    // Adaptive rendering level
  action?: string;
  children?: Block[];
  columns?: string[];  // For tables: column field names
  survey?: EmbeddedSurveyAST;
  // Range/numeric input properties
  min?: number;
  max?: number;
  step?: number;
  // Custom component (LLM-generated)
  componentId?: string;  // For type='custom': registered component identifier
  props?: Record<string, unknown>;  // Additional serializable props
}

export interface Binding {
  kind: 'indexed' | 'field' | 'computed' | 'literal' | 'iterator' | 'indexRef';
  value: string | number[];
  indices?: number[];
  // For charts with multiple bindings (x, y axes)
  x?: string;
  y?: string;
}

export interface Layout {
  priority?: number | string;
  flex?: string;
  span?: number | string;
}

export interface SignalBinding {
  emit?: SignalEmit;
  receive?: string | string[];  // Supports multiple receive signals
  both?: string | string[];     // Supports multiple bidirectional signals
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
  signal?: string;
  signalValue?: string;
}

export interface Style {
  color?: string;
  colorCondition?: string;
  size?: string;
}

export interface StreamConfig {
  type: 'ws' | 'sse' | 'poll' | 'interval';
  url?: string;
  interval?: number;  // in milliseconds
}

export type FidelityLevel = 'lo' | 'hi' | 'auto' | 'skeleton' | 'defer';

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
      // Expand blocks (handles repetition shorthand)
      const expandedBlocks = ast.mainBlocks.flatMap(b => this.emitBlockWithExpansion(b));

      // Wrap multiple main blocks in a container
      let root: Block;
      if (expandedBlocks.length === 1) {
        root = expandedBlocks[0]!;
      } else {
        // Infer layout based on separator type
        // comma = row, newline = column, mixed = column
        const flex = ast.mainBlocksSeparator === 'comma' ? 'row' : 'column';
        root = {
          uid: 'root',
          type: 'container',
          layout: { flex },
          children: expandedBlocks,
        };
      }

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

  // Chart types use multi-binding for x/y axes
  private static CHART_TYPES = new Set(['bar', 'line', 'pie', 'heatmap', 'sankey', 'area', 'scatter']);

  // Types that should NOT expand (single instance with special handling)
  private static NO_EXPAND_TYPES = new Set(['table', 'form', 'container']);

  /**
   * Emit block with expansion for repetition shorthand.
   * Non-chart types with multiple field bindings expand into multiple blocks.
   * e.g., "Kp :revenue :orders :customers" → 3 separate KPI blocks
   */
  private emitBlockWithExpansion(astBlock: BlockAST): Block[] {
    const isChart = UIEmitter.CHART_TYPES.has(astBlock.type);
    const noExpand = UIEmitter.NO_EXPAND_TYPES.has(astBlock.type);
    const fieldBindings = astBlock.bindings.filter(b => b.kind === 'field');

    // Expand if: not a chart, not special type, has multiple field bindings
    if (!isChart && !noExpand && fieldBindings.length > 1) {
      // Create one block per field binding
      return fieldBindings.map((binding, i) => {
        const expandedBlock: Block = {
          uid: `${astBlock.uid}_${i}`,
          type: astBlock.type,
          binding: this.emitBinding(binding),
          label: this.fieldToLabel(binding.value),
        };

        // Copy layout modifiers to each expanded block
        const layout = this.extractLayout(astBlock.modifiers);
        if (Object.keys(layout).length > 0) {
          expandedBlock.layout = layout;
        }

        // Copy signal modifiers
        const signals = this.extractSignals(astBlock.modifiers);
        if (Object.keys(signals).length > 0) {
          expandedBlock.signals = signals;
        }

        // Copy style modifiers
        const style = this.extractStyle(astBlock.modifiers);
        if (Object.keys(style).length > 0) {
          expandedBlock.style = style;
        }

        // Copy stream modifiers
        const stream = this.extractStream(astBlock.modifiers);
        if (stream) {
          expandedBlock.stream = stream;
        }

        // Copy fidelity modifiers
        const fidelity = this.extractFidelity(astBlock.modifiers);
        if (fidelity) {
          expandedBlock.fidelity = fidelity;
        }

        // Copy condition (from ?@signal=value)
        if (astBlock.condition) {
          expandedBlock.condition = {
            signal: astBlock.condition.signal,
            signalValue: astBlock.condition.value,
          };
        }

        return expandedBlock;
      });
    }

    // No expansion - return single block
    return [this.emitBlock(astBlock)];
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

      // For charts, check if there are x/y bindings
      const isChart = ['bar', 'line', 'pie', 'heatmap', 'sankey'].includes(astBlock.type);
      if (isChart && astBlock.bindings.length >= 2) {
        const fieldBindings = astBlock.bindings.filter(b => b.kind === 'field');
        if (fieldBindings.length >= 2) {
          block.binding.x = fieldBindings[0]!.value;
          block.binding.y = fieldBindings[1]!.value;
        }
      }

      // Literal binding becomes label
      if (firstBinding.kind === 'literal') {
        block.label = firstBinding.value;
      } else {
        // Auto-generate label from field name if no explicit label
        const literalBinding = astBlock.bindings.find(b => b.kind === 'literal');
        if (literalBinding) {
          block.label = literalBinding.value;
        } else if (firstBinding.kind === 'field') {
          // Auto-label: camelCase/snake_case -> "Title Case"
          block.label = this.fieldToLabel(firstBinding.value);
        }
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

    // Stream modifiers (real-time data)
    const stream = this.extractStream(astBlock.modifiers);
    if (stream) {
      block.stream = stream;
    }

    // Fidelity modifiers (adaptive rendering)
    const fidelity = this.extractFidelity(astBlock.modifiers);
    if (fidelity) {
      block.fidelity = fidelity;
    }

    // State conditions
    const stateModifier = astBlock.modifiers.find(m => m.kind === 'state');
    if (stateModifier) {
      block.condition = { state: stateModifier.value as string };
    }

    // Signal conditions (from ?@signal=value)
    if (astBlock.condition) {
      block.condition = {
        ...block.condition,
        signal: astBlock.condition.signal,
        signalValue: astBlock.condition.value,
      };
    }

    // Action
    const actionModifier = astBlock.modifiers.find(m => m.kind === 'action');
    if (actionModifier) {
      block.action = actionModifier.value as string;
    }

    // Table columns
    if (astBlock.columns && astBlock.columns.length > 0) {
      block.columns = astBlock.columns;
    }

    // Range parameters
    if (astBlock.min !== undefined) {
      block.min = astBlock.min;
    }
    if (astBlock.max !== undefined) {
      block.max = astBlock.max;
    }
    if (astBlock.step !== undefined) {
      block.step = astBlock.step;
    }

    // Children (with expansion support)
    if (astBlock.children && astBlock.children.length > 0) {
      block.children = astBlock.children.flatMap(c => this.emitBlockWithExpansion(c));
    }

    // Embedded survey
    if (astBlock.survey) {
      block.survey = {
        raw: astBlock.survey.raw,
        startLine: astBlock.survey.startLine,
        endLine: astBlock.survey.endLine,
      };
    }

    // Custom component
    if (astBlock.componentId) {
      block.componentId = astBlock.componentId;
    }

    // Custom component props (for roundtrip preservation)
    if ((astBlock as any).props) {
      block.props = (astBlock as any).props;
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
    const receivers: string[] = [];
    const bothSignals: string[] = [];

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
        if (mod.target) receivers.push(mod.target);
      } else if (mod.kind === 'both') {
        if (mod.target) bothSignals.push(mod.target);
      }
    }

    // Store as array if multiple, string if single
    if (receivers.length === 1) {
      signals.receive = receivers[0];
    } else if (receivers.length > 1) {
      signals.receive = receivers;
    }

    if (bothSignals.length === 1) {
      signals.both = bothSignals[0];
    } else if (bothSignals.length > 1) {
      signals.both = bothSignals;
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

  private extractStream(modifiers: ModifierAST[]): StreamConfig | undefined {
    const streamMod = modifiers.find(m => m.kind === 'stream');
    if (!streamMod) return undefined;

    return {
      type: streamMod.streamType || 'poll',
      url: streamMod.streamUrl,
      interval: streamMod.interval,
    };
  }

  private extractFidelity(modifiers: ModifierAST[]): FidelityLevel | undefined {
    const fidelityMod = modifiers.find(m => m.kind === 'fidelity');
    if (!fidelityMod) return undefined;
    return fidelityMod.fidelityLevel;
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

    // Condition prefix (e.g., ?@tab=0)
    if (block.condition) {
      const condValue = block.condition.value !== undefined ? `=${block.condition.value}` : '';
      parts.push(`?@${block.condition.signal}${condValue}`);
    }

    // Type (prefer index if available)
    const typeIndex = UI_TYPE_TO_INDEX[block.type];
    if (typeIndex !== undefined && typeIndex >= 0 && typeIndex <= 9) {
      parts.push(String(typeIndex));
    } else {
      const typeCode = UI_TYPE_TO_CODE[block.type] || block.typeCode || 'Cn';
      parts.push(typeCode);
    }

    // Custom componentId (after type)
    if (block.type === 'custom' && block.componentId) {
      // componentId is from BlockAST which has string componentId
      const componentIdValue = (block as unknown as { componentId: string }).componentId;
      parts.push(`"${this.escapeString(componentIdValue)}"`);
    }

    // Bindings
    for (const binding of block.bindings) {
      parts.push(this.emitBindingDSL(binding));
    }

    // Modifiers
    for (const mod of block.modifiers) {
      parts.push(this.emitModifierDSL(mod));
    }

    // Range parameters
    if (block.min !== undefined) {
      parts.push(String(block.min));
    }
    if (block.max !== undefined) {
      parts.push(String(block.max));
    }
    if (block.step !== undefined) {
      parts.push(String(block.step));
    }

    // Columns (for tables)
    if (block.columns && block.columns.length > 0) {
      const columnsDSL = block.columns.map(c => `:${c}`).join(' ');
      parts.push(`[${columnsDSL}]`);
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
      case 'stream':
        return `~${mod.value}`;
      case 'fidelity':
        return `$${mod.value}`;
      default:
        return '';
    }
  }

  private escapeString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
  }

  /**
   * Convert field name to human-readable label
   * Examples:
   *   revenue -> "Revenue"
   *   totalRevenue -> "Total Revenue"
   *   order_count -> "Order Count"
   *   avgOrderValue -> "Avg Order Value"
   */
  private fieldToLabel(field: string): string {
    // Remove any path prefix (e.g., "summary.revenue" -> "revenue")
    const name = field.split('.').pop() || field;

    // Replace underscores with spaces
    let result = name.replace(/_/g, ' ');

    // Split camelCase: "totalRevenue" -> "total Revenue"
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Capitalize first letter of each word
    result = result
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return result;
  }
}

// ============================================================================
// Conversion: LiquidSchema -> UIAST (for roundtrip)
// ============================================================================

/**
 * Convert field name to human-readable label (standalone version for roundtrip)
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

export function liquidSchemaToAST(schema: LiquidSchema): UIAST {
  const ast: UIAST = {
    signals: schema.signals.map((s, i) => ({ name: s.name, line: i + 1 })),
    layers: [],
    mainBlocks: [],
    mainBlocksSeparator: 'newline',
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

    // Label as literal binding - emit if explicit (differs from auto-generated)
    if (block.label) {
      if (!block.binding) {
        // No binding - label is standalone
        astBlock.bindings.push({
          kind: 'literal',
          value: block.label,
        });
      } else if (block.binding.kind === 'field') {
        // Has field binding - check if label differs from auto-generated
        const autoLabel = fieldToLabel(String(block.binding.value));
        if (block.label !== autoLabel) {
          // Explicit label differs from auto-label - preserve it
          astBlock.bindings.push({
            kind: 'literal',
            value: block.label,
          });
        }
      }
    }

    // Layout
    if (block.layout) {
      if (block.layout.priority !== undefined) {
        // Convert numeric priority to symbolic form for proper roundtrip
        const prioritySymbol = block.layout.priority === 100 ? 'h' :
                               block.layout.priority === 75 ? 'p' :
                               block.layout.priority === 50 ? 's' :
                               String(block.layout.priority);
        astBlock.modifiers.push({
          kind: 'priority',
          raw: `!${prioritySymbol}`,
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
        const receivers = Array.isArray(block.signals.receive)
          ? block.signals.receive
          : [block.signals.receive];
        for (const receiver of receivers) {
          astBlock.modifiers.push({
            kind: 'receive',
            raw: `<${receiver}`,
            target: receiver,
          });
        }
      }
      if (block.signals.both) {
        const bothSignals = Array.isArray(block.signals.both)
          ? block.signals.both
          : [block.signals.both];
        for (const sig of bothSignals) {
          astBlock.modifiers.push({
            kind: 'both',
            raw: `<>${sig}`,
            target: sig,
          });
        }
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

    // Stream (real-time data)
    if (block.stream) {
      let streamValue: string;
      if (block.stream.url) {
        streamValue = block.stream.url;
      } else if (block.stream.interval) {
        // Convert ms to human-readable: 5000 -> 5s, 60000 -> 1m
        const ms = block.stream.interval;
        if (ms >= 60000 && ms % 60000 === 0) {
          streamValue = `${ms / 60000}m`;
        } else {
          streamValue = `${ms / 1000}s`;
        }
      } else {
        streamValue = 'poll';
      }
      astBlock.modifiers.push({
        kind: 'stream',
        raw: `~${streamValue}`,
        value: streamValue,
        streamType: block.stream.type,
        streamUrl: block.stream.url,
        interval: block.stream.interval,
      });
    }

    // Fidelity (adaptive rendering)
    if (block.fidelity) {
      astBlock.modifiers.push({
        kind: 'fidelity',
        raw: `$${block.fidelity}`,
        value: block.fidelity,
        fidelityLevel: block.fidelity,
      });
    }

    // Condition
    if (block.condition?.state) {
      astBlock.modifiers.push({
        kind: 'state',
        raw: `:${block.condition.state}`,
        value: block.condition.state,
      });
    }

    // Signal condition (for conditional rendering)
    if (block.condition?.signal) {
      astBlock.condition = {
        signal: block.condition.signal,
        value: block.condition.signalValue ?? '',
      };
    }

    // Action
    if (block.action) {
      astBlock.modifiers.push({
        kind: 'action',
        raw: `!${block.action}`,
        value: block.action,
      });
    }

    // Columns (for tables)
    if (block.columns && block.columns.length > 0) {
      astBlock.columns = block.columns;
    }

    // Children
    if (block.children) {
      astBlock.children = block.children.map(convertBlock);
    }

    // Survey
    if (block.survey) {
      astBlock.survey = block.survey;
    }

    // Range parameters
    if (block.min !== undefined) {
      astBlock.min = block.min;
    }
    if (block.max !== undefined) {
      astBlock.max = block.max;
    }
    if (block.step !== undefined) {
      astBlock.step = block.step;
    }

    // Custom component
    if (block.componentId) {
      astBlock.componentId = block.componentId;
    }

    // Custom component props (for roundtrip preservation)
    if (block.props) {
      (astBlock as any).props = block.props;
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
