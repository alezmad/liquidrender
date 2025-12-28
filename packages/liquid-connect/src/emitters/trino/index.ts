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
