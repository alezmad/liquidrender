---
description: 'Resume an interrupted workflow from last checkpoint'
---

# Workflow Resume

Continue an interrupted workflow.

## Arguments
- $ARGUMENTS: Optional workflow ID (e.g., "WF-0041")

## Instructions

1. Find workflow to resume:
   - If $ARGUMENTS provided, use that ID
   - Otherwise, find most recent in `.workflows/active/`

2. **Verify Context Integrity** (CRITICAL):
   ```bash
   python .context/workflows/scripts/verify-context.py .workflows/active/WF-[ID]-[name]
   ```

   This checks if context files have changed since workflow started.

   **If drift detected**, present options:
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  CONTEXT DRIFT DETECTED                                       ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  [CHANGED]  specs/LIQUID-RENDER-SPEC.md (modified 2h ago)     ║
   ║  [SAME]     docs/COMPONENT-GUIDE.md              ✓            ║
   ║                                                               ║
   ║  Options:                                                     ║
   ║  [R] RESUME  - Use original context (ignore changes)          ║
   ║  [U] UPDATE  - Re-read changed files into context             ║
   ║  [S] RESTART - Reset to Wave 0 with fresh context             ║
   ║  [X] ABORT   - Cancel resume                                  ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

   - **RESUME**: Continue with stale context (fast, but may miss spec changes)
   - **UPDATE**: Re-gather context, update CONTEXT-LIBRARY.yaml
   - **RESTART**: Full reset, re-run from Wave 0

3. Read STATUS.yaml to determine task state

4. Identify resume point:
   - Current wave number
   - Pending/failed tasks in wave
   - Last successful checkpoint

4. Present resume plan with timing context:
   ```
   ## Resuming: WF-[ID] - [NAME]

   ### Timing Context

   **Originally Started**: [timestamp from timing.started]
   **Interrupted After**: [elapsed before pause]
   **Resumed At**: [current time]

   Completed before interruption:
   | Agent | Duration | Status |
   |-------|----------|--------|
   | T1 | 33s | ✅ |
   | T2 | 1m 46s | ✅ |

   Remaining:
   | Agent | Est. Time |
   |-------|-----------|
   | T3 | 30s-1min |
   | T4 | 30s-1min |

   Last checkpoint: Wave [N] passed
   Resume from: Wave [M], Task [T]

   Pending tasks:
   - T4: [name] (never started)
   - T5: [name] (failed, attempt 2)

   **Continue?** Reply "yes" or describe changes.
   ```

5. **ASK USER BEFORE RESUMING**:
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  RESUME: WF-[ID] from Wave [N]                                ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  Context: [verified/updated/stale]                            ║
   ║  Pending tasks: [list]                                        ║
   ║                                                               ║
   ║  Will launch [X] PARALLEL SUBTASKS for remaining work.        ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝

   **Resume now?** [Y/n]
   ```

6. On approval:
   - Skip completed waves
   - Re-launch failed tasks (up to max 3 attempts)
   - **Launch pending tasks as PARALLEL SUBTASKS** (if no conflicts):
     ```
     # In a SINGLE message:
     [Task: T4, run_in_background=true]
     [Task: T5, run_in_background=true]

     # Then wait:
     [TaskOutput: T4, block=true]
     [TaskOutput: T5, block=true]
     ```
   - Update STATUS.yaml with agent assignments

7. After each wave:
   ```bash
   .context/workflows/scripts/validate-wave.sh @repo/liquid-render
   ```

## Timing Tracking

Resumed workflows track timing differently:

1. **Original start time** is preserved from `timing.started`
2. **Resume time** is recorded in new field `timing.resumed_at`
3. **Interruption duration** is excluded from total elapsed time

Update STATUS.yaml with interruption tracking:

```yaml
timing:
  started: "2025-12-25T20:45:00Z"
  resumed_at: "2025-12-25T21:00:00Z"
  interruptions:
    - paused_at: "2025-12-25T20:47:15Z"
      resumed_at: "2025-12-25T21:00:00Z"
      gap: "12m 45s"
```

For multiple interruptions, append to the `interruptions` array. When calculating total elapsed time, subtract all gap durations.
