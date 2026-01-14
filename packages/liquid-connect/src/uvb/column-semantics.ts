/**
 * Column Semantics Detection
 *
 * Automatically detect what a column represents based on:
 * - Column name patterns
 * - Value distribution
 * - Data range
 *
 * This makes KPI generation robust across ANY database.
 */

export type ColumnSemantic =
  | 'PERCENTAGE_DECIMAL'    // 0.05 means 5% (discount, tax_rate)
  | 'PERCENTAGE_WHOLE'      // 5 means 5% (some systems)
  | 'CURRENCY'              // Dollar amounts
  | 'QUANTITY'              // Count of items (integers)
  | 'IDENTIFIER'            // IDs, keys
  | 'CATEGORICAL'           // Enum-like values
  | 'TIMESTAMP'             // Date/time
  | 'UNKNOWN';

export interface ColumnSemanticResult {
  semantic: ColumnSemantic;
  confidence: number;       // 0-1
  reasoning: string;
}

/**
 * Detect column semantics from profiling data
 */
export function detectColumnSemantic(
  columnName: string,
  profile: {
    dataType: string;
    minValue?: number | null;
    maxValue?: number | null;
    distinctCount?: number;
    nullPercentage?: number;
    sampleValues?: (string | number | null)[];
  }
): ColumnSemanticResult {
  const nameLower = columnName.toLowerCase();

  // =========================================================================
  // Pattern 1: Percentage stored as decimal (0-1)
  // =========================================================================
  const percentageNamePatterns = [
    /discount/i,
    /rate$/i,
    /ratio/i,
    /pct/i,
    /percent/i,
    /margin/i,
    /tax/i,
    /commission/i,
  ];

  const looksLikePercentageName = percentageNamePatterns.some(p => p.test(nameLower));
  const valuesIn0to1Range = profile.minValue != null &&
    profile.maxValue != null &&
    profile.minValue >= 0 &&
    profile.maxValue <= 1;

  if (looksLikePercentageName && valuesIn0to1Range) {
    return {
      semantic: 'PERCENTAGE_DECIMAL',
      confidence: 0.95,
      reasoning: `Column "${columnName}" has percentage-like name and values in 0-1 range`,
    };
  }

  // Values 0-1 even without percentage name = might be percentage
  if (valuesIn0to1Range && profile.dataType.includes('float')) {
    return {
      semantic: 'PERCENTAGE_DECIMAL',
      confidence: 0.7,
      reasoning: `Column "${columnName}" has float values exclusively in 0-1 range`,
    };
  }

  // =========================================================================
  // Pattern 2: Percentage stored as whole number (0-100)
  // =========================================================================
  const valuesIn0to100Range = profile.minValue != null &&
    profile.maxValue != null &&
    profile.minValue >= 0 &&
    profile.maxValue <= 100;

  if (looksLikePercentageName && valuesIn0to100Range && !valuesIn0to1Range) {
    return {
      semantic: 'PERCENTAGE_WHOLE',
      confidence: 0.8,
      reasoning: `Column "${columnName}" has percentage-like name and values in 0-100 range`,
    };
  }

  // =========================================================================
  // Pattern 3: Currency/monetary values
  // =========================================================================
  const currencyNamePatterns = [
    /price/i,
    /amount/i,
    /total/i,
    /revenue/i,
    /cost/i,
    /fee/i,
    /value/i,
    /payment/i,
    /salary/i,
    /wage/i,
  ];

  const looksLikeCurrencyName = currencyNamePatterns.some(p => p.test(nameLower));

  if (looksLikeCurrencyName && profile.dataType.match(/float|decimal|numeric|money/i)) {
    return {
      semantic: 'CURRENCY',
      confidence: 0.9,
      reasoning: `Column "${columnName}" has currency-like name and numeric type`,
    };
  }

  // =========================================================================
  // Pattern 4: Quantity/count columns
  // =========================================================================
  const quantityNamePatterns = [
    /quantity/i,
    /qty/i,
    /count/i,
    /units/i,
    /stock/i,
    /inventory/i,
  ];

  const looksLikeQuantityName = quantityNamePatterns.some(p => p.test(nameLower));

  if (looksLikeQuantityName && profile.dataType.match(/int|integer|smallint|bigint/i)) {
    return {
      semantic: 'QUANTITY',
      confidence: 0.9,
      reasoning: `Column "${columnName}" has quantity-like name and integer type`,
    };
  }

  // =========================================================================
  // Pattern 5: Identifier columns
  // =========================================================================
  const idNamePatterns = [
    /_id$/i,
    /^id$/i,
    /_key$/i,
    /_code$/i,
  ];

  const looksLikeIdName = idNamePatterns.some(p => p.test(nameLower));
  const highCardinality = profile.distinctCount && profile.distinctCount > 100;

  if (looksLikeIdName || (highCardinality && profile.dataType.match(/int|varchar|uuid/i))) {
    return {
      semantic: 'IDENTIFIER',
      confidence: looksLikeIdName ? 0.95 : 0.7,
      reasoning: `Column "${columnName}" appears to be an identifier`,
    };
  }

  // =========================================================================
  // Pattern 6: Categorical columns
  // =========================================================================
  const lowCardinality = profile.distinctCount && profile.distinctCount < 50;

  if (lowCardinality && profile.dataType.match(/varchar|text|char/i)) {
    return {
      semantic: 'CATEGORICAL',
      confidence: 0.8,
      reasoning: `Column "${columnName}" has low cardinality (${profile.distinctCount} values)`,
    };
  }

  // =========================================================================
  // Pattern 7: Timestamp columns
  // =========================================================================
  if (profile.dataType.match(/timestamp|datetime|date/i)) {
    return {
      semantic: 'TIMESTAMP',
      confidence: 0.95,
      reasoning: `Column "${columnName}" has date/time type`,
    };
  }

  // Default
  return {
    semantic: 'UNKNOWN',
    confidence: 0.5,
    reasoning: `Could not determine semantic for column "${columnName}"`,
  };
}

/**
 * Generate semantic annotations for prompt context
 */
export function generateSemanticContext(
  columns: Array<{
    tableName: string;
    columnName: string;
    semantic: ColumnSemantic;
    confidence: number;
  }>
): string {
  const percentageColumns = columns.filter(c => c.semantic === 'PERCENTAGE_DECIMAL');
  const currencyColumns = columns.filter(c => c.semantic === 'CURRENCY');
  const quantityColumns = columns.filter(c => c.semantic === 'QUANTITY');

  const lines: string[] = ['## Column Semantics (auto-detected)'];

  if (percentageColumns.length > 0) {
    lines.push('\n**Percentage columns (0-1 = 0-100%):**');
    for (const col of percentageColumns) {
      lines.push(`- ${col.tableName}.${col.columnName}: 0.05 means 5%, NOT $0.05`);
    }
  }

  if (currencyColumns.length > 0) {
    lines.push('\n**Currency/monetary columns:**');
    for (const col of currencyColumns) {
      lines.push(`- ${col.tableName}.${col.columnName}`);
    }
  }

  if (quantityColumns.length > 0) {
    lines.push('\n**Quantity columns (count of items):**');
    for (const col of quantityColumns) {
      lines.push(`- ${col.tableName}.${col.columnName}: Use SUM for total units, not for "items per order"`);
    }
  }

  return lines.join('\n');
}
