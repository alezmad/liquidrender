#!/usr/bin/env python3
"""
Gather context files for a workflow and generate CONTEXT-LIBRARY.yaml.

Reads workflow configuration to determine required context files,
estimates token counts, applies budget constraints, and generates
a manifest for transparency and resume capability.

Usage:
  python gather-context.py <workflow_dir> [--budget=20000] [--output=CONTEXT-LIBRARY.yaml]

Examples:
  $ python gather-context.py .workflows/active/WF-0006-context-management
  $ python gather-context.py .workflows/active/WF-0006-context-management --budget=15000
"""
import sys
import os
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import subprocess

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("Warning: PyYAML not installed. Using basic output.", file=sys.stderr)


# Token estimation: ~4 chars per token
CHARS_PER_TOKEN = 4

# Default budget allocation
DEFAULT_BUDGET = {
    'total': 20000,
    'core': 8000,
    'wave_specific': 8000,
    'on_demand': 4000
}

# Common context file patterns by category
CONTEXT_PATTERNS = {
    'specs': ['specs/*.md', 'specs/**/*.md'],
    'guides': ['docs/*.md', 'docs/**/*.md'],
    'types': ['src/types/*.ts', 'src/**/types.ts'],
    'patterns': ['src/**/*.tsx'],  # Reference implementations
    'project': ['.context/CLAUDE.md', 'CLAUDE.md', '_bmad-output/*.md']
}


def estimate_tokens(content: str) -> int:
    """Estimate token count from content."""
    return len(content) // CHARS_PER_TOKEN


def file_hash(content: str) -> str:
    """Generate truncated SHA-256 hash."""
    full_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
    return f"sha256:{full_hash[:12]}"


def get_git_info() -> Dict:
    """Get current git state."""
    def run_git(*args):
        result = subprocess.run(
            ['git'] + list(args),
            capture_output=True,
            text=True
        )
        return result.stdout.strip() if result.returncode == 0 else None

    return {
        'branch': run_git('rev-parse', '--abbrev-ref', 'HEAD') or 'unknown',
        'commit': run_git('rev-parse', '--short', 'HEAD') or 'unknown',
        'was_clean': run_git('status', '--porcelain') == ''
    }


def analyze_file(path: Path, purpose: str = '') -> Optional[Dict]:
    """Analyze a file for context inclusion."""
    if not path.exists():
        return None

    try:
        content = path.read_text(encoding='utf-8', errors='ignore')
        return {
            'path': str(path),
            'hash': file_hash(content),
            'tokens': estimate_tokens(content),
            'loaded_at': datetime.now().isoformat(),
            'purpose': purpose
        }
    except Exception as e:
        print(f"Warning: Could not read {path}: {e}", file=sys.stderr)
        return None


def load_workflow_config(workflow_dir: Path) -> Dict:
    """Load workflow configuration to determine required context."""
    config = {
        'required_reading': [],
        'wave_context': {}
    }

    # Try to load WORKFLOW.md and parse required_reading section
    workflow_md = workflow_dir / 'WORKFLOW.md'
    if workflow_md.exists():
        content = workflow_md.read_text()
        # Simple extraction - look for yaml blocks after "Required Reading"
        # In production, use proper markdown/yaml parsing
        if 'required_reading:' in content.lower():
            # Extract paths mentioned
            import re
            paths = re.findall(r'path:\s*["\']?([^"\'}\n]+)["\']?', content)
            config['required_reading'] = paths

    # Try to load config.yaml
    config_yaml = workflow_dir / 'config.yaml'
    if config_yaml.exists() and HAS_YAML:
        try:
            with open(config_yaml) as f:
                yaml_config = yaml.safe_load(f)
                if yaml_config and 'context' in yaml_config:
                    config.update(yaml_config['context'])
        except Exception as e:
            print(f"Warning: Could not parse config.yaml: {e}", file=sys.stderr)

    return config


def find_context_files(base_path: Path, patterns: List[str]) -> List[Path]:
    """Find files matching glob patterns."""
    files = []
    for pattern in patterns:
        files.extend(base_path.glob(pattern))
    return sorted(set(files))


def gather_context(
    workflow_dir: Path,
    budget: Dict[str, int] = None,
    base_path: Path = None
) -> Dict:
    """Gather context files and generate manifest."""
    if budget is None:
        budget = DEFAULT_BUDGET.copy()
    if base_path is None:
        base_path = Path.cwd()

    workflow_id = workflow_dir.name.split('-')[0] + '-' + workflow_dir.name.split('-')[1]

    # Load workflow config
    config = load_workflow_config(workflow_dir)

    # Initialize manifest
    manifest = {
        'workflow_id': workflow_id,
        'created_at': datetime.now().isoformat(),
        'context_mode': 'fresh',
        'git_checkpoint': get_git_info(),
        'budget': budget,
        'sources': {
            'core': [],
        },
        'deferred': [],
        'integrity': {
            'last_verified': datetime.now().isoformat(),
            'files_changed': 0
        }
    }

    # Track token usage
    used_tokens = 0
    core_budget = budget['core']

    # 1. Always include core project context
    core_files = [
        (Path('.context/CLAUDE.md'), 'Project context hub'),
        (Path('CLAUDE.md'), 'Root agent instructions'),
    ]

    # Add files from required_reading
    for path_str in config.get('required_reading', []):
        path = Path(path_str)
        core_files.append((path, f'Required reading: {path.name}'))

    # 2. Analyze and budget core files
    for path, purpose in core_files:
        full_path = base_path / path if not path.is_absolute() else path
        if not full_path.exists():
            continue

        info = analyze_file(full_path, purpose)
        if info is None:
            continue

        if used_tokens + info['tokens'] <= core_budget:
            # Use relative path in manifest
            info['path'] = str(path)
            manifest['sources']['core'].append(info)
            used_tokens += info['tokens']
        else:
            manifest['deferred'].append({
                'path': str(path),
                'tokens': info['tokens'],
                'reason': f'Exceeds core budget ({core_budget} tokens)'
            })

    # 3. Look for spec files if budget allows
    spec_files = find_context_files(base_path, CONTEXT_PATTERNS['specs'])
    for spec_path in spec_files[:3]:  # Limit to top 3 specs
        info = analyze_file(spec_path, f'Specification: {spec_path.name}')
        if info is None:
            continue

        rel_path = spec_path.relative_to(base_path) if spec_path.is_relative_to(base_path) else spec_path

        if used_tokens + info['tokens'] <= core_budget:
            info['path'] = str(rel_path)
            manifest['sources']['core'].append(info)
            used_tokens += info['tokens']
        else:
            manifest['deferred'].append({
                'path': str(rel_path),
                'tokens': info['tokens'],
                'reason': 'Exceeds core budget'
            })

    # Add summary stats
    total_core_tokens = sum(f['tokens'] for f in manifest['sources']['core'])
    total_deferred_tokens = sum(f['tokens'] for f in manifest['deferred'])

    manifest['summary'] = {
        'core_files': len(manifest['sources']['core']),
        'core_tokens': total_core_tokens,
        'deferred_files': len(manifest['deferred']),
        'deferred_tokens': total_deferred_tokens,
        'budget_remaining': budget['total'] - total_core_tokens
    }

    return manifest


def print_context_summary(manifest: Dict):
    """Print a human-readable context summary."""
    print("\n" + "=" * 65)
    print("CONTEXT SUMMARY")
    print("=" * 65)

    summary = manifest.get('summary', {})
    budget = manifest.get('budget', {})

    print(f"\nWorkflow: {manifest['workflow_id']}")
    print(f"Mode: {manifest['context_mode']}")
    print(f"Git: {manifest['git_checkpoint']['branch']} @ {manifest['git_checkpoint']['commit']}")

    print(f"\n📚 CORE CONTEXT ({summary.get('core_files', 0)} files, ~{summary.get('core_tokens', 0):,} tokens)")
    print("-" * 40)
    for f in manifest['sources'].get('core', []):
        tokens = f.get('tokens', 0)
        print(f"  {f['path']}: ~{tokens:,} tokens")
        if f.get('purpose'):
            print(f"    └─ {f['purpose']}")

    if manifest.get('deferred'):
        print(f"\n⏳ DEFERRED ({len(manifest['deferred'])} files)")
        print("-" * 40)
        for f in manifest['deferred']:
            print(f"  {f['path']}: ~{f.get('tokens', 0):,} tokens")
            print(f"    └─ {f.get('reason', 'Budget exceeded')}")

    print(f"\n📊 BUDGET")
    print("-" * 40)
    print(f"  Core: {summary.get('core_tokens', 0):,} / {budget.get('core', 0):,} tokens")
    print(f"  Remaining: {summary.get('budget_remaining', 0):,} tokens")

    print("\n" + "=" * 65)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    workflow_dir = Path(sys.argv[1])
    if not workflow_dir.exists():
        print(f"Error: Workflow directory not found: {workflow_dir}", file=sys.stderr)
        sys.exit(1)

    # Parse budget override
    budget = DEFAULT_BUDGET.copy()
    for arg in sys.argv[2:]:
        if arg.startswith('--budget='):
            try:
                budget['total'] = int(arg.split('=')[1])
                # Rebalance
                budget['core'] = int(budget['total'] * 0.4)
                budget['wave_specific'] = int(budget['total'] * 0.4)
                budget['on_demand'] = int(budget['total'] * 0.2)
            except ValueError:
                print(f"Warning: Invalid budget value, using default", file=sys.stderr)

    # Gather context
    manifest = gather_context(workflow_dir, budget)

    # Output
    if '--json' in sys.argv:
        import json
        print(json.dumps(manifest, indent=2))
    elif HAS_YAML:
        # Write CONTEXT-LIBRARY.yaml
        output_path = workflow_dir / 'CONTEXT-LIBRARY.yaml'
        with open(output_path, 'w') as f:
            yaml.dump(manifest, f, default_flow_style=False, sort_keys=False)
        print(f"✓ Generated: {output_path}")
        print_context_summary(manifest)
    else:
        print_context_summary(manifest)


if __name__ == "__main__":
    main()
