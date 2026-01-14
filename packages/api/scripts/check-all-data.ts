/**
 * Check all Knosia tables for schema data
 */

import { db } from "@turbostarter/db/server";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Checking All Knosia Tables ===\n");

  // Get all table names from knosia schema
  const tables = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'knosia'
    ORDER BY table_name
  `);

  console.log("Tables in knosia schema:");
  console.log("Raw tables result:", JSON.stringify(tables).slice(0, 500));

  const tableRows = Array.isArray(tables) ? tables : (tables as any).rows || [];
  for (const row of tableRows as { table_name: string }[]) {
    try {
      const countResult = await db.execute(
        sql.raw(`SELECT COUNT(*) as count FROM knosia."${row.table_name}"`)
      );
      const countRows = Array.isArray(countResult) ? countResult : (countResult as any).rows || [];
      const count = countRows[0]?.count || 0;
      console.log(`  ${row.table_name}: ${count} rows`);
    } catch (e) {
      console.log(`  ${row.table_name}: error counting`);
    }
  }

  // Check if extracted_schema or detected_vocabulary columns exist anywhere
  console.log("\n=== Checking for schema/vocabulary columns ===");
  const columns = await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'knosia'
    AND (column_name LIKE '%schema%' OR column_name LIKE '%vocabulary%')
    ORDER BY table_name, column_name
  `);

  const columnRows = Array.isArray(columns) ? columns : (columns as any).rows || [];
  for (const row of columnRows as { table_name: string; column_name: string }[]) {
    console.log(`  ${row.table_name}.${row.column_name}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
