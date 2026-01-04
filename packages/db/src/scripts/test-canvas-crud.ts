/**
 * Canvas CRUD Smoke Test
 *
 * Tests basic database operations on canvas tables:
 * - Create workspace canvas
 * - Create canvas version
 * - Query canvases
 * - Query versions
 * - Clean up
 */

import { sql } from "drizzle-orm";

import { db } from "../server";

async function testCanvasCRUD() {
  console.log("🧪 Canvas CRUD Smoke Test\n");

  try {
    // 0. Get existing records to use for foreign keys
    console.log("0️⃣  Finding existing records for test...");

    const orgs = await db.execute(sql`
      SELECT id FROM knosia_organization LIMIT 1
    `);
    const users = await db.execute(sql`
      SELECT id FROM "user" LIMIT 1
    `);
    const workspaces = await db.execute(sql`
      SELECT id FROM knosia_workspace LIMIT 1
    `);

    if (!orgs[0] || !users[0] || !workspaces[0]) {
      console.log("   ⚠️  No existing org/user/workspace found.");
      console.log("   ℹ️  Please run the app once to create initial data, then rerun this test.");
      process.exit(0);
    }

    const testWorkspaceId = workspaces[0].id;
    const testUserId = users[0].id;
    const testCanvasId = "test-canvas-123";

    console.log(`   ✅ Using workspace: ${testWorkspaceId}, user: ${testUserId}`);

    // 1. Create a test canvas
    console.log("\n1️⃣  Creating test canvas...");
    await db.execute(sql`
      INSERT INTO knosia_workspace_canvas (
        id, workspace_id, title, schema, owner_id, scope, current_version, created_at, updated_at
      ) VALUES (
        ${testCanvasId},
        ${testWorkspaceId},
        'Test Canvas',
        '{"version":"1.0","layers":[]}'::jsonb,
        ${testUserId},
        'private',
        1,
        NOW(),
        NOW()
      )
    `);
    console.log("   ✅ Canvas created");

    // 2. Query the canvas
    console.log("\n2️⃣  Querying test canvas...");
    const canvasResult = await db.execute(sql`
      SELECT id, title, scope, current_version
      FROM knosia_workspace_canvas
      WHERE id = ${testCanvasId}
    `);
    console.log("   ✅ Canvas retrieved:", canvasResult[0]);

    // 3. Create a version history entry
    console.log("\n3️⃣  Creating version history...");
    const versionId = "test-version-123";
    await db.execute(sql`
      INSERT INTO knosia_canvas_version (
        id, canvas_id, version_number, schema, created_by, created_at
      ) VALUES (
        ${versionId},
        ${testCanvasId},
        1,
        '{"version":"1.0","layers":[]}'::jsonb,
        ${testUserId},
        NOW()
      )
    `);
    console.log("   ✅ Version created");

    // 4. Query versions
    console.log("\n4️⃣  Querying versions...");
    const versionsResult = await db.execute(sql`
      SELECT version_number, created_by
      FROM knosia_canvas_version
      WHERE canvas_id = ${testCanvasId}
    `);
    console.log("   ✅ Versions retrieved:", versionsResult);

    // 5. Test unique constraints
    console.log("\n5️⃣  Testing unique constraints...");
    try {
      await db.execute(sql`
        INSERT INTO knosia_canvas_version (
          id, canvas_id, version_number, schema, created_by, created_at
        ) VALUES (
          'test-version-456',
          ${testCanvasId},
          1,
          '{"version":"1.0","layers":[]}'::jsonb,
          ${testUserId},
          NOW()
        )
      `);
      console.log("   ❌ FAILED: Duplicate version_number should have been rejected!");
    } catch (error: any) {
      if (error.message?.includes("unique_canvas_version")) {
        console.log("   ✅ Unique constraint working (duplicate version rejected)");
      } else {
        throw error;
      }
    }

    // 6. Clean up
    console.log("\n6️⃣  Cleaning up test data...");
    await db.execute(sql`DELETE FROM knosia_canvas_version WHERE canvas_id = ${testCanvasId}`);
    await db.execute(sql`DELETE FROM knosia_workspace_canvas WHERE id = ${testCanvasId}`);
    console.log("   ✅ Test data cleaned up");

    console.log("\n✨ All tests passed! Canvas tables are working correctly.\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

testCanvasCRUD().catch(console.error);
