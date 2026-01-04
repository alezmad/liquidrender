import { sql } from "drizzle-orm";

import { db } from "../server";

async function checkCanvasEnums() {
  try {
    // Check what enums exist
    const enums = await db.execute(sql`
      SELECT n.nspname as schema, t.typname as enum_name
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname LIKE '%canvas%'
      ORDER BY enum_name
    `);

    console.log("\nCanvas-related enums:");
    console.log(enums);
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkCanvasEnums().catch(console.error);
