---
description: 'Check status of active workflow'
---

# Workflow Status

Show current workflow progress.

## Instructions

1. Check for active workflow:
   ```bash
   ls .workflows/active/
   ```

2. If found, read STATUS.yaml:
   ```bash
   cat .workflows/active/*/STATUS.yaml
   ```

3. Present summary:
   ```
   ## Workflow: [NAME] (WF-[ID])

   Status: [pending|in_progress|blocked|complete]
   Current Wave: [N] of [M]

   ### Wave Progress
   | Wave | Status | Tasks | Completed |
   |------|--------|-------|-----------|
   | 0    | complete | Bootstrap | 6/6 |
   | 1    | in_progress | T1,T2,T3 | 1/3 |

   ### Active Tasks
   - T2: [task name] - in_progress
   - T3: [task name] - pending

   ### Current Timing

   Show elapsed time and per-agent status:

   **Started**: [timestamp from STATUS.yaml started_at]
   **Elapsed**: [calculated from now - started_at] (running|complete)

   | Wave | Status | Duration |
   |------|--------|----------|
   | 1 | ✅ Complete | 2m 18s |
   | 2 | 🔄 Running | 45s... |

   | Agent | Status | Duration |
   |-------|--------|----------|
   | T1 | ✅ Done | 33s |
   | T2 | ✅ Done | 1m 46s |
   | T3 | 🔄 Running | 45s... |
   | T4 | ⏳ Pending | - |

   **Timing Notes:**
   - For running agents, show elapsed time with "..." to indicate ongoing
   - For completed agents, show final duration
   - Calculate elapsed from agent's started_at to completed_at (or now if running)
   - Pending agents show "-" for duration

   ### Errors (if any)
   - T1 attempt 2: [error message]
   ```

4. If no active workflow:
   ```
   No active workflow.

   Run `/workflow:create [task]` to create one.
   ```

5. Generate overview (ephemeral):
   ```bash
   python .context/workflows/scripts/aggregate-overview.py .workflows/active/WF-*
   ```
