// LiquidCode UI Parser - Syntactic Analysis
// Parses UI tokens into an AST representing the UI structure

import type { UIToken, UITokenType } from './ui-scanner';
import { UI_INDEX_TO_TYPE, UI_TYPE_CODES, UI_PRIORITY_VALUES, UI_FLEX_VALUES, UI_SPAN_VALUES } from './constants';

// ============================================================================
// AST Node Types
// ============================================================================

export interface UIAST {
  signals: SignalDeclaration[];
  layers: LayerAST[];
  mainBlocks: BlockAST[];
  surveys: EmbeddedSurveyAST[];
  comments: string[];
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
  survey?: EmbeddedSurveyAST;
  line: number;
}

export interface BindingAST {
  kind: 'index' | 'field' | 'expr' | 'literal' | 'iterator' | 'indexRef';
  value: string;
  indices?: number[];  // For indexed bindings like 0123
}

export interface ModifierAST {
  kind: 'priority' | 'flex' | 'span' | 'emit' | 'receive' | 'both' | 'color' | 'size' | 'state' | 'action';
  raw: string;
  value?: string | number;
  target?: string;  // For signals
  layerId?: number; // For layer triggers
  condition?: string; // For conditional styles
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
  private current = 0;
  private uidCounter = 0;

  constructor(tokens: UIToken[]) {
    // Filter newlines but keep them for line tracking
    this.tokens = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'COMMENT');
  }

  parse(): UIAST {
    const ast: UIAST = {
      signals: [],
      layers: [],
      mainBlocks: [],
      surveys: [],
      comments: [],
    };

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

      // Main blocks (everything else)
      const block = this.parseBlock();
      if (block) {
        ast.mainBlocks.push(block);
      } else {
        // Skip unknown tokens to prevent infinite loop
        this.advance();
      }
    }

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
    } else {
      // Not a block start
      return null;
    }

    // Parse bindings and modifiers
    this.parseBindingsAndModifiers(block);

    // Parse children [...]
    if (this.check('LBRACKET')) {
      block.children = this.parseChildren();
    }

    // Check for embedded survey
    if (this.check('SURVEY_START')) {
      const survey = this.parseSurveyBlock();
      if (survey) block.survey = survey;
    }

    return block;
  }

  private parseBindingsAndModifiers(block: BlockAST): void {
    while (!this.isAtEnd()) {
      // Bindings
      if (this.check('NUMBER')) {
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
          modifier.value = raw;
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

  private parseChildren(): BlockAST[] {
    const children: BlockAST[] = [];

    this.advance(); // consume [

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      // Skip commas
      if (this.check('COMMA')) {
        this.advance();
        continue;
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

  private parseSurveyBlock(): EmbeddedSurveyAST | null {
    const startToken = this.advance(); // consume Survey

    if (!this.check('LBRACE')) {
      return null;
    }
    this.advance(); // consume {

    // Collect raw content until matching }
    const startLine = startToken.line;
    let depth = 1;
    const contentTokens: string[] = [];

    while (!this.isAtEnd() && depth > 0) {
      const token = this.advance();
      if (token.type === 'LBRACE') {
        depth++;
        contentTokens.push('{');
      } else if (token.type === 'RBRACE') {
        depth--;
        if (depth > 0) {
          contentTokens.push('}');
        }
      } else {
        contentTokens.push(token.value);
      }
    }

    return {
      raw: contentTokens.join(' ').trim(),
      startLine,
      endLine: this.previous().line,
    };
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
}
