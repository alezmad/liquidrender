// LiquidConnect Compiler - Parser
// Transforms token stream into AST

import type { Token, TokenType } from './tokens';
import type {
  QueryNode,
  MetricNode,
  EntityNode,
  DimensionNode,
  FilterExprNode,
  TimeNode,
  LimitNode,
  OrderByNode,
  CompareNode,
  ValueNode,
  NamedFilterNode,
  ExplicitFilterNode,
  DurationNode,
  PeriodNode,
} from './ast';
import { LiquidError, ErrorCode } from './diagnostics';

/**
 * Parser for LiquidConnect queries
 * Transforms tokens into Abstract Syntax Tree
 */
export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens into a QueryNode
   */
  parse(): QueryNode {
    return this.query();
  }

  private query(): QueryNode {
    // Must start with Q
    if (!this.check('QUERY')) {
      throw this.error(ErrorCode.E102, "Query must start with 'Q'");
    }
    this.advance(); // consume Q

    // Determine query type based on next token
    if (this.check('ENTITY')) {
      return this.entityQuery();
    } else if (this.check('METRIC')) {
      return this.metricQuery();
    } else {
      throw this.error(ErrorCode.E101, "Expected '@' or '.' after 'Q'");
    }
  }

  private metricQuery(): QueryNode {
    const metrics = this.metrics();
    const dimensions = this.dimensions();
    const filter = this.filter();
    const time = this.time();
    const limit = this.limit();
    const orderBy = this.orderBy();
    const compare = this.compare();

    return {
      kind: 'Query',
      type: 'metric',
      metrics,
      dimensions: dimensions.length > 0 ? dimensions : undefined,
      filter,
      time,
      limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      compare,
    };
  }

  private entityQuery(): QueryNode {
    const entity = this.entity();
    const filter = this.filter();
    const limit = this.limit();
    const orderBy = this.orderBy();

    return {
      kind: 'Query',
      type: 'entity',
      entity,
      filter,
      limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    };
  }

  // === Parsing helpers ===

  private metrics(): MetricNode[] {
    const metrics: MetricNode[] = [];

    while (this.check('METRIC')) {
      this.advance(); // consume @
      const name = this.consumeIdentifier('metric name');
      metrics.push({ kind: 'Metric', name });
    }

    if (metrics.length === 0) {
      throw this.error(ErrorCode.E101, 'Expected at least one metric');
    }

    return metrics;
  }

  private entity(): EntityNode {
    this.advance(); // consume .
    const name = this.consumeIdentifier('entity name');
    return { kind: 'Entity', name };
  }

  private dimensions(): DimensionNode[] {
    const dimensions: DimensionNode[] = [];

    while (this.check('DIMENSION')) {
      this.advance(); // consume #
      const name = this.consumeIdentifier('dimension name');
      dimensions.push({ kind: 'Dimension', name });
    }

    return dimensions;
  }

  private filter(): FilterExprNode | undefined {
    // Filter can start with ?, !, or (
    if (!this.check('FILTER') && !this.check('NOT') && !this.check('LPAREN')) {
      return undefined;
    }

    // Consume initial ? if present
    if (this.check('FILTER')) {
      this.advance();
    }

    return this.filterExpression();
  }

  private filterExpression(): FilterExprNode {
    return this.orExpression();
  }

  private orExpression(): FilterExprNode {
    let left = this.andExpression();

    while (this.check('OR')) {
      this.advance();
      const right = this.andExpression();
      left = {
        kind: 'BinaryFilter',
        operator: 'OR',
        left,
        right,
      };
    }

    return left;
  }

  private andExpression(): FilterExprNode {
    let left = this.unaryExpression();

    while (this.check('AND')) {
      this.advance();
      const right = this.unaryExpression();
      left = {
        kind: 'BinaryFilter',
        operator: 'AND',
        left,
        right,
      };
    }

    return left;
  }

  private unaryExpression(): FilterExprNode {
    if (this.check('NOT')) {
      this.advance();
      const operand = this.primaryFilter();
      return {
        kind: 'UnaryFilter',
        operator: 'NOT',
        operand,
      };
    }

    return this.primaryFilter();
  }

  private primaryFilter(): FilterExprNode {
    // Grouped expression
    if (this.check('LPAREN')) {
      this.advance();
      const expr = this.filterExpression();
      this.consume('RPAREN', "Expected ')' after filter expression");
      return {
        kind: 'GroupedFilter',
        expression: expr,
      };
    }

    // Filter sigil (for subsequent filters in compound expressions)
    if (this.check('FILTER')) {
      this.advance(); // consume ?
    }

    // Explicit filter: :field=value
    if (this.check('COLON')) {
      return this.explicitFilter();
    }

    // Named filter: identifier
    if (this.check('IDENTIFIER')) {
      return this.namedFilter();
    }

    throw this.error(ErrorCode.E101, 'Expected filter expression');
  }

  private explicitFilter(): ExplicitFilterNode {
    this.advance(); // consume :
    const field = this.consumeIdentifier('field name');

    // Determine operator and value
    const operator = this.filterOperator();
    const value = this.value();

    return {
      kind: 'ExplicitFilter',
      field,
      operator,
      value,
      negated: false,
    };
  }

  private namedFilter(): NamedFilterNode {
    const name = this.consumeIdentifier('filter name');
    return {
      kind: 'NamedFilter',
      name,
      negated: false,
    };
  }

  private filterOperator(): string {
    if (this.check('EQUALS')) { this.advance(); return '='; }
    if (this.check('NOT_EQUALS')) { this.advance(); return '!='; }
    if (this.check('GREATER_EQ')) { this.advance(); return '>='; }
    if (this.check('LESS_EQ')) { this.advance(); return '<='; }
    if (this.check('GREATER')) { this.advance(); return '>'; }
    if (this.check('LESS')) { this.advance(); return '<'; }
    if (this.check('CONTAINS')) { this.advance(); return '~~'; }

    throw this.error(ErrorCode.E101, 'Expected filter operator');
  }

  private value(): ValueNode {
    if (this.check('STRING')) {
      const token = this.advance();
      return { kind: 'StringValue', value: token.value };
    }
    if (this.check('NUMBER')) {
      const token = this.advance();
      return { kind: 'NumberValue', value: parseFloat(token.value) };
    }
    if (this.check('BOOLEAN')) {
      const token = this.advance();
      return { kind: 'BooleanValue', value: token.value === 'true' };
    }

    throw this.error(ErrorCode.E101, 'Expected value');
  }

  private time(): TimeNode | undefined {
    if (!this.check('TIME')) {
      return undefined;
    }
    this.advance(); // consume ~

    return this.timeExpression();
  }

  private timeExpression(): TimeNode {
    const token = this.peek();

    if (token.type === 'DURATION') {
      this.advance();
      const match = token.value.match(/^P(\d+)([dwMY])$/i);
      if (match) {
        return {
          kind: 'Duration',
          amount: parseInt(match[1]!, 10),
          unit: match[2]!.toLowerCase() as 'd' | 'w' | 'M' | 'Y',
        };
      }
    }

    if (token.type === 'PERIOD') {
      this.advance();
      const match = token.value.match(/^([DWMQY])(-(\d+))?$/i);
      if (match) {
        return {
          kind: 'Period',
          unit: match[1]!.toUpperCase() as 'D' | 'W' | 'M' | 'Q' | 'Y',
          offset: match[3] ? -parseInt(match[3], 10) : 0,
        };
      }
    }

    throw this.error(ErrorCode.E103, 'Invalid time expression');
  }

  private limit(): LimitNode | undefined {
    if (!this.check('TOP')) {
      return undefined;
    }
    this.advance(); // consume top
    this.consume('COLON', "Expected ':' after 'top'");

    const token = this.consume('NUMBER', 'Expected number after top:');
    return {
      kind: 'Limit',
      value: parseInt(token.value, 10),
    };
  }

  private orderBy(): OrderByNode[] {
    const orders: OrderByNode[] = [];

    while (this.check('SORT_ASC') || this.check('SORT_DESC')) {
      const direction = this.check('SORT_ASC') ? 'asc' : 'desc';
      this.advance();

      if (this.check('METRIC')) {
        this.advance();
        const name = this.consumeIdentifier('metric name');
        orders.push({
          kind: 'OrderBy',
          target: { kind: 'Metric', name },
          direction,
        });
      } else if (this.check('DIMENSION')) {
        this.advance();
        const name = this.consumeIdentifier('dimension name');
        orders.push({
          kind: 'OrderBy',
          target: { kind: 'Dimension', name },
          direction,
        });
      } else if (this.check('COLON')) {
        this.advance();
        const name = this.consumeIdentifier('field name');
        orders.push({
          kind: 'OrderBy',
          target: { kind: 'FieldRef', name },
          direction,
        });
      }
    }

    return orders;
  }

  private compare(): CompareNode | undefined {
    if (!this.check('VS')) {
      return undefined;
    }
    this.advance(); // consume vs

    // Consume the ~ (TIME) token before the period
    if (!this.check('TIME')) {
      throw this.error(ErrorCode.E103, "Expected '~' after 'vs'");
    }
    this.advance(); // consume ~

    const period = this.timeExpression();
    return {
      kind: 'Compare',
      period,
    };
  }

  // === Token helpers ===

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(ErrorCode.E101, message);
  }

  private consumeIdentifier(context: string): string {
    const token = this.consume('IDENTIFIER', `Expected ${context}`);
    return token.value;
  }

  private error(code: ErrorCode, message: string): LiquidError {
    const token = this.peek();
    return new LiquidError(code, message, token.position);
  }
}
