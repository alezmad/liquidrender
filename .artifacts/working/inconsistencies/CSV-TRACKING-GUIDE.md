# Knosia Issues CSV Tracker - Usage Guide

**File**: `issues-tracker.csv`
**Total Issues**: 99 (100 rows with header)

---

## Overview

The CSV file contains all 99 issues with **kanban-style tracking columns** for managing implementation progress. Import this into:
- **Excel/Google Sheets** - Filter, sort, assign work
- **Notion/Airtable** - Full kanban board visualization
- **Linear/Jira** - Bulk import (may need field mapping)
- **GitHub Projects** - CSV import feature

---

## Column Reference

### Identification
- **issue_id** - Unique ID (e.g., `DB-001`, `API-042`, `GLUE-005`)
- **subtask** - Source subtask (SUBTASK1 through SUBTASK10)
- **domain** - Category (e.g., `database-schema`, `api-structure`)

### Issue Details
- **title** - Short description
- **severity** - `critical` | `high` | `medium` | `low`
- **effort_estimate** - Human-readable (e.g., `15min`, `2h`, `1d`, `1w`)
- **effort_hours** - Numeric hours (for summing/filtering)

### Tracking (Kanban Columns)
- **status** - Current state:
  - `not_started` (default for all)
  - `in_progress`
  - `blocked`
  - `in_review`
  - `completed`
- **assignee** - Who's working on it (empty by default)
- **date_started** - When work began (YYYY-MM-DD format)
- **date_completed** - When finished (YYYY-MM-DD format)
- **notes** - Free-form tracking notes

### Dependencies
- **blocks** - Comma-separated list of subtasks this issue blocks
- **blocked_by** - Comma-separated list of subtasks blocking this issue
- **affected_systems** - Which systems are impacted (e.g., `api, ui, database`)

### Implementation
- **fix_type** - Type of fix:
  - `schema_change` - Database migration needed
  - `api_update` - Backend code change
  - `ui_update` - Frontend code change
  - `doc_update` - Documentation only
  - `refactor` - Code restructure
  - `addition` - New code/feature
  - `removal` - Delete code
- **current_state** - What exists now (the problem)
- **desired_state** - What should exist (the solution)
- **files_affected** - Semicolon-separated file paths

---

## Workflow Examples

### 1. Filter by Status (Kanban Board)
```
Column: status
- Filter = "not_started" → Backlog
- Filter = "in_progress" → Active Work
- Filter = "in_review" → Code Review
- Filter = "completed" → Done
```

### 2. Find Critical Path (What to Fix First)
```
Sort by:
1. severity (A→Z to get critical first)
2. effort_hours (smallest to largest)

Filter: blocked_by (is empty) → Shows unblocked issues
```

### 3. Assign Work to Team
```
1. Sort by severity + effort
2. Assign critical/high issues with low effort first (quick wins)
3. Fill assignee column with names
4. Export filtered view per person
```

### 4. Track Progress
```
When starting work:
- Update status = "in_progress"
- Fill date_started = today's date
- Add assignee name

When blocked:
- Update status = "blocked"
- Add notes = "Waiting for X" or "Need help with Y"

When completing:
- Update status = "completed"
- Fill date_completed = today's date
```

### 5. Calculate Team Velocity
```
Weekly:
- Count rows where status = "completed" this week
- Sum effort_hours for completed issues
- Calculate: Average hours per issue

Use to estimate: Remaining hours ÷ Weekly velocity = Weeks to completion
```

---

## Pre-sorted by Priority

The CSV is **already sorted** by:
1. Severity (critical → low)
2. Effort (smallest → largest within each severity)

**Critical issues** (rows 2-18) should be tackled first. They block downstream work.

---

## Dependency Management

### Using "blocks" and "blocked_by" columns

**Example**:
```
GLUE-001 blocks SUBTASK9
  ↓
Find all issues with blocked_by = "SUBTASK9"
These can only start after GLUE-001 is completed
```

**Workflow**:
1. Focus on issues with **empty "blocked_by"** (unblocked)
2. Complete those first
3. Mark as completed
4. Now issues they were blocking become unblocked
5. Repeat

---

## Excel/Sheets Tips

### Conditional Formatting
```
Status column:
- "not_started" → Gray
- "in_progress" → Yellow
- "blocked" → Red
- "in_review" → Blue
- "completed" → Green
```

### Formulas
```
# Count by status
=COUNTIF(status_column, "completed")

# Total hours remaining
=SUMIF(status_column, "not_started", effort_hours_column)

# Critical issues remaining
=COUNTIFS(severity_column, "critical", status_column, "<>completed")
```

### Pivot Table
```
Rows: domain
Columns: status
Values: Count of issue_id

Shows completion progress per domain
```

---

## Import to Notion/Airtable

### Notion
1. Create new database
2. Import → CSV file → Select `issues-tracker.csv`
3. Convert to Board view
4. Group by: `status`
5. Add filters for severity, assignee

### Airtable
1. Create new base
2. Import data → CSV → Select `issues-tracker.csv`
3. Add "Single Select" field for status (with colors)
4. Add "Link to another record" for dependencies
5. Create Kanban view grouped by status

---

## Sample Queries

### Show me critical issues I can work on now
```
Filter:
- severity = "critical"
- blocked_by = (empty)
- status = "not_started"

Sort by: effort_hours (ascending)
```

### Show all documentation-only fixes
```
Filter:
- fix_type = "doc_update"

Sort by: effort_hours
```

### Find all issues affecting the API
```
Filter:
- affected_systems contains "api"

Sort by: severity, effort_hours
```

### Show unblocked quick wins (< 1 hour)
```
Filter:
- effort_hours < 1
- blocked_by = (empty)
- status = "not_started"

Sort by: severity (critical first)
```

---

## Updating Status as You Work

**Recommended workflow**:

```
Day 1:
- Filter: severity = critical, blocked_by = empty
- Pick top 3 issues
- Assign to yourself
- Change status → "in_progress"
- Fill date_started

Day 2-3:
- Complete first issue
- Change status → "completed"
- Fill date_completed
- Move to next issue

Weekly:
- Review blocked items (status = "blocked")
- Unblock if dependencies resolved
- Re-prioritize based on remaining work
```

---

## Generated Reports Reference

This CSV complements other generated reports:

1. **`master-matrix.md`** - All 99 issues organized by severity (38KB)
2. **`priority-ranked.md`** - Same issues sorted by priority (52KB)
3. **`dependency-graph.md`** - Visual dependency diagram (Mermaid)
4. **`effort-breakdown.md`** - Time estimates by domain/severity
5. **`issues-tracker.csv`** - THIS FILE (47KB) - Kanban tracking

**Use CSV for**: Day-to-day tracking, assignments, progress monitoring
**Use Markdown for**: Understanding context, technical details, planning

---

## Tips for Success

1. **Update status daily** - Keeps team aligned
2. **Use notes column** - Track blockers, questions, decisions
3. **Review dependencies weekly** - Unblock issues as work progresses
4. **Celebrate quick wins** - Knock out 15min issues between big tasks
5. **Track velocity** - Use completed effort_hours to estimate timeline
6. **Export filtered views** - Share personalized lists per team member

---

## Questions?

- **"How do I know what to work on next?"** → Filter by severity=critical, blocked_by=empty
- **"Can I add custom columns?"** → Yes! Add sprint number, PR link, etc.
- **"Should I edit the CSV directly?"** → Yes, it's yours to track work
- **"What if issues change?"** → Re-run `python3 aggregate.py` to regenerate from JSON sources

**Source data**: `.artifacts/working/inconsistencies/json/SUBTASK*.json`
**Regenerate anytime**: Just run the Python script if JSON changes
