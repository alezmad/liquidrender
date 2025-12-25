# Master Workflow Generator for Claude Code

> A meta-framework for generating parallel multi-agent execution workflows.
> Optimized for Claude Code's Task tool with dependency-aware parallelism.

---

## PRE-FLIGHT PROTOCOL (Before Any Workflow)

**Every workflow execution MUST complete pre-flight checks before Wave 0:**

```
┌─────────────────────────────────────────────────────────────────┐
│  PRE-FLIGHT PROTOCOL                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GIT STATE CHECK                                             │
│     ├── Run: python .context/workflows/scripts/preflight-check.py WF-[ID]
│     ├── If dirty: Suggest commit message                        │
│     ├── User decides: [C]ommit / [P]roceed / [X] Abort          │
│     └── Tag starting point: git tag WF-[ID]-start               │
│                                                                 │
│  2. CONTEXT GATHERING                                           │
│     ├── Run: python .context/workflows/scripts/gather-context.py <dir>
│     ├── Analyze required_reading from WORKFLOW.md               │
│     ├── Estimate token counts                                   │
│     ├── Apply budget constraints (default 20k tokens)           │
│     └── Generate CONTEXT-LIBRARY.yaml                           │
│                                                                 │
│  3. CONTEXT SUMMARY DISPLAY                                     │
│     ├── Show user what files will be loaded                     │
│     ├── Show budget utilization                                 │
│     ├── List deferred files (over budget)                       │
│     └── User confirms or edits before proceeding                │
│                                                                 │
│  4. RESUME CHECK (if resuming paused workflow)                  │
│     ├── Run: python .context/workflows/scripts/verify-context.py <dir>
│     ├── Compare current file hashes against stored              │
│     ├── Report drift (changed/deleted files)                    │
│     └── User decides: [R]esume / [U]pdate / [S]tart fresh       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Pre-Flight Matters

| Problem | Solution |
|---------|----------|
| **Context blindness** | CONTEXT-LIBRARY.yaml records what agent "knows" |
| **Context overflow** | Token budget prevents compaction spiral |
| **Dirty git state** | Commit suggestion enables clean rollback |
| **Resume ambiguity** | Hash verification detects drift |

### Pre-Flight Scripts

| Script | Purpose |
|--------|---------|
| `preflight-check.py` | Git state analysis, commit suggestion |
| `gather-context.py` | Build CONTEXT-LIBRARY.yaml with budget |
| `verify-context.py` | Check file integrity for resume |
| `estimate-tokens.py` | Token counting utility |

### Context Budget System

The workflow uses tiered context loading to prevent overflow:

```yaml
budget:
  total: 20000          # Total tokens for context
  core: 8000            # Always loaded, entire workflow
  wave_specific: 8000   # Loaded per-wave, dropped after checkpoint
  on_demand: 4000       # Reserved for agent-requested files
```

**Loading Strategy:**
- **Core**: Essential specs/guides - loaded at start, never dropped
- **Wave-specific**: Task-relevant files - loaded per wave, dropped after
- **On-demand**: Agent requests during execution - auto-dropped after use

This prevents the death spiral: load everything → overflow → compact → lose context → mistakes → re-read → overflow again.

### User Confirmation Before Wave 0

**ALWAYS ask the user before starting Wave 0:**

```
╔═══════════════════════════════════════════════════════════════╗
║  READY TO START: WF-[ID]                                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✓ Git checkpoint: [commit] (tagged: WF-[ID]-start)           ║
║  ✓ Context gathered: X,XXX tokens (Y files)                   ║
║  ✓ Workflow directory created                                 ║
║                                                               ║
║  Wave 0 will create shared types and structure.               ║
║  Waves 1-N will launch PARALLEL SUBTASKS for speed.           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

**Start Wave 0?** [Y/n]
```

### CRITICAL: Parallel Subtask Execution

**For maximum speed, ALWAYS launch non-conflicting tasks as parallel subtasks:**

```
┌─────────────────────────────────────────────────────────────────┐
│  PARALLEL EXECUTION RULE                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IF tasks write to DIFFERENT files:                             │
│     → Launch ALL as PARALLEL SUBTASKS in ONE message            │
│     → 3 tasks in parallel = 3x faster than sequential           │
│                                                                 │
│  IF tasks write to SAME file:                                   │
│     → Run SEQUENTIALLY to avoid conflicts                       │
│                                                                 │
│  BARREL/INDEX files:                                            │
│     → Update AFTER wave completes (orchestrator handles)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Pattern:
  # In ONE message, launch all parallel tasks:
  [Task: T1, run_in_background=true]
  [Task: T2, run_in_background=true]
  [Task: T3, run_in_background=true]

  # Then collect results:
  [TaskOutput: T1, block=true]
  [TaskOutput: T2, block=true]
  [TaskOutput: T3, block=true]
```

### CONTEXT-LIBRARY.yaml Schema

See `.context/workflows/schemas/CONTEXT-LIBRARY.schema.yaml` for full schema.

```yaml
workflow_id: WF-0006
created_at: 2025-12-25T10:00:00Z
context_mode: fresh  # fresh | resume | minimal

git_checkpoint:
  branch: main
  commit: 9ae2f2f
  tag: WF-0006-start
  was_clean: true

budget:
  total: 20000
  core: 8000
  wave_specific: 8000
  on_demand: 4000

sources:
  core:
    - path: specs/LIQUID-RENDER-SPEC.md
      hash: sha256:a1b2c3d4e5f6
      tokens: 4200
      purpose: "DSL grammar and syntax"

deferred:
  - path: _bmad-output/architecture.md
    tokens: 8500
    reason: "Exceeds core budget"

integrity:
  last_verified: 2025-12-25T10:00:00Z
  files_changed: 0
```

### WORKFLOW-LAUNCHER.md Template

Generate this file for fresh session resume capability:

```markdown
# Workflow Launcher: WF-[ID] - [NAME]

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-[ID]`

## Quick Resume

\`\`\`
/workflow:launch WF-[ID]
\`\`\`

## Context Summary

Files from CONTEXT-LIBRARY.yaml (X,XXX tokens):
- `path/to/file1.md` - Purpose (~N,NNN tokens)
- `path/to/file2.md` - Purpose (~N,NNN tokens)

## Workflow State

- **ID**: WF-[ID]
- **Name**: [NAME]
- **Status**: [approved | in_progress | paused]
- **Current Wave**: [N]
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

### Context Clear Suggestion

After generating WORKFLOW-LAUNCHER.md, if conversation is heavy (>15k tokens):

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

This is **optional** - only suggest when context is genuinely heavy.

---

## CRITICAL: ITERATIVE PROPOSAL REFINEMENT

**Every workflow MUST follow this iterative approval cycle:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ITERATIVE PROPOSAL LOOP                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     REFINEMENT CYCLE                          │   │
│  │                                                               │   │
│  │   1. GENERATE → Create/update workflow proposal               │   │
│  │        ↓                                                      │   │
│  │   2. PRESENT → Show COMPLETE workflow overview:               │   │
│  │        ┌─────────────────────────────────────────────┐       │   │
│  │        │ WORKFLOW PROPOSAL: WF-[ID]                  │       │   │
│  │        ├─────────────────────────────────────────────┤       │   │
│  │        │ Tasks: [N] total                            │       │   │
│  │        │ Waves: [M] parallel execution groups        │       │   │
│  │        │ Files: [X] to create, [Y] to modify         │       │   │
│  │        │ Dependencies: [list if any]                 │       │   │
│  │        │                                             │       │   │
│  │        │ Wave 1 (parallel): T1, T2, T3               │       │   │
│  │        │ Wave 2 (parallel): T4, T5                   │       │   │
│  │        │ Wave 3 (sequential): Integration            │       │   │
│  │        │                                             │       │   │
│  │        │ [Full task matrix with dependencies]        │       │   │
│  │        └─────────────────────────────────────────────┘       │   │
│  │        ↓                                                      │   │
│  │   3. AWAIT → User responds:                                   │   │
│  │        • ✓ "approved/proceed/yes" → EXIT loop, EXECUTE        │   │
│  │        • ✎ "change X to Y" → Apply changes, RESTART loop      │   │
│  │        • ✗ "reject/cancel" → Archive, EXIT                    │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                           ↑        │                                 │
│                           │        │ (on modification)               │
│                           └────────┘                                 │
│                                                                      │
│  AFTER APPROVAL:                                                     │
│  ───────────────                                                     │
│  4. EXECUTE → Run waves sequentially                                │
│       ↓                                                              │
│  5. VERIFY → After each wave, show results                          │
│       • On failure: Present fix options, await decision             │
│       • On success: Continue to next wave                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Proposal Presentation Format

When presenting a workflow for approval, ALWAYS show:

```markdown
## Workflow Proposal: WF-[ID] - [NAME]

### Overview
- **Tasks**: [N] components to implement
- **Waves**: [M] parallel execution groups
- **Files to create**: [X]
- **Files to modify**: [Y]
- **Dependencies to install**: [list or "none"]

### Execution Plan

| Wave | Type | Tasks | Files |
|------|------|-------|-------|
| 0 | Sequential | Bootstrap | types.ts, index.ts |
| 1 | Parallel (3) | T1, T2, T3 | button.tsx, input.tsx, modal.tsx |
| 2 | Parallel (2) | T4, T5 | form.tsx, dialog.tsx |
| 3 | Sequential | Integration | index.ts (exports) |

### Task Details

| ID | Name | Output | Dependencies | Complexity |
|----|------|--------|--------------|------------|
| T1 | Button | button.tsx | none | S |
| T2 | Input | input.tsx | none | S |
| T3 | Modal | modal.tsx | none | M |
| T4 | Form | form.tsx | T1, T2 | M |
| T5 | Dialog | dialog.tsx | T3 | S |

### Dependency Graph
```
T1 (Button) ──┐
              ├──▶ T4 (Form)
T2 (Input) ───┘
T3 (Modal) ────▶ T5 (Dialog)
```

---
**Approve?** Reply with:
- "approved" / "proceed" / "yes" to start execution
- Describe changes to modify the proposal
- "cancel" to abort
```

### Modification Handling

When user requests changes:

1. **Parse the modification request**
2. **Update the workflow definition**
3. **Regenerate the proposal with changes highlighted**
4. **Present the UPDATED proposal again**
5. **Await approval (loop continues)**

Example modification flow:
```
User: "Add a Tooltip component and make Form depend on it too"

Claude: "Updated proposal:"

## Workflow Proposal: WF-0043 - UI Components (v2)

### Changes from v1:
- ✚ Added T6: Tooltip component
- ✎ Modified T4: Form now depends on T1, T2, T6

### Execution Plan (updated)

| Wave | Type | Tasks | Files |
|------|------|-------|-------|
| 0 | Sequential | Bootstrap | types.ts, index.ts |
| 1 | Parallel (4) | T1, T2, T3, T6 | button.tsx, input.tsx, modal.tsx, tooltip.tsx |
| 2 | Parallel (2) | T4, T5 | form.tsx, dialog.tsx |
| 3 | Sequential | Integration | index.ts (exports) |

[... rest of updated proposal ...]

**Approve?**
```

**Key Rule: Never execute until user explicitly approves the LATEST proposal version.**

---

## WORKSPACE STRUCTURE

All workflow executions live in `.workflows/` - isolated from project code.

```
.workflows/
├── registry.yaml                    # Master index of all workflows
├── templates/                       # Reusable workflow templates
│   ├── components.template.yaml
│   ├── api-endpoints.template.yaml
│   └── migrations.template.yaml
│
├── queue/                           # Planned workflows (not started)
│   └── WF-0042-feature-xyz/
│       ├── WORKFLOW.md
│       ├── PROPOSAL.md              # User-facing summary for approval
│       └── config.yaml
│
├── active/                          # Currently executing (max 1 recommended)
│   └── WF-0041-ui-components/
│       ├── WORKFLOW.md              # Full workflow definition
│       ├── STATUS.yaml              # Live progress tracking
│       ├── config.yaml              # Execution configuration
│       ├── BATCH-1-SPECS.md         # Wave 1 detailed specs
│       ├── BATCH-2-SPECS.md         # Wave 2 detailed specs (if needed)
│       ├── agents/                  # Per-agent workspaces
│       │   ├── T1-kpi-card/
│       │   │   ├── prompt.md        # Agent's specific prompt
│       │   │   ├── output.log       # Agent stdout/stderr
│       │   │   └── attempts/        # Retry history
│       │   │       ├── attempt-1.md
│       │   │       └── attempt-2.md
│       │   └── T2-data-table/
│       │       └── ...
│       ├── checkpoints/             # Checkpoint validation logs
│       │   ├── wave-1.log
│       │   └── wave-2.log
│       └── artifacts/               # Generated files (copied here before moving to project)
│           ├── kpi-card.tsx
│           └── kpi-card.test.tsx
│
├── completed/                       # Successfully finished workflows
│   ├── WF-0039-auth-system/
│   │   ├── WORKFLOW.md
│   │   ├── STATUS.yaml              # Final status (frozen)
│   │   ├── SUMMARY.md               # Completion report
│   │   ├── CHANGELOG.md             # What was created/modified
│   │   └── artifacts/               # Archive of generated files
│   └── WF-0040-database-setup/
│       └── ...
│
└── failed/                          # Workflows that couldn't complete
    └── WF-0038-broken-feature/
        ├── WORKFLOW.md
        ├── STATUS.yaml
        ├── POSTMORTEM.md            # Why it failed, lessons learned
        └── agents/                  # Preserved for debugging
```

---

## REGISTRY.yaml (Master Index)

```yaml
# .workflows/registry.yaml
next_id: 43

workflows:
  WF-0041:
    name: "UI Components"
    status: active
    created: 2024-12-24T10:00:00Z
    started: 2024-12-24T10:05:00Z
    path: active/WF-0041-ui-components
    tasks_total: 12
    tasks_complete: 0

  WF-0042:
    name: "Feature XYZ"
    status: queued
    created: 2024-12-24T11:00:00Z
    path: queue/WF-0042-feature-xyz

  WF-0040:
    name: "Database Setup"
    status: completed
    created: 2024-12-23T09:00:00Z
    completed: 2024-12-23T11:30:00Z
    path: completed/WF-0040-database-setup
    duration_minutes: 150
    tasks_total: 8
    tasks_complete: 8

  WF-0038:
    name: "Broken Feature"
    status: failed
    created: 2024-12-22T14:00:00Z
    failed: 2024-12-22T15:45:00Z
    path: failed/WF-0038-broken-feature
    failure_reason: "Dependency conflict in Phase 2"

stats:
  total_workflows: 42
  completed: 38
  failed: 2
  active: 1
  queued: 1
  avg_duration_minutes: 95
```

---

## WORKFLOW LIFECYCLE

```
┌─────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│  PLAN   │────▶│  QUEUE  │────▶│  ACTIVE   │────▶│ COMPLETED │
│         │     │         │     │           │     │           │
│ Generate│     │ .queue/ │     │ .active/  │     │.completed/│
│ workflow│     │ AWAIT   │     │ Execute   │     │           │
└─────────┘     │ APPROVAL│     └─────┬─────┘     └───────────┘
                └─────────┘           │
                                      │ on failure
                                      ▼
                                ┌───────────┐
                                │  FAILED   │
                                │           │
                                │ .failed/  │
                                │ Postmortem│
                                └───────────┘
```

---

## DEPENDENCY-AWARE PARALLEL EXECUTION OPTIMIZER

The workflow planner automatically analyzes task dependencies to maximize parallelism while preventing file corruption.

### Dependency Analysis Algorithm

```
FUNCTION analyze_dependencies(tasks):

  # Build dependency graph
  FOR each task T:
    T.file_writes = extract_output_files(T)
    T.file_reads = extract_input_files(T)
    T.explicit_deps = extract_declared_dependencies(T)

  # Detect implicit dependencies (file-based conflicts)
  FOR each pair (A, B) where A != B:
    IF A.file_writes ∩ B.file_writes ≠ ∅:
      # CONFLICT: Same file, cannot run parallel
      mark_sequential(A, B, "write conflict")
    IF A.file_writes ∩ B.file_reads ≠ ∅:
      # DEPENDENCY: B reads what A writes
      add_dependency(B, A, "read-after-write")

  # Merge with explicit dependencies
  FOR each task T:
    T.all_deps = T.explicit_deps ∪ T.implicit_deps

  # Generate parallel waves using topological sort
  waves = []
  remaining = all_tasks
  WHILE remaining not empty:
    wave = tasks where all dependencies satisfied
    waves.append(wave)
    mark_as_satisfied(wave)
    remaining = remaining - wave

  RETURN waves
```

### Wave Generation Rules

1. **File Ownership**: Each file can only be written by ONE task per wave
2. **Barrel Exports**: Append-only operations can be batched at wave end
3. **Shared Types**: Create in Wave 0, read-only in subsequent waves
4. **Test Files**: Follow same ownership as source files

### Example Dependency Resolution

```yaml
# Input: 6 tasks with dependencies
tasks:
  T1: {writes: [types.ts], deps: []}
  T2: {writes: [button.tsx], deps: [T1], reads: [types.ts]}
  T3: {writes: [input.tsx], deps: [T1], reads: [types.ts]}
  T4: {writes: [form.tsx], deps: [T2, T3], reads: [button.tsx, input.tsx]}
  T5: {writes: [modal.tsx], deps: [T1], reads: [types.ts]}
  T6: {writes: [index.ts], deps: [T2, T3, T4, T5]}

# Output: Optimized waves
waves:
  wave_0: [T1]                    # Foundation - must complete first
  wave_1: [T2, T3, T5]            # Max parallelism - independent tasks
  wave_2: [T4]                    # Depends on T2, T3
  wave_3: [T6]                    # Final integration - depends on all
```

### Conflict Detection Visualization

```
┌──────────────────────────────────────────────────────────────────┐
│ DEPENDENCY ANALYZER OUTPUT                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ◉ T1: types.ts                                                  │
│   ├──▶ T2: button.tsx (reads types.ts)                          │
│   ├──▶ T3: input.tsx (reads types.ts)                           │
│   └──▶ T5: modal.tsx (reads types.ts)                           │
│                                                                   │
│  ◉ T2 + T3 ──▶ T4: form.tsx                                     │
│                                                                   │
│  ◉ T2 + T3 + T4 + T5 ──▶ T6: index.ts (barrel)                 │
│                                                                   │
│  ⚠ CONFLICT DETECTED: None                                       │
│  ✓ PARALLEL EFFICIENCY: 66% (4 parallel / 6 total tasks)        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## CLAUDE CODE TASK TOOL INTEGRATION

The workflow executor uses Claude Code's Task tool for autonomous parallel execution.

### Task Tool Agent Types

```yaml
agents:
  Explore:
    use_for: "Codebase discovery, finding patterns, locating files"
    thoroughness: ["quick", "medium", "very thorough"]

  Plan:
    use_for: "Designing implementation strategy"
    returns: "Step-by-step plans with file identification"

  general-purpose:
    use_for: "Multi-step implementation tasks"
    capabilities: "Full tool access including edit, write, bash"
```

### Parallel Execution Pattern

When executing a wave, launch all independent tasks simultaneously using multiple Task tool calls in a single message:

```
# Wave 1: Launch 3 parallel agents
Use Task tool 3 times in ONE message:
  - Task 1: subagent_type="general-purpose", run_in_background=true
  - Task 2: subagent_type="general-purpose", run_in_background=true
  - Task 3: subagent_type="general-purpose", run_in_background=true

# Wait for all to complete using TaskOutput
Use TaskOutput with block=true for each agent_id

# Validate wave checkpoint
Run: pnpm test && pnpm build

# If passed, proceed to Wave 2
# If failed, diagnose and retry (max 3 attempts)
```

### Agent Prompt Template

Each parallel agent receives this structured prompt:

```markdown
## Agent Assignment: [TASK_ID] - [TASK_NAME]

### Context
You are implementing [COMPONENT] as part of workflow [WF-ID].
Read these files first:
- [REQUIRED_READING_1]
- [REQUIRED_READING_2]

### Your Exclusive Files (ONLY touch these)
- CREATE: [FILE_PATH]
- CREATE: [TEST_FILE_PATH]

### DO NOT TOUCH
- Any file not listed above
- Other agents are working on: [LIST_OTHER_AGENT_FILES]
- Shared config files (orchestrator handles)

### Implementation Requirements
[TASK_SPECIFIC_REQUIREMENTS]

### Interface Contract
```typescript
[INTERFACE_CODE]
```

### Acceptance Criteria
- [ ] Implementation matches interface
- [ ] Tests pass: pnpm test [FILE_PATTERN]
- [ ] TypeScript compiles: pnpm build
- [ ] No console.log in production code

### On Completion
Report: files created, test count, any blockers
```

---

## DEPENDENCY INSTALLATION PHASE

Before Wave 0, check and install dependencies:

### Pre-flight Dependency Check

```yaml
# config.yaml
dependencies:
  required:
    - name: "recharts"
      version: "^2.12.0"
      workspace: "@repo/liquid-render"
      reason: "Chart components"
    - name: "date-fns"
      version: "^3.0.0"
      workspace: "@repo/liquid-render"
      reason: "DateRange component"

  dev_required:
    - name: "@testing-library/react"
      version: "^14.0.0"
      workspace: "@repo/liquid-render"
      reason: "Component testing"
```

### Installation Commands (pnpm - TurboStarter standard)

```bash
# Install to specific workspace (preferred)
pnpm add --filter @repo/liquid-render recharts date-fns

# Install dev dependency
pnpm add -D --filter @repo/liquid-render @testing-library/react

# Install to monorepo root (shared across all packages)
pnpm add -w shared-dependency

# Update all workspaces
pnpm update -r package-name
```

### Bootstrap Phase (Wave 0)

```yaml
wave_0:
  name: "Bootstrap"
  type: sequential  # Always sequential
  tasks:
    - id: W0-1
      name: "Install Python aggregation dependencies"
      command: "pip install pyyaml --quiet"
      validation: "python -c 'import yaml; print(yaml.__version__)'"
      notes: "Required for aggregate-overview.py"

    - id: W0-2
      name: "Install project dependencies"
      command: "pnpm add --filter [WORKSPACE] [PACKAGES]"
      validation: "pnpm list [PACKAGES]"

    - id: W0-3
      name: "Create shared types"
      file: "[TYPES_FILE]"
      validation: "pnpm build --filter [WORKSPACE]"

    - id: W0-4
      name: "Create barrel export skeleton"
      file: "[INDEX_FILE]"
      validation: "pnpm build --filter [WORKSPACE]"

    - id: W0-5
      name: "Initialize STATUS.yaml"
      file: ".workflows/active/[WF-ID]/STATUS.yaml"

    - id: W0-6
      name: "Create docs directory structure"
      command: "mkdir -p .workflows/active/[WF-ID]/docs/components"
```

---

## ROLLBACK WORKFLOW

When a workflow fails or needs to be undone:

### Rollback Command

```bash
claude "Rollback workflow WF-[ID].
1. Read CHANGELOG.md for files modified
2. Git diff to show changes
3. Present rollback plan to user
4. On approval: git checkout for modified files, rm for new files
5. Update registry.yaml status to 'rolled_back'"
```

### Rollback Safety Checks

```yaml
rollback:
  pre_checks:
    - "Confirm no uncommitted changes outside workflow"
    - "Verify git history contains pre-workflow state"
    - "List all files to be reverted"

  actions:
    modified_files: "git checkout HEAD~N -- [files]"
    new_files: "rm -f [files]"
    barrel_exports: "Regenerate from remaining components"

  post_checks:
    - "pnpm build passes"
    - "pnpm test passes"
    - "No orphaned imports"
```

### Partial Rollback

```bash
claude "Rollback only Wave 2 of workflow WF-[ID].
Keep Wave 1 changes intact.
Revert Wave 2 files only."
```

---

## WORKFLOW COMMANDS

### Create New Workflow
```bash
claude "Create workflow for: [DESCRIPTION]
Use MASTER-WORKFLOW-GENERATOR.md template.
Assign next ID from registry.
Generate PROPOSAL.md for my approval.
Place in .workflows/queue/"
```

### Approve and Start Workflow
```bash
claude "I approve workflow WF-[ID].
Move from queue/ to active/.
Install dependencies.
Begin Wave 0 bootstrap.
Update registry.yaml."
```

### Check Progress
```bash
claude "Report status of active workflow.
Read .workflows/active/*/STATUS.yaml.
Summarize wave progress and any blockers."
```

### Resume After Interrupt
```bash
claude "Resume workflow WF-[ID].
Read STATUS.yaml for current state.
Continue from last checkpoint."
```

### Complete Workflow
```bash
claude "Finalize workflow WF-[ID].
Run final validation.
Generate SUMMARY.md and CHANGELOG.md.
Move from active/ to completed/.
Copy artifacts to project.
Update registry.yaml."
```

### Archive Failed Workflow
```bash
claude "Mark workflow WF-[ID] as failed.
Write POSTMORTEM.md with failure analysis.
Move from active/ to failed/.
Update registry.yaml."
```

### Rollback Workflow
```bash
claude "Rollback workflow WF-[ID].
Show me the rollback plan first.
Await my approval before executing."
```

---

## WORKFLOW TEMPLATE

````markdown
# [PROJECT_NAME] - [TASK_DESCRIPTION]

## 1. CONTEXT ANCHOR

### Working Environment
```yaml
base_path: [BASE_DIRECTORY]
language: [typescript|python|go|rust|etc]
framework: [react|next|express|fastapi|etc]
styling: [tailwind|css-modules|styled-components|none]
testing: [vitest|jest|pytest|etc]
design_system: [shadcn|mui|custom|none]
package_manager: pnpm  # TurboStarter standard
```

### Required Reading
```yaml
# Files agents MUST read before implementing
required_reading:
  - path: "[COMPONENT_GUIDE]"
    purpose: "File structure and conventions"
  - path: "[SPEC_FILE]"
    purpose: "DSL syntax and patterns"
```

### Existing Code References
```yaml
types_location: [PATH_TO_TYPES]
patterns_reference: [PATH_TO_SIMILAR_CODE]
exports_barrel: [PATH_TO_INDEX_FILE]
```

### Constraints
```yaml
max_file_size: [NUMBER] lines
test_coverage_min: [PERCENTAGE]%
no_external_deps: [true|false]
must_support: [LIST_OF_REQUIREMENTS]
```

---

## 2. DEPENDENCY MANIFEST

### Runtime Dependencies
```yaml
dependencies:
  - name: "[PACKAGE]"
    version: "[VERSION]"
    workspace: "[WORKSPACE_NAME]"
    reason: "[WHY_NEEDED]"
```

### Dev Dependencies
```yaml
dev_dependencies:
  - name: "[PACKAGE]"
    version: "[VERSION]"
    workspace: "[WORKSPACE_NAME]"
    reason: "[WHY_NEEDED]"
```

---

## 3. TASK DECOMPOSITION

### Task Matrix

| ID | Task Name | Output File(s) | Reads | Priority | Dependencies | Est. Complexity |
|----|-----------|----------------|-------|----------|--------------|-----------------|
| T1 | [NAME] | [FILE_PATH] (EXCLUSIVE) | [] | P0 | None | [S/M/L] |
| T2 | [NAME] | [FILE_PATH] (EXCLUSIVE) | [T1 output] | P0 | T1 | [S/M/L] |
| T3 | [NAME] | [FILE_PATH] (EXCLUSIVE) | [T1 output] | P0 | T1 | [S/M/L] |
| ... | ... | ... | ... | ... | ... | ... |

### Priority Definitions
- **P0**: Critical path, blocks other work
- **P1**: Secondary, may depend on P0
- **P2**: Optional/enhancement

### Complexity Guide
- **S (Small)**: <100 lines, single file, well-defined scope
- **M (Medium)**: 100-300 lines, may need helper utilities
- **L (Large)**: >300 lines, consider splitting into subtasks

---

## 4. INTERFACE CONTRACTS

### Shared Types (Create First)
```typescript
// [SHARED_TYPES_FILE]
[DEFINE_COMMON_INTERFACES_HERE]
```

### Per-Task Contract
Each task MUST:
- [ ] Implement the shared interface
- [ ] Export from barrel file
- [ ] Include JSDoc/docstrings
- [ ] Handle error states
- [ ] [ADDITIONAL_REQUIREMENTS]

### Naming Conventions
```yaml
files: [kebab-case|camelCase|PascalCase]
components: [PascalCase]
functions: [camelCase]
constants: [UPPER_SNAKE_CASE]
types: [PascalCase]
tests: [name].test.[ext]
```

---

## 5. EXECUTION WAVES

### Wave 0: Bootstrap (SEQUENTIAL - Orchestrator)
```yaml
tasks:
  - Install dependencies
  - Create directory structure
  - Create shared types file
  - Create barrel export skeleton
  - Create STATUS.yaml tracking file
checkpoint: "pnpm build passes"
```

### Wave 1: Foundation (PARALLEL - P0 Tasks)
```yaml
tasks: [T1, T2, ...P0_TASKS_WITH_NO_DEPS]
parallelism: max
file_ownership: exclusive
checkpoint: "pnpm test && pnpm build passes"
```

### Wave 2: Extension (PARALLEL - P1 Tasks)
```yaml
tasks: [T3, T4, ...TASKS_DEPENDING_ON_WAVE_1]
parallelism: max
wait_for: Wave 1 checkpoint
file_ownership: exclusive
checkpoint: "pnpm test && pnpm build passes"
```

### Wave 3: Integration (SEQUENTIAL - Orchestrator)
```yaml
tasks:
  - Wire all exports to barrel
  - Run integration tests
  - Update documentation
  - Final validation
checkpoint: "Full test suite passes, build clean"
```

---

## 6. PER-TASK AGENT PROMPT

Each parallel agent receives this prompt structure:

```markdown
## Agent Assignment: [TASK_ID] - [TASK_NAME]

### Required Reading (DO THIS FIRST)
Read these files before writing any code:
- [FILE_1]: [PURPOSE]
- [FILE_2]: [PURPOSE]

### Your Exclusive Files
- CREATE: [FILE_PATH]
- CREATE: [TEST_FILE_PATH]

### DO NOT TOUCH
- Any file not listed above
- Other agents' files: [LIST]
- Shared configs (orchestrator handles)

### Implementation Requirements
[TASK_SPECIFIC_REQUIREMENTS]

### Interface to Implement
```typescript
[INTERFACE_CODE]
```

### Acceptance Criteria
- [ ] [CRITERION_1]
- [ ] [CRITERION_2]
- [ ] Tests pass: `pnpm test [FILE_PATTERN]`
- [ ] Types check: `pnpm build`

### On Completion
Report:
1. Files created
2. Test count (passed/total)
3. Any blockers or concerns
```

---

## 7. STATUS TRACKING

### STATUS.yaml Schema
```yaml
workflow: [WORKFLOW_NAME]
workflow_id: [WF-ID]
started_at: [ISO_TIMESTAMP]
current_wave: [0|1|2|3]
overall_status: [pending|in_progress|blocked|complete|failed]

dependencies_installed: [true|false]

waves:
  wave_0:
    status: [pending|complete]
    completed_at: [ISO_TIMESTAMP|null]
  wave_1:
    status: [pending|in_progress|complete]
    tasks:
      T1:
        name: [TASK_NAME]
        status: [pending|in_progress|complete|failed]
        agent_id: [AGENT_ID|null]
        started_at: [ISO_TIMESTAMP|null]
        completed_at: [ISO_TIMESTAMP|null]
        files: [LIST_OF_FILES]
        tests_passed: [NUMBER]
        tests_total: [NUMBER]
        attempts: [NUMBER]
        notes: [STRING|null]
      T2:
        # ...
  wave_2:
    # ...
  wave_3:
    status: [pending|complete]

errors: []
  # - task: T3
  #   wave: 1
  #   error: "Type mismatch with shared interface"
  #   timestamp: [ISO_TIMESTAMP]
  #   attempt: 2

checkpoints:
  - wave: 0
    passed: [true|false]
    timestamp: [ISO_TIMESTAMP]
  # ...
```

---

## 8. MASTER ORCHESTRATOR LOOP

```
WHILE workflow not complete:

  1. READ STATUS.yaml

  2. IF dependencies not installed:
       RUN dependency installation
       VALIDATE with pnpm list
       UPDATE STATUS.yaml

  3. IF current wave has pending tasks with met dependencies:
       GENERATE agent prompts for each task
       PRESENT wave execution plan to user
       AWAIT approval
       LAUNCH parallel agents using Task tool (run_in_background=true)
       UPDATE STATUS.yaml with agent assignments

  4. POLL for agent completion using TaskOutput (block=false)
       UPDATE STATUS.yaml as agents complete

  5. IF all tasks in current wave complete:
       RUN checkpoint validation (pnpm test && pnpm build)
       IF checkpoint passes:
         ADVANCE to next wave
         UPDATE STATUS.yaml
         PRESENT results to user
       ELSE:
         IDENTIFY failures
         PRESENT fix options to user
         AWAIT decision: retry | skip | abort
         IF retry: RE-LAUNCH failed tasks (max 3 attempts)

  6. IF final wave complete:
       RUN final validation
       GENERATE SUMMARY.md and CHANGELOG.md
       PRESENT completion report to user
       SET overall_status = complete

  7. ON any error:
       LOG to errors array
       PRESENT to user with options
       AWAIT decision
```

---

## 9. CHECKPOINT VALIDATORS

### Pre-built Validation Scripts

Use the pre-built scripts in `.context/workflows/scripts/` for checkpoint validation:

```bash
# Full wave checkpoint (build + typecheck + test + lint)
.context/workflows/scripts/validate-wave.sh @repo/liquid-render

# TypeScript validation only (tsc + ESLint + Prettier)
.context/workflows/scripts/validate-typescript.sh @repo/liquid-render

# Run specific tests
.context/workflows/scripts/run-tests.sh "button" @repo/liquid-render

# Check barrel exports
python .context/workflows/scripts/check-exports.py src/components/index.ts src/components/
```

### Standard Validators
```yaml
build_check:
  command: "pnpm build"
  success: exit_code == 0

test_check:
  command: "pnpm test"
  success: exit_code == 0

type_check:
  command: "pnpm tsc --noEmit"
  success: exit_code == 0

lint_check:
  command: "pnpm lint"
  success: exit_code == 0

wave_checkpoint:
  command: ".context/workflows/scripts/validate-wave.sh [WORKSPACE]"
  success: exit_code == 0
  notes: "Runs all validators in sequence"

exports_check:
  command: "python .context/workflows/scripts/check-exports.py [INDEX] [DIR]"
  success: exit_code == 0
  notes: "Verify all components exported from barrel"
```

### Custom Validators
```yaml
[VALIDATOR_NAME]:
  command: "[COMMAND]"
  success: [CONDITION]
```

---

## 10. RETRY STRATEGY

```yaml
max_retries: 3
retry_delay: 0  # immediate

on_failure:
  attempt_1: "Re-run with same prompt"
  attempt_2: "Re-run with error context from previous attempt"
  attempt_3: "Present to user for manual intervention"

escalation:
  after_max_retries: "Add to errors array, present options to user"
  blocking_dependency: "Pause dependent tasks, notify user"
```

---

## 11. OUTPUT ARTIFACTS

### Per-Task Outputs
- `[file].tsx` - Implementation
- `[file].test.tsx` - Tests
- `[file].component.md` - Component documentation (per component)
- Entry in barrel export

### Workflow Outputs
- `STATUS.yaml` - Live progress tracking
- `CHANGELOG.md` - What was created/modified
- `SUMMARY.md` - Final report with metrics

### Documentation Hierarchy (Aggregated)

Each task generates its own `.md` file. These are aggregated into higher-level docs:

```
.workflows/active/WF-[ID]/docs/
├── components/                      # Per-component docs (generated by agents)
│   ├── button.component.md
│   ├── input.component.md
│   ├── modal.component.md
│   └── form.component.md
└── MODULE.md                        # Aggregated from components/*.md
```

**Note: OVERVIEW.md is ephemeral** - generated on-demand, never stored:
- Always fresh when requested (no drift from STATUS.yaml)
- Reduces file count and maintenance burden
- Generated via: `python aggregate-overview.py .`

**Aggregation flow:**
```
button.component.md ─┐
input.component.md  ─┼──▶ MODULE.md (stored)
modal.component.md  ─┤
form.component.md   ─┘
                           │
                           ▼
              STATUS.yaml + MODULE.md
                           │
                           ▼ (on-demand only)
                     OVERVIEW.md (ephemeral, not stored)
```

**Accessing OVERVIEW:**
```bash
# Generate and view (does not persist)
claude "Show me workflow overview for WF-[ID]"

# Or manually:
python aggregate-overview.py .workflows/active/WF-[ID] --stdout
```

### Component Doc Template (Per-Task)

Each agent generates a **structured** component doc with YAML frontmatter for easy parsing:

```markdown
---
# REQUIRED: Structured metadata for aggregation
name: ComponentName
code: Cn
status: completed
tests_passed: 12
tests_total: 12
dependencies: []
signals:
  - "@value"
  - ">onClick"
modifiers:
  - "#primary"
  - "^disabled"
complexity: S  # S/M/L
---

# ComponentName

Brief one-line description of the component.

## DSL Pattern
\`\`\`
Cn "Label" @binding #primary
\`\`\`

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | Display text |
| binding | Signal | - | Two-way data binding |

## Signals
- `@value` - Two-way binding for component state
- `>onClick` - Emitted when component is clicked

## Examples
\`\`\`
Cn "Submit" #primary >onClick=submit
Cn @dynamicLabel ^disabled
\`\`\`

## Test Coverage
- Tests: 12 passing
- Coverage: 95%
```

**Why YAML frontmatter?**
- Python aggregation parses metadata without regex guessing
- Consistent structure across all components
- Easy filtering (e.g., "show only components with >10 tests")
- Schema validation possible

### CHANGELOG.md Format
```markdown
# Changelog: WF-[ID] - [NAME]

## Files Created
- `src/components/button.tsx` - Button component
- `tests/button.test.ts` - Button tests (12 passing)

## Files Modified
- `src/components/index.ts` - Added button export

## Dependencies Added
- `recharts@2.12.0` - Chart components

## Documentation Generated
- `docs/components/button.component.md`
- `docs/MODULE.md` (aggregated)
- `docs/OVERVIEW.md` (aggregated)
```

---

## 12. DOCUMENTATION AGGREGATION

### Pre-built Scripts

All workflow scripts are available in `.context/workflows/scripts/`:

```
.context/workflows/scripts/
├── README.md                   # Complete usage documentation
│
├── # Documentation Scripts (Python)
├── init-workflow.py            # Initialize new workflow directory
├── validate-frontmatter.py     # Validate YAML frontmatter in component docs
├── collect-docs.py             # Gather docs from project to workflow folder
├── aggregate-module.py         # Generate MODULE.md from component docs
├── aggregate-overview.py       # Generate OVERVIEW.md (ephemeral)
│
├── # TypeScript/TSX Validation Scripts (Shell)
├── validate-typescript.sh      # Run tsc + ESLint + Prettier
├── validate-wave.sh            # Full checkpoint validation (build + typecheck + test + lint)
├── run-tests.sh                # Run tests with optional pattern filtering
│
├── # Code Generation Scripts (Python)
├── check-exports.py            # Verify all components exported from barrel
└── generate-barrel.py          # Auto-generate index.ts with all exports
```

**Prerequisites:**
```bash
pip install pyyaml
```

**Quick Start:**
```bash
# Initialize workflow
python .context/workflows/scripts/init-workflow.py WF-0001 "UI Components"

# After agents complete, validate code
.context/workflows/scripts/validate-wave.sh @repo/liquid-render

# Check barrel exports
python .context/workflows/scripts/check-exports.py src/components/index.ts src/components/

# Collect and validate docs
python .context/workflows/scripts/collect-docs.py .workflows/active/WF-0001-ui-components \
  "src/**/*.component.md"
python .context/workflows/scripts/validate-frontmatter.py .workflows/active/WF-0001-ui-components/docs/components/
python .context/workflows/scripts/aggregate-module.py docs/components docs/MODULE.md

# View overview
python .context/workflows/scripts/aggregate-overview.py .workflows/active/WF-0001-ui-components
```

### Python Aggregator Scripts (Reference)

The workflow includes Python scripts to aggregate component docs into higher-level documentation.

#### aggregate-module.py

Aggregates all `*.component.md` files into `MODULE.md`:

```python
#!/usr/bin/env python3
"""
Aggregate component documentation into MODULE.md
Usage: python aggregate-module.py <components_dir> <output_file>
"""
import sys
from pathlib import Path
from datetime import datetime

def aggregate_module(components_dir: Path, output_file: Path):
    """Aggregate component docs into a module overview."""
    components = sorted(components_dir.glob("*.component.md"))

    if not components:
        print(f"No component docs found in {components_dir}")
        return

    lines = [
        f"# Module Documentation",
        f"",
        f"**Generated:** {datetime.now().isoformat()}",
        f"**Components:** {len(components)}",
        f"",
        f"---",
        f"",
        f"## Components Index",
        f"",
        f"| Component | File | Description |",
        f"|-----------|------|-------------|",
    ]

    # Build index
    for comp in components:
        name = comp.stem.replace(".component", "")
        content = comp.read_text()
        # Extract first line after # heading as description
        desc_lines = [l for l in content.split("\n") if l and not l.startswith("#")]
        desc = desc_lines[0][:60] + "..." if desc_lines else "No description"
        lines.append(f"| {name.title()} | `{comp.name}` | {desc} |")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Component Details",
        f"",
    ])

    # Include full content of each component
    for comp in components:
        content = comp.read_text()
        lines.append(content)
        lines.append("")
        lines.append("---")
        lines.append("")

    output_file.write_text("\n".join(lines))
    print(f"Generated {output_file} with {len(components)} components")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python aggregate-module.py <components_dir> <output_file>")
        sys.exit(1)

    aggregate_module(Path(sys.argv[1]), Path(sys.argv[2]))
```

#### aggregate-overview.py

Aggregates `MODULE.md` and `STATUS.yaml` into `OVERVIEW.md`:

```python
#!/usr/bin/env python3
"""
Aggregate MODULE.md and STATUS.yaml into OVERVIEW.md (ephemeral by default)
Usage:
  python aggregate-overview.py <workflow_dir>           # Print to stdout (ephemeral)
  python aggregate-overview.py <workflow_dir> --save    # Save to file (rare)
"""
import sys
from pathlib import Path
from datetime import datetime
import yaml

def aggregate_overview(workflow_dir: Path, save_to_file: bool = False):
    """Create high-level overview from module docs and status.

    By default, prints to stdout (ephemeral). Use --save to write to file.
    """
    docs_dir = workflow_dir / "docs"
    module_file = docs_dir / "MODULE.md"
    status_file = workflow_dir / "STATUS.yaml"

    # Load status
    status = {}
    if status_file.exists():
        status = yaml.safe_load(status_file.read_text()) or {}

    # Load module (just the index table)
    module_index = ""
    if module_file.exists():
        content = module_file.read_text()
        # Extract just the components index table
        in_table = False
        table_lines = []
        for line in content.split("\n"):
            if "| Component |" in line:
                in_table = True
            if in_table:
                if line.startswith("|"):
                    table_lines.append(line)
                elif table_lines:
                    break
        module_index = "\n".join(table_lines)

    # Calculate stats
    total_tests = status.get("test_results", {}).get("total", 0)
    passed_tests = status.get("test_results", {}).get("passed", 0)
    waves = status.get("waves", {})
    completed_waves = sum(1 for w in waves.values()
                         if isinstance(w, dict) and w.get("status") == "complete")

    lines = [
        f"# Workflow Overview: {status.get('workflow', 'Unknown')}",
        f"",
        f"**ID:** {status.get('workflow_id', 'N/A')}",
        f"**Status:** {status.get('overall_status', 'unknown')}",
        f"**Generated:** {datetime.now().isoformat()}",
        f"",
        f"---",
        f"",
        f"## Progress Summary",
        f"",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Waves Completed | {completed_waves}/{len(waves)} |",
        f"| Tests Passing | {passed_tests}/{total_tests} |",
        f"| Overall Status | {status.get('overall_status', 'N/A')} |",
        f"",
        f"---",
        f"",
        f"## Components",
        f"",
        module_index or "No components documented yet.",
        f"",
        f"---",
        f"",
        f"## Quick Links",
        f"",
        f"- [Full Module Documentation](MODULE.md)",
        f"- [Status Tracking](../STATUS.yaml)",
        f"- [Changelog](../CHANGELOG.md)",
        f"",
    ]

    output = "\n".join(lines)

    if save_to_file:
        output_file = docs_dir / "OVERVIEW.md"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(output)
        print(f"Saved to {output_file}", file=sys.stderr)
    else:
        # Default: ephemeral (stdout only)
        print(output)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python aggregate-overview.py <workflow_dir> [--save]")
        sys.exit(1)

    save = "--save" in sys.argv
    workflow_dir = Path(sys.argv[1])
    aggregate_overview(workflow_dir, save_to_file=save)
```

### Aggregation Strategy

Documentation aggregation is **conditional** based on workflow size to avoid wasteful regeneration:

```yaml
aggregation_strategy:
  # Small workflows: Skip intermediate MODULE.md, generate only at end
  small_workflow:
    threshold: 3  # components or fewer
    after_each_wave: false
    after_complete:
      - "python aggregate-module.py docs/components docs/MODULE.md"

  # Large workflows: Incremental aggregation after each wave
  large_workflow:
    threshold: 4  # components or more
    after_each_wave:
      - "python aggregate-module.py docs/components docs/MODULE.md"
    after_complete:
      - "python aggregate-module.py docs/components docs/MODULE.md"

  # OVERVIEW.md is ephemeral - only generated on-demand, never stored
  overview:
    storage: ephemeral
    generation: on_demand
    command: "python aggregate-overview.py . --stdout"

  # On-demand regeneration (always available)
  on_demand:
    module: "python aggregate-module.py docs/components docs/MODULE.md"
    overview: "python aggregate-overview.py . --stdout"
    full: "claude 'Show workflow overview for WF-[ID]'"
```

### Aggregation Decision Logic

```
IF workflow.total_tasks <= 3:
  # Small workflow - defer aggregation
  SKIP after-wave aggregation
  GENERATE MODULE.md only at workflow completion
ELSE:
  # Large workflow - incremental aggregation
  AFTER each wave: regenerate MODULE.md
  AT completion: regenerate both MODULE.md and OVERVIEW.md
```

### Integration with Orchestrator Loop

**Step 5: After wave checkpoint passes**

```
5. IF all tasks in current wave complete:
     RUN checkpoint validation (pnpm test && pnpm build)
     IF checkpoint passes:
       # COLLECT: Copy agent-generated docs to workflow docs folder
       FOR each completed task T in wave:
         IF T generated component.md:
           COPY T.output_path/[name].component.md → docs/components/
           VALIDATE: Check YAML frontmatter is present and valid

       # AGGREGATE: Only for large workflows (>3 tasks)
       IF workflow.total_tasks > 3:
         RUN: python aggregate-module.py docs/components docs/MODULE.md

       ADVANCE to next wave
       UPDATE STATUS.yaml
       PRESENT results to user
```

**Step 6: Final wave (completion)**

```
6. IF final wave complete:
     RUN final validation

     # COLLECT: Ensure all component docs gathered
     FOR each task T in workflow:
       VERIFY docs/components/[T.name].component.md exists

     # AGGREGATE: Always generate MODULE.md at completion
     RUN: python aggregate-module.py docs/components docs/MODULE.md

     # NOTE: OVERVIEW.md is ephemeral - do NOT generate to file
     # It will be generated on-demand when user requests it

     GENERATE SUMMARY.md and CHANGELOG.md
     PRESENT completion report to user:
       - Files created
       - Tests passed
       - "Run 'claude show workflow overview' for full overview"
     SET overall_status = complete
```

**Agent Output Collection Details:**

Agents write component docs directly to project paths. The orchestrator must:

1. **Track expected outputs** in STATUS.yaml:
   ```yaml
   tasks:
     T1:
       expected_docs:
         - src/renderer/components/button.component.md
   ```

2. **Copy to workflow docs folder** after task completion:
   ```bash
   cp src/renderer/components/button.component.md \
      .workflows/active/WF-[ID]/docs/components/
   ```

3. **Validate frontmatter** before aggregation:
   ```python
   # Quick validation
   with open(doc) as f:
       content = f.read()
       if not content.startswith('---'):
           raise ValueError(f"{doc} missing YAML frontmatter")
   ```

---

## 13. QUALITY GATES

### Code Quality
```yaml
- No TypeScript errors (strict mode)
- No ESLint errors
- No console.log in production code
- All exports documented with JSDoc
```

### Test Quality
```yaml
- Minimum [X]% coverage per file
- At least [N] test cases per task
- Edge cases covered (null, empty, error states)
```

### Design Quality
```yaml
- Consistent with design system
- Responsive (mobile-first)
- Accessible (ARIA labels, keyboard nav)
- Dark mode support (if applicable)
```
````

---

## INSTANTIATION EXAMPLES

### Example 1: React Components

```yaml
PROJECT_NAME: "LiquidCode Renderer"
TASK_DESCRIPTION: "Production UI Components"
BASE_DIRECTORY: "/packages/liquid-render/src/renderer/components"
language: typescript
framework: react
styling: tailwind
design_system: shadcn
package_manager: pnpm

REQUIRED_READING:
  - docs/COMPONENT-GUIDE.md
  - specs/LIQUID-RENDER-SPEC.md

DEPENDENCIES:
  - {name: recharts, version: "^2.12.0", workspace: "@repo/liquid-render"}

TASKS:
  - {id: C1, name: KPICard, file: kpi-card.tsx, priority: P0, deps: []}
  - {id: C2, name: DataTable, file: data-table.tsx, priority: P0, deps: []}
  - {id: C3, name: LineChart, file: line-chart.tsx, priority: P1, deps: [C1, recharts]}
```

### Example 2: API Endpoints

```yaml
PROJECT_NAME: "User Service API"
TASK_DESCRIPTION: "REST Endpoints"
BASE_DIRECTORY: "/src/api/routes"
language: typescript
framework: express
testing: jest
package_manager: pnpm

TASKS:
  - {id: E1, name: UserCreate, file: user-create.ts, priority: P0}
  - {id: E2, name: UserRead, file: user-read.ts, priority: P0}
  - {id: E3, name: UserUpdate, file: user-update.ts, priority: P1, deps: [E2]}
  - {id: E4, name: UserDelete, file: user-delete.ts, priority: P1, deps: [E2]}
```

---

## QUICK START COMMANDS

### Initialize Workflow System
```bash
claude "Initialize workflow system:
1. Create .workflows/ directory structure
2. Create registry.yaml with next_id: 1
3. Create README.md with quick reference
Confirm structure created."
```

### Create and Approve Workflow
```bash
# Step 1: Create proposal
claude "Create workflow for [YOUR TASK].
Use MASTER-WORKFLOW-GENERATOR.md template.
Show me the proposal for approval."

# Step 2: Review and approve (or request changes)
# User: "Approved" or "Change X to Y"

# Step 3: Execute (after approval)
claude "Start the approved workflow."
```

### Monitor Active Workflow
```bash
claude "Show workflow status."
```

---

## ARTIFACT FLOW

```
Wave Execution                    Artifact Lifecycle
─────────────────                  ──────────────────

Agent T1 writes code ─────────────▶ Directly to project path
                                    (with exclusive file ownership)
                                           │
                                           │ (isolated by file)
                                           ▼
Checkpoint validates ─────────────▶ pnpm test && pnpm build
                                           │
                                           │ (only on success)
                                           ▼
Wave complete ───────────────────▶ Next wave starts
                                           │
                                           │ (all waves done)
                                           ▼
Workflow complete ───────────────▶ Generate CHANGELOG.md
                                   Archive to .workflows/completed/
```

---

## QUICK REFERENCE CARD

```
WORKFLOW SYSTEM COMMANDS
========================

Initialize:     claude "Initialize .workflows/ structure"
Create:         claude "Create workflow for [TASK]"
Approve:        User says "approved" or "proceed"
Start:          claude "Start approved workflow WF-[ID]"
Status:         claude "Show workflow status"
Resume:         claude "Resume workflow WF-[ID]"
Complete:       claude "Finalize workflow WF-[ID]"
Fail:           claude "Mark workflow WF-[ID] as failed"
Rollback:       claude "Rollback workflow WF-[ID]"
List:           claude "List all workflows"

VALIDATION SCRIPTS
==================
.context/workflows/scripts/

validate-wave.sh [WORKSPACE]     # Full checkpoint (build+test+lint)
validate-typescript.sh [WS]      # tsc + ESLint + Prettier
run-tests.sh [PATTERN] [WS]      # Run tests with filter
check-exports.py INDEX DIR       # Verify barrel exports
generate-barrel.py DIR           # Auto-generate index.ts

DOCUMENTATION SCRIPTS
=====================
init-workflow.py ID NAME         # Initialize workflow directory
validate-frontmatter.py PATH     # Validate YAML frontmatter
collect-docs.py WF_DIR PATTERN   # Gather component docs
aggregate-module.py DIR OUT      # Generate MODULE.md
aggregate-overview.py WF_DIR     # Generate OVERVIEW (ephemeral)

FOLDER STRUCTURE
================
.workflows/
├── registry.yaml      # Master index
├── templates/         # Reusable templates
├── queue/             # Awaiting approval
├── active/            # Currently running
├── completed/         # Successfully finished
└── failed/            # Failed (with postmortem)

WORKFLOW STATES
===============
queued (awaiting approval) → active → completed
                                  ↘→ failed
                                  ↘→ rolled_back

APPROVAL CHECKPOINTS
====================
1. Before workflow starts (proposal review)
2. Before each wave (execution plan)
3. After failures (retry/skip/abort decision)
4. Before rollback (confirm revert)
```
