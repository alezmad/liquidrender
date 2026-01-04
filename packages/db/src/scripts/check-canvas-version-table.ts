import { sql } from "drizzle-orm";

import { db } from "../server";

async function checkCanvasVersionTable() {
  try {
    // Check if table exists and get its structure
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'knosia_canvas_version'
      ORDER BY ordinal_position
    `);

    console.log("\nColumns in knosia_canvas_version:");
    console.log(columns);

    // Check if there's any data
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM knosia_canvas_version
    `);
    console.log("\nRow count:", count);
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkCanvasVersionTable().catch(console.error);
