// LiquidSurvey Scanner - Lexical Analysis
// Tokenizes LiquidSurvey DSL source code

import { NODE_TYPE_SYMBOLS, QUESTION_TYPE_CODES } from './constants';

export type TokenType =
  | 'NODE_START'      // >
  | 'NODE_QUESTION'   // ?
  | 'NODE_MESSAGE'    // !
  | 'NODE_END'        // <
  | 'IDENTIFIER'      // node-id
  | 'QUESTION_TYPE'   // Tx, Rt, Ch, etc.
  | 'REQUIRED'        // *
  | 'STRING'          // "quoted text"
  | 'ARROW'           // ->
  | 'CONDITION_OP'    // ?=, ?>=, ?<=, ?>, ?<, ?in, ?contains
  | 'LBRACKET'        // [
  | 'RBRACKET'        // ]
  | 'LBRACE'          // {
  | 'RBRACE'          // }
  | 'COLON'           // :
  | 'COMMA'           // ,
  | 'EQUALS'          // =
  | 'NUMBER'          // 123, 3.14
  | 'BOOLEAN'         // true, false
  | 'NEWLINE'         // \n
  | 'COMMENT'         // // comment
  | 'HEADER_SEP'      // ---
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class SurveyScanner {
  private source: string;
  private tokens: Token[] = [];
  private current = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  scan(): Token[] {
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
      case '>':
        this.addToken('NODE_START', c);
        break;
      case '?':
        // Check for condition operators
        if (this.match('>=')) {
          this.addToken('CONDITION_OP', '?>=');
        } else if (this.match('<=')) {
          this.addToken('CONDITION_OP', '?<=');
        } else if (this.match('>')) {
          this.addToken('CONDITION_OP', '?>');
        } else if (this.match('<')) {
          this.addToken('CONDITION_OP', '?<');
        } else if (this.match('=')) {
          this.addToken('CONDITION_OP', '?=');
        } else if (this.matchWord('in')) {
          this.addToken('CONDITION_OP', '?in');
        } else if (this.matchWord('contains')) {
          this.addToken('CONDITION_OP', '?contains');
        } else {
          this.addToken('NODE_QUESTION', c);
        }
        break;
      case '!':
        this.addToken('NODE_MESSAGE', c);
        break;
      case '<':
        this.addToken('NODE_END', c);
        break;
      case '*':
        this.addToken('REQUIRED', c);
        break;
      case '[':
        this.addToken('LBRACKET', c);
        break;
      case ']':
        this.addToken('RBRACKET', c);
        break;
      case '{':
        this.addToken('LBRACE', c);
        break;
      case '}':
        this.addToken('RBRACE', c);
        break;
      case ':':
        this.addToken('COLON', c);
        break;
      case ',':
        this.addToken('COMMA', c);
        break;
      case '=':
        this.addToken('EQUALS', c);
        break;
      case '-':
        if (this.match('->')) {
          this.addToken('ARROW', '->');
        } else if (this.match('--')) {
          this.addToken('HEADER_SEP', '---');
        } else {
          // Might be part of an identifier or number
          if (this.isDigit(this.peek())) {
            this.number(c);
          } else {
            this.identifier(c);
          }
        }
        break;
      case '/':
        if (this.match('/')) {
          this.comment();
        }
        break;
      case '"':
        this.string();
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
          this.number(c);
        } else if (this.isAlpha(c)) {
          this.identifier(c);
        }
        break;
    }
  }

  private string(): void {
    const start = this.current;
    const startColumn = this.column;

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      if (this.peek() === '\\' && this.peekNext() === '"') {
        this.advance(); // skip backslash
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }

    // Closing quote
    this.advance();

    const value = this.source.slice(start, this.current - 1);
    this.tokens.push({
      type: 'STRING',
      value,
      line: this.line,
      column: startColumn,
    });
  }

  private number(first: string): void {
    let value = first;
    const startColumn = this.column - 1;

    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

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

  private identifier(first: string): void {
    let value = first;
    const startColumn = this.column - 1;

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-' || this.peek() === '_') {
      value += this.advance();
    }

    // Check if it's a question type code
    if (Object.values(QUESTION_TYPE_CODES).includes(value as any)) {
      this.tokens.push({
        type: 'QUESTION_TYPE',
        value,
        line: this.line,
        column: startColumn,
      });
    } else if (value === 'true' || value === 'false') {
      this.tokens.push({
        type: 'BOOLEAN',
        value,
        line: this.line,
        column: startColumn,
      });
    } else {
      this.tokens.push({
        type: 'IDENTIFIER',
        value,
        line: this.line,
        column: startColumn,
      });
    }
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

  private match(expected: string): boolean {
    for (let i = 0; i < expected.length; i++) {
      if (this.current + i >= this.source.length) return false;
      if (this.source[this.current + i] !== expected[i]) return false;
    }
    this.current += expected.length;
    this.column += expected.length;
    return true;
  }

  private matchWord(word: string): boolean {
    // Match word with word boundary
    for (let i = 0; i < word.length; i++) {
      if (this.current + i >= this.source.length) return false;
      if (this.source[this.current + i] !== word[i]) return false;
    }
    // Check word boundary
    const nextChar = this.source[this.current + word.length];
    if (nextChar && this.isAlphaNumeric(nextChar)) return false;

    this.current += word.length;
    this.column += word.length;
    return true;
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }
}
