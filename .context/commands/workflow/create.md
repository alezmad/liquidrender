---
description: 'Create a new parallel multi-agent workflow proposal for complex tasks'
---

# Workflow Create

Generate a workflow proposal for parallel multi-agent execution.

## Arguments
- $ARGUMENTS: Task description (e.g., "implement dashboard components")

## Instructions

### 1. Analyze Task

Break down "$ARGUMENTS" into:
- Individual tasks (what needs to be built)
- Dependencies between tasks
- Shared resources (types, utilities)

### 2. Generate Proposal

Present this structure for approval:

```
## Workflow Proposal: WF-[ID] - [NAME]

### Overview
- **Tasks**: [N] components to implement
- **Waves**: [M] parallel execution groups
- **Files to create**: [X]
- **Dependencies to install**: [list or "none"]

### Effort Estimation

<!-- Complexity estimates: S=30s-1min, M=1-3min, L=3-10min -->

| Wave | Type | Tasks | Est. Time |
|------|------|-------|-----------|
| 0 | Sequential | Bootstrap | ~30s |
| 1 | Parallel (N) | T1, T2, T3 | ~2-3 min |
| 2 | Sequential | Integration | ~30s |

| Task | Complexity | Est. Time |
|------|------------|-----------|
| T1 | S/M/L | 30s-1min / 1-3min / 3-10min |

**Estimated Total**: X-Y min (wall clock)
**Estimated Agent Time**: Z min (sum of all agents)

### Execution Plan

| Wave | Type | Tasks | Files |
|------|------|-------|-------|
| 0 | Sequential | Bootstrap | types.ts, index.ts |
| 1 | Parallel (N) | T1, T2, T3 | file1.tsx, file2.tsx, file3.tsx |
| 2 | Sequential | Integration | index.ts (exports) |

### Task Details

| ID | Name | Output | Dependencies | Complexity |
|----|------|--------|--------------|------------|
| T1 | Name | file.tsx | none | S/M/L |

### Dependency Graph
[ASCII diagram showing task dependencies]

---
**Approve?** Reply:
- "approved" to start execution
- Describe changes to modify
- "cancel" to abort
```

### 3. Wave Rules

- **Wave 0**: Bootstrap (types, barrel skeleton, dirs) - SEQUENTIAL
- **Wave 1-N**: Parallel tasks with exclusive file ownership - **USE SUBTASKS**
- **Final Wave**: Integration (wire exports, final validation) - SEQUENTIAL

### 3.1 CRITICAL: Parallel Execution with Subtasks

**When tasks have NO file conflicts, ALWAYS launch them as parallel subtasks:**

```
┌─────────────────────────────────────────────────────────────────┐
│  WAVE EXECUTION STRATEGY                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Wave has conflicts?                                            │
│  ├── YES → Run tasks SEQUENTIALLY                               │
│  └── NO  → Launch ALL tasks as PARALLEL SUBTASKS                │
│                                                                 │
│  Parallel Launch Pattern:                                       │
│  ─────────────────────────                                      │
│  Use Task tool MULTIPLE TIMES in a SINGLE message:              │
│                                                                 │
│  [Task tool: T1 - Button component, run_in_background=true]     │
│  [Task tool: T2 - Input component, run_in_background=true]      │
│  [Task tool: T3 - Modal component, run_in_background=true]      │
│                                                                 │
│  Then wait for ALL with TaskOutput(block=true)                  │
│                                                                 │
│  ⚡ This is 3x faster than sequential execution!                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Conflict Detection:**
- Same file written by multiple tasks = CONFLICT
- Same barrel/index file = Run barrel update AFTER wave completes
- Different files = NO CONFLICT → PARALLELIZE

### 4. Validation Scripts

After each wave, run:
```bash
.context/workflows/scripts/validate-wave.sh @repo/liquid-render
```

### 5. On Approval - Pre-Flight Protocol

**CRITICAL: Execute ALL steps in EXACT order. Do NOT skip any step.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  MANDATORY PRE-FLIGHT SEQUENCE (NEVER SKIP)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. GIT CHECKPOINT                                                  │
│     └── Tag starting point                                          │
│                                                                     │
│  2. CREATE DIRECTORY ← Immediately after git                        │
│     └── .workflows/active/WF-[ID]-[name]/                          │
│                                                                     │
│  3. GATHER CONTEXT  ← MANDATORY, right after directory              │
│     └── python gather-context.py → CONTEXT-LIBRARY.yaml            │
│     └── Display context summary to user                             │
│                                                                     │
│  4. CREATE STATUS.yaml                                              │
│                                                                     │
│  5. ASK USER BEFORE WAVE 0                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Step 1: Git Checkpoint

```bash
# Check for uncommitted changes
python .context/workflows/scripts/preflight-check.py WF-[ID]
```
- If dirty: Show suggested commit message
- User decides: [C]ommit / [P]roceed / [X] Abort
- Tag starting point:
```bash
git tag "WF-[ID]-start" -m "Pre-workflow checkpoint"
```

#### Step 2: Create Workflow Directory

```bash
mkdir -p .workflows/active/WF-[ID]-[name]/{docs,agents,checkpoints}
```

#### Step 3: Gather Context (MANDATORY - DO NOT SKIP)

**This step is REQUIRED immediately after creating the directory.**

```bash
python .context/workflows/scripts/gather-context.py .workflows/active/WF-[ID]-[name]
```

This script:
- Reads workflow requirements (files to create/modify)
- Identifies required context files (specs, guides, examples)
- Generates `CONTEXT-LIBRARY.yaml`
- Applies token budget (default 20k)

**ALWAYS display context summary after gathering:**
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  CONTEXT: WF-[ID]                        X,XXX / 20,000 tokens║
   ╠═══════════════════════════════════════════════════════════════╣
   ║  [SPEC]  LIQUID-RENDER-SPEC.md   ~4,200 tokens                ║
   ║  [GUIDE] COMPONENT-GUIDE.md      ~1,800 tokens                ║
   ║  [DEFER] architecture.md         ~8,500 tokens (over budget)  ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

#### Step 4: Create STATUS.yaml

Create STATUS.yaml with git checkpoint info and workflow structure.

#### Step 5: Register in Central Registry
   ```bash
   python .context/workflows/scripts/update-registry.py create WF-[ID] \
     --name "[NAME]" \
     --dirname "WF-[ID]-[name]" \
     --location active \
     --tasks [N]
   ```
   This adds the workflow to `.workflows/registry.yaml` for tracking.

#### Step 6: Generate WORKFLOW-LAUNCHER.md (for fresh session resume)

   Create `.workflows/active/WF-[ID]-[name]/WORKFLOW-LAUNCHER.md`:

   ```markdown
   # Workflow Launcher: WF-[ID] - [NAME]

   > Copy this entire file content and paste into a fresh Claude Code session,
   > or run: `/workflow:launch WF-[ID]`

   ## Quick Resume

   ```
   /workflow:launch WF-[ID]
   ```

   ## Context Summary

   Files from CONTEXT-LIBRARY.yaml (X,XXX tokens):
   - `specs/LIQUID-RENDER-SPEC.md` - DSL grammar (~4,200 tokens)
   - `docs/COMPONENT-GUIDE.md` - Design tokens (~1,800 tokens)

   ## Workflow State

   - **ID**: WF-[ID]
   - **Name**: [NAME]
   - **Status**: approved
   - **Current Wave**: 0
   - **Git Tag**: WF-[ID]-start (commit: [hash])

   ## Key Decisions Made

   <!-- Captured from approval conversation -->
   - [Decision 1 from conversation]
   - [Decision 2 from conversation]
   - [Any user preferences noted]

   ## User Notes

   <!-- Add anything important to remember across sessions -->


   ## Launch Instructions

   1. Paste this file into a fresh Claude Code session, OR
   2. Run: `/workflow:launch WF-[ID]`

   The launcher will:
   - Load context files listed above
   - Read STATUS.yaml for current position
   - Resume from the current wave
   ```

#### Step 7: Offer Context Clear (Optional)

   If conversation is heavy (>15k tokens accumulated):
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  SUGGESTION: Clear Context Before Wave 0                      ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  Current conversation: ~18k tokens (heavy)                    ║
   ║  CONTEXT-LIBRARY.yaml: 8k tokens (ready)                      ║
   ║                                                               ║
   ║  Clearing will:                                               ║
   ║  • Reset conversation                                         ║
   ║  • Workflow state preserved in STATUS.yaml                    ║
   ║  • WORKFLOW-LAUNCHER.md ready for fresh start                 ║
   ║  • Free ~10k tokens for agent execution                       ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝

   [C] Clear and run /workflow:launch WF-[ID]
   [S] Skip (continue with current context)
   ```

   - On "C": Instruct user to run `/clear` then `/workflow:launch WF-[ID]`
   - On "S": Continue with current context

#### Step 8: ASK USER BEFORE WAVE 0 (Required Confirmation)
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  READY TO START: WF-[ID]                                      ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  ✓ Git checkpoint: [commit] (tagged: WF-[ID]-start)           ║
   ║  ✓ Context gathered: X,XXX tokens (Y files)                   ║
   ║  ✓ Workflow directory created                                 ║
   ║                                                               ║
   ║  Wave 0 will:                                                 ║
   ║  • Create shared types                                        ║
   ║  • Set up directory structure                                 ║
   ║  • Initialize barrel exports                                  ║
   ║                                                               ║
   ║  Waves 1-N will launch PARALLEL SUBTASKS for speed.           ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝

   **Start Wave 0?** [Y/n]
   ```

   - On "Y" or "yes": Proceed with Wave 0
   - On "n" or "no": Pause workflow, save state
   - On other input: Clarify and re-ask

#### Step 9: Begin Wave 0

Bootstrap (sequential) - create types, structure, etc.

#### Step 10: Launch PARALLEL subtasks for Wave 1
   ```
   # In a SINGLE message, launch all Wave 1 tasks:
   [Task: T1, run_in_background=true]
   [Task: T2, run_in_background=true]
   [Task: T3, run_in_background=true]

   # Wait for completion:
   [TaskOutput: T1, block=true]
   [TaskOutput: T2, block=true]
   [TaskOutput: T3, block=true]
   ```

### 6. Show Available Commands

```
## Workflow Commands

| Command | Purpose |
|---------|---------|
| `/workflow:status` | Check current workflow progress |
| `/workflow:resume [ID]` | Resume an interrupted workflow |
| `/workflow:launch [ID]` | Launch workflow in fresh session |
| `/workflow:complete [ID]` | Finalize and archive a workflow |
| `/workflow:rollback [ID]` | Revert a failed workflow |
| `/workflow:list` | List all workflows by status |
| `/workflow:validate [type]` | Run validation (wave/full/exports/docs) |
```

Reference: `.context/workflows/MASTER-WORKFLOW-GENERATOR.md`
