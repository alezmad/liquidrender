#!/usr/bin/env python3
"""
Workflow Registry Update

Updates registry.yaml and metrics.yaml when workflow state changes.

Usage:
    python update-registry.py <action> <workflow_id> [options]

Actions:
    create   - Register a new workflow
    start    - Mark workflow as started
    complete - Mark workflow as completed and add to metrics
    fail     - Mark workflow as failed
    move     - Move workflow between locations

Examples:
    python update-registry.py create WF-0008 --name "New Feature" --location active
    python update-registry.py complete WF-0008
    python update-registry.py move WF-0008 --from active --to completed
"""

import argparse
import os
import sys
import yaml
from datetime import datetime
from pathlib import Path

# Workflow root directory
WORKFLOWS_ROOT = Path(__file__).parent.parent.parent.parent / ".workflows"
REGISTRY_FILE = WORKFLOWS_ROOT / "registry.yaml"
METRICS_FILE = WORKFLOWS_ROOT / "metrics.yaml"


def load_yaml(path: Path) -> dict:
    """Load YAML file, return empty dict if not found."""
    if not path.exists():
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def save_yaml(path: Path, data: dict):
    """Save data to YAML file."""
    with open(path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def format_duration(seconds: int) -> str:
    """Format seconds to human readable duration."""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins}m {secs}s" if secs else f"{mins}m"
    else:
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        return f"{hours}h {mins}m" if mins else f"{hours}h"


def update_stats(registry: dict):
    """Recalculate stats from workflows."""
    stats = {'total_workflows': 0, 'queued': 0, 'active': 0, 'completed': 0, 'failed': 0}

    for wf in registry.get('workflows', {}).values():
        stats['total_workflows'] += 1
        location = wf.get('location', '')
        if location in stats:
            stats[location] += 1

    registry['stats'] = stats


def action_create(registry: dict, workflow_id: str, args):
    """Register a new workflow."""
    now = datetime.now().isoformat()

    # Get next ID if not provided
    if not workflow_id:
        workflow_id = f"WF-{registry.get('next_id', 1):04d}"
        registry['next_id'] = registry.get('next_id', 1) + 1

    workflows = registry.setdefault('workflows', {})

    workflows[workflow_id] = {
        'name': args.name or workflow_id,
        'dirname': args.dirname or f"{workflow_id}-{args.name.lower().replace(' ', '-')}" if args.name else workflow_id,
        'location': args.location or 'active',
        'status': 'pending',
        'created_at': now,
        'updated_at': now,
        'started_at': '',
        'completed_at': '',
        'current_wave': 0,
        'total_tasks': args.tasks or 0,
        'completed_tasks': 0,
    }

    update_stats(registry)
    print(f"Created: {workflow_id} - {args.name}")
    return workflow_id


def action_start(registry: dict, workflow_id: str, args):
    """Mark workflow as started."""
    workflows = registry.get('workflows', {})

    if workflow_id not in workflows:
        print(f"Error: Workflow {workflow_id} not found")
        sys.exit(1)

    now = datetime.now().isoformat()
    workflows[workflow_id]['status'] = 'in_progress'
    workflows[workflow_id]['started_at'] = now
    workflows[workflow_id]['updated_at'] = now

    print(f"Started: {workflow_id}")


def action_complete(registry: dict, metrics: dict, workflow_id: str, args):
    """Mark workflow as completed and add to metrics."""
    workflows = registry.get('workflows', {})

    if workflow_id not in workflows:
        print(f"Error: Workflow {workflow_id} not found")
        sys.exit(1)

    wf = workflows[workflow_id]
    now = datetime.now().isoformat()

    wf['status'] = 'completed'
    wf['completed_at'] = now
    wf['updated_at'] = now
    wf['location'] = 'completed'

    # Calculate duration
    if wf.get('started_at'):
        try:
            start = datetime.fromisoformat(wf['started_at'].replace('Z', '+00:00'))
            end = datetime.now()
            duration_s = int((end - start).total_seconds())
            wf['duration_s'] = duration_s
            wf['duration'] = format_duration(duration_s)
        except Exception:
            pass

    update_stats(registry)

    # Add to metrics history
    history = metrics.setdefault('history', [])
    history.insert(0, {
        'workflow_id': workflow_id,
        'name': wf.get('name', ''),
        'started_at': wf.get('started_at', ''),
        'completed_at': now,
        'duration': wf.get('duration', ''),
        'duration_s': wf.get('duration_s', 0),
        'tasks_completed': wf.get('completed_tasks', wf.get('total_tasks', 0)),
    })
    metrics['last_updated'] = now

    print(f"Completed: {workflow_id} ({wf.get('duration', 'unknown')})")


def action_fail(registry: dict, workflow_id: str, args):
    """Mark workflow as failed."""
    workflows = registry.get('workflows', {})

    if workflow_id not in workflows:
        print(f"Error: Workflow {workflow_id} not found")
        sys.exit(1)

    now = datetime.now().isoformat()
    workflows[workflow_id]['status'] = 'failed'
    workflows[workflow_id]['location'] = 'failed'
    workflows[workflow_id]['updated_at'] = now
    if args.reason:
        workflows[workflow_id]['failure_reason'] = args.reason

    update_stats(registry)
    print(f"Failed: {workflow_id}")


def action_move(registry: dict, workflow_id: str, args):
    """Move workflow between locations."""
    workflows = registry.get('workflows', {})

    if workflow_id not in workflows:
        print(f"Error: Workflow {workflow_id} not found")
        sys.exit(1)

    if not args.to:
        print("Error: --to location required")
        sys.exit(1)

    workflows[workflow_id]['location'] = args.to
    workflows[workflow_id]['updated_at'] = datetime.now().isoformat()

    update_stats(registry)
    print(f"Moved: {workflow_id} -> {args.to}")


def action_update(registry: dict, workflow_id: str, args):
    """Update workflow fields."""
    workflows = registry.get('workflows', {})

    if workflow_id not in workflows:
        print(f"Error: Workflow {workflow_id} not found")
        sys.exit(1)

    wf = workflows[workflow_id]
    wf['updated_at'] = datetime.now().isoformat()

    if args.status:
        wf['status'] = args.status
    if args.wave is not None:
        wf['current_wave'] = args.wave
    if args.tasks is not None:
        wf['total_tasks'] = args.tasks
    if args.completed is not None:
        wf['completed_tasks'] = args.completed

    print(f"Updated: {workflow_id}")


def main():
    parser = argparse.ArgumentParser(description='Update workflow registry')
    parser.add_argument('action', choices=['create', 'start', 'complete', 'fail', 'move', 'update', 'sync'])
    parser.add_argument('workflow_id', nargs='?', default='')
    parser.add_argument('--name', help='Workflow name')
    parser.add_argument('--dirname', help='Directory name')
    parser.add_argument('--location', help='Location (queue/active/completed/failed)')
    parser.add_argument('--to', help='Target location for move')
    parser.add_argument('--reason', help='Failure reason')
    parser.add_argument('--status', help='Workflow status')
    parser.add_argument('--wave', type=int, help='Current wave number')
    parser.add_argument('--tasks', type=int, help='Total tasks')
    parser.add_argument('--completed', type=int, help='Completed tasks')

    args = parser.parse_args()

    # Load registry and metrics
    registry = load_yaml(REGISTRY_FILE)
    metrics = load_yaml(METRICS_FILE)

    # Ensure defaults
    if 'next_id' not in registry:
        registry['next_id'] = 1
    if 'workflows' not in registry:
        registry['workflows'] = {}

    # Execute action
    if args.action == 'create':
        action_create(registry, args.workflow_id, args)
    elif args.action == 'start':
        action_start(registry, args.workflow_id, args)
    elif args.action == 'complete':
        action_complete(registry, metrics, args.workflow_id, args)
    elif args.action == 'fail':
        action_fail(registry, args.workflow_id, args)
    elif args.action == 'move':
        action_move(registry, args.workflow_id, args)
    elif args.action == 'update':
        action_update(registry, args.workflow_id, args)
    elif args.action == 'sync':
        # Just run the sync script
        import subprocess
        subprocess.run([sys.executable, str(Path(__file__).parent / 'sync-registry.py')])
        return

    # Save files
    save_yaml(REGISTRY_FILE, registry)
    save_yaml(METRICS_FILE, metrics)


if __name__ == "__main__":
    main()
