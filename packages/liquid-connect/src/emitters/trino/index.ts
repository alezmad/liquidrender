// Trino Emitter
// SQL generation for Trino (formerly Presto)

import {
  BaseEmitter,
  type DialectTraits,
  type EmitterOptions,
} from '../base';

/**
 * Trino-specific emitter
 */
export class TrinoEmitter extends BaseEmitter {
  constructor(options: EmitterOptions = {}) {
    super(options);
  }

  getDialect(): string {
    return 'trino';
  }

  getTraits(): DialectTraits {
    return {
      identifierQuote: '"',
      stringQuote: "'",
      parameterStyle: 'question',
      supportsLimitOffset: true,
      supportsWindowFunctions: true,
      supportsCTE: true,
      supportsFilterClause: true,
      castToFloat: ' * 1.0',  // Trino: CAST(x AS DOUBLE) or multiply by 1.0
      dateFunctions: {
        currentDate: 'CURRENT_DATE',
        currentTimestamp: 'CURRENT_TIMESTAMP',
        dateAdd: (field, value, unit) => `DATE_ADD('${unit}', ${value}, ${field})`,
        dateDiff: (unit, start, end) => `DATE_DIFF('${unit}', ${start}, ${end})`,
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
        median: undefined, // Trino uses approx_percentile
        percentile: (field, p) => `APPROX_PERCENTILE(${field}, ${p})`,
        stddev: 'STDDEV_SAMP',
        variance: 'VAR_SAMP',
        stringAgg: (field, delimiter, orderBy) =>
          orderBy
            ? `LISTAGG(${field}, '${delimiter}') WITHIN GROUP (ORDER BY ${orderBy})`
            : `LISTAGG(${field}, '${delimiter}')`,
        arrayAgg: (field, orderBy) =>
          orderBy ? `ARRAY_AGG(${field} ORDER BY ${orderBy})` : `ARRAY_AGG(${field})`,
        // Boolean aggregations
        boolAnd: 'BOOL_AND',
        boolOr: 'BOOL_OR',
        every: 'EVERY',
        any: 'ANY_VALUE', // Trino uses ANY_VALUE
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
 * Create a Trino emitter
 */
export function createTrinoEmitter(options?: EmitterOptions): TrinoEmitter {
  return new TrinoEmitter(options);
}
