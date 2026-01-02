#!/usr/bin/env python3
"""
Knosia Inconsistency Aggregation Script

Loads all SUBTASK JSON files and generates analysis reports:
- master-matrix.md: Overview table of all issues
- dependency-graph.mermaid: Visual dependency diagram
- priority-ranked.md: Issues sorted by priority
- effort-breakdown.md: Time estimates and totals
"""

import json
import os
import csv
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

# Severity weights for priority calculation
SEVERITY_WEIGHTS = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1
}

# Effort estimates in hours
EFFORT_HOURS = {
    "15min": 0.25,
    "30min": 0.5,
    "1h": 1,
    "2h": 2,
    "4h": 4,
    "1d": 8,
    "2d": 16,
    "1w": 40,
    "unknown": 4  # Default estimate
}

def load_json_files(json_dir: Path) -> List[Dict[str, Any]]:
    """Load all SUBTASK JSON files"""
    subtasks = []
    for i in range(1, 11):
        file_path = json_dir / f"SUBTASK{i}.json"
        if file_path.exists():
            with open(file_path, 'r') as f:
                subtasks.append(json.load(f))
        else:
            print(f"Warning: {file_path} not found")
    return subtasks

def generate_master_matrix(subtasks: List[Dict], output_path: Path):
    """Generate master overview table with ALL issues"""
    with open(output_path, 'w') as f:
        f.write("# Knosia Inconsistency Master Matrix\n\n")
        f.write("Generated from 10 SUBTASK analysis documents.\n\n")

        # Summary stats
        total_issues = sum(s['summary']['total_issues'] for s in subtasks)
        total_critical = sum(s['summary'].get('critical', 0) for s in subtasks)
        total_high = sum(s['summary'].get('high', 0) for s in subtasks)
        total_medium = sum(s['summary'].get('medium', 0) for s in subtasks)
        total_low = sum(s['summary'].get('low', 0) for s in subtasks)

        f.write("## Overview\n\n")
        f.write(f"- **Total Issues**: {total_issues}\n")
        f.write(f"- **Critical**: {total_critical}\n")
        f.write(f"- **High**: {total_high}\n")
        f.write(f"- **Medium**: {total_medium}\n")
        f.write(f"- **Low**: {total_low}\n\n")

        # Domain breakdown table
        f.write("## Domain Breakdown\n\n")
        f.write("| Subtask | Domain | Total | Critical | High | Medium | Low |\n")
        f.write("|---------|--------|-------|----------|------|--------|-----|\n")

        for subtask in sorted(subtasks, key=lambda s: s['subtask_id']):
            summary = subtask['summary']
            f.write(f"| {subtask['subtask_id']} | ")
            f.write(f"{subtask['domain']} | ")
            f.write(f"{summary['total_issues']} | ")
            f.write(f"{summary.get('critical', 0)} | ")
            f.write(f"{summary.get('high', 0)} | ")
            f.write(f"{summary.get('medium', 0)} | ")
            f.write(f"{summary.get('low', 0)} |\n")

        # ALL issues by severity
        for severity_level in ['critical', 'high', 'medium', 'low']:
            f.write(f"\n## {severity_level.upper()} Issues\n\n")

            has_issues = False
            for subtask in subtasks:
                issues = [i for i in subtask['issues'] if i['severity'] == severity_level]
                if issues:
                    has_issues = True
                    f.write(f"### {subtask['subtask_id']}: {subtask['domain']}\n\n")
                    for issue in issues:
                        f.write(f"**{issue['id']}**: {issue['title']}\n")
                        f.write(f"- **Affects**: {', '.join(issue['affected_systems'])}\n")
                        f.write(f"- **Effort**: {issue.get('effort_estimate', 'unknown')}\n")
                        if issue.get('blocks'):
                            f.write(f"- **Blocks**: {', '.join(issue['blocks'])}\n")
                        if issue.get('blocked_by'):
                            f.write(f"- **Blocked By**: {', '.join(issue['blocked_by'])}\n")
                        f.write(f"- **Current**: {issue['current_state']}\n")
                        f.write(f"- **Desired**: {issue['desired_state']}\n\n")

            if not has_issues:
                f.write(f"*No {severity_level} issues found.*\n\n")

def generate_dependency_graph(subtasks: List[Dict], output_path: Path):
    """Generate Mermaid dependency diagram"""
    with open(output_path, 'w') as f:
        f.write("# Dependency Graph\n\n")
        f.write("```mermaid\n")
        f.write("graph TD\n")

        # Track all blocking relationships
        blocks_map = defaultdict(list)

        for subtask in subtasks:
            subtask_id = subtask['subtask_id']
            for issue in subtask['issues']:
                if issue.get('blocks'):
                    for blocked in issue['blocks']:
                        blocks_map[subtask_id].append(blocked)

        # Create nodes
        for subtask in subtasks:
            sid = subtask['subtask_id']
            domain = subtask['domain']
            critical = subtask['summary'].get('critical', 0)

            # Style based on severity
            if critical > 0:
                f.write(f"    {sid}[\"{sid}<br/>{domain}<br/>{critical} critical\"]:::critical\n")
            else:
                f.write(f"    {sid}[\"{sid}<br/>{domain}\"]:::normal\n")

        # Create edges
        for blocker, blocked_list in blocks_map.items():
            for blocked in set(blocked_list):
                f.write(f"    {blocker} --> {blocked}\n")

        # Styles
        f.write("\n    classDef critical fill:#f88,stroke:#c00,stroke-width:2px\n")
        f.write("    classDef normal fill:#ddd,stroke:#999,stroke-width:1px\n")

        f.write("```\n\n")

        # Legend
        f.write("## Legend\n\n")
        f.write("- **Red nodes**: Contains critical issues\n")
        f.write("- **Arrows**: Dependency direction (A → B means A blocks B)\n")

def generate_priority_ranking(subtasks: List[Dict], output_path: Path):
    """Generate priority-ranked issue list"""
    all_issues = []

    # Collect all issues with metadata
    for subtask in subtasks:
        for issue in subtask['issues']:
            all_issues.append({
                **issue,
                'subtask_id': subtask['subtask_id'],
                'domain': subtask['domain'],
                'priority_score': SEVERITY_WEIGHTS[issue['severity']]
            })

    # Sort by severity (critical first), then by effort (quick wins)
    all_issues.sort(key=lambda i: (
        -i['priority_score'],  # Higher severity first
        EFFORT_HOURS.get(i.get('effort_estimate', 'unknown'), 4)  # Lower effort first
    ))

    with open(output_path, 'w') as f:
        f.write("# Priority-Ranked Issues\n\n")
        f.write("Issues sorted by severity (critical → low), then by effort (quick wins first).\n\n")

        current_severity = None
        for idx, issue in enumerate(all_issues, 1):
            severity = issue['severity']

            # Section headers
            if severity != current_severity:
                current_severity = severity
                f.write(f"\n## {severity.upper()} Priority\n\n")

            f.write(f"### {idx}. {issue['id']} - {issue['title']}\n\n")
            f.write(f"- **Domain**: {issue['domain']} ({issue['subtask_id']})\n")
            f.write(f"- **Effort**: {issue.get('effort_estimate', 'unknown')}\n")
            f.write(f"- **Affects**: {', '.join(issue['affected_systems'])}\n")

            if issue.get('blocks'):
                f.write(f"- **Blocks**: {', '.join(issue['blocks'])}\n")
            if issue.get('blocked_by'):
                f.write(f"- **Blocked by**: {', '.join(issue['blocked_by'])}\n")

            f.write(f"- **Current**: {issue['current_state']}\n")
            f.write(f"- **Desired**: {issue['desired_state']}\n")

            if issue.get('files_affected'):
                f.write(f"- **Files**: {', '.join(issue['files_affected'][:3])}")
                if len(issue['files_affected']) > 3:
                    f.write(f" (+{len(issue['files_affected']) - 3} more)")
                f.write("\n")

            f.write("\n")

def generate_effort_breakdown(subtasks: List[Dict], output_path: Path):
    """Generate effort estimates and breakdown"""
    with open(output_path, 'w') as f:
        f.write("# Effort Breakdown\n\n")

        # Total effort by domain
        f.write("## Total Effort by Domain\n\n")
        f.write("| Domain | Issues | Total Hours | Total Days |\n")
        f.write("|--------|--------|-------------|------------|\n")

        grand_total_hours = 0

        for subtask in sorted(subtasks, key=lambda s: s['subtask_id']):
            total_hours = sum(
                EFFORT_HOURS.get(issue.get('effort_estimate', 'unknown'), 4)
                for issue in subtask['issues']
            )
            grand_total_hours += total_hours
            total_days = total_hours / 8

            f.write(f"| {subtask['domain']} | ")
            f.write(f"{subtask['summary']['total_issues']} | ")
            f.write(f"{total_hours:.1f}h | ")
            f.write(f"{total_days:.1f}d |\n")

        f.write(f"| **TOTAL** | **{sum(s['summary']['total_issues'] for s in subtasks)}** | ")
        f.write(f"**{grand_total_hours:.1f}h** | **{grand_total_hours/8:.1f}d** |\n\n")

        # Effort by severity
        f.write("## Effort by Severity\n\n")
        severity_effort = defaultdict(float)
        severity_count = defaultdict(int)

        for subtask in subtasks:
            for issue in subtask['issues']:
                severity = issue['severity']
                effort = EFFORT_HOURS.get(issue.get('effort_estimate', 'unknown'), 4)
                severity_effort[severity] += effort
                severity_count[severity] += 1

        f.write("| Severity | Count | Total Hours | Avg Hours/Issue |\n")
        f.write("|----------|-------|-------------|------------------|\n")

        for severity in ['critical', 'high', 'medium', 'low']:
            if severity in severity_effort:
                count = severity_count[severity]
                hours = severity_effort[severity]
                avg = hours / count if count > 0 else 0
                f.write(f"| {severity.capitalize()} | {count} | {hours:.1f}h | {avg:.1f}h |\n")

        # Execution timeline scenarios
        f.write("\n## Execution Timeline Scenarios\n\n")
        f.write(f"**Total effort**: {grand_total_hours:.1f} hours ({grand_total_hours/8:.1f} days)\n\n")

        f.write("### Sequential Execution\n")
        f.write(f"- 1 developer: **{grand_total_hours/8:.1f} working days** (~{grand_total_hours/8/5:.1f} weeks)\n\n")

        f.write("### Parallel Execution (realistic)\n")
        f.write("Assuming parallelizable work after resolving blockers:\n")
        f.write(f"- 2 developers: **~{grand_total_hours/8/2:.1f} working days** (~{grand_total_hours/8/2/5:.1f} weeks)\n")
        f.write(f"- 3 developers: **~{grand_total_hours/8/3:.1f} working days** (~{grand_total_hours/8/3/5:.1f} weeks)\n\n")

        # Critical path estimate
        critical_hours = sum(
            EFFORT_HOURS.get(issue.get('effort_estimate', 'unknown'), 4)
            for subtask in subtasks
            for issue in subtask['issues']
            if issue['severity'] == 'critical'
        )

        f.write(f"### Critical Path Only\n")
        f.write(f"**{critical_hours:.1f} hours** ({critical_hours/8:.1f} days) to resolve all critical issues\n\n")

def generate_csv_export(subtasks: List[Dict], output_path: Path):
    """Generate CSV with kanban tracking columns + context + prompt"""
    all_issues = []

    # Collect all issues with metadata
    for subtask in subtasks:
        for issue in subtask['issues']:
            # Build context for agent
            context = f"Domain: {subtask['domain']}\n"
            context += f"Issue: {issue['title']}\n"
            context += f"Current: {issue['current_state']}\n"
            context += f"Desired: {issue['desired_state']}\n"
            if issue.get('description'):
                context += f"Details: {issue['description']}\n"
            context += f"Affected Systems: {', '.join(issue['affected_systems'])}\n"
            if issue.get('blocks'):
                context += f"Blocks: {', '.join(issue['blocks'])}\n"
            if issue.get('blocked_by'):
                context += f"Blocked By: {', '.join(issue['blocked_by'])}\n"

            # Build prompt for agent
            prompt = f"Fix {issue['id']}: {issue['title']}\n\n"
            prompt += f"**Current State**: {issue['current_state']}\n\n"
            prompt += f"**Desired State**: {issue['desired_state']}\n\n"
            prompt += f"**Fix Type**: {issue.get('fix_type', 'unknown')}\n\n"

            if issue.get('files_affected'):
                prompt += f"**Files to Modify**:\n"
                for file in issue['files_affected']:
                    prompt += f"- {file}\n"
                prompt += "\n"

            prompt += f"**Steps**:\n"
            if issue.get('fix_type') == 'doc_update':
                prompt += "1. Read the file(s)\n"
                prompt += "2. Update documentation to reflect desired state\n"
                prompt += "3. Verify consistency across related docs\n"
            elif issue.get('fix_type') == 'schema_change':
                prompt += "1. Update schema definition in packages/db/src/schema/knosia.ts\n"
                prompt += "2. Generate migration: pnpm with-env -F @turbostarter/db db:generate\n"
                prompt += "3. Review migration file\n"
                prompt += "4. Apply migration: pnpm with-env -F @turbostarter/db db:migrate\n"
            elif issue.get('fix_type') in ['api_update', 'addition']:
                prompt += "1. Read existing code\n"
                prompt += "2. Implement required changes\n"
                prompt += "3. Update related files (schemas, queries, mutations)\n"
                prompt += "4. Test API endpoint manually\n"
            elif issue.get('fix_type') == 'ui_update':
                prompt += "1. Read existing components\n"
                prompt += "2. Implement UI changes\n"
                prompt += "3. Update routes/layouts if needed\n"
                prompt += "4. Test in browser\n"
            else:
                prompt += "1. Analyze current implementation\n"
                prompt += "2. Make required changes\n"
                prompt += "3. Verify against desired state\n"

            all_issues.append({
                'issue_id': issue['id'],
                'subtask': subtask['subtask_id'],
                'domain': subtask['domain'],
                'title': issue['title'],
                'severity': issue['severity'],
                'effort_estimate': issue.get('effort_estimate', 'unknown'),
                'effort_hours': EFFORT_HOURS.get(issue.get('effort_estimate', 'unknown'), 4),
                'status': 'not_started',
                'assignee': '',
                'blocks': ', '.join(issue.get('blocks', [])),
                'blocked_by': ', '.join(issue.get('blocked_by', [])),
                'affected_systems': ', '.join(issue['affected_systems']),
                'fix_type': issue.get('fix_type', ''),
                'current_state': issue['current_state'],
                'desired_state': issue['desired_state'],
                'files_affected': '; '.join(issue.get('files_affected', [])),
                'context': context,
                'prompt': prompt,
                'date_started': '',
                'date_completed': '',
                'notes': ''
            })

    # Sort by severity, then effort
    all_issues.sort(key=lambda i: (
        -SEVERITY_WEIGHTS[i['severity']],
        i['effort_hours']
    ))

    # Write CSV
    fieldnames = [
        'issue_id', 'subtask', 'domain', 'title', 'severity',
        'effort_estimate', 'effort_hours', 'status', 'assignee',
        'blocks', 'blocked_by', 'affected_systems', 'fix_type',
        'current_state', 'desired_state', 'files_affected',
        'context', 'prompt',
        'date_started', 'date_completed', 'notes'
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_issues)

def generate_file_centric_csv(subtasks: List[Dict], output_path: Path):
    """Generate file-centric CSV for parallel agent execution"""
    file_issues_map = defaultdict(list)

    # Group issues by file
    for subtask in subtasks:
        for issue in subtask['issues']:
            files = issue.get('files_affected', [])
            if not files:
                # No specific files - group under domain
                files = [f"[{subtask['domain']}]"]

            for file_path in files:
                file_issues_map[file_path].append({
                    **issue,
                    'subtask_id': subtask['subtask_id'],
                    'domain': subtask['domain']
                })

    # Build file-centric rows
    file_rows = []
    for file_path, issues in file_issues_map.items():
        # Calculate aggregate metrics
        issue_ids = [i['id'] for i in issues]
        severities = [i['severity'] for i in issues]
        total_hours = sum(EFFORT_HOURS.get(i.get('effort_estimate', 'unknown'), 4) for i in issues)

        # Highest severity wins
        severity_priority = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        max_severity = max(severities, key=lambda s: severity_priority[s])

        # Build combined context
        context = f"File: {file_path}\n"
        context += f"Total Issues: {len(issues)}\n"
        context += f"Severity: {max_severity}\n"
        context += f"Estimated Effort: {total_hours:.1f}h\n\n"
        context += "Issues to fix:\n"
        for issue in issues:
            context += f"\n{issue['id']}: {issue['title']}\n"
            context += f"  Current: {issue['current_state']}\n"
            context += f"  Desired: {issue['desired_state']}\n"

        # Build combined prompt
        prompt = f"Fix all issues in: {file_path}\n\n"
        prompt += f"You need to address {len(issues)} issue(s) in this file:\n\n"

        for idx, issue in enumerate(issues, 1):
            prompt += f"## Issue {idx}: {issue['id']} - {issue['title']}\n\n"
            prompt += f"**Severity**: {issue['severity']}\n"
            prompt += f"**Current State**: {issue['current_state']}\n"
            prompt += f"**Desired State**: {issue['desired_state']}\n"
            prompt += f"**Fix Type**: {issue.get('fix_type', 'unknown')}\n\n"

        prompt += "**Instructions**:\n"
        prompt += "1. Read the current file content\n"
        prompt += "2. Address each issue listed above\n"
        prompt += "3. Ensure all changes are consistent\n"
        prompt += "4. Verify the file compiles/validates\n"
        prompt += "5. Report what was changed\n"

        file_rows.append({
            'file_path': file_path,
            'issue_count': len(issues),
            'issue_ids': ', '.join(issue_ids),
            'max_severity': max_severity,
            'total_effort_hours': round(total_hours, 1),
            'affected_systems': ', '.join(set(
                sys for issue in issues
                for sys in issue['affected_systems']
            )),
            'fix_types': ', '.join(set(
                issue.get('fix_type', '') for issue in issues
            )),
            'context': context,
            'prompt': prompt,
            'status': 'not_started',
            'assignee': '',
            'notes': ''
        })

    # Sort by severity, then effort
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    file_rows.sort(key=lambda r: (
        severity_order[r['max_severity']],
        -r['total_effort_hours']
    ))

    # Write CSV
    fieldnames = [
        'file_path', 'issue_count', 'issue_ids', 'max_severity',
        'total_effort_hours', 'affected_systems', 'fix_types',
        'context', 'prompt', 'status', 'assignee', 'notes'
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(file_rows)

def main():
    """Main execution"""
    script_dir = Path(__file__).parent
    json_dir = script_dir / "json"

    print("Loading JSON files...")
    subtasks = load_json_files(json_dir)
    print(f"Loaded {len(subtasks)} subtask files")

    print("\nGenerating reports...")

    print("  → master-matrix.md (all issues)")
    generate_master_matrix(subtasks, script_dir / "master-matrix.md")

    print("  → dependency-graph.mermaid")
    generate_dependency_graph(subtasks, script_dir / "dependency-graph.md")

    print("  → priority-ranked.md")
    generate_priority_ranking(subtasks, script_dir / "priority-ranked.md")

    print("  → effort-breakdown.md")
    generate_effort_breakdown(subtasks, script_dir / "effort-breakdown.md")

    print("  → issues-tracker.csv (kanban + context + prompt)")
    generate_csv_export(subtasks, script_dir / "issues-tracker.csv")

    print("  → file-fix-plan.csv (file-centric for parallel agents)")
    generate_file_centric_csv(subtasks, script_dir / "file-fix-plan.csv")

    print("\n✅ All reports generated successfully!")
    print(f"\nReports location: {script_dir}")

if __name__ == "__main__":
    main()
