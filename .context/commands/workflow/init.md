---
description: 'Initialize the workflow system in this project'
---

# Workflow Init

Set up the workflow directory structure.

## Instructions

1. Create directories:
   ```bash
   mkdir -p .workflows/{queue,active,completed,failed,templates}
   ```

2. Create registry.yaml:
   ```yaml
   # .workflows/registry.yaml
   next_id: 1

   workflows: {}

   stats:
     total_workflows: 0
     completed: 0
     failed: 0
     active: 0
     queued: 0
   ```

3. Create metrics.yaml:
   ```yaml
   # .workflows/metrics.yaml
   # Workflow timing estimates and historical data

   estimates:
     # Complexity to time mapping (human readable)
     S: "30s-1min"
     M: "1-3min"
     L: "3-10min"

     # Complexity to seconds (for calculations)
     S_seconds: { min: 30, max: 60, avg: 45 }
     M_seconds: { min: 60, max: 180, avg: 120 }
     L_seconds: { min: 180, max: 600, avg: 300 }

   history: []
   # History entries will be added by /workflow:complete
   # Format:
   #   - workflow_id: WF-XXX
   #     name: "Workflow Name"
   #     started_at: "2025-12-25T20:45:12Z"
   #     completed_at: "2025-12-25T20:48:47Z"
   #     duration: "3m 35s"
   #     duration_s: 215
   #     tasks: [{ id: T1, duration: "33s", duration_s: 33 }, ...]
   #     estimated: "3-4 min"
   #     accuracy: "92%"
   ```

4. Create schemas directory:
   ```bash
   mkdir -p .context/workflows/schemas
   ```

5. Verify scripts exist:
   ```bash
   ls .context/workflows/scripts/
   ```

   Required scripts:

   **Validation:**
   - validate-wave.sh
   - validate-typescript.sh
   - run-tests.sh

   **Code Generation:**
   - check-exports.py
   - generate-barrel.py

   **Workflow Management:**
   - init-workflow.py

   **Documentation:**
   - validate-frontmatter.py
   - collect-docs.py
   - aggregate-module.py
   - aggregate-overview.py

   **Context Management (NEW):**
   - preflight-check.py     ← Git state + commit suggestion
   - gather-context.py      ← Build CONTEXT-LIBRARY.yaml
   - verify-context.py      ← Check integrity for resume
   - estimate-tokens.py     ← Token counting utility

   **Schema:**
   - `.context/workflows/schemas/CONTEXT-LIBRARY.schema.yaml`

6. Install Python dependency:
   ```bash
   pip install pyyaml --quiet
   ```

7. Make shell scripts executable:
   ```bash
   chmod +x .context/workflows/scripts/*.sh
   ```

8. Confirm setup:
   ```
   ## Workflow System Initialized

   Structure created:
   .workflows/
   ├── registry.yaml
   ├── metrics.yaml
   ├── queue/
   ├── active/
   ├── completed/
   ├── failed/
   └── templates/

   Scripts verified: 10/10
   ```

9. Show available commands:
   ```
   ## Available Commands

   | Command | Purpose |
   |---------|---------|
   | `/workflow:init` | Initialize the workflow system |
   | `/workflow:create [task]` | Create a new workflow proposal |
   | `/workflow:status` | Check current workflow progress |
   | `/workflow:resume [ID]` | Resume an interrupted workflow |
   | `/workflow:launch [ID]` | Launch workflow in fresh session |
   | `/workflow:complete [ID]` | Finalize and archive a workflow |
   | `/workflow:rollback [ID]` | Revert a failed workflow |
   | `/workflow:list` | List all workflows by status |
   | `/workflow:validate [type]` | Run validation (wave/full/exports/docs) |
   ```
