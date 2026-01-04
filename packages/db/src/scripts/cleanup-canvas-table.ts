import { sql } from "drizzle-orm";

import { db } from "../server";

async function cleanupCanvasTable() {
  try {
    console.log("Dropping knosia_workspace_canvas table and dependencies...");

    // Drop table (CASCADE will drop dependent constraints, indexes, etc.)
    await db.execute(sql`DROP TABLE IF EXISTS knosia_workspace_canvas CASCADE`);
    console.log("✓ Dropped table");

    // Drop old enum type
    await db.execute(sql`DROP TYPE IF EXISTS knosia_canvas_source_type CASCADE`);
    console.log("✓ Dropped enum knosia_canvas_source_type");

    // Drop any other canvas-related enums that shouldn't exist
    await db.execute(sql`DROP TYPE IF EXISTS knosia_canvas_block_type CASCADE`);
    console.log("✓ Dropped enum knosia_canvas_block_type (if existed)");

    await db.execute(sql`DROP TYPE IF EXISTS knosia_canvas_status CASCADE`);
    console.log("✓ Dropped enum knosia_canvas_status (if existed)");

    console.log("\nCleanup complete! Now run migration to recreate with correct schema.");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  process.exit(0);
}

cleanupCanvasTable().catch(console.error);
