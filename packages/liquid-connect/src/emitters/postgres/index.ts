// PostgreSQL Emitter
// SQL generation for PostgreSQL

import {
  BaseEmitter,
  type DialectTraits,
  type EmitterOptions,
} from '../base';

/**
 * PostgreSQL-specific emitter
 */
export class PostgresEmitter extends BaseEmitter {
  constructor(options: EmitterOptions = {}) {
    super(options);
  }

  getDialect(): string {
    return 'postgres';
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
        median: undefined, // PostgreSQL uses percentile_cont
        percentile: (field, p) => `PERCENTILE_CONT(${p}) WITHIN GROUP (ORDER BY ${field})`,
      },
    };
  }
}

/**
 * Create a PostgreSQL emitter
 */
export function createPostgresEmitter(options?: EmitterOptions): PostgresEmitter {
  return new PostgresEmitter(options);
}
