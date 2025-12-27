#!/usr/bin/env python3
"""
Check context graph integrity.
Output: JSON report of broken links, orphans, issues.
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
import yaml


def parse_frontmatter(content: str) -> dict | None:
    """Extract YAML frontmatter if present."""
    if not content.startswith("---"):
        return None

    end = content.find("---", 3)
    if end == -1:
        return None

    try:
        return yaml.safe_load(content[3:end])
    except:
        return None


def extract_links(content: str) -> list[tuple[int, str]]:
    """Extract all markdown links with line numbers."""
    links = []

    for i, line in enumerate(content.split("\n"), 1):
        # Match [text](path)
        for match in re.finditer(r'\[.*?\]\(([^)]+)\)', line):
            path = match.group(1)
            if not path.startswith("http"):
                links.append((i, path))

        # Match → path.md
        for match in re.finditer(r'→\s*`?([^\s`\)]+\.md)`?', line):
            links.append((i, match.group(1)))

    return links


def resolve_link(source: Path, target: str, root: Path) -> Path | None:
    """Resolve a relative link to absolute path."""
    # Handle various link formats
    target = target.split("#")[0]  # Remove anchors
    target = target.strip()

    if not target:
        return None

    # Try relative to source
    resolved = (source.parent / target).resolve()
    if resolved.exists():
        return resolved

    # Try relative to root
    resolved = (root / target).resolve()
    if resolved.exists():
        return resolved

    # Try relative to .context
    resolved = (root / ".context" / target).resolve()
    if resolved.exists():
        return resolved

    return None


def check_context(root: Path) -> dict:
    """Check context graph for issues."""
    context_dir = root / ".context"

    if not context_dir.exists():
        return {
            "status": "error",
            "message": ".context directory not found",
        }

    # Collect all context files
    context_files = {}
    all_links = []  # (source, line, target, resolved)

    for path in context_dir.rglob("*.md"):
        rel_path = path.relative_to(root)
        content = path.read_text(encoding="utf-8")

        frontmatter = parse_frontmatter(content)
        links = extract_links(content)

        context_files[str(rel_path)] = {
            "path": str(rel_path),
            "has_frontmatter": frontmatter is not None,
            "frontmatter": frontmatter,
            "incoming": 0,  # Will count later
        }

        for line_num, target in links:
            resolved = resolve_link(path, target, root)
            all_links.append({
                "source": str(rel_path),
                "line": line_num,
                "target": target,
                "resolved": str(resolved.relative_to(root)) if resolved else None,
                "exists": resolved is not None and resolved.exists(),
            })

    # Count incoming links
    for link in all_links:
        if link["resolved"] and link["resolved"] in context_files:
            context_files[link["resolved"]]["incoming"] += 1

    # Find issues
    broken_links = [l for l in all_links if not l["exists"]]
    missing_frontmatter = [f for f in context_files.values() if not f["has_frontmatter"]]
    orphans = [f for f in context_files.values()
               if f["incoming"] == 0
               and "CLAUDE.md" not in f["path"]
               and "CONTEXT-MAP.md" not in f["path"]]

    # Check required files
    required_files = [
        ".context/CLAUDE.md",
        ".context/CONTEXT-MAP.md",
    ]
    missing_required = [f for f in required_files if f not in context_files]

    # Check for role validity
    valid_roles = {"spec", "decision", "guide", "reference", "hub"}
    invalid_roles = []
    for f in context_files.values():
        if f["frontmatter"] and "role" in f["frontmatter"]:
            role = f["frontmatter"]["role"]
            if role not in valid_roles:
                invalid_roles.append({
                    "path": f["path"],
                    "role": role,
                })

    # Summary
    issues_count = (
        len(broken_links) +
        len(missing_frontmatter) +
        len(orphans) +
        len(missing_required) +
        len(invalid_roles)
    )

    return {
        "check_date": datetime.now().isoformat(),
        "status": "pass" if issues_count == 0 else "fail",
        "summary": {
            "total_files": len(context_files),
            "total_links": len(all_links),
            "broken_links": len(broken_links),
            "missing_frontmatter": len(missing_frontmatter),
            "orphans": len(orphans),
            "missing_required": len(missing_required),
            "invalid_roles": len(invalid_roles),
        },
        "issues": {
            "broken_links": broken_links,
            "missing_frontmatter": [f["path"] for f in missing_frontmatter],
            "orphans": [f["path"] for f in orphans],
            "missing_required": missing_required,
            "invalid_roles": invalid_roles,
        },
        "files": context_files,
    }


def main():
    root = Path.cwd()
    result = check_context(root)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
