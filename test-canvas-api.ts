/**
 * Automated Canvas Creation Test
 * Tests the complete onboarding flow via API
 */

import { execSync } from "node:child_process";

const BASE_URL = "http://localhost:3000";
const DB_URL = "postgresql://turbostarter:turbostarter@localhost:5440/core";

interface ConnectionResponse {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  type: string;
  host: string;
  port: number | null;
  database: string;
  schema: string | null;
  sslEnabled: boolean | null;
  createdAt: string;
  updatedAt: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeSQL(query: string): Promise<string> {
  const cmd = `PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -t -c "${query}"`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

async function testConnectionCreation() {
  console.log("\n🔌 Testing Connection Creation API...");

  // Get organization ID
  const orgId = await executeSQL("SELECT id FROM organization LIMIT 1;");
  if (!orgId) {
    throw new Error("No organization found in database");
  }
  console.log(`✅ Using organization: ${orgId.trim()}`);

  // Test connection first
  console.log("\n🧪 Testing database connection...");
  const testResponse = await fetch(`${BASE_URL}/api/knosia/connections/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type: "postgres",
      host: "localhost",
      port: 5440,
      database: "core",
      username: "turbostarter",
      password: "turbostarter",
      schema: "public",
    }),
  });

  if (!testResponse.ok) {
    const error = await testResponse.text();
    throw new Error(`Test connection failed: ${error}`);
  }

  const testResult = await testResponse.json();
  console.log(`✅ Connection test passed: ${testResult.message}`);

  // Create connection
  console.log("\n📝 Creating connection...");
  const createResponse = await fetch(`${BASE_URL}/api/knosia/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type: "postgres",
      host: "localhost",
      port: 5440,
      database: "core",
      username: "turbostarter",
      password: "turbostarter",
      schema: "public",
      name: "Test Connection",
      orgId: orgId.trim(),
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Create connection failed: ${error}`);
  }

  const connection: ConnectionResponse = await createResponse.json();
  console.log(`✅ Connection created: ${connection.id}`);
  console.log(`✅ Workspace ID: ${connection.workspaceId}`);

  return connection;
}

async function testAnalysisRun(connectionId: string, workspaceId: string) {
  console.log("\n🔬 Starting analysis...");

  const url = `${BASE_URL}/api/knosia/analysis/run?connectionId=${connectionId}&workspaceId=${workspaceId}&includeDataProfiling=false`;

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(url, { withCredentials: true } as any);
    let lastEvent: any = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        lastEvent = data;

        if (data.type === "progress") {
          console.log(`  📊 ${data.step.name} (${data.currentStep}/${data.totalSteps})`);
        } else if (data.type === "complete") {
          console.log(`\n✅ Analysis completed!`);
          console.log(`   Analysis ID: ${data.analysisId}`);
          console.log(`   Business Type: ${data.result?.businessType?.detected || "N/A"}`);
          console.log(`   Tables: ${data.result?.schema?.tables?.length || 0}`);
          console.log(`   Metrics: ${data.result?.vocabulary?.metrics?.length || 0}`);
          console.log(`   Dimensions: ${data.result?.vocabulary?.dimensions?.length || 0}`);
          eventSource.close();
          resolve(data);
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      reject(new Error("Analysis failed"));
    };

    // Timeout after 5 minutes
    setTimeout(() => {
      eventSource.close();
      reject(new Error("Analysis timed out after 5 minutes"));
    }, 300000);
  });
}

async function verifyCanvasCreation() {
  console.log("\n🎨 Verifying canvas creation...");

  // Check analysis record
  const analysisQuery = `
    SELECT
      id,
      workspace_id,
      status,
      created_at
    FROM knosia_analysis
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const analysisResult = await executeSQL(analysisQuery);
  console.log("\n📊 Analysis Record:");
  console.log(analysisResult);

  // Check if workspace_id is present
  const workspaceCheck = await executeSQL(`
    SELECT
      CASE WHEN workspace_id IS NULL THEN 'NULL' ELSE workspace_id END as wid
    FROM knosia_analysis
    ORDER BY created_at DESC
    LIMIT 1;
  `);

  if (workspaceCheck.trim() === "NULL") {
    console.log("❌ FAILED: Analysis workspace_id is NULL");
    return false;
  }
  console.log(`✅ Analysis has workspace_id: ${workspaceCheck.trim()}`);

  // Check canvas
  const canvasCount = await executeSQL("SELECT COUNT(*) FROM knosia_workspace_canvas;");

  if (parseInt(canvasCount.trim()) === 0) {
    console.log("\n❌ FAILED: No canvas created");

    // Debug info
    console.log("\n🔍 Debugging info:");
    const debugInfo = await executeSQL(`
      SELECT
        status,
        CASE WHEN workspace_id IS NULL THEN '❌ NULL' ELSE '✅ Present' END as workspace_id_check
      FROM knosia_analysis
      ORDER BY created_at DESC
      LIMIT 1;
    `);
    console.log(debugInfo);

    return false;
  }

  // Get canvas details
  const canvasQuery = `
    SELECT
      id,
      name,
      workspace_id,
      status,
      created_at
    FROM knosia_workspace_canvas
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const canvasResult = await executeSQL(canvasQuery);
  console.log("\n🎨 Canvas Record:");
  console.log(canvasResult);
  console.log("\n✅ SUCCESS: Canvas was created!");

  return true;
}

async function main() {
  console.log("===================================");
  console.log("Canvas Creation Automated Test");
  console.log("===================================");

  try {
    // Step 1: Create connection
    const connection = await testConnectionCreation();

    // Step 2: Run analysis
    await testAnalysisRun(connection.id, connection.workspaceId);

    // Step 3: Verify canvas
    const success = await verifyCanvasCreation();

    console.log("\n===================================");
    if (success) {
      console.log("✅ ALL TESTS PASSED!");
      console.log("===================================");
      process.exit(0);
    } else {
      console.log("❌ TESTS FAILED");
      console.log("===================================");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
