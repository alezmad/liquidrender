/**
 * Diagnose KPI Calculation Issues
 *
 * Investigate why certain KPIs return invalid/suspicious values
 */

import { DuckDBUniversalAdapter } from "@repo/liquid-connect/uvb";

const DB_CONNECTION = "postgresql://superadmin:superadmin@localhost:5433/northwind";

async function main() {
  console.log("═".repeat(70));
  console.log("  KPI ISSUE DIAGNOSIS");
  console.log("═".repeat(70));

  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(DB_CONNECTION);
  console.log("\n✓ Connected to Northwind\n");

  // =========================================================================
  // 1. INVALID: Average Items per Order (returned 62, expected 2-5)
  // =========================================================================
  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ ISSUE 1: Average Items per Order = 62 (INVALID)                    │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // The generated SQL was:
  // SELECT (SUM(quantity)) / (COUNT(DISTINCT order_id)) AS value FROM order_details

  // Let's understand the data
  const totalQuantity = await adapter.query<{total: number}>(
    'SELECT SUM(quantity) as total FROM "source_db"."order_details"'
  );
  console.log(`\n  Total quantity sold: ${totalQuantity[0]?.total}`);

  const uniqueOrders = await adapter.query<{cnt: bigint}>(
    'SELECT COUNT(DISTINCT order_id) as cnt FROM "source_db"."order_details"'
  );
  console.log(`  Unique orders: ${uniqueOrders[0]?.cnt}`);

  const totalRows = await adapter.query<{cnt: bigint}>(
    'SELECT COUNT(*) as cnt FROM "source_db"."order_details"'
  );
  console.log(`  Total order_details rows: ${totalRows[0]?.cnt}`);

  // The issue: SUM(quantity) includes ALL quantity across all line items
  // But "items per order" should be COUNT of line items, not SUM of quantities

  const correctCalc = await adapter.query<{avg_items: number}>(
    `SELECT COUNT(*) * 1.0 / COUNT(DISTINCT order_id) as avg_items
     FROM "source_db"."order_details"`
  );
  console.log(`\n  CORRECT: Avg line items per order: ${correctCalc[0]?.avg_items?.toFixed(2)}`);

  const generatedCalc = await adapter.query<{value: number}>(
    `SELECT (SUM(quantity)) / (COUNT(DISTINCT order_id)) as value
     FROM "source_db"."order_details"`
  );
  console.log(`  GENERATED (wrong): SUM(quantity)/orders: ${generatedCalc[0]?.value?.toFixed(2)}`);

  console.log(`
  🔴 ROOT CAUSE: Semantic confusion between "items" and "quantity"
     - "Items per order" should count LINE ITEMS (rows), not sum quantities
     - The LLM chose SUM(quantity) instead of COUNT(*)
     - This is a SEMANTIC INTERPRETATION error

  📝 FIX: Add clarification in prompt about items vs quantities
`);

  // =========================================================================
  // 2. SUSPICIOUS: Average Order Value = $1,632 (seems high)
  // =========================================================================
  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ ISSUE 2: Average Order Value = $1,632 (SUSPICIOUS)                 │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // The generated SQL was:
  // SELECT (SUM(unit_price * quantity)) / (COUNT(DISTINCT order_id)) AS value FROM order_details

  const aovCheck = await adapter.query<{total: number, orders: bigint, aov: number}>(`
    SELECT
      SUM(unit_price * quantity) as total,
      COUNT(DISTINCT order_id) as orders,
      SUM(unit_price * quantity) / COUNT(DISTINCT order_id) as aov
    FROM "source_db"."order_details"
  `);
  console.log(`\n  Total revenue: $${aovCheck[0]?.total?.toFixed(2)}`);
  console.log(`  Number of orders: ${aovCheck[0]?.orders}`);
  console.log(`  AOV: $${aovCheck[0]?.aov?.toFixed(2)}`);

  // Check order value distribution
  const orderDistribution = await adapter.query<{bucket: string, cnt: bigint}>(`
    SELECT
      CASE
        WHEN order_total < 500 THEN '<$500'
        WHEN order_total < 1000 THEN '$500-1000'
        WHEN order_total < 2000 THEN '$1000-2000'
        WHEN order_total < 5000 THEN '$2000-5000'
        ELSE '>$5000'
      END as bucket,
      COUNT(*) as cnt
    FROM (
      SELECT order_id, SUM(unit_price * quantity) as order_total
      FROM "source_db"."order_details"
      GROUP BY order_id
    )
    GROUP BY bucket
    ORDER BY bucket
  `);
  console.log(`\n  Order Value Distribution:`);
  for (const row of orderDistribution) {
    console.log(`    ${row.bucket}: ${row.cnt} orders`);
  }

  console.log(`
  🟡 ANALYSIS: The AOV is actually CORRECT for this dataset
     - Northwind is a B2B wholesale business (food distributor)
     - B2B orders are typically large ($1000-5000 range)
     - The LLM flagged it as suspicious because it compared to B2C e-commerce

  📝 FIX: Prompt should consider business type context
     - B2B: Higher AOV expected ($500-5000)
     - B2C: Lower AOV expected ($50-200)
`);

  // =========================================================================
  // 3. SUSPICIOUS: Discount Rate = 0.9% (seems low)
  // =========================================================================
  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ ISSUE 3: Discount Rate = 0.9% (SUSPICIOUS)                         │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // The generated SQL was:
  // SELECT ((SUM(discount)) / (SUM(unit_price * quantity))) * 100 AS value FROM order_details

  // Check the discount column
  const discountSample = await adapter.query<{discount: number}>(`
    SELECT DISTINCT discount FROM "source_db"."order_details" ORDER BY discount LIMIT 10
  `);
  console.log(`\n  Sample discount values: ${discountSample.map(r => r.discount).join(', ')}`);

  const discountStats = await adapter.query<{sum_discount: number, sum_revenue: number}>(`
    SELECT
      SUM(discount) as sum_discount,
      SUM(unit_price * quantity) as sum_revenue
    FROM "source_db"."order_details"
  `);
  console.log(`  Sum of discount column: ${discountStats[0]?.sum_discount}`);
  console.log(`  Sum of revenue: ${discountStats[0]?.sum_revenue?.toFixed(2)}`);

  // Check how discount is stored
  const discountWithRevenue = await adapter.query<{discount: number, unit_price: number, quantity: number}>(`
    SELECT discount, unit_price, quantity
    FROM "source_db"."order_details"
    WHERE discount > 0
    LIMIT 5
  `);
  console.log(`\n  Sample rows with discounts:`);
  for (const row of discountWithRevenue) {
    const lineTotal = row.unit_price * row.quantity;
    const discountPct = row.discount * 100;
    console.log(`    unit_price=${row.unit_price}, qty=${row.quantity}, discount=${row.discount} (${discountPct}%)`);
    console.log(`      → line total: $${lineTotal.toFixed(2)}, discount is ${discountPct}% OFF`);
  }

  console.log(`
  🔴 ROOT CAUSE: The discount column stores PERCENTAGE as decimal (0.05 = 5%)
     - The LLM calculated: SUM(discount) / SUM(revenue) * 100
     - This is WRONG - discount is already a percentage, not a dollar amount

  📋 CORRECT calculation should be:
     - Average discount percentage: AVG(discount) * 100
     - OR weighted: SUM(discount * unit_price * quantity) / SUM(unit_price * quantity) * 100

  📝 FIX: Prompt needs to clarify discount column semantics
     - If discount is 0.05, it means 5% off (not $0.05)
     - Need to detect if column is percentage vs absolute value
`);

  // =========================================================================
  // SUMMARY: Root Causes for Robust KPI Generation
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("  ROOT CAUSE SUMMARY");
  console.log("═".repeat(70));
  console.log(`
  1. SEMANTIC CONFUSION (Items per Order)
     → LLM confused "items" (line count) with "quantity" (units sold)
     → Fix: Add glossary of common KPI terms with precise definitions

  2. MISSING BUSINESS CONTEXT (AOV)
     → B2B vs B2C have different "normal" ranges
     → Fix: Include business type in validation context

  3. COLUMN SEMANTICS (Discount Rate)
     → Discount column stores percentage (0.05) not dollars ($0.05)
     → Fix: Data profiling should detect percentage columns (values 0-1)

  4. GENERAL: Need "sanity bounds" per KPI type
     → Items per order: typically 1-10
     → Discount rate: typically 0-50%
     → AOV varies by business type
`);

  await adapter.disconnect();
  console.log("\n✓ Diagnosis complete\n");
}

main().catch(console.error);
