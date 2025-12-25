#!/usr/bin/env python3
"""
Check that all components are properly exported from barrel file.

Usage:
  python check-exports.py <index_file> <components_dir>

Example:
  python check-exports.py src/renderer/components/index.ts src/renderer/components/

Verifies that every .tsx file in components_dir is exported from index.ts
"""
import sys
import re
from pathlib import Path


def get_component_files(components_dir: Path) -> list[str]:
    """Get list of component files (excluding index, utils, types)."""
    exclude = {'index.ts', 'index.tsx', 'utils.ts', 'utils.tsx', 'types.ts', 'types.tsx'}

    files = []
    for f in components_dir.glob("*.tsx"):
        if f.name not in exclude and not f.name.startswith('_'):
            files.append(f.stem)

    return sorted(files)


def get_exports_from_index(index_file: Path) -> set[str]:
    """Extract exported module names from index file."""
    content = index_file.read_text()

    # Match: export * from './component'
    # Match: export { Component } from './component'
    # Match: export { default as Component } from './component'
    pattern = r"from\s+['\"]\.\/([^'\"]+)['\"]"

    matches = re.findall(pattern, content)
    return set(matches)


def check_exports(index_file: Path, components_dir: Path):
    """Check that all components are exported."""

    if not index_file.exists():
        print(f"Error: Index file not found: {index_file}", file=sys.stderr)
        return False

    if not components_dir.exists():
        print(f"Error: Components directory not found: {components_dir}", file=sys.stderr)
        return False

    component_files = get_component_files(components_dir)
    exported = get_exports_from_index(index_file)

    print(f"Components found: {len(component_files)}")
    print(f"Exports in index: {len(exported)}")
    print()

    missing = []
    extra = []

    for comp in component_files:
        if comp in exported:
            print(f"✓ {comp}")
        else:
            print(f"✗ {comp} (not exported)")
            missing.append(comp)

    # Check for exports that don't have corresponding files
    for exp in exported:
        if exp not in component_files and exp not in {'utils', 'types'}:
            # Check if file exists
            if not (components_dir / f"{exp}.tsx").exists() and not (components_dir / f"{exp}.ts").exists():
                print(f"⚠ {exp} (exported but file not found)")
                extra.append(exp)

    print()

    if missing:
        print(f"❌ Missing exports: {', '.join(missing)}")
        print()
        print("Add to index.ts:")
        for m in missing:
            print(f"  export * from './{m}';")
        return False

    if extra:
        print(f"⚠ Orphaned exports: {', '.join(extra)}")

    print("✅ All components properly exported")
    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: python check-exports.py <index_file> <components_dir>")
        print("Example: python check-exports.py src/components/index.ts src/components/")
        sys.exit(1)

    index_file = Path(sys.argv[1])
    components_dir = Path(sys.argv[2])

    success = check_exports(index_file, components_dir)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
