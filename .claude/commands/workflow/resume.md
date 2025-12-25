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

2. Read STATUS.yaml to determine state

3. Identify resume point:
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

5. On approval:
   - Skip completed waves
   - Re-launch failed tasks (up to max 3 attempts)
   - Launch pending tasks in parallel
   - Update STATUS.yaml with agent assignments

6. After each wave:
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
