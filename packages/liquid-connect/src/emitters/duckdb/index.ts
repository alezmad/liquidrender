// DuckDB Emitter
// SQL generation for DuckDB

import {
  BaseEmitter,
  type DialectTraits,
  type EmitterOptions,
} from '../base';

/**
 * DuckDB-specific emitter
 */
export class DuckDBEmitter extends BaseEmitter {
  constructor(options: EmitterOptions = {}) {
    super(options);
  }

  getDialect(): string {
    return 'duckdb';
  }

  getTraits(): DialectTraits {
    return {
      identifierQuote: '"',
      stringQuote: "'",
      parameterStyle: 'positional',
      supportsLimitOffset: true,
      supportsWindowFunctions: true,
      supportsCTE: true,
      dateFunctions: {
        currentDate: 'CURRENT_DATE',
        currentTimestamp: 'CURRENT_TIMESTAMP',
        dateAdd: (field, value, unit) => `${field} + INTERVAL '${value}' ${unit}`,
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
        median: 'MEDIAN',
        percentile: (field, p) => `PERCENTILE_CONT(${p}) WITHIN GROUP (ORDER BY ${field})`,
        stddev: 'STDDEV_SAMP',
        variance: 'VAR_SAMP',
        stringAgg: (field, delimiter, orderBy) =>
          orderBy
            ? `STRING_AGG(${field}, '${delimiter}' ORDER BY ${orderBy})`
            : `STRING_AGG(${field}, '${delimiter}')`,
        arrayAgg: (field, orderBy) =>
          orderBy ? `ARRAY_AGG(${field} ORDER BY ${orderBy})` : `ARRAY_AGG(${field})`,
      },
    };
  }
}

/**
 * Create a DuckDB emitter
 */
export function createDuckDBEmitter(options?: EmitterOptions): DuckDBEmitter {
  return new DuckDBEmitter(options);
}
