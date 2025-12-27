---
description: 'Finalize a completed workflow'
---

# Workflow Complete

Finalize a workflow and move to completed.

## Arguments
- $ARGUMENTS: Optional workflow ID

## Instructions

1. Find workflow:
   - Use $ARGUMENTS if provided
   - Otherwise, find in `.workflows/active/`

2. Run final validation:
   ```bash
   .context/workflows/scripts/validate-wave.sh @repo/liquid-render
   python .context/workflows/scripts/check-exports.py \
     src/renderer/components/index.ts \
     src/renderer/components/
   ```

3. Collect and aggregate docs:
   ```bash
   python .context/workflows/scripts/collect-docs.py \
     .workflows/active/WF-[ID]-[name] \
     "packages/liquid-render/src/**/*.component.md"

   python .context/workflows/scripts/aggregate-module.py \
     .workflows/active/WF-[ID]-[name]/docs/components \
     .workflows/active/WF-[ID]-[name]/docs/MODULE.md
   ```

4. Generate CHANGELOG.md:
   ```markdown
   # Changelog: WF-[ID] - [NAME]

   ## Files Created
   - [list each created file]

   ## Files Modified
   - [list each modified file]

   ## Dependencies Added
   - [list if any]

   ## Test Results
   - [N] tests passing
   ```

5. Generate SUMMARY.md:
   ```markdown
   # Summary: WF-[ID] - [NAME]

   ## Metrics
   - Tasks: [N] total, [N] completed
   - Duration: [time]
   - Waves: [M]

   ## Components Delivered
   [table of components]
   ```

6. Generate Timing Report from STATUS.yaml:

   Read `timing` section from STATUS.yaml and calculate:

   ```markdown
   ### Timing Report

   **Started**: [human readable date/time from timing.workflow.started_at]
   **Completed**: [current time]
   **Duration**: [calculate human readable duration]

   | Wave | Duration | Bottleneck |
   |------|----------|------------|
   | 1 | Xm Ys | [slowest agent in wave] |
   | 2 | Xm Ys | [slowest agent in wave] |

   | Agent | Est. | Actual | Status |
   |-------|------|--------|--------|
   | T1 | 30s-1min | 33s | ✅ |
   | T2 | 30s-1min | 1m 46s | ⚠️ slow |
   ```

   Calculate wave durations by finding max(agent.duration) per wave.
   Mark agents as:
   - ✅ if actual <= estimated max
   - ⚠️ slow if actual > estimated max by <50%
   - ❌ over if actual > estimated max by >=50%

7. Show timing report to user and confirm before proceeding.

8. Move to completed:
   ```bash
   mv .workflows/active/WF-[ID]-[name] .workflows/completed/
   ```

9. Update STATUS.yaml:
   ```yaml
   overall_status: complete
   completed_at: [ISO timestamp]
   ```

10. **Update Central Registry and Metrics**:
    ```bash
    python .context/workflows/scripts/update-registry.py complete WF-[ID]
    ```
    This automatically:
    - Marks workflow as completed in registry.yaml
    - Updates location to "completed"
    - Calculates duration
    - Adds entry to metrics.yaml history

11. Verify registry update:
    ```bash
    python .context/workflows/scripts/sync-registry.py
    ```

12. Present completion report to user:
    ```
    ╔═══════════════════════════════════════════════════════════════╗
    ║  WORKFLOW COMPLETE: WF-[ID]                                   ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║                                                               ║
    ║  Name: [NAME]                                                 ║
    ║  Duration: [Xh Ym]                                            ║
    ║  Tasks: [N]/[N] completed                                     ║
    ║  Waves: [M]                                                   ║
    ║                                                               ║
    ║  Location: .workflows/completed/WF-[ID]-[name]/               ║
    ║  Registry: Updated ✓                                          ║
    ║  Metrics: Added to history ✓                                  ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    ```
