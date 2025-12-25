---
description: 'Rollback a failed or problematic workflow'
---

# Workflow Rollback

Revert changes from a workflow.

## Arguments
- $ARGUMENTS: Workflow ID (required)

## Instructions

1. Find workflow in active/ or failed/

2. Read CHANGELOG.md for affected files

3. Present rollback plan:
   ```
   ## Rollback Plan: WF-[ID] - [NAME]

   ### Files to Revert
   - src/components/button.tsx (modified)
   - src/components/input.tsx (created - will delete)

   ### Exports to Remove
   - button, input from index.ts

   ### Safety Checks
   - [ ] No uncommitted changes outside workflow
   - [ ] Git history available

   **Confirm rollback?** Reply "yes" or "cancel"
   ```

4. On approval:

   For modified files:
   ```bash
   git checkout HEAD~[N] -- [file]
   ```

   For created files:
   ```bash
   rm -f [file]
   ```

   For barrel exports:
   ```bash
   python .context/workflows/scripts/generate-barrel.py src/components/
   ```

5. Validate rollback:
   ```bash
   .context/workflows/scripts/validate-wave.sh @repo/liquid-render
   ```

6. Move workflow:
   ```bash
   mv .workflows/[location]/WF-[ID]-[name] .workflows/failed/
   ```

7. Update STATUS.yaml:
   ```yaml
   overall_status: rolled_back
   rolled_back_at: [ISO timestamp]
   rollback_reason: "[user reason]"
   ```
