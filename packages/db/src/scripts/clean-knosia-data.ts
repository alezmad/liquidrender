import { sql } from "drizzle-orm";

import { db } from "../server";

async function cleanKnosiaData() {
  console.log("\n=== Cleaning Knosia Data ===\n");

  try {
    // Delete in correct order to respect foreign key constraints
    console.log("Deleting thread messages...");
    await db.execute(sql`DELETE FROM knosia_thread_message`);

    console.log("Deleting threads...");
    await db.execute(sql`DELETE FROM knosia_thread`);

    console.log("Deleting analyses...");
    await db.execute(sql`DELETE FROM knosia_analysis`);

    console.log("Deleting canvas versions...");
    await db.execute(sql`DELETE FROM knosia_canvas_version`);

    console.log("Deleting workspace canvases...");
    await db.execute(sql`DELETE FROM knosia_workspace_canvas`);

    console.log("Deleting vocabulary versions...");
    await db.execute(sql`DELETE FROM knosia_vocabulary_version`);

    console.log("Deleting vocabulary items...");
    await db.execute(sql`DELETE FROM knosia_vocabulary_item`);

    console.log("Deleting workspace connections...");
    await db.execute(sql`DELETE FROM knosia_workspace_connection`);

    console.log("Deleting connection schemas...");
    await db.execute(sql`DELETE FROM knosia_connection_schema`);

    console.log("Deleting connection health...");
    await db.execute(sql`DELETE FROM knosia_connection_health`);

    console.log("Deleting connections...");
    await db.execute(sql`DELETE FROM knosia_connection`);

    console.log("Deleting workspaces...");
    await db.execute(sql`DELETE FROM knosia_workspace`);

    console.log("Deleting organizations...");
    await db.execute(sql`DELETE FROM knosia_organization`);

    console.log("\n✅ All Knosia data cleaned successfully!\n");
    console.log("You can now test onboarding from a fresh state.\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error cleaning data:", error);
    process.exit(1);
  }
}

cleanKnosiaData().catch(console.error);
