// PostgreSQL Emitter
// SQL generation for PostgreSQL

import {
  BaseEmitter,
  type DialectTraits,
  type EmitterOptions,
} from '../base';

/**
 * PostgreSQL emitter options
 */
export interface PostgresEmitterOptions extends EmitterOptions {
  /**
   * Use EXPLAIN ANALYZE for explain mode (executes query)
   * Default: false (uses simple EXPLAIN)
   */
  explainAnalyze?: boolean;

  /**
   * Include buffer usage in EXPLAIN output
   * Only applies when explainAnalyze is true
   * Default: true
   */
  explainBuffers?: boolean;
}

/**
 * PostgreSQL-specific emitter
 * v7 compatible: supports explain mode and comparison columns
 */
export class PostgresEmitter extends BaseEmitter {
  private pgOptions: Required<PostgresEmitterOptions>;

  constructor(options: PostgresEmitterOptions = {}) {
    super(options);
    this.pgOptions = {
      ...this.options,
      explainAnalyze: options.explainAnalyze ?? false,
      explainBuffers: options.explainBuffers ?? true,
    };
  }

  getDialect(): string {
    return 'postgres';
  }

  /**
   * v7: Wrap SQL in EXPLAIN for explain mode
   * PostgreSQL supports EXPLAIN (ANALYZE, BUFFERS) for detailed execution plans
   */
  protected wrapExplain(sql: string): string {
    if (this.pgOptions.explainAnalyze) {
      const options = ['ANALYZE'];
      if (this.pgOptions.explainBuffers) {
        options.push('BUFFERS');
      }
      return `EXPLAIN (${options.join(', ')}) ${sql}`;
    }
    // Default: simple EXPLAIN (does not execute query)
    return `EXPLAIN ${sql}`;
  }

  getTraits(): DialectTraits {
    return {
      identifierQuote: '"',
      stringQuote: "'",
      parameterStyle: 'positional',
      supportsLimitOffset: true,
      supportsWindowFunctions: true,
      supportsCTE: true,
      supportsFilterClause: true,
      castToFloat: '::float',
      dateFunctions: {
        currentDate: 'CURRENT_DATE',
        currentTimestamp: 'CURRENT_TIMESTAMP',
        dateAdd: (field, value, unit) => `${field} + INTERVAL '${value} ${unit}'`,
        dateDiff: (unit, start, end) => {
          switch (unit.toLowerCase()) {
            case 'day':
              return `EXTRACT(DAY FROM ${end} - ${start})`;
            case 'hour':
              return `EXTRACT(EPOCH FROM ${end} - ${start}) / 3600`;
            case 'minute':
              return `EXTRACT(EPOCH FROM ${end} - ${start}) / 60`;
            case 'second':
              return `EXTRACT(EPOCH FROM ${end} - ${start})`;
            default:
              return `DATE_PART('${unit}', AGE(${end}, ${start}))`;
          }
        },
        dateTrunc: (unit, field) => `DATE_TRUNC('${unit}', ${field})`,
        extract: (part, field) => `EXTRACT(${part} FROM ${field})`,
      },
      aggregateFunctions: {
        count: 'COUNT',
        countDistinct: (field) => `COUNT(DISTINCT ${field})`,
        sum: 'SUM',
        avg: 'AVG',
        min: 'MIN',
        max: 'MAX',
        median: (field) => `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${field})`,
        percentile: (field, p) =>
          `PERCENTILE_CONT(${p}) WITHIN GROUP (ORDER BY ${field})`,
        stddev: 'STDDEV_SAMP',
        variance: 'VAR_SAMP',
        stringAgg: (field, delimiter, orderBy) =>
          orderBy
            ? `STRING_AGG(${field}, '${delimiter}' ORDER BY ${orderBy})`
            : `STRING_AGG(${field}, '${delimiter}')`,
        arrayAgg: (field, orderBy) =>
          orderBy ? `ARRAY_AGG(${field} ORDER BY ${orderBy})` : `ARRAY_AGG(${field})`,
        // Boolean aggregations
        boolAnd: 'BOOL_AND',
        boolOr: 'BOOL_OR',
        every: 'EVERY',
        any: 'ANY',
        // Positional aggregations
        firstValue: (field, orderBy) =>
          orderBy
            ? `FIRST_VALUE(${field}) OVER (ORDER BY ${orderBy})`
            : `FIRST_VALUE(${field})`,
        lastValue: (field, orderBy) =>
          orderBy
            ? `LAST_VALUE(${field}) OVER (ORDER BY ${orderBy})`
            : `LAST_VALUE(${field})`,
        // Ranking functions
        rank: 'RANK',
        denseRank: 'DENSE_RANK',
        rowNumber: 'ROW_NUMBER',
        ntile: (buckets) => `NTILE(${buckets})`,
      },
    };
  }
}

/**
 * Create a PostgreSQL emitter
 */
export function createPostgresEmitter(options?: PostgresEmitterOptions): PostgresEmitter {
  return new PostgresEmitter(options);
}
