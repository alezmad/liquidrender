/**
 * Check existing organizations and connections
 */

import { db } from "@turbostarter/db/server";
import { knosiaOrganization, knosiaConnection } from "@turbostarter/db/schema";

async function main() {
  console.log("=== Checking Existing Data ===\n");

  const orgs = await db.select().from(knosiaOrganization).limit(5);
  console.log(`Organizations (${orgs.length}):`);
  orgs.forEach((o) => console.log(`  - ${o.name} (${o.id})`));

  const conns = await db.select().from(knosiaConnection).limit(10);
  console.log(`\nConnections (${conns.length}):`);
  conns.forEach((c) => console.log(`  - ${c.name} (${c.id}) org=${c.orgId}`));

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
