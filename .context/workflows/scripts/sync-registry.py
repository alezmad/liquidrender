#!/usr/bin/env python3
"""
Workflow Registry Sync

Scans all workflow directories and builds/updates:
- .workflows/registry.yaml (central index)
- .workflows/metrics.yaml (historical timing)

Usage:
    python sync-registry.py [--rebuild]

Options:
    --rebuild   Force full rebuild (default: incremental update)
"""

import os
import sys
import yaml
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

# Workflow root directory
WORKFLOWS_ROOT = Path(__file__).parent.parent.parent.parent / ".workflows"
REGISTRY_FILE = WORKFLOWS_ROOT / "registry.yaml"
METRICS_FILE = WORKFLOWS_ROOT / "metrics.yaml"

# Location directories
LOCATIONS = ["queue", "active", "completed", "failed"]


def parse_duration(duration_str: str) -> int:
    """Parse duration string like '7h 6m' or '35m' to seconds."""
    if not duration_str:
        return 0

    total_seconds = 0

    # Match hours
    hours_match = re.search(r'(\d+)h', duration_str)
    if hours_match:
        total_seconds += int(hours_match.group(1)) * 3600

    # Match minutes
    mins_match = re.search(r'(\d+)m', duration_str)
    if mins_match:
        total_seconds += int(mins_match.group(1)) * 60

    # Match seconds
    secs_match = re.search(r'(\d+)s', duration_str)
    if secs_match:
        total_seconds += int(secs_match.group(1))

    return total_seconds


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


def extract_workflow_id(dirname: str) -> Optional[str]:
    """Extract workflow ID from directory name like 'WF-0003-missing-components'."""
    match = re.match(r'(WF-\d+)', dirname)
    return match.group(1) if match else None


def extract_workflow_name(dirname: str) -> str:
    """Extract workflow name from directory name."""
    match = re.match(r'WF-\d+-(.+)', dirname)
    return match.group(1).replace('-', ' ').title() if match else dirname


def parse_status_yaml(status_path: Path) -> Dict[str, Any]:
    """Parse STATUS.yaml with various format support."""
    if not status_path.exists():
        return {}

    try:
        with open(status_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        print(f"  Warning: Could not parse {status_path}: {e}")
        return {}

    # Normalize different STATUS.yaml formats
    normalized = {}

    # Handle nested 'workflow:' key (WF-0003 format)
    if 'workflow' in data and isinstance(data['workflow'], dict):
        wf = data['workflow']
        normalized['id'] = wf.get('id', '')
        normalized['name'] = wf.get('name', '')
        normalized['status'] = wf.get('status', 'unknown')
        normalized['created_at'] = wf.get('created', '')
    else:
        # Flat format (WF-0001, WF-0002 format)
        normalized['id'] = data.get('workflow_id', data.get('id', ''))
        normalized['name'] = data.get('workflow', data.get('name', ''))
        normalized['status'] = data.get('overall_status', data.get('status', 'unknown'))
        normalized['created_at'] = data.get('started_at', data.get('started', ''))

    # Extract timing
    timing = data.get('timing', {})
    if timing:
        normalized['started_at'] = timing.get('started', timing.get('started_at', ''))
        normalized['completed_at'] = timing.get('completed', timing.get('completed_at', ''))
        normalized['interruptions'] = timing.get('interruptions', [])
    else:
        normalized['started_at'] = data.get('started_at', data.get('started', ''))
        normalized['completed_at'] = data.get('completed_at', '')

    # Count tasks
    waves = data.get('waves', [])
    if isinstance(waves, dict):
        # Old format with wave_0, wave_1 keys
        waves = list(waves.values())

    total_tasks = 0
    completed_tasks = 0
    for wave in waves:
        if isinstance(wave, dict):
            tasks = wave.get('tasks', [])
            if isinstance(tasks, dict):
                tasks = list(tasks.values())
            for task in tasks:
                if isinstance(task, dict):
                    total_tasks += 1
                    if task.get('status') == 'completed':
                        completed_tasks += 1

    normalized['total_tasks'] = total_tasks
    normalized['completed_tasks'] = completed_tasks
    normalized['current_wave'] = data.get('current_wave', 0)

    return normalized


def get_file_mtime(path: Path) -> str:
    """Get file modification time as ISO string."""
    if path.exists():
        mtime = os.path.getmtime(path)
        return datetime.fromtimestamp(mtime).isoformat()
    return ""


def scan_workflows() -> Dict[str, Dict[str, Any]]:
    """Scan all workflow directories and collect info."""
    workflows = {}

    for location in LOCATIONS:
        location_path = WORKFLOWS_ROOT / location
        if not location_path.exists():
            continue

        for entry in location_path.iterdir():
            if not entry.is_dir():
                continue

            workflow_id = extract_workflow_id(entry.name)
            if not workflow_id:
                # Handle special cases like WF-SPEC-AUDIT
                if entry.name.startswith('WF-'):
                    workflow_id = entry.name
                else:
                    continue

            status_path = entry / "STATUS.yaml"
            status_data = parse_status_yaml(status_path)

            # Build workflow entry
            wf_entry = {
                'name': status_data.get('name') or extract_workflow_name(entry.name),
                'dirname': entry.name,
                'location': location,
                'status': status_data.get('status', 'unknown'),
                'created_at': status_data.get('created_at') or status_data.get('started_at', ''),
                'updated_at': get_file_mtime(status_path) if status_path.exists() else get_file_mtime(entry),
                'started_at': status_data.get('started_at', ''),
                'completed_at': status_data.get('completed_at', ''),
                'current_wave': status_data.get('current_wave', 0),
                'total_tasks': status_data.get('total_tasks', 0),
                'completed_tasks': status_data.get('completed_tasks', 0),
            }

            # Calculate duration for completed workflows
            if wf_entry['completed_at'] and wf_entry['started_at']:
                try:
                    start = datetime.fromisoformat(wf_entry['started_at'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(wf_entry['completed_at'].replace('Z', '+00:00'))
                    duration_s = int((end - start).total_seconds())
                    wf_entry['duration_s'] = duration_s
                    wf_entry['duration'] = format_duration(duration_s)
                except Exception:
                    pass

            workflows[workflow_id] = wf_entry
            print(f"  Found: {workflow_id} ({location}) - {wf_entry['status']}")

    return workflows


def calculate_stats(workflows: Dict[str, Dict]) -> Dict[str, int]:
    """Calculate workflow statistics."""
    stats = {
        'total_workflows': len(workflows),
        'queued': 0,
        'active': 0,
        'completed': 0,
        'failed': 0,
    }

    for wf in workflows.values():
        location = wf.get('location', '')
        if location in stats:
            stats[location] += 1

    return stats


def get_next_id(workflows: Dict[str, Dict]) -> int:
    """Determine next workflow ID number."""
    max_id = 0
    for wf_id in workflows.keys():
        match = re.search(r'WF-(\d+)', wf_id)
        if match:
            max_id = max(max_id, int(match.group(1)))
    return max_id + 1


def build_metrics_history(workflows: Dict[str, Dict]) -> List[Dict]:
    """Build metrics history from completed workflows."""
    history = []

    for wf_id, wf in workflows.items():
        if wf.get('location') == 'completed' and wf.get('completed_at'):
            entry = {
                'workflow_id': wf_id,
                'name': wf.get('name', ''),
                'started_at': wf.get('started_at', ''),
                'completed_at': wf.get('completed_at', ''),
                'duration': wf.get('duration', ''),
                'duration_s': wf.get('duration_s', 0),
                'tasks_completed': wf.get('completed_tasks', 0),
            }
            history.append(entry)

    # Sort by completion time (newest first)
    # Handle mixed datetime/string types
    history.sort(key=lambda x: str(x.get('completed_at', '')), reverse=True)

    return history


def sync_registry(rebuild: bool = False):
    """Main sync function."""
    print("Syncing workflow registry...")
    print(f"  Scanning: {WORKFLOWS_ROOT}")

    # Scan all workflows
    workflows = scan_workflows()

    if not workflows:
        print("  No workflows found.")
        return

    # Calculate stats
    stats = calculate_stats(workflows)
    next_id = get_next_id(workflows)

    # Build registry
    registry = {
        'next_id': next_id,
        'last_sync': datetime.now().isoformat(),
        'workflows': workflows,
        'stats': stats,
    }

    # Write registry.yaml
    with open(REGISTRY_FILE, 'w') as f:
        yaml.dump(registry, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"  Wrote: {REGISTRY_FILE}")

    # Build and write metrics.yaml
    history = build_metrics_history(workflows)

    # Load existing metrics to preserve estimates
    existing_metrics = {}
    if METRICS_FILE.exists() and not rebuild:
        try:
            with open(METRICS_FILE) as f:
                existing_metrics = yaml.safe_load(f) or {}
        except Exception:
            pass

    metrics = {
        'estimates': existing_metrics.get('estimates', {
            'S': '30s-1min',
            'M': '1-3min',
            'L': '3-10min',
            'S_seconds': {'min': 30, 'max': 60, 'avg': 45},
            'M_seconds': {'min': 60, 'max': 180, 'avg': 120},
            'L_seconds': {'min': 180, 'max': 600, 'avg': 300},
        }),
        'history': history,
        'last_updated': datetime.now().isoformat(),
    }

    with open(METRICS_FILE, 'w') as f:
        yaml.dump(metrics, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"  Wrote: {METRICS_FILE}")

    # Summary
    print(f"\nRegistry Summary:")
    print(f"  Total workflows: {stats['total_workflows']}")
    print(f"  Active: {stats['active']}")
    print(f"  Completed: {stats['completed']}")
    print(f"  Queued: {stats['queued']}")
    print(f"  Failed: {stats['failed']}")
    print(f"  Next ID: WF-{next_id:04d}")


if __name__ == "__main__":
    rebuild = "--rebuild" in sys.argv
    sync_registry(rebuild=rebuild)
