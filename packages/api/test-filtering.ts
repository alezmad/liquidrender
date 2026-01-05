/**
 * Test script to verify smart field filtering is working
 */

import { db } from "@turbostarter/db/server";
import { knosiaAnalysis, knosiaVocabularyItem } from "@turbostarter/db/schema";
import { desc } from "@turbostarter/db";

async function main() {
  console.log("Checking latest analysis and vocabulary filtering...\n");

  // Get latest analysis
  const analyses = await db
    .select()
    .from(knosiaAnalysis)
    .orderBy(desc(knosiaAnalysis.createdAt))
    .limit(1);

  if (analyses.length === 0) {
    console.log("No analyses found. Run onboarding first.");
    return;
  }

  const analysis = analyses[0]!;
  console.log("Latest Analysis:");
  console.log("  ID:", analysis.id);
  console.log("  Status:", analysis.status);
  console.log("  Created:", analysis.createdAt);
  console.log("  Business Type:", analysis.businessType);

  if (analysis.summary) {
    const summary = analysis.summary as any;
    console.log("\nDetected Vocabulary:");
    console.log("  Metrics:", summary.metrics);
    console.log("  Dimensions:", summary.dimensions);
    console.log("  Entities:", summary.entities);
  }

  // Check vocabulary items
  const vocabItems = await db.select().from(knosiaVocabularyItem);

  console.log("\nVocabulary Items:");
  console.log("  Total saved:", vocabItems.length);

  // Show enriched items (those with LLM descriptions)
  const enrichedItems = vocabItems.filter(
    (v) => v.definition && (v.definition as any).descriptionHuman
  );

  console.log("  LLM-enriched:", enrichedItems.length);
  console.log("  Filtering ratio:", `${Math.round((enrichedItems.length / vocabItems.length) * 100)}%`);

  // Show sample enriched items
  console.log("\nSample Enriched Items:");
  enrichedItems.slice(0, 5).forEach((item) => {
    const def = item.definition as any;
    console.log(`  - ${item.canonicalName} (${item.type})`);
    console.log(`    Category: ${item.category || "N/A"}`);
    console.log(`    Description: ${def.descriptionHuman?.slice(0, 60)}...`);
    if (def.caveats && def.caveats.length > 0) {
      console.log(`    Caveats: ${def.caveats[0]}`);
    }
  });

  // Show items that were NOT enriched (should be IDs, timestamps, etc.)
  const nonEnrichedItems = vocabItems.filter(
    (v) => !v.definition || !(v.definition as any).descriptionHuman
  );

  if (nonEnrichedItems.length > 0) {
    console.log("\nNon-Enriched Items (should be IDs, timestamps, etc.):");
    nonEnrichedItems.slice(0, 10).forEach((item) => {
      console.log(`  - ${item.canonicalName} (${item.type})`);
    });
  }

  console.log("\n✅ Filtering verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
