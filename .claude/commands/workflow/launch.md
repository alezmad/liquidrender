---
description: 'Launch a workflow in a fresh context from WORKFLOW-LAUNCHER.md'
---

# Workflow Launch

Bootstrap a workflow from its launcher file in a fresh session.

## Arguments
- $ARGUMENTS: Workflow ID (e.g., "WF-0006")

## Instructions

### 1. Find Workflow Launcher

```bash
# Locate workflow directory
ls -d .workflows/active/WF-$ARGUMENTS-*/
```

Read the launcher file:
`.workflows/active/WF-[ID]-[name]/WORKFLOW-LAUNCHER.md`

### 2. Load Context from CONTEXT-LIBRARY.yaml

Read `.workflows/active/WF-[ID]-[name]/CONTEXT-LIBRARY.yaml`

For each file in `sources.core`:
- Read the file
- Verify it exists and matches expected tokens

```
Loading context...
├── [1/4] specs/LIQUID-RENDER-SPEC.md (4,200 tokens)
├── [2/4] docs/COMPONENT-GUIDE.md (1,800 tokens)
├── [3/4] components/utils.ts (800 tokens)
└── [4/4] types/index.ts (600 tokens)
Total: 7,400 tokens loaded
```

### 3. Read Workflow State

Read `.workflows/active/WF-[ID]-[name]/STATUS.yaml`

Extract:
- `status`: Current workflow status (approved, in_progress, etc.)
- `current_wave`: Wave number to resume from
- `tasks`: List of tasks and their states

### 4. Display Launch Summary

```
╔═══════════════════════════════════════════════════════════════╗
║  LAUNCHED: WF-[ID] - [NAME]                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Context loaded: X,XXX tokens (Y files)                       ║
║  Resuming from: Wave [N]                                      ║
║                                                               ║
║  Pending tasks:                                               ║
║  • T3: Card component (in_progress)                           ║
║  • T4: Modal component (pending)                              ║
║  • T5: Dropdown component (pending)                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 5. Check User Notes

If WORKFLOW-LAUNCHER.md has content in "User Notes" section:
```
╔═══════════════════════════════════════════════════════════════╗
║  USER NOTES FROM PREVIOUS SESSION                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [Display user notes content here]                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 6. Confirm and Resume

```
Ready to resume workflow execution.

**Continue?** [Y/n]
```

On confirmation:
- Resume from current wave
- Launch parallel subtasks if applicable
- Follow standard workflow execution

### 7. Error Handling

If launcher file not found:
```
Error: Workflow WF-[ID] not found in .workflows/active/

Available workflows:
• WF-0005-dashboard (completed)
• WF-0006-context-management (in_progress)

Use: /workflow:launch WF-0006
```

If context files missing:
```
Warning: Some context files have changed since workflow creation:

Changed:
• specs/LIQUID-RENDER-SPEC.md (modified: 2024-12-25)

Deleted:
• old-file.md (no longer exists)

Options:
[R] Reload with current files
[U] Update CONTEXT-LIBRARY.yaml
[A] Abort and check manually
```

---

## Usage Examples

```bash
# Launch specific workflow
/workflow:launch WF-0006

# After copying WORKFLOW-LAUNCHER.md content to fresh session
# The content contains instructions to run:
/workflow:launch WF-0006
```

---

## File Dependencies

- `.workflows/active/WF-[ID]-[name]/WORKFLOW-LAUNCHER.md`
- `.workflows/active/WF-[ID]-[name]/CONTEXT-LIBRARY.yaml`
- `.workflows/active/WF-[ID]-[name]/STATUS.yaml`
