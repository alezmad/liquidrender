// LiquidConnect Compiler - Scanner (Lexer)
// Tokenizes LiquidConnect query strings

import type { Position } from '../types';
import type { Token, TokenType } from './tokens';
import { isTimeAlias } from './tokens';

/**
 * Scanner for LiquidConnect queries
 * Converts source string into token stream
 */
export class Scanner {
  private source: string;
  private tokens: Token[] = [];
  private current = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Scan the entire source and return tokens
   */
  scan(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      // Single-character sigils
      case '@':
        // Check for @t: time override pattern
        if (this.peek() === 't' && this.peekNext() === ':') {
          this.advance(); // consume 't'
          this.advance(); // consume ':'
          // Read the identifier after @t:
          const startPos = this.getPosition();
          let value = '';
          while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
            value += this.advance();
          }
          this.tokens.push({
            type: 'TIME_OVERRIDE',
            value,
            position: startPos,
          });
        } else {
          this.addToken('METRIC', c);
        }
        break;
      case '#':
        this.addToken('DIMENSION', c);
        break;
      case '+':
        this.addToken('SORT_ASC', c);
        break;
      case '-':
        this.addToken('SORT_DESC', c);
        break;
      case '&':
        this.addToken('AND', c);
        break;
      case '|':
        this.addToken('OR', c);
        break;
      case '(':
        this.addToken('LPAREN', c);
        break;
      case ')':
        this.addToken('RPAREN', c);
        break;
      case '[':
        this.addToken('LBRACKET', c);
        break;
      case ']':
        this.addToken('RBRACKET', c);
        break;
      case ',':
        this.addToken('COMMA', c);
        break;

      // Two-character operators
      case '.':
        if (this.match('.')) {
          this.addToken('DOT_DOT', '..');
        } else {
          this.addToken('ENTITY', c);
        }
        break;

      case '~':
        // Single tilde = contains operator
        this.addToken('CONTAINS', '~');
        break;

      case 't':
        // Check for t: time prefix
        if (this.peek() === ':') {
          this.advance(); // consume ':'
          this.addToken('TIME', 't:');
          this.scanTimeExpression();
        } else {
          // Regular identifier starting with 't'
          this.identifier(c);
        }
        break;

      case '?':
        this.addToken('FILTER', c);
        break;

      case ':':
        this.addToken('COLON', c);
        break;

      case '=':
        this.addToken('EQUALS', c);
        break;

      case '!':
        if (this.match('=')) {
          this.addToken('NOT_EQUALS', '!=');
        } else if (this.match(':')) {
          this.addToken('NOT_IN', '!:');
        } else {
          // Check for !explain keyword
          if (this.peek() === 'e') {
            const startPos = this.getPosition();
            let keyword = '';
            while (this.isAlpha(this.peek())) {
              keyword += this.advance();
            }
            if (keyword === 'explain') {
              this.tokens.push({
                type: 'EXPLAIN',
                value: '!explain',
                position: startPos,
              });
            } else {
              // Not !explain, treat ! as NOT and identifier separately
              this.addToken('NOT', c);
              // Put the identifier back as a token
              if (keyword) {
                this.tokens.push({
                  type: 'IDENTIFIER',
                  value: keyword,
                  position: startPos,
                });
              }
            }
          } else {
            this.addToken('NOT', c);
          }
        }
        break;

      case '>':
        if (this.match('=')) {
          this.addToken('GREATER_EQ', '>=');
        } else {
          this.addToken('GREATER', c);
        }
        break;

      case '<':
        if (this.match('=')) {
          this.addToken('LESS_EQ', '<=');
        } else {
          this.addToken('LESS', c);
        }
        break;

      // String literals
      case '"':
        this.string();
        break;

      // Whitespace
      case ' ':
      case '\t':
      case '\r':
        // Skip whitespace
        break;

      case '\n':
        this.line++;
        this.column = 1;
        break;

      // Comments
      case '/':
        if (this.match('/')) {
          this.comment();
        }
        break;

      case '$':
        // Parameter: $identifier
        {
          const startPos = this.getPosition();
          let paramName = '';
          while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
            paramName += this.advance();
          }
          if (paramName) {
            this.tokens.push({
              type: 'PARAMETER',
              value: paramName,
              position: startPos,
            });
          }
        }
        break;

      default:
        if (this.isDigit(c)) {
          this.number(c);
        } else if (this.isAlpha(c)) {
          this.identifier(c);
        } else {
          // Unknown character - could add error handling
        }
        break;
    }
  }

  private string(): void {
    const startPosition = this.getPosition();
    let value = '';

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      // Handle escape sequences
      if (this.peek() === '\\' && this.peekNext() === '"') {
        this.advance(); // skip backslash
      }
      value += this.advance();
    }

    if (this.isAtEnd()) {
      // Unterminated string error
      return;
    }

    // Closing quote
    this.advance();

    this.tokens.push({
      type: 'STRING',
      value,
      position: startPosition,
    });
  }

  private number(first: string): void {
    const startPosition = this.getPosition();
    startPosition.column--; // Adjust for already consumed character
    let value = first;

    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push({
      type: 'NUMBER',
      value,
      position: startPosition,
    });
  }

  private identifier(first: string): void {
    const startPosition = this.getPosition();
    startPosition.column--;
    let value = first;

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-') {
      value += this.advance();
    }

    // Check for Q@ scope pin pattern - emit QUERY first, then SCOPE_PIN
    if (value.toUpperCase() === 'Q' && this.peek() === '@') {
      // First emit QUERY token
      this.tokens.push({
        type: 'QUERY',
        value: 'Q',
        position: startPosition,
      });
      // Then consume @ and scope name
      this.advance(); // consume '@'
      const scopeStartPos = this.getPosition();
      let scopeName = '';
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
        scopeName += this.advance();
      }
      this.tokens.push({
        type: 'SCOPE_PIN',
        value: scopeName,
        position: scopeStartPos,
      });
      return;
    }

    // Check for keywords
    const tokenType = this.getKeywordType(value);

    this.tokens.push({
      type: tokenType,
      value,
      position: startPosition,
    });
  }

  private getKeywordType(value: string): TokenType {
    // Check for time expressions FIRST (before keywords)
    // This ensures ~Q parses as PERIOD, not QUERY
    // v7: Accept both P30d and 30d formats (P is optional)
    if (/^P?\d+[dwMY]$/i.test(value)) {
      return 'DURATION';
    }
    if (/^[DWMQY](-\d+)?$/i.test(value)) {
      // Only treat as PERIOD if preceded by ~ (TIME token)
      // Check if previous token was TIME
      const prevToken = this.tokens[this.tokens.length - 1];
      if (prevToken?.type === 'TIME') {
        return 'PERIOD';
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'DATE';
    }
    if (/^\d{4}-Q[1-4]$/.test(value)) {
      return 'YEAR_QUARTER';
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
      return 'YEAR_MONTH';
    }

    // Check for time aliases
    if (isTimeAlias(value)) {
      return 'TIME_ALIAS';
    }

    // Keywords
    switch (value.toUpperCase()) {
      case 'Q':
        // Check for Q@ scope pin pattern
        if (this.peek() === '@') {
          return 'QUERY'; // Will be handled in identifier() for SCOPE_PIN
        }
        return 'QUERY';
      case 'TOP':
        return 'TOP';
      case 'VS':
        return 'VS';
      case 'TRUE':
      case 'FALSE':
        return 'BOOLEAN';
      default:
        return 'IDENTIFIER';
    }
  }

  /**
   * Scan time expression after ~ sigil
   * Handles time aliases (today, yesterday, etc.) and durations without P prefix
   */
  private scanTimeExpression(): void {
    // Skip whitespace after ~
    while (this.peek() === ' ' || this.peek() === '\t') {
      this.advance();
    }

    const startPos = this.getPosition();

    // Check if next token starts with a digit (duration like 30d)
    if (this.isDigit(this.peek())) {
      let value = '';
      // Consume digits
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
      // Consume unit letter (d, w, M, Y)
      if (this.isAlpha(this.peek())) {
        value += this.advance();
      }
      // This is a duration without P prefix
      this.tokens.push({
        type: 'DURATION',
        value,
        position: startPos,
      });
      return;
    }

    // Check if next token starts with a letter (could be time alias or period)
    if (this.isAlpha(this.peek())) {
      let value = '';
      while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-') {
        value += this.advance();
      }

      // Check if it's a time alias
      if (isTimeAlias(value)) {
        this.tokens.push({
          type: 'TIME_ALIAS',
          value,
          position: startPos,
        });
        return;
      }

      // Check if it's a duration or period
      const tokenType = this.getKeywordType(value);
      this.tokens.push({
        type: tokenType,
        value,
        position: startPos,
      });
    }
  }

  private comment(): void {
    // Skip until end of line
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
  }

  // === Helper methods ===

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
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;
    this.current++;
    this.column++;
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

  private getPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.current,
    };
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      position: {
        line: this.line,
        column: this.column - value.length,
        offset: this.current - value.length,
      },
    });
  }
}
