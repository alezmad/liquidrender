// Emitters - Base Emitter
// Abstract base class for SQL emitters

import type { LiquidFlow, ResolvedFilter, ResolvedMetric } from '../liquidflow/types';
import type { AggregationType } from '../types';

/**
 * Exhaustive check helper for type-safe switches
 * Throws at runtime if an unhandled case is reached
 * TypeScript will error at compile time if any case is missing
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled aggregation type: ${value}`);
}

/**
 * Emitter result
 */
export interface EmitResult {
  /** Generated SQL */
  sql: string;

  /** Parameters for prepared statements */
  params: unknown[];

  /** Debug information */
  debug?: EmitDebug;
}

/**
 * Debug information for emitted SQL
 */
export interface EmitDebug {
  /** Original LiquidFlow */
  flow: LiquidFlow;

  /** Intermediate SQL parts */
  parts: SQLParts;

  /** Dialect used */
  dialect: string;

  /** Generation timestamp */
  generatedAt: string;
}

/**
 * SQL parts before final assembly
 */
export interface SQLParts {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  groupBy: string[];
  having: string[];
  orderBy: string[];
  limit?: string;
}

/**
 * Emitter options
 */
export interface EmitterOptions {
  /** Use prepared statement placeholders */
  parameterized?: boolean;

  /** Include debug information */
  debug?: boolean;

  /** Pretty print SQL */
  prettyPrint?: boolean;

  /** Quote identifiers */
  quoteIdentifiers?: boolean;

  /** Schema prefix */
  defaultSchema?: string;
}

/**
 * Dialect-specific SQL generation traits
 */
export interface DialectTraits {
  /** Identifier quote character */
  identifierQuote: string;

  /** String quote character */
  stringQuote: string;

  /** Parameter placeholder style */
  parameterStyle: 'positional' | 'named' | 'question';

  /** Supports LIMIT/OFFSET */
  supportsLimitOffset: boolean;

  /** Supports window functions */
  supportsWindowFunctions: boolean;

  /** Supports CTEs */
  supportsCTE: boolean;

  /** Date/time function names */
  dateFunctions: DateFunctions;

  /** Aggregation function names */
  aggregateFunctions: AggregateFunctions;
}

/**
 * Date/time function mapping
 */
export interface DateFunctions {
  currentDate: string;
  currentTimestamp: string;
  dateAdd: (field: string, value: string, unit: string) => string;
  dateDiff: (unit: string, start: string, end: string) => string;
  dateTrunc: (unit: string, field: string) => string;
  extract: (part: string, field: string) => string;
}

/**
 * Aggregate function mapping
 */
export interface AggregateFunctions {
  count: string;
  countDistinct: (field: string) => string;
  sum: string;
  avg: string;
  min: string;
  max: string;
  median?: string;
  percentile?: (field: string, p: number) => string;
  stddev?: string;
  variance?: string;
  stringAgg?: (field: string, delimiter: string, orderBy?: string) => string;
  arrayAgg?: (field: string, orderBy?: string) => string;
}

/**
 * Abstract base emitter
 */
export abstract class BaseEmitter {
  protected options: Required<EmitterOptions>;
  protected params: unknown[] = [];

  constructor(options: EmitterOptions = {}) {
    this.options = {
      parameterized: options.parameterized ?? true,
      debug: options.debug ?? false,
      prettyPrint: options.prettyPrint ?? true,
      quoteIdentifiers: options.quoteIdentifiers ?? true,
      defaultSchema: options.defaultSchema ?? '',
    };
  }

  /**
   * Get dialect-specific traits
   */
  abstract getTraits(): DialectTraits;

  /**
   * Get dialect name
   */
  abstract getDialect(): string;

  /**
   * Emit SQL from LiquidFlow
   */
  emit(flow: LiquidFlow): EmitResult {
    this.params = [];
    const parts = this.buildParts(flow);
    let sql = this.assembleSql(parts);

    // v7: Handle explain mode
    if (flow.explain) {
      sql = this.wrapExplain(sql);
    }

    const result: EmitResult = {
      sql,
      params: [...this.params],
    };

    if (this.options.debug) {
      result.debug = {
        flow,
        parts,
        dialect: this.getDialect(),
        generatedAt: new Date().toISOString(),
      };
    }

    return result;
  }

  /**
   * v7: Wrap SQL in EXPLAIN for explain mode
   * Override in dialect-specific emitters for custom syntax
   */
  protected wrapExplain(sql: string): string {
    return `EXPLAIN ${sql}`;
  }

  /**
   * Build SQL parts from LiquidFlow
   */
  protected buildParts(flow: LiquidFlow): SQLParts {
    return {
      select: this.buildSelect(flow),
      from: this.buildFrom(flow),
      joins: this.buildJoins(flow),
      where: this.buildWhere(flow),
      groupBy: this.buildGroupBy(flow),
      having: [],
      orderBy: this.buildOrderBy(flow),
      limit: this.buildLimit(flow),
    };
  }

  /**
   * Build SELECT clause
   */
  protected buildSelect(flow: LiquidFlow): string[] {
    const selects: string[] = [];

    if (flow.type === 'metric') {
      // Add dimensions first
      for (const dim of flow.dimensions ?? []) {
        selects.push(`${dim.expression} AS ${this.quoteIdentifier(dim.alias)}`);
      }

      // Add metrics
      for (const metric of flow.metrics ?? []) {
        let metricExpr: string;
        if (metric.derived) {
          // Derived metrics: expression should already be expanded by resolver
          // Just use the expression directly (no aggregation wrapper)
          metricExpr = this.expandMetricRefs(metric.expression, flow.metrics ?? []);
        } else {
          // Simple metrics: wrap in aggregation function
          metricExpr = this.buildAggregation(metric.aggregation, metric.expression);
        }
        selects.push(`${metricExpr} AS ${this.quoteIdentifier(metric.alias)}`);
      }

      // v7: Add comparison columns if compare mode is enabled
      if (flow.compare) {
        selects.push(...this.buildComparisonSelect(flow));
      }
    } else if (flow.type === 'entity') {
      // Add entity fields
      for (const field of flow.entity?.fields ?? []) {
        selects.push(`${field.column} AS ${this.quoteIdentifier(field.alias)}`);
      }
    }

    return selects;
  }

  /**
   * v7: Build comparison columns for compare mode
   * Generates _compare, _delta, and _pct columns for period comparison
   * Override in dialect-specific emitters for custom comparison logic
   */
  protected buildComparisonSelect(flow: LiquidFlow): string[] {
    const comparisonSelects: string[] = [];

    if (!flow.compare || !flow.metrics) {
      return comparisonSelects;
    }

    // For each metric, add comparison columns
    for (const metric of flow.metrics) {
      if (metric.derived) continue; // Skip derived metrics for comparison

      const baseAlias = metric.alias;
      const compareAlias = `${baseAlias}_compare`;
      const deltaAlias = `${baseAlias}_delta`;
      const pctAlias = `${baseAlias}_pct`;

      // The comparison value (from comparison period)
      // This would typically come from a subquery or window function
      // For now, we generate placeholder expressions that the resolver should fill in
      const compareExpr = this.buildComparisonMetricExpr(metric, flow.compare);
      comparisonSelects.push(`${compareExpr} AS ${this.quoteIdentifier(compareAlias)}`);

      // Delta: current - comparison
      const deltaExpr = `${this.quoteIdentifier(baseAlias)} - ${this.quoteIdentifier(compareAlias)}`;
      comparisonSelects.push(`${deltaExpr} AS ${this.quoteIdentifier(deltaAlias)}`);

      // Percentage change: ((current - comparison) / comparison) * 100
      // Handle division by zero with NULLIF
      const pctExpr = `CASE WHEN ${this.quoteIdentifier(compareAlias)} = 0 THEN NULL ELSE (${deltaExpr}) * 100.0 / ${this.quoteIdentifier(compareAlias)} END`;
      comparisonSelects.push(`${pctExpr} AS ${this.quoteIdentifier(pctAlias)}`);
    }

    return comparisonSelects;
  }

  /**
   * v7: Build comparison metric expression for a specific metric
   * Override in dialect-specific emitters for optimized comparison queries
   */
  protected buildComparisonMetricExpr(metric: ResolvedMetric, compare: LiquidFlow['compare']): string {
    // Default implementation uses LAG window function or subquery
    // This is a placeholder that dialect-specific emitters should override
    // for more efficient period-over-period comparison patterns
    return `NULL /* comparison value for ${metric.ref} - implement in dialect */`;
  }

  /**
   * Build aggregation expression
   * Uses exhaustive switch for compile-time type safety
   */
  protected buildAggregation(aggregation: AggregationType, expression: string): string {
    const funcs = this.getTraits().aggregateFunctions;

    switch (aggregation) {
      case 'COUNT':
        return `${funcs.count}(${expression})`;
      case 'COUNT_DISTINCT':
        return funcs.countDistinct(expression);
      case 'SUM':
        return `${funcs.sum}(${expression})`;
      case 'AVG':
        return `${funcs.avg}(${expression})`;
      case 'MIN':
        return `${funcs.min}(${expression})`;
      case 'MAX':
        return `${funcs.max}(${expression})`;
      // v2 aggregations
      case 'MEDIAN':
        if (!funcs.median) throw new Error('Dialect does not support MEDIAN');
        return `${funcs.median}(${expression})`;
      case 'PERCENTILE_25':
        if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
        return funcs.percentile(expression, 0.25);
      case 'PERCENTILE_75':
        if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
        return funcs.percentile(expression, 0.75);
      case 'PERCENTILE_90':
        if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
        return funcs.percentile(expression, 0.90);
      case 'PERCENTILE_95':
        if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
        return funcs.percentile(expression, 0.95);
      case 'PERCENTILE_99':
        if (!funcs.percentile) throw new Error('Dialect does not support PERCENTILE');
        return funcs.percentile(expression, 0.99);
      case 'STDDEV':
        if (!funcs.stddev) return `STDDEV(${expression})`;
        return `${funcs.stddev}(${expression})`;
      case 'VARIANCE':
        if (!funcs.variance) return `VARIANCE(${expression})`;
        return `${funcs.variance}(${expression})`;
      case 'ARRAY_AGG':
        if (!funcs.arrayAgg) return `ARRAY_AGG(${expression})`;
        return funcs.arrayAgg(expression);
      case 'STRING_AGG':
        if (!funcs.stringAgg) return `STRING_AGG(${expression}, ',')`;
        return funcs.stringAgg(expression, ',');
      default:
        return assertNever(aggregation);
    }
  }

  /**
   * Expand @metric references in derived expressions
   */
  protected expandMetricRefs(expression: string, metrics: ResolvedMetric[]): string {
    // Find all @metricName references
    return expression.replace(/@(\w+)/g, (match, metricName) => {
      // Find the referenced metric
      const metric = metrics.find(m => m.ref === metricName);
      if (metric && !metric.derived) {
        // Expand to aggregated expression
        return this.buildAggregation(metric.aggregation, metric.expression);
      }
      // If not found, keep the reference (resolver should have included it)
      return match;
    });
  }

  /**
   * Build FROM clause
   */
  protected buildFrom(flow: LiquidFlow): string {
    if (flow.sources.length === 0) {
      throw new Error('No sources defined in LiquidFlow');
    }

    const source = flow.sources[0];
    const tableName = this.formatTableName(source.table, source.schema, source.database);
    return `${tableName} AS ${this.quoteIdentifier(source.alias)}`;
  }

  /**
   * Build JOIN clauses
   */
  protected buildJoins(flow: LiquidFlow): string[] {
    return (flow.joins ?? []).map(join => {
      const rightTable = this.formatTableName(join.rightTable);
      return `${join.type} JOIN ${rightTable} AS ${this.quoteIdentifier(join.rightAlias)} ON ${join.on}`;
    });
  }

  /**
   * Build WHERE clause
   */
  protected buildWhere(flow: LiquidFlow): string[] {
    const conditions: string[] = [];

    // Add time constraint
    if (flow.time) {
      conditions.push(this.buildTimeCondition(flow.time));
    }

    // Add filters
    for (const filter of flow.filters ?? []) {
      conditions.push(this.buildFilter(filter));
    }

    return conditions;
  }

  /**
   * Build time constraint
   */
  protected buildTimeCondition(time: LiquidFlow['time']): string {
    if (!time) return '';

    const field = time.field;
    const start = this.addParam(time.start);
    const end = this.addParam(time.end);

    return `${field} >= ${start} AND ${field} < ${end}`;
  }

  /**
   * Build filter expression
   */
  protected buildFilter(filter: ResolvedFilter): string {
    if (filter.type === 'compound') {
      const left = this.buildFilter(filter.left!);
      const right = this.buildFilter(filter.right!);
      return `(${left} ${filter.booleanOp} ${right})`;
    }

    const field = filter.field!;
    const operator = filter.operator!;
    const value = filter.value;

    return this.buildPredicate(field, operator, value);
  }

  /**
   * Build predicate expression
   */
  protected buildPredicate(field: string, operator: string, value: unknown): string {
    switch (operator) {
      case '=':
      case '!=':
      case '>':
      case '>=':
      case '<':
      case '<=':
        return `${field} ${operator} ${this.addParam(value)}`;

      case 'LIKE':
      case 'NOT LIKE':
        return `${field} ${operator} ${this.addParam(value)}`;

      case 'IN':
        if (!Array.isArray(value)) {
          throw new Error('IN operator requires array value');
        }
        const placeholders = value.map(v => this.addParam(v)).join(', ');
        return `${field} IN (${placeholders})`;

      case 'NOT IN':
        if (!Array.isArray(value)) {
          throw new Error('NOT IN operator requires array value');
        }
        const notPlaceholders = value.map(v => this.addParam(v)).join(', ');
        return `${field} NOT IN (${notPlaceholders})`;

      case 'IS NULL':
        return `${field} IS NULL`;

      case 'IS NOT NULL':
        return `${field} IS NOT NULL`;

      case 'BETWEEN':
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error('BETWEEN operator requires array of two values');
        }
        return `${field} BETWEEN ${this.addParam(value[0])} AND ${this.addParam(value[1])}`;

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Build GROUP BY clause
   */
  protected buildGroupBy(flow: LiquidFlow): string[] {
    if (flow.type !== 'metric') return [];

    return (flow.dimensions ?? []).map(dim => dim.expression);
  }

  /**
   * Build ORDER BY clause
   */
  protected buildOrderBy(flow: LiquidFlow): string[] {
    return (flow.orderBy ?? []).map(order => {
      return `${order.expression} ${order.direction.toUpperCase()}`;
    });
  }

  /**
   * Build LIMIT clause
   */
  protected buildLimit(flow: LiquidFlow): string | undefined {
    if (flow.limit === undefined) return undefined;
    return flow.limit.toString();
  }

  /**
   * Assemble final SQL from parts
   */
  protected assembleSql(parts: SQLParts): string {
    const lines: string[] = [];
    const indent = this.options.prettyPrint ? '  ' : '';
    const newline = this.options.prettyPrint ? '\n' : ' ';

    // SELECT
    lines.push('SELECT');
    lines.push(indent + parts.select.join(`,${newline}${indent}`));

    // FROM
    lines.push('FROM ' + parts.from);

    // JOINs
    for (const join of parts.joins) {
      lines.push(join);
    }

    // WHERE
    if (parts.where.length > 0) {
      lines.push('WHERE ' + parts.where.join(` AND${newline}${indent}`));
    }

    // GROUP BY
    if (parts.groupBy.length > 0) {
      lines.push('GROUP BY ' + parts.groupBy.join(', '));
    }

    // HAVING
    if (parts.having.length > 0) {
      lines.push('HAVING ' + parts.having.join(' AND '));
    }

    // ORDER BY
    if (parts.orderBy.length > 0) {
      lines.push('ORDER BY ' + parts.orderBy.join(', '));
    }

    // LIMIT
    if (parts.limit) {
      lines.push('LIMIT ' + parts.limit);
    }

    return lines.join(newline);
  }

  /**
   * Add parameter and return placeholder
   */
  protected addParam(value: unknown): string {
    if (!this.options.parameterized) {
      return this.formatLiteral(value);
    }

    this.params.push(value);
    const traits = this.getTraits();

    switch (traits.parameterStyle) {
      case 'positional':
        return `$${this.params.length}`;
      case 'named':
        return `:p${this.params.length}`;
      case 'question':
        return '?';
      default:
        return `$${this.params.length}`;
    }
  }

  /**
   * Format literal value
   */
  protected formatLiteral(value: unknown): string {
    if (value === null) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'string') {
      const quote = this.getTraits().stringQuote;
      const escaped = value.replace(new RegExp(quote, 'g'), quote + quote);
      return `${quote}${escaped}${quote}`;
    }
    if (value instanceof Date) {
      return this.formatLiteral(value.toISOString());
    }
    return this.formatLiteral(String(value));
  }

  /**
   * Quote identifier
   */
  protected quoteIdentifier(name: string): string {
    if (!this.options.quoteIdentifiers) {
      return name;
    }
    const quote = this.getTraits().identifierQuote;
    return `${quote}${name}${quote}`;
  }

  /**
   * Format fully qualified table name
   */
  protected formatTableName(table: string, schema?: string, database?: string): string {
    const parts: string[] = [];

    if (database) {
      parts.push(this.quoteIdentifier(database));
    }

    if (schema) {
      parts.push(this.quoteIdentifier(schema));
    } else if (this.options.defaultSchema) {
      parts.push(this.quoteIdentifier(this.options.defaultSchema));
    }

    parts.push(this.quoteIdentifier(table));

    return parts.join('.');
  }
}
