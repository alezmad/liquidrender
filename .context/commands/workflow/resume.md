---
description: 'Resume an interrupted workflow from last checkpoint'
---

# Workflow Resume

Continue an interrupted workflow.

## Arguments
- $ARGUMENTS: Optional workflow ID (e.g., "WF-0041")

## Instructions

**CRITICAL: Execute ALL steps in EXACT order. Do NOT skip any step.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  MANDATORY RESUME SEQUENCE (NEVER SKIP)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. FIND WORKFLOW                                                   │
│     └── Locate STATUS.yaml                                          │
│                                                                     │
│  2. VERIFY CONTEXT INTEGRITY                                        │
│     └── Check for drift                                             │
│                                                                     │
│  3. LOAD CONTEXT FILES  ← MANDATORY, before showing resume plan     │
│     └── Read all files from CONTEXT-LIBRARY.yaml                   │
│     └── These are REQUIRED for agents to work correctly            │
│                                                                     │
│  4. SHOW RESUME PLAN with context summary                           │
│                                                                     │
│  5. ASK USER BEFORE RESUMING                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 1: Find Workflow

- If $ARGUMENTS provided, use that ID
- Otherwise, find most recent in `.workflows/active/`

### Step 2: Verify Context Integrity

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

### Step 3: Load Context Files (MANDATORY - DO NOT SKIP)

**This step is REQUIRED before showing the resume plan or launching agents.**

Read CONTEXT-LIBRARY.yaml and load ALL required context files:

```bash
# Read the context library
cat .workflows/active/WF-[ID]-[name]/CONTEXT-LIBRARY.yaml
```

**Then READ each file listed in the `required` section:**

```yaml
# Example CONTEXT-LIBRARY.yaml
required:
  - path: packages/liquid-render/src/renderer/components/index.ts
    purpose: Component registry
  - path: packages/liquid-render/docs/COMPONENT-GUIDE.md
    purpose: Design tokens & patterns
```

**You MUST read these files NOW, before proceeding:**
- Use the Read tool on each file path
- These provide the context agents need to work correctly
- Skipping this step leads to agents making mistakes

### Step 4: Identify Resume Point

Read STATUS.yaml and determine:
- Current wave number
- Pending/failed tasks in wave
- Last successful checkpoint

### Step 5: Present Resume Plan with Context Summary

**Include file paths in the context summary:**
```
╔═══════════════════════════════════════════════════════════════════╗
║  RESUME: WF-[ID] - [NAME]                                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  CONTEXT LOADED (X files, ~Y,YYY tokens):                         ║
║  ├── components/index.ts      (component registry)                ║
║  ├── docs/COMPONENT-GUIDE.md  (design tokens)                     ║
║  └── dev/AIDemo.tsx           (reference implementation)          ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  TIMING:                                                          ║
║    Started: [timestamp]                                           ║
║    Interrupted After: [elapsed]                                   ║
║    Resume At: [current time]                                      ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  COMPLETED:                                                       ║
║    T1: [name]    33s    ✅                                        ║
║    T2: [name]    1m 46s ✅                                        ║
║                                                                   ║
║  REMAINING:                                                       ║
║    T3: [name]    pending                                          ║
║    T4: [name]    pending                                          ║
║                                                                   ║
║  Resume from: Wave [M], Task [T]                                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Step 6: ASK USER BEFORE RESUMING
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

### Step 7: On Approval - Launch Agents
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

### Step 8: Validate After Each Wave
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
