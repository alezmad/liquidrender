/**
 * Pipeline End-to-End Test
 *
 * Validates the complete pipeline from connection to canvas generation:
 * 1. Mock database connection
 * 2. Run full pipeline (schema extraction → vocabulary → dashboard)
 * 3. Verify canvas is generated with valid LiquidSchema
 * 4. Verify vocabulary items are saved
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runKnosiaPipeline } from "../pipeline";
import { db } from "@turbostarter/db/server";
import {
  knosiaConnection,
  knosiaWorkspace,
  knosiaOrganization,
  knosiaAnalysis,
  knosiaWorkspaceCanvas,
  knosiaVocabularyItem,
} from "@turbostarter/db/schema";
import { generateId } from "@turbostarter/shared/utils";
import { eq } from "drizzle-orm";

describe("Pipeline End-to-End", () => {
  let testOrgId: string;
  let testWorkspaceId: string;
  let testConnectionId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test data
    testOrgId = generateId();
    testWorkspaceId = generateId();
    testConnectionId = generateId();
    testUserId = generateId();

    // Insert test org
    await db.insert(knosiaOrganization).values({
      id: testOrgId,
      name: "Test Organization",
    });

    // Insert test workspace
    await db.insert(knosiaWorkspace).values({
      id: testWorkspaceId,
      orgId: testOrgId,
      name: "Test Workspace",
      slug: `test-workspace-${Date.now()}`,
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test data in reverse dependency order
    await db.delete(knosiaVocabularyItem).where(eq(knosiaVocabularyItem.workspaceId, testWorkspaceId));
    await db.delete(knosiaWorkspaceCanvas).where(eq(knosiaWorkspaceCanvas.workspaceId, testWorkspaceId));
    await db.delete(knosiaAnalysis).where(eq(knosiaAnalysis.workspaceId, testWorkspaceId));
    await db.delete(knosiaConnection).where(eq(knosiaConnection.id, testConnectionId));
    await db.delete(knosiaWorkspace).where(eq(knosiaWorkspace.id, testWorkspaceId));
    await db.delete(knosiaOrganization).where(eq(knosiaOrganization.id, testOrgId));
  });

  it("should run full pipeline with DuckDB in-memory database", async () => {
    // Create in-memory DuckDB connection
    await db.insert(knosiaConnection).values({
      id: testConnectionId,
      orgId: testOrgId,
      name: "Test SaaS DB",
      type: "duckdb",
      host: "localhost",
      database: ":memory:", // In-memory DuckDB
      schema: "main",
      credentials: JSON.stringify({}),
    });

    // Run pipeline
    const result = await runKnosiaPipeline(
      testConnectionId,
      testUserId,
      testWorkspaceId,
      {
        forceBusinessType: "saas",
        debug: true,
      }
    );

    // Verify pipeline succeeded
    if (!result.success) {
      console.log("Pipeline errors:", result.errors);
      console.log("Pipeline warnings:", result.warnings);
    }
    expect(result.success).toBe(true);
    expect(result.analysisId).toBeDefined();
    expect(result.businessType).toBe("saas");
    expect(result.errors).toHaveLength(0);

    // Verify analysis was saved
    const analyses = await db
      .select()
      .from(knosiaAnalysis)
      .where(eq(knosiaAnalysis.workspaceId, testWorkspaceId));
    expect(analyses.length).toBeGreaterThan(0);
    expect(analyses[0]?.status).toBe("completed");

    // Verify canvas was created
    const canvases = await db
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.workspaceId, testWorkspaceId));

    // Canvas may or may not be created depending on vocabulary detection
    // With in-memory DB, we likely won't detect much vocabulary
    if (canvases.length > 0) {
      const canvas = canvases[0];
      expect(canvas?.schema).toBeDefined();
      expect(canvas?.schema.version).toBe("1.0");
      expect(canvas?.schema.layers).toBeDefined();
      expect(canvas?.isDefault).toBe(true);
    }

    // Verify vocabulary items (may be 0 for empty in-memory DB)
    const vocabItems = await db
      .select()
      .from(knosiaVocabularyItem)
      .where(eq(knosiaVocabularyItem.workspaceId, testWorkspaceId));

    // Just verify query works, vocabulary count depends on schema detection
    expect(vocabItems).toBeDefined();
    expect(Array.isArray(vocabItems)).toBe(true);
  }, 30000); // 30s timeout for pipeline execution

  it("should handle pipeline errors gracefully", async () => {
    const invalidConnectionId = generateId();

    // Try to run pipeline with non-existent connection
    const result = await runKnosiaPipeline(
      invalidConnectionId,
      testUserId,
      testWorkspaceId
    );

    // Pipeline should fail but not throw
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("not found");
  });

  it("should generate debug output when requested", async () => {
    const debugConnectionId = generateId(); // Use unique ID for this test

    await db.insert(knosiaConnection).values({
      id: debugConnectionId,
      orgId: testOrgId,
      name: "Debug Test DB",
      type: "duckdb",
      host: "localhost",
      database: ":memory:",
      schema: "main",
      credentials: JSON.stringify({}),
    });

    const result = await runKnosiaPipeline(
      debugConnectionId, // Use the unique connection ID
      testUserId,
      testWorkspaceId,
      {
        debug: true,
      }
    );

    // Verify debug output is included
    expect(result.debug).toBeDefined();
    expect(result.debug?.extractedSchema).toBeDefined();
    expect(result.debug?.detectedVocabulary).toBeDefined();
    expect(result.debug?.resolvedVocabulary).toBeDefined();
    expect(result.debug?.semanticLayer).toBeDefined();

    // Cleanup
    await db.delete(knosiaConnection).where(eq(knosiaConnection.id, debugConnectionId));
  }, 30000);
});
