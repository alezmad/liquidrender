import { sql } from "drizzle-orm";

import { db } from "../server";

async function checkOrgSchema() {
  const columns = await db.execute(sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'knosia_organization'
    ORDER BY ordinal_position
  `);

  console.log("knosia_organization columns:");
  console.log(columns);

  process.exit(0);
}

checkOrgSchema().catch(console.error);
