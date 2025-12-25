#!/usr/bin/env python3
"""
Verify context integrity for workflow resume.

Compares current file state against CONTEXT-LIBRARY.yaml to detect
drift (files changed since workflow started). Provides options for
resume, refresh, or restart.

Usage:
  python verify-context.py <workflow_dir>

Examples:
  $ python verify-context.py .workflows/active/WF-0006-context-management

Output:
  - Files that have changed since context was gathered
  - Files that have been deleted
  - Recommendation for resume strategy
"""
import sys
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("Error: PyYAML required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


def file_hash(path: Path) -> Optional[str]:
    """Generate truncated SHA-256 hash matching gather-context format."""
    if not path.exists():
        return None
    try:
        content = path.read_text(encoding='utf-8', errors='ignore')
        full_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        return f"sha256:{full_hash[:12]}"
    except Exception:
        return None


def load_context_library(workflow_dir: Path) -> Optional[Dict]:
    """Load CONTEXT-LIBRARY.yaml from workflow directory."""
    context_file = workflow_dir / 'CONTEXT-LIBRARY.yaml'
    if not context_file.exists():
        return None

    try:
        with open(context_file) as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading CONTEXT-LIBRARY.yaml: {e}", file=sys.stderr)
        return None


def verify_files(manifest: Dict, base_path: Path = None) -> Dict:
    """Verify all context files against stored hashes."""
    if base_path is None:
        base_path = Path.cwd()

    results = {
        'verified_at': datetime.now().isoformat(),
        'total_files': 0,
        'unchanged': [],
        'changed': [],
        'deleted': [],
        'errors': []
    }

    # Check all source categories
    sources = manifest.get('sources', {})
    for category, files in sources.items():
        if not isinstance(files, list):
            continue

        for file_info in files:
            path_str = file_info.get('path', '')
            stored_hash = file_info.get('hash', '')

            results['total_files'] += 1

            # Resolve path
            file_path = base_path / path_str

            # Check if file exists
            if not file_path.exists():
                results['deleted'].append({
                    'path': path_str,
                    'category': category,
                    'stored_hash': stored_hash
                })
                continue

            # Compare hashes
            current_hash = file_hash(file_path)
            if current_hash is None:
                results['errors'].append({
                    'path': path_str,
                    'error': 'Could not read file'
                })
                continue

            if current_hash == stored_hash:
                results['unchanged'].append({
                    'path': path_str,
                    'category': category,
                    'hash': current_hash
                })
            else:
                results['changed'].append({
                    'path': path_str,
                    'category': category,
                    'stored_hash': stored_hash,
                    'current_hash': current_hash
                })

    return results


def get_resume_recommendation(results: Dict) -> Tuple[str, str]:
    """
    Determine recommended resume strategy.

    Returns: (recommendation, explanation)
    """
    changed_count = len(results['changed'])
    deleted_count = len(results['deleted'])
    total = results['total_files']

    if changed_count == 0 and deleted_count == 0:
        return ('RESUME', 'All context files unchanged. Safe to continue.')

    if deleted_count > 0:
        return ('RESTART', f'{deleted_count} required files deleted. Workflow may fail.')

    # Calculate drift percentage
    drift_pct = (changed_count / total) * 100 if total > 0 else 0

    if drift_pct <= 10:
        return ('RESUME_OR_REFRESH',
                f'{changed_count} files changed ({drift_pct:.0f}%). Minor drift - can resume or refresh.')

    if drift_pct <= 30:
        return ('REFRESH',
                f'{changed_count} files changed ({drift_pct:.0f}%). Recommend refreshing context.')

    return ('RESTART',
            f'{changed_count} files changed ({drift_pct:.0f}%). Significant drift - restart recommended.')


def print_verification_report(manifest: Dict, results: Dict):
    """Print human-readable verification report."""
    workflow_id = manifest.get('workflow_id', 'Unknown')
    created_at = manifest.get('created_at', 'Unknown')

    recommendation, explanation = get_resume_recommendation(results)

    print("\n" + "=" * 65)
    print(f"CONTEXT INTEGRITY CHECK: {workflow_id}")
    print("=" * 65)

    print(f"\nContext gathered: {created_at}")
    print(f"Verified at: {results['verified_at']}")

    # Summary stats
    print(f"\n📊 FILES CHECKED: {results['total_files']}")
    print(f"   ✓ Unchanged: {len(results['unchanged'])}")
    print(f"   ⚠ Changed: {len(results['changed'])}")
    print(f"   ✗ Deleted: {len(results['deleted'])}")

    # Show changed files
    if results['changed']:
        print(f"\n⚠ CHANGED FILES ({len(results['changed'])})")
        print("-" * 40)
        for f in results['changed']:
            print(f"  {f['path']}")
            print(f"    was: {f['stored_hash']}")
            print(f"    now: {f['current_hash']}")

    # Show deleted files
    if results['deleted']:
        print(f"\n✗ DELETED FILES ({len(results['deleted'])})")
        print("-" * 40)
        for f in results['deleted']:
            print(f"  {f['path']} (was: {f['stored_hash']})")

    # Recommendation
    print("\n" + "=" * 65)
    print(f"RECOMMENDATION: {recommendation}")
    print(f"  {explanation}")
    print("=" * 65)

    # Options
    print("\nOptions:")
    print("  [R] RESUME   - Continue with original context (ignore changes)")
    print("  [U] UPDATE   - Re-read changed files into context")
    print("  [S] RESTART  - Reset to Wave 0 with fresh context")
    print("  [X] ABORT    - Cancel resume")
    print()


def update_context_library(workflow_dir: Path, results: Dict) -> bool:
    """Update CONTEXT-LIBRARY.yaml with verification results."""
    context_file = workflow_dir / 'CONTEXT-LIBRARY.yaml'
    if not context_file.exists():
        return False

    try:
        with open(context_file) as f:
            manifest = yaml.safe_load(f)

        # Update integrity section
        manifest['integrity'] = {
            'last_verified': results['verified_at'],
            'files_changed': len(results['changed']),
            'files_deleted': len(results['deleted']),
            'drift_details': [
                {
                    'path': f['path'],
                    'status': 'changed',
                    'original_hash': f['stored_hash'],
                    'current_hash': f['current_hash']
                }
                for f in results['changed']
            ] + [
                {
                    'path': f['path'],
                    'status': 'deleted',
                    'original_hash': f['stored_hash'],
                    'current_hash': None
                }
                for f in results['deleted']
            ]
        }

        # Update context mode if resuming
        if results['changed'] or results['deleted']:
            manifest['context_mode'] = 'resume'

        with open(context_file, 'w') as f:
            yaml.dump(manifest, f, default_flow_style=False, sort_keys=False)

        return True
    except Exception as e:
        print(f"Error updating CONTEXT-LIBRARY.yaml: {e}", file=sys.stderr)
        return False


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    workflow_dir = Path(sys.argv[1])
    if not workflow_dir.exists():
        print(f"Error: Workflow directory not found: {workflow_dir}", file=sys.stderr)
        sys.exit(1)

    # Load context manifest
    manifest = load_context_library(workflow_dir)
    if manifest is None:
        print(f"Error: No CONTEXT-LIBRARY.yaml found in {workflow_dir}", file=sys.stderr)
        print("Run gather-context.py first to generate the context manifest.")
        sys.exit(1)

    # Verify files
    results = verify_files(manifest)

    # Output
    if '--json' in sys.argv:
        import json
        output = {
            'workflow_id': manifest.get('workflow_id'),
            'recommendation': get_resume_recommendation(results),
            'results': results
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        print_verification_report(manifest, results)

    # Update context library with verification results
    if '--update' in sys.argv:
        if update_context_library(workflow_dir, results):
            print("✓ Updated CONTEXT-LIBRARY.yaml with verification results")

    # Exit code based on drift
    recommendation, _ = get_resume_recommendation(results)
    if recommendation == 'RESUME':
        sys.exit(0)
    elif recommendation in ('RESUME_OR_REFRESH', 'REFRESH'):
        sys.exit(1)  # Warning
    else:
        sys.exit(2)  # Critical - restart needed


if __name__ == "__main__":
    main()
