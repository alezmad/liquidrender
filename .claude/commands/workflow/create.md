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

- **Wave 0**: Bootstrap (types, barrel skeleton, dirs)
- **Wave 1-N**: Parallel tasks with exclusive file ownership
- **Final Wave**: Integration (wire exports, final validation)

### 4. Validation Scripts

After each wave, run:
```bash
.context/workflows/scripts/validate-wave.sh @repo/liquid-render
```

### 5. On Approval

1. Create `.workflows/active/WF-[ID]-[name]/`
2. Create STATUS.yaml
3. Begin Wave 0 bootstrap
4. Launch parallel agents for Wave 1

### 6. Show Available Commands

```
## Workflow Commands

| Command | Purpose |
|---------|---------|
| `/workflow:status` | Check current workflow progress |
| `/workflow:resume [ID]` | Resume an interrupted workflow |
| `/workflow:complete [ID]` | Finalize and archive a workflow |
| `/workflow:rollback [ID]` | Revert a failed workflow |
| `/workflow:list` | List all workflows by status |
| `/workflow:validate [type]` | Run validation (wave/full/exports/docs) |
```

Reference: `.context/workflows/MASTER-WORKFLOW-GENERATOR.md`
