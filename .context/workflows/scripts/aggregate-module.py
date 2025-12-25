#!/usr/bin/env python3
"""
Aggregate component documentation into MODULE.md

Usage:
  python aggregate-module.py <components_dir> <output_file>

Example:
  python aggregate-module.py docs/components docs/MODULE.md
"""
import sys
from pathlib import Path
from datetime import datetime

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def parse_frontmatter(content: str) -> dict:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}

    try:
        end = content.index('---', 3)
        frontmatter = content[3:end].strip()
        if HAS_YAML:
            return yaml.safe_load(frontmatter) or {}
        else:
            # Fallback: basic key-value parsing
            result = {}
            for line in frontmatter.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    result[key.strip()] = value.strip()
            return result
    except (ValueError, Exception):
        return {}


def aggregate_module(components_dir: Path, output_file: Path):
    """Aggregate component docs into a module overview."""
    components = sorted(components_dir.glob("*.component.md"))

    if not components:
        print(f"No component docs found in {components_dir}")
        return False

    lines = [
        f"# Module Documentation",
        f"",
        f"**Generated:** {datetime.now().isoformat()}",
        f"**Components:** {len(components)}",
        f"",
        f"---",
        f"",
        f"## Components Index",
        f"",
        f"| Component | Code | Status | Tests | Complexity |",
        f"|-----------|------|--------|-------|------------|",
    ]

    # Build index from frontmatter
    for comp in components:
        content = comp.read_text()
        meta = parse_frontmatter(content)

        name = meta.get('name', comp.stem.replace(".component", "").title())
        code = meta.get('code', '-')
        status = meta.get('status', 'unknown')
        tests = f"{meta.get('tests_passed', '?')}/{meta.get('tests_total', '?')}"
        complexity = meta.get('complexity', '-')

        lines.append(f"| {name} | `{code}` | {status} | {tests} | {complexity} |")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Component Details",
        f"",
    ])

    # Include full content of each component
    for comp in components:
        content = comp.read_text()
        lines.append(content)
        lines.append("")
        lines.append("---")
        lines.append("")

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text("\n".join(lines))
    print(f"✓ Generated {output_file} with {len(components)} components")
    return True


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python aggregate-module.py <components_dir> <output_file>")
        print("Example: python aggregate-module.py docs/components docs/MODULE.md")
        sys.exit(1)

    success = aggregate_module(Path(sys.argv[1]), Path(sys.argv[2]))
    sys.exit(0 if success else 1)
