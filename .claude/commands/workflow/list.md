---
description: 'List all workflows (queued, active, completed, failed)'
---

# Workflow List

Show all workflows by status from the central registry.

## Instructions

### 1. Read Registry

Read `.workflows/registry.yaml` which contains the central workflow index.

If registry doesn't exist or is stale, sync it first:
```bash
python .context/workflows/scripts/sync-registry.py
```

### 2. Parse and Display

From registry.yaml, group workflows by location and present:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  WORKFLOW REGISTRY                                    Last sync: [timestamp]  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Total: [N] workflows | Active: [X] | Completed: [Y] | Queued: [Z] | Failed: [F] ║
╚═══════════════════════════════════════════════════════════════════════════════╝

### Active ([N])

| ID | Name | Status | Wave | Tasks | Updated |
|----|------|--------|------|-------|---------|
| WF-0007 | TypeScript Error Remediation | in_progress | 0 | 0/5 | 2h ago |
| WF-0005 | CustomBlock LLM Integration | in_progress | 0 | 0/8 | 4h ago |
| WF-0002 | Quality Remediation | pending | 0 | 0/31 | 1h ago |
| WF-0001 | Quality Audit | in_progress | 0 | 0/27 | 2h ago |

### Completed ([N])

| ID | Name | Duration | Tasks | Completed |
|----|------|----------|-------|-----------|
| WF-0006 | Context Management System | 15m | 6/6 | Dec 25 |
| WF-0003 | Missing Components | 7h 56m | 10/10 | Dec 26 |

### Queued ([N])
(none)

### Failed ([N])
(none)
```

### 3. Time Formatting

Format timestamps relative to now:
- Less than 1 hour: "Xm ago"
- Less than 24 hours: "Xh ago"
- Less than 7 days: "Mon", "Tue", etc.
- Older: "Dec 25", "Nov 12", etc.

### 4. Quick Commands

```
## Commands

| Command | Purpose |
|---------|---------|
| `/workflow:create [task]` | Create new workflow |
| `/workflow:status` | Check active workflow details |
| `/workflow:resume [ID]` | Resume interrupted workflow |
| `/workflow:launch [ID]` | Launch in fresh session |
| `/workflow:complete [ID]` | Finalize completed workflow |
| `/workflow:rollback [ID]` | Revert failed workflow |
```

### 5. Sync if Needed

If registry seems out of date (mismatch between registry and directories):
```bash
python .context/workflows/scripts/sync-registry.py
```

Then re-read and display updated data.

### 6. Metrics Summary (Optional)

If user asks for metrics or history, also read `.workflows/metrics.yaml`:

```
## Recent History

| Workflow | Duration | Tasks | When |
|----------|----------|-------|------|
| WF-0006 | 15m | 6 | Dec 25 |
| WF-0003 | 7h 56m | 10 | Dec 26 |

## Averages
- Avg workflow duration: 4h 5m
- Avg tasks per workflow: 8
- Completion rate: 92%
```
