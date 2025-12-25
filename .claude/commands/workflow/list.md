---
description: 'List all workflows (queued, active, completed, failed)'
---

# Workflow List

Show all workflows by status.

## Instructions

1. Read registry if exists:
   ```bash
   cat .workflows/registry.yaml 2>/dev/null
   ```

2. Scan directories:
   ```bash
   ls -la .workflows/queue/ 2>/dev/null
   ls -la .workflows/active/ 2>/dev/null
   ls -la .workflows/completed/ 2>/dev/null
   ls -la .workflows/failed/ 2>/dev/null
   ```

3. Present summary:
   ```
   ## Workflows

   ### Active (1)
   | ID | Name | Wave | Progress |
   |----|------|------|----------|
   | WF-0041 | UI Components | 2/4 | 8/12 tasks |

   ### Queued (1)
   | ID | Name | Created |
   |----|------|---------|
   | WF-0042 | Feature XYZ | 2024-12-24 |

   ### Completed (38)
   | ID | Name | Completed | Duration |
   |----|------|-----------|----------|
   | WF-0040 | Database Setup | 2024-12-23 | 2h 30m |
   | WF-0039 | Auth System | 2024-12-22 | 1h 45m |
   [show last 5]

   ### Failed (2)
   | ID | Name | Reason |
   |----|------|--------|
   | WF-0038 | Broken Feature | Dependency conflict |

   ---
   Total: 42 workflows (38 completed, 2 failed, 1 active, 1 queued)
   ```

4. Quick commands:
   ```
   /workflow:create [task]   Create new workflow
   /workflow:status          Check active workflow
   /workflow:resume [ID]     Resume interrupted workflow
   /workflow:launch [ID]     Launch in fresh session
   ```
