/**
 * Analysis Canvas Creation End-to-End Test
 *
 * Validates that the SSE analysis flow creates a default canvas:
 * 1. Mock database connection
 * 2. Run SSE analysis (runAnalysis generator)
 * 3. Verify workspace canvas is created
 * 4. Verify canvas has valid LiquidSchema
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runAnalysis } from "../analysis/queries";
import { db } from "@turbostarter/db/server";
import {
  knosiaConnection,
  knosiaWorkspace,
  knosiaOrganization,
  knosiaWorkspaceCanvas,
  user,
} from "@turbostarter/db/schema";
import { generateId } from "@turbostarter/shared/utils";
import { eq, and } from "drizzle-orm";

describe("Analysis Canvas Creation E2E", () => {
  let testOrgId: string;
  let testConnectionId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test data
    testOrgId = generateId();
    testConnectionId = generateId();
    testUserId = generateId();

    // Insert test user
    await db.insert(user).values({
      id: testUserId,
      name: "Test Canvas User",
      email: "test-canvas@example.com",
      emailVerified: true,
    });

    // Insert test org
    await db.insert(knosiaOrganization).values({
      id: testOrgId,
      name: "Test Canvas Org",
    });

    // Insert test connection (using Pagila database - has good e-commerce patterns)
    await db.insert(knosiaConnection).values({
      id: testConnectionId,
      orgId: testOrgId,
      name: "Pagila Test",
      type: "postgres",
      host: "localhost",
      port: 5433,
      database: "pagila",
      schema: "public",
      credentials: JSON.stringify({
        username: "postgres",
        password: "postgres",
      }),
      status: "connected",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(knosiaConnection).where(eq(knosiaConnection.id, testConnectionId));
    await db.delete(knosiaOrganization).where(eq(knosiaOrganization.id, testOrgId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it("should create default workspace canvas during analysis", { timeout: 60000 }, async () => {
    console.log("\n🧪 Testing canvas creation during SSE analysis...\n");

    // Run analysis (consume SSE events)
    const events: any[] = [];
    let workspaceId: string | null = null;

    for await (const event of runAnalysis(testConnectionId, testUserId, false)) {
      console.log(`📡 SSE Event: ${event.event}`);
      events.push(event);

      // Track workspaceId from complete event
      if (event.event === "complete") {
        // Get workspace from database
        const workspaces = await db
          .select()
          .from(knosiaWorkspace)
          .where(eq(knosiaWorkspace.orgId, testOrgId))
          .limit(1);

        if (workspaces.length > 0) {
          workspaceId = workspaces[0].id;
        }
      }

      // Stop on error
      if (event.event === "error") {
        console.error("❌ Analysis error:", event.data);
        break;
      }
    }

    // Verify we got a completion event
    const completeEvent = events.find((e) => e.event === "complete");
    expect(completeEvent, "Should receive complete event").toBeDefined();

    console.log("\n✅ Analysis completed successfully");

    // Verify workspace was created
    expect(workspaceId, "Workspace should be created").toBeTruthy();
    console.log(`✅ Workspace created: ${workspaceId}`);

    // Verify default canvas was created
    const canvases = await db
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(
        and(
          eq(knosiaWorkspaceCanvas.workspaceId, workspaceId!),
          eq(knosiaWorkspaceCanvas.isDefault, true)
        )
      );

    expect(canvases.length, "Should create default canvas").toBeGreaterThan(0);

    const canvas = canvases[0];
    console.log(`✅ Canvas created: ${canvas.title}`);

    // Verify canvas has valid schema
    expect(canvas.schema, "Canvas should have schema").toBeDefined();

    const schema = canvas.schema as any;
    expect(schema.version, "Schema should have version").toBeDefined();
    expect(schema.layers, "Schema should have layers").toBeDefined();
    expect(Array.isArray(schema.layers), "Layers should be an array").toBe(true);
    expect(schema.layers.length, "Should have at least one layer").toBeGreaterThan(0);

    console.log(`✅ Canvas has ${schema.layers.length} layer(s)`);

    // Verify canvas ownership
    expect(canvas.ownerId).toBe(testUserId);
    expect(canvas.scope).toBe("workspace");
    expect(canvas.currentVersion).toBe(1);

    console.log("\n🎉 Canvas creation test passed!\n");
  });

  it("should not create duplicate canvas on re-run", { timeout: 60000 }, async () => {
    console.log("\n🧪 Testing duplicate canvas prevention...\n");

    // Get workspace ID
    const workspaces = await db
      .select()
      .from(knosiaWorkspace)
      .where(eq(knosiaWorkspace.orgId, testOrgId))
      .limit(1);

    const workspaceId = workspaces[0]?.id;
    expect(workspaceId, "Workspace should exist from previous test").toBeTruthy();

    // Count canvases before re-run
    const canvasesBefore = await db
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(
        and(
          eq(knosiaWorkspaceCanvas.workspaceId, workspaceId!),
          eq(knosiaWorkspaceCanvas.isDefault, true)
        )
      );

    const countBefore = canvasesBefore.length;
    console.log(`📊 Canvases before re-run: ${countBefore}`);

    // Run analysis again
    for await (const event of runAnalysis(testConnectionId, testUserId, false)) {
      if (event.event === "complete" || event.event === "error") {
        break;
      }
    }

    // Count canvases after re-run
    const canvasesAfter = await db
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(
        and(
          eq(knosiaWorkspaceCanvas.workspaceId, workspaceId!),
          eq(knosiaWorkspaceCanvas.isDefault, true)
        )
      );

    const countAfter = canvasesAfter.length;
    console.log(`📊 Canvases after re-run: ${countAfter}`);

    expect(countAfter, "Should not create duplicate canvas").toBe(countBefore);

    console.log("\n✅ Duplicate prevention works!\n");
  });
});
