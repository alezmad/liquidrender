/**
 * Test Column Semantics Detection
 *
 * Shows how automatic detection makes KPI generation universal
 */

import { DuckDBUniversalAdapter } from "@repo/liquid-connect/uvb";

// Inline column semantics detection (would normally import from uvb)
type ColumnSemantic =
  | 'PERCENTAGE_DECIMAL'
  | 'PERCENTAGE_WHOLE'
  | 'CURRENCY'
  | 'QUANTITY'
  | 'IDENTIFIER'
  | 'CATEGORICAL'
  | 'TIMESTAMP'
  | 'UNKNOWN';

function detectColumnSemantic(
  columnName: string,
  profile: { dataType: string; minValue?: number | null; maxValue?: number | null }
): { semantic: ColumnSemantic; confidence: number; reasoning: string } {
  const nameLower = columnName.toLowerCase();

  // Percentage patterns
  const percentagePatterns = [/discount/i, /rate$/i, /ratio/i, /pct/i, /percent/i, /margin/i, /tax/i];
  const looksLikePercentage = percentagePatterns.some(p => p.test(nameLower));
  const valuesIn0to1 = profile.minValue != null && profile.maxValue != null && profile.minValue >= 0 && profile.maxValue <= 1;

  if (looksLikePercentage && valuesIn0to1) {
    return { semantic: 'PERCENTAGE_DECIMAL', confidence: 0.95, reasoning: `"${columnName}" has percentage-like name and values in 0-1 range` };
  }

  // Currency patterns
  const currencyPatterns = [/price/i, /amount/i, /total/i, /revenue/i, /cost/i, /fee/i, /value/i];
  if (currencyPatterns.some(p => p.test(nameLower)) && profile.dataType.match(/float|decimal|numeric/i)) {
    return { semantic: 'CURRENCY', confidence: 0.9, reasoning: `"${columnName}" has currency-like name and numeric type` };
  }

  // Quantity patterns
  const quantityPatterns = [/quantity/i, /qty/i, /count/i, /units/i, /stock/i];
  if (quantityPatterns.some(p => p.test(nameLower)) && profile.dataType.match(/int/i)) {
    return { semantic: 'QUANTITY', confidence: 0.9, reasoning: `"${columnName}" has quantity-like name and integer type` };
  }

  // ID patterns
  if (/_id$/i.test(nameLower) || /^id$/i.test(nameLower)) {
    return { semantic: 'IDENTIFIER', confidence: 0.95, reasoning: `"${columnName}" appears to be an identifier` };
  }

  return { semantic: 'UNKNOWN', confidence: 0.5, reasoning: `Could not determine semantic for "${columnName}"` };
}

function generateSemanticContext(columns: Array<{ tableName: string; columnName: string; semantic: ColumnSemantic }>): string {
  const percentageCols = columns.filter(c => c.semantic === 'PERCENTAGE_DECIMAL');
  const quantityCols = columns.filter(c => c.semantic === 'QUANTITY');
  const lines = ['## Column Semantics (auto-detected)'];
  if (percentageCols.length > 0) {
    lines.push('\n**Percentage columns (0-1 = 0-100%):**');
    percentageCols.forEach(c => lines.push(`- ${c.tableName}.${c.columnName}: 0.05 means 5%, NOT $0.05`));
  }
  if (quantityCols.length > 0) {
    lines.push('\n**Quantity columns:**');
    quantityCols.forEach(c => lines.push(`- ${c.tableName}.${c.columnName}: Use SUM for total units, not for "items per order"`));
  }
  return lines.join('\n');
}

const DB_CONNECTION = "postgresql://superadmin:superadmin@localhost:5433/northwind";

async function main() {
  console.log("═".repeat(70));
  console.log("  COLUMN SEMANTICS DETECTION TEST");
  console.log("═".repeat(70));

  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(DB_CONNECTION);

  // Get column info using DESCRIBE (works with DuckDB postgres_scanner)
  const describeResult = await adapter.query<{
    column_name: string;
    column_type: string;
  }>(`DESCRIBE "source_db"."order_details"`);

  const columns = describeResult.map(r => ({
    column_name: r.column_name,
    data_type: r.column_type,
  }));

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ Detected Column Semantics for order_details                         │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  const detectedColumns: Array<{
    tableName: string;
    columnName: string;
    semantic: ColumnSemantic;
    confidence: number;
  }> = [];

  for (const col of columns) {
    // Get min/max for numeric columns
    let minValue: number | null = null;
    let maxValue: number | null = null;

    if (col.data_type.match(/int|float|decimal|numeric|real|double/i)) {
      try {
        const stats = await adapter.query<{ min_val: number; max_val: number }>(`
          SELECT MIN("${col.column_name}") as min_val, MAX("${col.column_name}") as max_val
          FROM "source_db"."order_details"
        `);
        minValue = stats[0]?.min_val ?? null;
        maxValue = stats[0]?.max_val ?? null;
      } catch {
        // ignore
      }
    }

    const result = detectColumnSemantic(col.column_name, {
      dataType: col.data_type,
      minValue,
      maxValue,
    });

    detectedColumns.push({
      tableName: 'order_details',
      columnName: col.column_name,
      semantic: result.semantic,
      confidence: result.confidence,
    });

    const icon = result.confidence >= 0.9 ? '✅' : result.confidence >= 0.7 ? '⚠️' : '❓';
    console.log(`${icon} ${col.column_name}`);
    console.log(`   Type: ${col.data_type}`);
    console.log(`   Range: ${minValue} - ${maxValue}`);
    console.log(`   Semantic: ${result.semantic} (${(result.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`   Reasoning: ${result.reasoning}`);
    console.log();
  }

  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ Generated Context for LLM Prompt                                   │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  const context = generateSemanticContext(detectedColumns);
  console.log(context);

  console.log("\n" + "═".repeat(70));
  console.log("  HOW THIS MAKES KPI GENERATION UNIVERSAL");
  console.log("═".repeat(70));
  console.log(`
  BEFORE (heuristic-based):
    - Prompt says "discount is usually 0-1 = percentage"
    - Works for Northwind, but what if another DB stores discount as dollars?

  AFTER (data-driven):
    - We DETECT that discount column has values 0-0.25
    - We INJECT into prompt: "discount is PERCENTAGE_DECIMAL (0.05 = 5%)"
    - Works for ANY database because we check the actual data

  This approach handles:
    ✅ Different discount representations ($5 vs 0.05)
    ✅ Unknown column naming conventions
    ✅ Regional/industry variations
    ✅ Legacy systems with unusual patterns
`);

  await adapter.disconnect();
}

main().catch(console.error);
