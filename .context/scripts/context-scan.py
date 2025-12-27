#!/usr/bin/env python3
"""
Scan project for all markdown files.
Output: JSON report of all docs with metadata.
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
import yaml

# Directories to scan
SCAN_DIRS = [
    ".",
    ".context",
    ".mydocs",
    ".scratch",
    "_bmad-output",
    "docs",
    "packages",
]

# Directories to skip
SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "__pycache__",
    "venv",
    ".venv",
    ".archived",
}

# Approximate tokens per character (rough estimate)
CHARS_PER_TOKEN = 4


def count_tokens(text: str) -> int:
    """Approximate token count."""
    return len(text) // CHARS_PER_TOKEN


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


def extract_links(content: str) -> list[str]:
    """Extract all markdown links."""
    # Match [text](path) and bare paths after →
    patterns = [
        r'\[.*?\]\(([^)]+)\)',  # [text](path)
        r'→\s*`?([^\s`\)]+\.md)`?',  # → path.md
    ]

    links = []
    for pattern in patterns:
        links.extend(re.findall(pattern, content))

    return [l for l in links if not l.startswith("http")]


def scan_file(path: Path, root: Path) -> dict:
    """Scan a single markdown file."""
    try:
        content = path.read_text(encoding="utf-8")
    except:
        return None

    rel_path = path.relative_to(root)
    stat = path.stat()

    frontmatter = parse_frontmatter(content)
    links = extract_links(content)

    return {
        "path": str(rel_path),
        "tokens": count_tokens(content),
        "lines": content.count("\n") + 1,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "has_frontmatter": frontmatter is not None,
        "frontmatter": frontmatter,
        "links": links,
        "in_context": str(rel_path).startswith(".context/"),
    }


def scan_project(root: Path) -> dict:
    """Scan entire project for markdown files."""
    files = []

    for scan_dir in SCAN_DIRS:
        dir_path = root / scan_dir
        if not dir_path.exists():
            continue

        for path in dir_path.rglob("*.md"):
            # Skip excluded directories
            if any(skip in path.parts for skip in SKIP_DIRS):
                continue

            result = scan_file(path, root)
            if result:
                files.append(result)

    # Also scan for .mdx
    for scan_dir in SCAN_DIRS:
        dir_path = root / scan_dir
        if not dir_path.exists():
            continue

        for path in dir_path.rglob("*.mdx"):
            if any(skip in path.parts for skip in SKIP_DIRS):
                continue

            result = scan_file(path, root)
            if result:
                files.append(result)

    # Calculate summary
    in_context = [f for f in files if f["in_context"]]
    outside_context = [f for f in files if not f["in_context"]]
    with_frontmatter = [f for f in files if f["has_frontmatter"]]

    return {
        "scan_date": datetime.now().isoformat(),
        "root": str(root),
        "summary": {
            "total_files": len(files),
            "in_context": len(in_context),
            "outside_context": len(outside_context),
            "with_frontmatter": len(with_frontmatter),
            "total_tokens": sum(f["tokens"] for f in files),
            "avg_tokens": sum(f["tokens"] for f in files) // max(len(files), 1),
        },
        "files": sorted(files, key=lambda f: f["modified"], reverse=True),
    }


def main():
    root = Path.cwd()
    result = scan_project(root)

    # Output as JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
