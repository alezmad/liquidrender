#!/usr/bin/env python3
"""
Aggregate MODULE.md and STATUS.yaml into OVERVIEW.md (ephemeral by default)

Usage:
  python aggregate-overview.py <workflow_dir>           # Print to stdout (ephemeral)
  python aggregate-overview.py <workflow_dir> --save    # Save to file (rare)

Example:
  python aggregate-overview.py .workflows/active/WF-0001
"""
import sys
from pathlib import Path
from datetime import datetime

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("Warning: PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)


def load_yaml_file(path: Path) -> dict:
    """Load YAML file, return empty dict if missing or error."""
    if not path.exists():
        return {}
    try:
        if HAS_YAML:
            return yaml.safe_load(path.read_text()) or {}
        else:
            return {}
    except Exception as e:
        print(f"Warning: Could not parse {path}: {e}", file=sys.stderr)
        return {}


def extract_table_from_module(module_file: Path) -> str:
    """Extract the components index table from MODULE.md."""
    if not module_file.exists():
        return ""

    content = module_file.read_text()
    in_table = False
    table_lines = []

    for line in content.split("\n"):
        if "| Component |" in line:
            in_table = True
        if in_table:
            if line.startswith("|"):
                table_lines.append(line)
            elif table_lines:
                break

    return "\n".join(table_lines)


def aggregate_overview(workflow_dir: Path, save_to_file: bool = False) -> str:
    """Create high-level overview from module docs and status.

    By default, prints to stdout (ephemeral). Use --save to write to file.
    """
    docs_dir = workflow_dir / "docs"
    module_file = docs_dir / "MODULE.md"
    status_file = workflow_dir / "STATUS.yaml"

    # Load status
    status = load_yaml_file(status_file)

    # Load module index table
    module_index = extract_table_from_module(module_file)

    # Calculate stats
    test_results = status.get("test_results", {})
    total_tests = test_results.get("total", 0)
    passed_tests = test_results.get("passed", 0)

    waves = {}
    for key, value in status.items():
        if key.startswith("wave_") and isinstance(value, dict):
            waves[key] = value

    completed_waves = sum(1 for w in waves.values()
                         if w.get("status") == "complete")

    # Build overview
    lines = [
        f"# Workflow Overview: {status.get('workflow', 'Unknown')}",
        f"",
        f"**ID:** {status.get('workflow_id', status.get('workflow', 'N/A'))}",
        f"**Status:** {status.get('overall_status', 'unknown')}",
        f"**Generated:** {datetime.now().isoformat()}",
        f"",
        f"---",
        f"",
        f"## Progress Summary",
        f"",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Waves Completed | {completed_waves}/{len(waves)} |",
        f"| Tests Passing | {passed_tests}/{total_tests} |",
        f"| Overall Status | {status.get('overall_status', 'N/A')} |",
        f"",
    ]

    # Add errors if any
    errors = status.get("errors", [])
    if errors:
        lines.extend([
            f"### ⚠️ Errors ({len(errors)})",
            f"",
        ])
        for err in errors[:5]:  # Show first 5 errors
            lines.append(f"- {err.get('task', 'unknown')}: {err.get('error', 'no message')}")
        if len(errors) > 5:
            lines.append(f"- ... and {len(errors) - 5} more")
        lines.append("")

    lines.extend([
        f"---",
        f"",
        f"## Components",
        f"",
        module_index or "No components documented yet.",
        f"",
        f"---",
        f"",
        f"## Quick Links",
        f"",
        f"- [Full Module Documentation](docs/MODULE.md)",
        f"- [Status Tracking](STATUS.yaml)",
        f"- [Changelog](CHANGELOG.md)",
        f"",
    ])

    output = "\n".join(lines)

    if save_to_file:
        output_file = docs_dir / "OVERVIEW.md"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(output)
        print(f"✓ Saved to {output_file}", file=sys.stderr)
    else:
        # Default: ephemeral (stdout only)
        print(output)

    return output


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python aggregate-overview.py <workflow_dir> [--save]")
        print("Example: python aggregate-overview.py .workflows/active/WF-0001")
        sys.exit(1)

    save = "--save" in sys.argv
    workflow_dir = Path(sys.argv[1])

    if not workflow_dir.exists():
        print(f"Error: Workflow directory not found: {workflow_dir}", file=sys.stderr)
        sys.exit(1)

    aggregate_overview(workflow_dir, save_to_file=save)
