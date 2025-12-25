#!/usr/bin/env python3
"""
Pre-flight check for workflow execution.

Analyzes git state and context budget before starting a workflow.
Recommends commit if working tree is dirty.

Usage:
  python preflight-check.py [workflow_id] [--auto-commit]

Examples:
  $ python preflight-check.py WF-0006
  $ python preflight-check.py WF-0006 --auto-commit

Output:
  - Git state analysis (clean/dirty, uncommitted files)
  - Suggested commit message if dirty
  - Context budget preview
  - Go/no-go recommendation
"""
import sys
import subprocess
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple


def run_git(*args) -> Tuple[int, str, str]:
    """Run a git command and return (returncode, stdout, stderr)."""
    result = subprocess.run(
        ['git'] + list(args),
        capture_output=True,
        text=True
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def get_git_status() -> Dict:
    """Get comprehensive git status."""
    status = {
        'clean': True,
        'branch': '',
        'commit': '',
        'modified': [],
        'new': [],
        'deleted': [],
        'untracked': []
    }

    # Get current branch
    code, branch, _ = run_git('rev-parse', '--abbrev-ref', 'HEAD')
    if code == 0:
        status['branch'] = branch

    # Get current commit
    code, commit, _ = run_git('rev-parse', '--short', 'HEAD')
    if code == 0:
        status['commit'] = commit

    # Get porcelain status
    code, output, _ = run_git('status', '--porcelain')
    if code == 0 and output:
        status['clean'] = False
        for line in output.splitlines():
            if len(line) < 3:
                continue
            indicator = line[:2]
            filepath = line[3:]

            if indicator[0] == '?' or indicator[1] == '?':
                status['untracked'].append(filepath)
            elif indicator[0] == 'D' or indicator[1] == 'D':
                status['deleted'].append(filepath)
            elif indicator[0] == 'A' or indicator[0] == 'M' or indicator[1] == 'M':
                status['modified'].append(filepath)
            elif indicator[0] == 'A':
                status['new'].append(filepath)

    return status


def generate_commit_message(workflow_id: str, status: Dict) -> str:
    """Generate a conventional commit message for pre-workflow checkpoint."""
    file_count = (
        len(status['modified']) +
        len(status['new']) +
        len(status['deleted']) +
        len(status['untracked'])
    )

    return f"chore: pre-{workflow_id} checkpoint ({file_count} files)"


def check_existing_tag(workflow_id: str) -> Optional[str]:
    """Check if workflow start tag already exists."""
    tag_name = f"{workflow_id}-start"
    code, _, _ = run_git('rev-parse', tag_name)
    if code == 0:
        return tag_name
    return None


def print_status_box(title: str, lines: List[str], status_char: str = '│'):
    """Print a formatted status box."""
    width = 65
    print(f"┌{'─' * width}┐")
    print(f"│  {title:<{width-3}}│")
    print(f"├{'─' * width}┤")
    for line in lines:
        # Truncate long lines
        if len(line) > width - 4:
            line = line[:width-7] + '...'
        print(f"│  {line:<{width-3}}│")
    print(f"└{'─' * width}┘")


def main():
    workflow_id = sys.argv[1] if len(sys.argv) > 1 else 'WF-XXXX'
    auto_commit = '--auto-commit' in sys.argv

    # Get git status
    status = get_git_status()

    # Build output lines
    lines = []
    lines.append(f"Branch: {status['branch']}")
    lines.append(f"Commit: {status['commit']}")
    lines.append("")

    if status['clean']:
        lines.append("✓ Working tree is CLEAN")
        lines.append("")
        lines.append("Ready to start workflow.")
    else:
        total_changes = (
            len(status['modified']) +
            len(status['new']) +
            len(status['deleted']) +
            len(status['untracked'])
        )
        lines.append(f"⚠ Working tree is DIRTY ({total_changes} files)")
        lines.append("")

        if status['modified']:
            lines.append(f"Modified ({len(status['modified'])}):")
            for f in status['modified'][:5]:
                lines.append(f"  • {f}")
            if len(status['modified']) > 5:
                lines.append(f"  ... and {len(status['modified']) - 5} more")

        if status['untracked']:
            lines.append(f"Untracked ({len(status['untracked'])}):")
            for f in status['untracked'][:3]:
                lines.append(f"  • {f}")
            if len(status['untracked']) > 3:
                lines.append(f"  ... and {len(status['untracked']) - 3} more")

        lines.append("")
        lines.append("RECOMMENDED: Commit before workflow")
        lines.append(f"  git add -A && git commit -m \"{generate_commit_message(workflow_id, status)}\"")

    # Check for existing tag
    existing_tag = check_existing_tag(workflow_id)
    if existing_tag:
        lines.append("")
        lines.append(f"⚠ Tag '{existing_tag}' already exists")
        lines.append("  This workflow may have been started before.")

    print_status_box(f"PRE-FLIGHT CHECK: {workflow_id}", lines)

    # Output machine-readable status
    if '--json' in sys.argv:
        import json
        output = {
            'workflow_id': workflow_id,
            'git': status,
            'suggested_commit': generate_commit_message(workflow_id, status) if not status['clean'] else None,
            'ready': status['clean'],
            'existing_tag': existing_tag
        }
        print(json.dumps(output, indent=2))

    # Return appropriate exit code
    if status['clean']:
        sys.exit(0)
    else:
        sys.exit(1)  # Non-zero to indicate attention needed


if __name__ == "__main__":
    main()
