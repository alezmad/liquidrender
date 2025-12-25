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
  // Streaming modifiers (real-time data)
  | 'STREAM'           // ~5s, ~ws://url, ~sse://url
  // Fidelity modifiers (adaptive rendering)
  | 'FIDELITY'         // $lo, $hi, $auto, $skeleton
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

export interface ScanResult {
  tokens: UIToken[];
  errors: LiquidCodeError[];
}

export class UIScanner {
  private source: string;
  private tokens: UIToken[] = [];
  private errors: LiquidCodeError[] = [];
  private current = 0;
  private line = 1;
  private column = 1;
  private inSurveyBlock = 0; // Nesting depth for Survey { }

  constructor(source: string) {
    this.source = this.preprocessSource(source);
  }

    /**
   * Preprocess source code for normalization and validation
   * 1. Strip UTF-8 BOM
   * 2. Normalize line endings
   * 3. Validate UTF-8 encoding
   * 4. Handle control characters
   */
  private preprocessSource(source: string): string {
    // 1. Strip BOM (Byte Order Mark)
    let result = source.replace(/^\uFEFF/, '');

    // 2. Normalize line endings to \n
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. Validate UTF-8 (check for orphaned surrogates)
    this.validateUTF8(result);

    // 4. Handle control characters (keep \n, \t, strip others)
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return result;
  }

  /**
   * Validate UTF-8 encoding by checking for orphaned surrogates
   * @throws {LiquidCodeError} if invalid UTF-8 is detected
   */
  private validateUTF8(source: string): void {
    for (let i = 0; i < source.length; i++) {
      const code = source.charCodeAt(i);
      // Check for orphaned high surrogate
      if (code >= 0xD800 && code <= 0xDBFF) {
        const next = source.charCodeAt(i + 1);
        if (!(next >= 0xDC00 && next <= 0xDFFF)) {
          throw new LiquidCodeError(
            'Invalid UTF-8: orphaned high surrogate',
            1,
            i + 1,
            source
          );
        }
        i++; // Skip low surrogate
      }
      // Check for orphaned low surrogate
      else if (code >= 0xDC00 && code <= 0xDFFF) {
        throw new LiquidCodeError(
          'Invalid UTF-8: orphaned low surrogate',
          1,
          i + 1,
          source
        );
      }
    }
  }


  scan(): ScanResult {
    while (!this.isAtEnd()) {
      try {
        this.scanToken();

  
      } catch (e) {
        if (e instanceof LiquidCodeError) {
          this.errors.push(e);
          this.synchronize();
        } else {
          throw e;
        }
      }
    }

    this.tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column,
    });

    return { tokens: this.tokens, errors: this.errors };
  }

  /**
   * Synchronize scanner to a safe point after error
   * Skip until newline, bracket, comma, or known prefix character
   */
  private synchronize(): void {
    while (!this.isAtEnd()) {
      const c = this.peek();
      // Stop at structural boundaries
      if (c === '\n' || c === '[' || c === ']' || c === ',' || c === '{' || c === '}') {
        break;
      }
      // Stop at start of new block (type codes or signals at start of line)
      if ((this.isAlpha(c) || c === '@') && this.column === 1) {
        break;
      }
      this.advance();
    }
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

      case '~':
        this.stream();
        break;

      case '$':
        this.fidelity();
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

      case '-':
        // Negative number (for range parameters like Rg :temp -10 50)
        if (this.isDigit(this.peek())) {
          this.negativeNumber();
        }
        // Otherwise ignore standalone minus (not valid in DSL)
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

  private stream(): void {
    let value = '~';
    // Stream can be: ~5s, ~1m, ~ws://url, ~sse://url, ~poll
    // Consume until whitespace, comma, bracket, or prefix (but allow : for URLs)
    while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek())) {
      const c = this.peek();
      // Stop at prefix characters except : (needed for URLs)
      if (c !== ':' && this.isPrefixChar(c)) break;
      value += this.advance();
    }

    // Normalize double-protocol edge case:
    // ~sse://https://example.com -> ~sse:https://example.com (strip redundant //)
    // ~ws://wss://example.com -> ~ws:wss://example.com (strip redundant //)
    // The DSL protocol prefix (sse://, ws://) should not duplicate the URL's protocol
    const doubleProtocolMatch = value.match(/^~(sse|ws):\/\/(https?|wss?):\/\/(.+)$/);
    if (doubleProtocolMatch) {
      const [, dslProtocol, urlProtocol, rest] = doubleProtocolMatch;
      // Reconstruct with just the actual URL (strip DSL protocol prefix's //)
      value = `~${dslProtocol}:${urlProtocol}://${rest}`;
    }

    this.addToken('STREAM', value);
  }

  private fidelity(): void {
    let value = '$';
    // Fidelity: $lo, $hi, $auto, $skeleton, $defer
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    this.addToken('FIDELITY', value);
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
    // Consume until whitespace, comma, bracket, or prefix (but allow :*% as operators)
    while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek())) {
      const c = this.peek();
      // Stop at prefix characters except :*% (allowed as expression operators)
      if (c !== ':' && c !== '*' && c !== '%' && this.isPrefixChar(c)) break;
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

  /**
   * Handle negative numbers (for range parameters like Rg :temp -10 50)
   * Called when we've seen a '-' followed by a digit
   */
  private negativeNumber(): void {
    const startColumn = this.column - 1; // Account for the '-' we already consumed
    let value = '-';

    // Consume integer part
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Handle decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push({
      type: 'NUMBER',
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
    const firstChar = value.charAt(0);
    const isTypeCodePattern = value.length >= 2 && value.length <= 3 &&
                              firstChar >= 'A' && firstChar <= 'Z' &&
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

  /**
   * Check if character is a modifier prefix that signals end of current token
   * These characters are unambiguous delimiters in LiquidCode
   */
  private isPrefixChar(c: string): boolean {
    return ':@><#!^*%~$?'.includes(c);
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
