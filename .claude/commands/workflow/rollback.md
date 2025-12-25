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

3. Check for workflow start tag:
   ```bash
   git tag -l "WF-[ID]-start"
   ```
   If tag exists, rollback is simplified using git reset.

4. Present rollback plan:
   ```
   ## Rollback Plan: WF-[ID] - [NAME]

   ### Git Checkpoint
   - Start tag: WF-[ID]-start (commit: abc123)
   - Current: def456
   - Commits to revert: 3

   ### Quick Rollback (if tag exists)
   git reset --hard WF-[ID]-start

   ### Manual Rollback (if no tag)
   Files to Revert:
   - src/components/button.tsx (modified)
   - src/components/input.tsx (created - will delete)

   ### Exports to Remove
   - button, input from index.ts

   ### Safety Checks
   - [ ] No uncommitted changes outside workflow
   - [ ] Git history available
   - [ ] WF-[ID]-start tag exists

   **Confirm rollback?** Reply "yes" or "cancel"
   ```

5. On approval:

   **If WF-[ID]-start tag exists (preferred):**
   ```bash
   git reset --hard WF-[ID]-start
   git tag -d WF-[ID]-start  # Clean up tag
   ```

   **If no tag (manual rollback):**

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

6. Validate rollback:
   ```bash
   .context/workflows/scripts/validate-wave.sh @repo/liquid-render
   ```

7. Move workflow:
   ```bash
   mv .workflows/[location]/WF-[ID]-[name] .workflows/failed/
   ```

8. Update STATUS.yaml:
   ```yaml
   overall_status: rolled_back
   rolled_back_at: [ISO timestamp]
   rollback_reason: "[user reason]"
   ```
