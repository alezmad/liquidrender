import { knosiaWorkspaceCanvas, knosiaWorkspace } from "../schema";
import { db } from "../server";

async function checkCanvas() {
  console.log("Checking for canvases in database...\n");

  // Get all workspaces
  const workspaces = await db.select().from(knosiaWorkspace);
  console.log(`Found ${workspaces.length} workspaces:`);
  workspaces.forEach(ws => {
    console.log(`  - ${ws.name} (${ws.id})`);
  });

  // Get all canvases
  const canvases = await db.select().from(knosiaWorkspaceCanvas);
  console.log(`\nFound ${canvases.length} canvases:`);
  canvases.forEach(canvas => {
    console.log(`  - ${canvas.title} (workspace: ${canvas.workspaceId}, default: ${canvas.isDefault})`);
    console.log(`    Schema version: ${(canvas.schema as any)?.version || 'N/A'}`);
    console.log(`    Layers: ${(canvas.schema as any)?.layers?.length || 0}`);
  });

  process.exit(0);
}

checkCanvas().catch(console.error);
