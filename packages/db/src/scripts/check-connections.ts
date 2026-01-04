import { desc } from "drizzle-orm";

import { knosiaConnection } from "../schema";
import { db } from "../server";

async function checkConnections() {
  console.log("Checking database connections...\n");

  const connections = await db
    .select()
    .from(knosiaConnection)
    .orderBy(desc(knosiaConnection.createdAt))
    .limit(10);

  console.log(`Found ${connections.length} connections:\n`);
  connections.forEach((conn, i) => {
    console.log(`${i + 1}. ${conn.name} (${conn.type})`);
    console.log(`   Database: ${conn.host}:${conn.port}/${conn.database}`);
    console.log(`   Schema: ${conn.schema}`);
    console.log(`   Status: ${conn.status}`);
    console.log(`   Created: ${conn.createdAt}`);
    console.log(`   ID: ${conn.id}\n`);
  });

  process.exit(0);
}

checkConnections().catch(console.error);
