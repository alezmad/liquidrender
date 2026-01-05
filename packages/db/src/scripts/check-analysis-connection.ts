import { desc, eq } from "drizzle-orm";

import { knosiaAnalysis, knosiaConnection } from "../schema";
import { db } from "../server";

async function checkAnalysisConnection() {
  console.log("Checking analysis and connection mapping...\n");

  const analyses = await db
    .select()
    .from(knosiaAnalysis)
    .orderBy(desc(knosiaAnalysis.createdAt))
    .limit(5);

  for (const analysis of analyses) {
    const connection = await db
      .select()
      .from(knosiaConnection)
      .where(eq(knosiaConnection.id, analysis.connectionId))
      .limit(1);

    console.log(`Analysis ${analysis.id.substring(0, 8)}...`);
    console.log(`  Status: ${analysis.status}`);
    console.log(`  Created: ${analysis.createdAt}`);
    console.log(`  Connection: ${connection[0]?.name || 'NOT FOUND'} (${connection[0]?.database || 'N/A'})`);
    console.log(`  Summary saved: ${analysis.summary !== null && analysis.summary !== undefined}`);
    console.log();
  }

  process.exit(0);
}

checkAnalysisConnection().catch(console.error);
