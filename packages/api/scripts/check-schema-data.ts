/**
 * Check where schema data is stored
 */

import { db } from "@turbostarter/db/server";
import {
  knosiaConnection,
  knosiaConnectionSchema,
  knosiaAnalysis,
} from "@turbostarter/db/schema/knosia";
import { desc } from "drizzle-orm";

async function main() {
  console.log("=== Checking Schema Data Location ===\n");

  // Check connections
  const connections = await db.select().from(knosiaConnection);
  console.log(`Connections: ${connections.length}`);

  if (connections.length > 0) {
    console.log(`  First connection ID: ${connections[0].id}`);
    console.log(`  Database: ${connections[0].database}`);
  }

  // Check knosiaConnectionSchema table
  const schemas = await db.select().from(knosiaConnectionSchema);
  console.log(`\nknosiaConnectionSchema entries: ${schemas.length}`);

  // Check knosiaAnalysis table - schema might be stored here
  const analyses = await db
    .select()
    .from(knosiaAnalysis)
    .orderBy(desc(knosiaAnalysis.createdAt))
    .limit(3);

  console.log(`\nknosiaAnalysis entries (latest 3):`);
  for (const analysis of analyses) {
    console.log(`  ID: ${analysis.id}`);
    console.log(`    Status: ${analysis.status}`);
    console.log(`    Has extractedSchema: ${!!analysis.extractedSchema}`);
    console.log(`    Has detectedVocabulary: ${!!analysis.detectedVocabulary}`);
    if (analysis.extractedSchema) {
      const schema = analysis.extractedSchema as { tables?: unknown[] };
      console.log(`    Tables count: ${schema.tables?.length || 0}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
