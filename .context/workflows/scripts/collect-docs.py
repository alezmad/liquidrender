#!/usr/bin/env python3
"""
Collect component documentation from project paths to workflow docs folder.

Usage:
  python collect-docs.py <workflow_dir> <source_pattern>

Example:
  python collect-docs.py .workflows/active/WF-0001 "src/renderer/components/*.component.md"
  python collect-docs.py .workflows/active/WF-0001 "packages/*/src/**/*.component.md"

Copies matching files to: <workflow_dir>/docs/components/
"""
import sys
import shutil
from pathlib import Path
import glob


def collect_docs(workflow_dir: Path, source_pattern: str, validate: bool = True):
    """Collect component docs from source pattern to workflow docs folder."""
    docs_dir = workflow_dir / "docs" / "components"
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Find matching files
    matches = list(glob.glob(source_pattern, recursive=True))

    if not matches:
        print(f"No files found matching: {source_pattern}")
        return 0

    collected = 0
    errors = []

    for source_path in matches:
        source = Path(source_path)
        dest = docs_dir / source.name

        # Validate frontmatter if requested
        if validate:
            content = source.read_text()
            if not content.startswith('---'):
                errors.append(f"{source.name}: Missing YAML frontmatter")
                continue

        # Copy file
        shutil.copy2(source, dest)
        print(f"✓ {source.name}")
        collected += 1

    # Report errors
    if errors:
        print()
        print("Errors (skipped):")
        for error in errors:
            print(f"  ✗ {error}")

    print()
    print(f"Collected {collected} file(s) to {docs_dir}")

    if errors:
        print(f"Skipped {len(errors)} file(s) with errors")

    return collected


def main():
    if len(sys.argv) < 3:
        print("Usage: python collect-docs.py <workflow_dir> <source_pattern>")
        print('Example: python collect-docs.py .workflows/active/WF-0001 "src/**/*.component.md"')
        sys.exit(1)

    workflow_dir = Path(sys.argv[1])
    source_pattern = sys.argv[2]

    if not workflow_dir.exists():
        print(f"Error: Workflow directory not found: {workflow_dir}", file=sys.stderr)
        sys.exit(1)

    no_validate = "--no-validate" in sys.argv

    collected = collect_docs(workflow_dir, source_pattern, validate=not no_validate)
    sys.exit(0 if collected > 0 else 1)


if __name__ == "__main__":
    main()
