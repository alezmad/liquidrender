// LiquidCode UI Parser - Syntactic Analysis
// Parses UI tokens into an AST representing the UI structure

import type { UIToken, UITokenType } from './ui-scanner';
import { UI_INDEX_TO_TYPE, UI_TYPE_CODES, UI_PRIORITY_VALUES, UI_FLEX_VALUES, UI_SPAN_VALUES, COLOR_ALIASES } from './constants';

// ============================================================================
// AST Node Types
// ============================================================================

export interface UIAST {
  signals: SignalDeclaration[];
  layers: LayerAST[];
  mainBlocks: BlockAST[];
  mainBlocksSeparator: 'comma' | 'newline' | 'mixed';  // Track how main blocks are separated
  surveys: EmbeddedSurveyAST[];
  comments: string[];
  warnings: ParserWarning[];
}

export interface ParserWarning {
  message: string;
  line: number;
  type: 'empty-conditional' | 'syntax' | 'semantic';
}

export interface SignalDeclaration {
  name: string;
  line: number;
}

export interface LayerAST {
  id: number;
  root: BlockAST;
  line: number;
}

export interface BlockAST {
  uid: string;
  type: string;
  typeCode?: string;
  typeIndex?: number;
  bindings: BindingAST[];
  modifiers: ModifierAST[];
  children?: BlockAST[];
  columns?: string[];  // For tables: column field names
  survey?: EmbeddedSurveyAST;
  condition?: ConditionAST;  // Conditional rendering
  line: number;
  // Range/numeric input parameters
  min?: number;
  max?: number;
  step?: number;
  // Custom component (LLM-generated)
  componentId?: string;  // For type='custom': the registered component identifier
}

export interface ConditionAST {
  signal: string;
  value: string;
}

export interface BindingAST {
  kind: 'index' | 'field' | 'expr' | 'literal' | 'iterator' | 'indexRef';
  value: string;
  indices?: number[];  // For indexed bindings like 0123
}

export interface ModifierAST {
  kind: 'priority' | 'flex' | 'span' | 'emit' | 'receive' | 'both' | 'color' | 'size' | 'state' | 'action' | 'stream' | 'fidelity';
  raw: string;
  value?: string | number;
  target?: string;  // For signals
  layerId?: number; // For layer triggers
  condition?: string; // For conditional styles
  // Streaming properties
  streamType?: 'ws' | 'sse' | 'poll' | 'interval';  // Type of stream
  streamUrl?: string;    // URL for ws/sse
  interval?: number;     // Polling interval in ms
  // Fidelity properties
  fidelityLevel?: 'lo' | 'hi' | 'auto' | 'skeleton' | 'defer';
}

export interface EmbeddedSurveyAST {
  raw: string;  // Raw survey DSL content
  startLine: number;
  endLine: number;
}

// ============================================================================
// Parser
// ============================================================================

export class UIParser {
  private tokens: UIToken[];
  private rawTokens: UIToken[];  // Keep original tokens for separator detection
  private source: string;        // Original source for Survey extraction
  private current = 0;
  private uidCounter = 0;
  private warnings: ParserWarning[] = [];

  constructor(tokens: UIToken[], source: string = '') {
    this.rawTokens = tokens;
    this.source = source;
    // Filter newlines but keep them for line tracking
    this.tokens = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'COMMENT');
  }

  parse(): UIAST {
    // Reset warnings for each parse
    this.warnings = [];

    const ast: UIAST = {
      signals: [],
      layers: [],
      mainBlocks: [],
      mainBlocksSeparator: 'comma',  // Default
      surveys: [],
      comments: [],
      warnings: [],
    };

    // Detect separator type from raw tokens
    ast.mainBlocksSeparator = this.detectSeparatorType();

    // Parse top-level elements
    while (!this.isAtEnd()) {
      // Skip commas at top level (separating blocks)
      if (this.check('COMMA')) {
        this.advance();
        continue;
      }

      // Signal declarations (@signal)
      if (this.check('SIGNAL_DECLARE')) {
        const token = this.advance();
        const name = token.value.slice(1); // Remove @
        ast.signals.push({ name, line: token.line });
        continue;
      }

      // Layer definitions (/1 ...)
      if (this.check('LAYER')) {
        const layer = this.parseLayer();
        if (layer) ast.layers.push(layer);
        continue;
      }

      // Survey blocks
      if (this.check('SURVEY_START')) {
        const survey = this.parseSurveyBlock();
        if (survey) ast.surveys.push(survey);
        continue;
      }

      // Conditional blocks ?@signal=value [content]
      if (this.check('CONDITION')) {
        const blocks = this.parseConditionalBlock();
        if (blocks) {
          ast.mainBlocks.push(...blocks);
          continue;
        }
      }

      // Main blocks (everything else)
      const block = this.parseBlock();
      if (block) {
        ast.mainBlocks.push(block);
      } else {
        // Skip unknown tokens to prevent infinite loop
        this.advance();
      }
    }

    // Copy collected warnings to AST
    ast.warnings = this.warnings;

    return ast;
  }

  private parseLayer(): LayerAST | null {
    const layerToken = this.advance(); // consume /N
    const id = parseInt(layerToken.value.slice(1), 10);

    const root = this.parseBlock();
    if (!root) return null;

    return {
      id,
      root,
      line: layerToken.line,
    };
  }

  private parseBlock(): BlockAST | null {
    const startToken = this.peek();
    if (!startToken || this.isAtEnd()) return null;

    const block: BlockAST = {
      uid: this.generateUid(),
      type: '',
      bindings: [],
      modifiers: [],
      line: startToken.line,
    };

    // Parse type (index or code)
    if (this.check('UI_TYPE_INDEX')) {
      const token = this.advance();
      const index = parseInt(token.value, 10);
      block.type = UI_INDEX_TO_TYPE[index] || 'container';
      block.typeIndex = index;
      block.typeCode = token.value;
    } else if (this.check('UI_TYPE_CODE')) {
      const token = this.advance();
      block.type = UI_TYPE_CODES[token.value] || token.value.toLowerCase();
      block.typeCode = token.value;

      // Special handling for Custom blocks: first string is componentId
      if (block.type === 'custom' && this.check('STRING')) {
        const componentToken = this.advance();
        block.componentId = componentToken.value;
      }
    } else {
      // Not a block start
      return null;
    }

    // Parse bindings and modifiers
    this.parseBindingsAndModifiers(block);

    // Parse numeric parameters for range component
    if (block.type === 'range') {
      this.parseRangeParameters(block);
    }

    // Parse children [...] or columns for tables
    if (this.check('LBRACKET')) {
      if (block.type === 'table') {
        // For tables, brackets contain column definitions
        block.columns = this.parseColumns();
      } else {
        block.children = this.parseChildren();
      }
    }

    // Check for embedded survey
    if (this.check('SURVEY_START')) {
      const survey = this.parseSurveyBlock();
      if (survey) block.survey = survey;
    }

    return block;
  }

  /**
   * Parse conditional block: ?@signal=value [content]
   * Creates blocks with condition property attached
   */
  private parseConditionalBlock(): BlockAST[] | null {
    const conditionToken = this.advance(); // consume ?@signal=value
    const raw = conditionToken.value.slice(2); // Remove ?@
    const line = conditionToken.line;

    // Parse signal=value
    const [signal, value] = raw.includes('=') ? raw.split('=') : [raw, 'true'];
    const condition: ConditionAST = { signal: signal!, value: value! };

    // Expect bracket with content
    if (!this.check('LBRACKET')) {
      this.warnings.push({
        message: `Empty conditional block: ?@${raw} has no content (missing brackets)`,
        line,
        type: 'empty-conditional',
      });
      return null;
    }

    const children = this.parseChildren();
    if (!children || children.length === 0) {
      this.warnings.push({
        message: `Empty conditional block: ?@${raw} [] has no children`,
        line,
        type: 'empty-conditional',
      });
      return null;
    }

    // Attach condition to each child block
    for (const child of children) {
      child.condition = condition;
    }

    return children;
  }

  private parseBindingsAndModifiers(block: BlockAST): void {
    while (!this.isAtEnd()) {
      // Bindings
      if (this.check('NUMBER')) {
        // For range components, stop parsing if we've already seen a label
        // Numbers after the label are range parameters (min, max, step)
        const hasLabel = block.bindings.some(b => b.kind === 'literal');
        if (block.type === 'range' && hasLabel) {
          break;
        }

        const token = this.advance();
        const indices = token.value.split('').map(d => parseInt(d, 10));
        block.bindings.push({
          kind: 'index',
          value: token.value,
          indices,
        });
        continue;
      }

      if (this.check('FIELD')) {
        const token = this.advance();
        block.bindings.push({
          kind: 'field',
          value: token.value.slice(1), // Remove :
        });
        continue;
      }

      if (this.check('ITERATOR')) {
        const token = this.advance();
        block.bindings.push({
          kind: 'iterator',
          value: token.value.slice(2), // Remove :.
        });
        continue;
      }

      if (this.check('INDEX_REF')) {
        this.advance();
        block.bindings.push({
          kind: 'indexRef',
          value: '#',
        });
        continue;
      }

      if (this.check('EXPR')) {
        const token = this.advance();
        block.bindings.push({
          kind: 'expr',
          value: token.value.slice(1), // Remove =
        });
        continue;
      }

      if (this.check('STRING')) {
        const token = this.advance();
        block.bindings.push({
          kind: 'literal',
          value: token.value,
        });
        continue;
      }

      // Modifiers
      if (this.check('PRIORITY')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove !
        const modifier: ModifierAST = {
          kind: raw.length > 1 ? 'action' : 'priority',
          raw: token.value,
        };
        if (modifier.kind === 'priority') {
          modifier.value = UI_PRIORITY_VALUES[raw] ?? parseInt(raw, 10);
        } else {
          modifier.value = raw; // Action name
        }
        block.modifiers.push(modifier);
        continue;
      }

      if (this.check('FLEX')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove ^
        block.modifiers.push({
          kind: 'flex',
          raw: token.value,
          value: UI_FLEX_VALUES[raw] || raw,
        });
        continue;
      }

      if (this.check('SPAN')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove *
        const value = UI_SPAN_VALUES[raw] ?? parseInt(raw, 10);
        block.modifiers.push({
          kind: 'span',
          raw: token.value,
          value,
        });
        continue;
      }

      if (this.check('SIGNAL_EMIT')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove >
        const modifier: ModifierAST = {
          kind: 'emit',
          raw: token.value,
        };
        // Check if layer trigger >/1
        if (raw.startsWith('/')) {
          modifier.layerId = parseInt(raw.slice(1), 10);
        } else if (raw.includes('=')) {
          const [name, val] = raw.split('=');
          modifier.target = name;
          modifier.value = val;
        } else {
          modifier.target = raw;
        }
        block.modifiers.push(modifier);
        continue;
      }

      if (this.check('SIGNAL_RECEIVE')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove <
        block.modifiers.push({
          kind: 'receive',
          raw: token.value,
          target: raw,
        });
        continue;
      }

      if (this.check('SIGNAL_BOTH')) {
        const token = this.advance();
        const raw = token.value.slice(2); // Remove <>
        block.modifiers.push({
          kind: 'both',
          raw: token.value,
          target: raw,
        });
        continue;
      }

      if (this.check('COLOR')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove #
        const modifier: ModifierAST = {
          kind: 'color',
          raw: token.value,
        };
        if (raw.startsWith('?')) {
          modifier.condition = raw;
        } else {
          // Expand color aliases: #g -> green, #r -> red, etc.
          modifier.value = COLOR_ALIASES[raw] ?? raw;
        }
        block.modifiers.push(modifier);
        continue;
      }

      if (this.check('SIZE')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove %
        block.modifiers.push({
          kind: 'size',
          raw: token.value,
          value: raw,
        });
        continue;
      }

      if (this.check('STATE_COND')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove :
        block.modifiers.push({
          kind: 'state',
          raw: token.value,
          value: raw,
        });
        continue;
      }

      // Streaming modifier: ~5s, ~ws://url, ~sse://url
      if (this.check('STREAM')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove ~
        const modifier: ModifierAST = {
          kind: 'stream',
          raw: token.value,
          value: raw,
        };

        // Parse stream type
        if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
          modifier.streamType = 'ws';
          modifier.streamUrl = raw;
        } else if (raw.startsWith('sse://')) {
          modifier.streamType = 'sse';
          modifier.streamUrl = raw.replace('sse://', 'https://');
        } else if (/^\d+[smh]?$/.test(raw)) {
          // Interval: 5s, 1m, 30, etc.
          modifier.streamType = 'interval';
          modifier.interval = this.parseInterval(raw);
        } else {
          modifier.streamType = 'poll';
        }

        block.modifiers.push(modifier);
        continue;
      }

      // Fidelity modifier: $lo, $hi, $auto, $skeleton, $defer
      if (this.check('FIDELITY')) {
        const token = this.advance();
        const raw = token.value.slice(1); // Remove $
        const level = raw as 'lo' | 'hi' | 'auto' | 'skeleton' | 'defer';
        block.modifiers.push({
          kind: 'fidelity',
          raw: token.value,
          value: raw,
          fidelityLevel: level,
        });
        continue;
      }

      if (this.check('LAYER_CLOSE')) {
        const token = this.advance();
        block.modifiers.push({
          kind: 'emit',
          raw: token.value,
          layerId: 0, // Special: close current layer
        });
        continue;
      }

      // Stop on block terminators
      if (this.check('LBRACKET', 'RBRACKET', 'COMMA', 'LAYER', 'UI_TYPE_INDEX', 'UI_TYPE_CODE', 'SURVEY_START', 'EOF')) {
        break;
      }

      // Skip unknown tokens
      this.advance();
    }
  }

  private parseRangeParameters(block: BlockAST): void {
    // Parse numeric parameters for range: min max [step]
    // Format: Rg :binding "Label" min max [step]
    // Note: Single digits (0-9) are tokenized as UI_TYPE_INDEX, not NUMBER
    const params: number[] = [];

    while (params.length < 3) {
      // Accept both NUMBER and UI_TYPE_INDEX as numeric values for range
      if (this.check('NUMBER')) {
        const token = this.advance();
        const value = parseFloat(token.value);
        if (!isNaN(value)) {
          params.push(value);
        }
      } else if (this.check('UI_TYPE_INDEX')) {
        // Single digits 0-9 are tokenized as UI_TYPE_INDEX
        const token = this.advance();
        const value = parseInt(token.value, 10);
        if (!isNaN(value)) {
          params.push(value);
        }
      } else {
        break;
      }
    }

    // Assign parameters: min, max, optional step
    if (params.length >= 2) {
      block.min = params[0];
      block.max = params[1];
      if (params.length >= 3) {
        block.step = params[2];
      }
    }
  }

  private parseChildren(): BlockAST[] {
    const children: BlockAST[] = [];

    this.advance(); // consume [

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance();
        continue;
      }

      // Handle conditional blocks inside children
      if (this.check('CONDITION')) {
        const conditionalBlocks = this.parseConditionalBlock();
        if (conditionalBlocks) {
          children.push(...conditionalBlocks);
          continue;
        }
      }

      const block = this.parseBlock();
      if (block) {
        children.push(block);
      } else {
        // Not a block, skip token
        if (!this.check('RBRACKET')) {
          this.advance();
        }
      }
    }

    if (this.check('RBRACKET')) {
      this.advance();
    }

    return children;
  }

  private parseColumns(): string[] {
    const columns: string[] = [];

    this.advance(); // consume [

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance();
        continue;
      }

      // Collect field bindings as column names
      if (this.check('FIELD')) {
        const token = this.advance();
        columns.push(token.value.slice(1)); // Remove :
        continue;
      }

      // Skip other tokens
      if (!this.check('RBRACKET')) {
        this.advance();
      }
    }

    if (this.check('RBRACKET')) {
      this.advance();
    }

    return columns;
  }

  private parseSurveyBlock(): EmbeddedSurveyAST | null {
    const startToken = this.advance(); // consume Survey

    if (!this.check('LBRACE')) {
      return null;
    }
    const openBrace = this.advance(); // consume {

    // Find matching closing brace by tracking depth
    const startLine = startToken.line;
    let depth = 1;
    let closeBraceToken = openBrace;

    while (!this.isAtEnd() && depth > 0) {
      const token = this.advance();
      if (token.type === 'LBRACE') {
        depth++;
      } else if (token.type === 'RBRACE') {
        depth--;
        if (depth === 0) {
          closeBraceToken = token;
        }
      }
    }

    // Extract raw content from source if available
    let raw = '';
    if (this.source) {
      // Find the content between { and } in the original source
      const lines = this.source.split('\n');
      const contentLines: string[] = [];

      // Start from line after { to line before }
      for (let i = openBrace.line; i < closeBraceToken.line; i++) {
        if (lines[i - 1] !== undefined) {
          contentLines.push(lines[i - 1]!);
        }
      }

      // If single line, extract between braces
      if (openBrace.line === closeBraceToken.line) {
        const line = lines[openBrace.line - 1] || '';
        const braceStart = line.indexOf('{');
        const braceEnd = line.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd !== -1) {
          raw = line.slice(braceStart + 1, braceEnd).trim();
        }
      } else {
        raw = contentLines.join('\n').trim();
      }
    }

    return {
      raw,
      startLine,
      endLine: closeBraceToken.line,
    };
  }

  // Detect separator type from raw tokens (before filtering)
  private detectSeparatorType(): 'comma' | 'newline' | 'mixed' {
    let hasComma = false;
    let hasNewline = false;
    let depth = 0;  // Track bracket depth - only count top-level separators

    for (let i = 0; i < this.rawTokens.length; i++) {
      const token = this.rawTokens[i]!;

      if (token.type === 'LBRACKET') {
        depth++;
      } else if (token.type === 'RBRACKET') {
        depth--;
      }

      // Only count separators at top level (depth 0)
      if (depth === 0) {
        if (token.type === 'COMMA') {
          hasComma = true;
        } else if (token.type === 'NEWLINE') {
          // Check if this newline separates UI blocks
          // Look for: [block-content] NEWLINE [block-start]
          const prevToken = this.rawTokens[i - 1];
          const nextToken = this.rawTokens[i + 1];
          if (prevToken && nextToken) {
            // Previous can be any block content (field, string, bracket, etc.)
            const prevIsBlockContent = prevToken.type === 'UI_TYPE_INDEX' ||
                               prevToken.type === 'UI_TYPE_CODE' ||
                               prevToken.type === 'FIELD' ||
                               prevToken.type === 'RBRACKET' ||
                               prevToken.type === 'STRING' ||
                               prevToken.type === 'NUMBER';
            // Next must start a new block
            const nextIsBlockStart = nextToken.type === 'UI_TYPE_INDEX' ||
                               nextToken.type === 'UI_TYPE_CODE';
            if (prevIsBlockContent && nextIsBlockStart) {
              hasNewline = true;
            }
          }
        }
      }
    }

    if (hasComma && hasNewline) return 'mixed';
    if (hasNewline) return 'newline';
    return 'comma';  // Default
  }

  // Helper methods
  private check(...types: UITokenType[]): boolean {
    if (this.isAtEnd()) return false;
    return types.includes(this.peek().type);
  }

  private advance(): UIToken {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): UIToken {
    return this.tokens[this.current]!;
  }

  private previous(): UIToken {
    return this.tokens[this.current - 1]!;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF';
  }

  private generateUid(): string {
    return `b${++this.uidCounter}`;
  }

  /**
   * Parse interval string to milliseconds
   * Examples: "5s" -> 5000, "1m" -> 60000, "30" -> 30000
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smh])?$/);
    if (!match) return 5000; // Default 5s

    const value = parseInt(match[1]!, 10);
    const unit = match[2] || 's';

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return value * 1000;
    }
  }
}
