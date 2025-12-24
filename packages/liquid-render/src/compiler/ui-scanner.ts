// LiquidCode UI Scanner - Lexical Analysis
// Tokenizes LiquidCode DSL source code for UI components

import { UI_TYPE_CODES } from './constants';

// ============================================================================
// Compiler Error Class
// ============================================================================

export class LiquidCodeError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly source?: string
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'LiquidCodeError';
  }

  /**
   * Get a formatted error message with source context
   */
  format(): string {
    if (!this.source) {
      return this.message;
    }

    const lines = this.source.split('\n');
    const errorLine = lines[this.line - 1] || '';
    const pointer = ' '.repeat(this.column - 1) + '^';

    return [
      `LiquidCodeError: ${this.message.split(' at line')[0]}`,
      '',
      `  ${this.line} | ${errorLine}`,
      `      ${pointer}`,
      '',
    ].join('\n');
  }
}

export type UITokenType =
  // Types
  | 'UI_TYPE_INDEX'    // 0-9 (single digit for core types)
  | 'UI_TYPE_CODE'     // Kp, Br, Bt, etc.
  // Bindings
  | 'FIELD'            // :fieldName
  | 'ITERATOR'         // :. or :.field
  | 'INDEX_REF'        // :# (current index)
  | 'EXPR'             // =expression
  | 'STRING'           // "text"
  | 'NUMBER'           // 123, 3.14
  // Layout modifiers
  | 'PRIORITY'         // !h, !p, !s, !0-9
  | 'FLEX'             // ^f, ^s, ^g, ^c
  | 'SPAN'             // *1-9, *f, *h, *t, *q
  // Signal modifiers
  | 'SIGNAL_DECLARE'   // @signal
  | 'SIGNAL_EMIT'      // >signal or >/1
  | 'SIGNAL_RECEIVE'   // <signal
  | 'SIGNAL_BOTH'      // <>signal
  // Conditional
  | 'CONDITION'        // ?@signal=value
  // Style modifiers
  | 'COLOR'            // #color or #?cond
  | 'SIZE'             // %lg, %sm
  // State modifiers
  | 'STATE_COND'       // :hover?expr
  // Structure
  | 'LBRACKET'         // [
  | 'RBRACKET'         // ]
  | 'COMMA'            // ,
  | 'LAYER'            // /1, /2
  | 'LAYER_CLOSE'      // /<
  // Survey embedding
  | 'SURVEY_START'     // Survey {
  | 'LBRACE'           // {
  | 'RBRACE'           // }
  // General
  | 'IDENTIFIER'       // generic identifier
  | 'NEWLINE'          // \n
  | 'COMMENT'          // // comment
  | 'EOF';

export interface UIToken {
  type: UITokenType;
  value: string;
  line: number;
  column: number;
}

export class UIScanner {
  private source: string;
  private tokens: UIToken[] = [];
  private current = 0;
  private line = 1;
  private column = 1;
  private inSurveyBlock = 0; // Nesting depth for Survey { }

  constructor(source: string) {
    this.source = source;
  }

  scan(): UIToken[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case '@':
        this.signalDeclare();
        break;

      case '>':
        this.signalEmit();
        break;

      case '<':
        if (this.peek() === '>') {
          this.advance();
          this.signalBoth();
        } else {
          this.signalReceive();
        }
        break;

      case '!':
        this.priority();
        break;

      case '^':
        this.flex();
        break;

      case '*':
        this.span();
        break;

      case '#':
        this.color();
        break;

      case '%':
        this.size();
        break;

      case ':':
        this.field();
        break;

      case '=':
        this.expression();
        break;

      case '/':
        if (this.peek() === '/') {
          this.advance();
          this.comment();
        } else if (this.peek() === '<') {
          this.advance();
          this.addToken('LAYER_CLOSE', '/<');
        } else if (this.isDigit(this.peek())) {
          this.layer();
        }
        break;

      case '[':
        this.addToken('LBRACKET', c);
        break;

      case ']':
        this.addToken('RBRACKET', c);
        break;

      case '{':
        this.addToken('LBRACE', c);
        this.inSurveyBlock++;
        break;

      case '}':
        this.addToken('RBRACE', c);
        this.inSurveyBlock = Math.max(0, this.inSurveyBlock - 1);
        break;

      case ',':
        this.addToken('COMMA', c);
        break;

      case '"':
        this.string();
        break;

      case '?':
        this.condition();
        break;

      case '\n':
        this.addToken('NEWLINE', c);
        this.line++;
        this.column = 1;
        break;

      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace
        break;

      default:
        if (this.isDigit(c)) {
          this.numberOrType(c);
        } else if (this.isAlpha(c)) {
          this.identifierOrType(c);
        }
        break;
    }
  }

  private signalDeclare(): void {
    let value = '@';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      value += this.advance();
    }
    this.addToken('SIGNAL_DECLARE', value);
  }

  private signalEmit(): void {
    let value = '>';
    // Check for layer trigger >/1
    if (this.peek() === '/') {
      value += this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    } else {
      // Signal name
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '=') {
        value += this.advance();
      }
    }
    this.addToken('SIGNAL_EMIT', value);
  }

  private signalReceive(): void {
    let value = '<';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      value += this.advance();
    }
    this.addToken('SIGNAL_RECEIVE', value);
  }

  private signalBoth(): void {
    let value = '<>';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      value += this.advance();
    }
    this.addToken('SIGNAL_BOTH', value);
  }

  private priority(): void {
    let value = '!';
    // Check for letter (h, p, s) or digit
    if (this.isAlpha(this.peek())) {
      value += this.advance();
      // Could be action name like !submit, !reset
      while (this.isAlphaNumeric(this.peek())) {
        value += this.advance();
      }
    } else if (this.isDigit(this.peek())) {
      value += this.advance();
    }
    this.addToken('PRIORITY', value);
  }

  private flex(): void {
    let value = '^';
    // Allow multi-character flex values like ^row, ^column, ^grow
    while (this.isAlpha(this.peek())) {
      value += this.advance();
    }
    this.addToken('FLEX', value);
  }

  private span(): void {
    let value = '*';
    if (this.isDigit(this.peek())) {
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    } else if (this.isAlpha(this.peek())) {
      value += this.advance();
    }
    this.addToken('SPAN', value);
  }

  private color(): void {
    let value = '#';
    // Check for conditional color #?>=80:green,<80:red
    if (this.peek() === '?') {
      // Consume until whitespace or bracket (allow commas for multi-condition)
      while (!this.isAtEnd() && !' \t\n[]'.includes(this.peek())) {
        value += this.advance();
      }
    } else {
      // Simple color name
      while (this.isAlphaNumeric(this.peek())) {
        value += this.advance();
      }
    }
    this.addToken('COLOR', value);
  }

  private size(): void {
    let value = '%';
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    this.addToken('SIZE', value);
  }

  private field(): void {
    const startColumn = this.column - 1;

    if (this.peek() === '.') {
      // Iterator binding :. or :.field
      let value = ':.';
      this.advance();
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
        value += this.advance();
      }
      this.tokens.push({ type: 'ITERATOR', value, line: this.line, column: startColumn });
    } else if (this.peek() === '#') {
      // Index reference :#
      this.advance();
      this.tokens.push({ type: 'INDEX_REF', value: ':#', line: this.line, column: startColumn });
    } else if (this.isAlpha(this.peek())) {
      // Field binding :fieldName or :nested.field.path
      let value = ':';
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '.') {
        value += this.advance();
      }
      // Check for state condition :hover?expr
      if (this.peek() === '?') {
        value += this.advance();
        while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek())) {
          value += this.advance();
        }
        this.tokens.push({ type: 'STATE_COND', value, line: this.line, column: startColumn });
      } else {
        this.tokens.push({ type: 'FIELD', value, line: this.line, column: startColumn });
      }
    }
  }

  private expression(): void {
    let value = '=';
    // Consume until whitespace, comma, or bracket
    while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek())) {
      value += this.advance();
    }
    this.addToken('EXPR', value);
  }

  private condition(): void {
    // Handles ?@signal=value conditional expressions
    let value = '?';
    // Expect @ for signal condition
    if (this.peek() === '@') {
      value += this.advance();
      // Signal name and optional =value
      while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek())) {
        value += this.advance();
      }
    }
    this.addToken('CONDITION', value);
  }

  private layer(): void {
    let value = '/';
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    this.addToken('LAYER', value);
  }

  private string(): void {
    const start = this.current;
    const startColumn = this.column;

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      if (this.peek() === '\\') {
        // Skip backslash and the next character (handles \\, \", \n, \t, etc.)
        this.advance();
        if (!this.isAtEnd()) {
          if (this.peek() === '\n') {
            this.line++;
            this.column = 0;
          }
          this.advance();
        }
      } else {
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LiquidCodeError('Unterminated string', this.line, startColumn, this.source);
    }

    // Closing quote
    this.advance();

    // Unescape the string using single-pass to avoid re-processing
    // Handles: \" -> ", \\ -> \, \n -> newline, \t -> tab
    const raw = this.source.slice(start, this.current - 1);
    const value = raw.replace(/\\(.)/g, (_, char) => {
      switch (char) {
        case '"': return '"';
        case '\\': return '\\';
        case 'n': return '\n';
        case 't': return '\t';
        default: return char; // Unknown escapes: keep the character
      }
    });

    this.tokens.push({
      type: 'STRING',
      value,
      line: this.line,
      column: startColumn,
    });
  }

  private numberOrType(first: string): void {
    const startColumn = this.column - 1;

    // Check if single digit (0-9) is a UI type index
    if (!this.isDigit(this.peek()) && !this.isAlpha(this.peek()) && first >= '0' && first <= '9') {
      // Single digit = UI type index
      this.tokens.push({
        type: 'UI_TYPE_INDEX',
        value: first,
        line: this.line,
        column: startColumn,
      });
      return;
    }

    // Multi-digit number or number-prefixed identifier
    let value = first;
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check if it continues as identifier (like 0123 for table columns)
    if (this.isAlpha(this.peek()) || this.peek() === '_') {
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
        value += this.advance();
      }
      this.tokens.push({ type: 'IDENTIFIER', value, line: this.line, column: startColumn });
    } else if (value.length > 1 && /^\d+$/.test(value)) {
      // Multi-digit number - could be indexed bindings like "0123" for columns
      // For UI, we treat sequences of digits as indexed bindings
      this.tokens.push({ type: 'NUMBER', value, line: this.line, column: startColumn });
    } else {
      // Decimal number
      if (this.peek() === '.' && this.isDigit(this.peekNext())) {
        value += this.advance();
        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
      }
      this.tokens.push({ type: 'NUMBER', value, line: this.line, column: startColumn });
    }
  }

  private identifierOrType(first: string): void {
    const startColumn = this.column - 1;
    let value = first;

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-') {
      value += this.advance();
    }

    // Check for Survey keyword
    if (value === 'Survey') {
      this.addToken('SURVEY_START', value);
      return;
    }

    // Check if it's a UI type code:
    // 1. Known type code (in lookup table)
    // 2. Unknown but matches pattern: 2-3 chars, starts with capital letter
    //    This allows forward-compatibility with new component types
    const isKnownType = UI_TYPE_CODES[value] !== undefined;
    const isTypeCodePattern = value.length >= 2 && value.length <= 3 &&
                              value[0] >= 'A' && value[0] <= 'Z' &&
                              /^[A-Z][a-z]{1,2}$/.test(value);

    if (isKnownType || isTypeCodePattern) {
      this.tokens.push({
        type: 'UI_TYPE_CODE',
        value,
        line: this.line,
        column: startColumn,
      });
      return;
    }

    // Generic identifier
    this.tokens.push({
      type: 'IDENTIFIER',
      value,
      line: this.line,
      column: startColumn,
    });
  }

  private comment(): void {
    const start = this.current;
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
    const value = this.source.slice(start, this.current).trim();
    this.addToken('COMMENT', value);
  }

  private advance(): string {
    this.column++;
    return this.source[this.current++] ?? '\0';
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current] ?? '\0';
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1] ?? '\0';
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    // Support ASCII letters, underscore, and unicode letters
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || /\p{L}/u.test(c);
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private addToken(type: UITokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }
}
