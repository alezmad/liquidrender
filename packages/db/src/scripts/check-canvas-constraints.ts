import { sql } from "drizzle-orm";

import { db } from "../server";

async function checkCanvasConstraints() {
  try {
    // Check foreign key constraints for knosia_workspace_canvas
    const canvasFKs = await db.execute(sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'knosia_workspace_canvas'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    console.log("\nForeign Keys for knosia_workspace_canvas:");
    console.log(canvasFKs);

    // Check foreign key constraints for knosia_canvas_version
    const versionFKs = await db.execute(sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'knosia_canvas_version'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    console.log("\nForeign Keys for knosia_canvas_version:");
    console.log(versionFKs);

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('knosia_workspace_canvas', 'knosia_canvas_version')
      ORDER BY tablename, indexname
    `);

    console.log("\nIndexes:");
    console.log(indexes);
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkCanvasConstraints().catch(console.error);
