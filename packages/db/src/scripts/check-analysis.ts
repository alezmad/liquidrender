import { desc } from "drizzle-orm";

import { knosiaAnalysis } from "../schema";
import { db } from "../server";

async function checkAnalysis() {
  console.log("Checking recent analysis...\n");

  // Get most recent analysis
  const analyses = await db
    .select()
    .from(knosiaAnalysis)
    .orderBy(desc(knosiaAnalysis.createdAt))
    .limit(1);

  if (analyses.length === 0) {
    console.log("No analyses found");
    process.exit(0);
  }

  const analysis = analyses[0];
  console.log("Most recent analysis:");
  console.log(`  ID: ${analysis.id}`);
  console.log(`  Status: ${analysis.status}`);
  console.log(`  Created: ${analysis.createdAt}`);
  console.log(`  Result:`, JSON.stringify(analysis.result, null, 2));

  process.exit(0);
}

checkAnalysis().catch(console.error);
