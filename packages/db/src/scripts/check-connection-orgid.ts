#!/usr/bin/env tsx
/**
 * Check if connections have orgId set
 */

import { knosiaConnection } from "../schema";
import { db } from "../server";

async function checkConnectionOrgId() {
  console.log("\n=== Checking Connection orgId ===\n");

  const connections = await db
    .select()
    .from(knosiaConnection)
    .orderBy(knosiaConnection.createdAt);

  console.log(`Total connections: ${connections.length}\n`);

  for (const conn of connections) {
    console.log(`Connection: ${conn.id}`);
    console.log(`  Name: ${conn.name}`);
    console.log(`  Type: ${conn.type}`);
    console.log(`  OrgId: ${conn.orgId ?? "❌ NULL"}`);
    console.log(`  Created: ${conn.createdAt}`);
    console.log();
  }

  const withoutOrgId = connections.filter((c) => !c.orgId);
  if (withoutOrgId.length > 0) {
    console.log(`\n⚠️  ${withoutOrgId.length} connection(s) missing orgId:\n`);
    withoutOrgId.forEach((c) => {
      console.log(`  - ${c.id} (${c.name})`);
    });
  } else {
    console.log("\n✅ All connections have orgId\n");
  }

  process.exit(0);
}

checkConnectionOrgId().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
