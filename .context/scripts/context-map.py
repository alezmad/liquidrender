#!/usr/bin/env python3
"""
Generate visual map of context graph.
Output: ASCII tree + JSON structure.
"""

import os
import json
from pathlib import Path
from collections import defaultdict
import yaml

CHARS_PER_TOKEN = 4


def count_tokens(text: str) -> int:
    return len(text) // CHARS_PER_TOKEN


def parse_frontmatter(content: str) -> dict | None:
    if not content.startswith("---"):
        return None
    end = content.find("---", 3)
    if end == -1:
        return None
    try:
        return yaml.safe_load(content[3:end])
    except:
        return None


def build_tree(root: Path) -> dict:
    """Build a tree structure of the context."""
    context_dir = root / ".context"

    if not context_dir.exists():
        return {"error": ".context not found"}

    tree = {
        "name": ".context",
        "type": "dir",
        "children": [],
        "tokens": 0,
    }

    # Map paths to their info
    path_info = {}

    for path in sorted(context_dir.rglob("*.md")):
        content = path.read_text(encoding="utf-8")
        rel_path = path.relative_to(context_dir)
        frontmatter = parse_frontmatter(content)
        tokens = count_tokens(content)

        role = frontmatter.get("role", "?") if frontmatter else "?"
        role_icon = {
            "hub": "◉",
            "spec": "📋",
            "decision": "💡",
            "guide": "📖",
            "reference": "📚",
            "?": "❓",
        }.get(role, "?")

        path_info[str(rel_path)] = {
            "name": path.name,
            "role": role,
            "role_icon": role_icon,
            "tokens": tokens,
            "path": str(rel_path),
        }

    # Build nested structure
    def add_to_tree(parts: list[str], info: dict, node: dict):
        if len(parts) == 1:
            node["children"].append({
                "name": info["name"],
                "type": "file",
                "role": info["role"],
                "role_icon": info["role_icon"],
                "tokens": info["tokens"],
            })
            node["tokens"] += info["tokens"]
        else:
            folder_name = parts[0]
            folder = None
            for child in node["children"]:
                if child["type"] == "dir" and child["name"] == folder_name:
                    folder = child
                    break

            if not folder:
                folder = {
                    "name": folder_name,
                    "type": "dir",
                    "children": [],
                    "tokens": 0,
                }
                node["children"].append(folder)

            add_to_tree(parts[1:], info, folder)
            node["tokens"] += info["tokens"]

    for rel_path, info in path_info.items():
        parts = Path(rel_path).parts
        add_to_tree(list(parts), info, tree)

    return tree


def render_ascii_tree(node: dict, prefix: str = "", is_last: bool = True) -> list[str]:
    """Render tree as ASCII art."""
    lines = []

    connector = "└── " if is_last else "├── "

    if node["type"] == "dir":
        lines.append(f"{prefix}{connector}{node['name']}/ ({node['tokens']} tokens)")
        child_prefix = prefix + ("    " if is_last else "│   ")

        children = node.get("children", [])
        # Sort: dirs first, then files
        dirs = [c for c in children if c["type"] == "dir"]
        files = [c for c in children if c["type"] == "file"]
        sorted_children = sorted(dirs, key=lambda x: x["name"]) + sorted(files, key=lambda x: x["name"])

        for i, child in enumerate(sorted_children):
            is_child_last = i == len(sorted_children) - 1
            lines.extend(render_ascii_tree(child, child_prefix, is_child_last))
    else:
        role_icon = node.get("role_icon", "?")
        lines.append(f"{prefix}{connector}{role_icon} {node['name']} ({node['tokens']})")

    return lines


def main():
    root = Path.cwd()
    tree = build_tree(root)

    if "error" in tree:
        print(json.dumps(tree))
        return

    # Print ASCII tree
    print("CONTEXT MAP")
    print("═" * 60)
    print()

    # Start from root
    print(f".context/ ({tree['tokens']} total tokens)")

    children = tree.get("children", [])
    dirs = [c for c in children if c["type"] == "dir"]
    files = [c for c in children if c["type"] == "file"]
    sorted_children = sorted(dirs, key=lambda x: x["name"]) + sorted(files, key=lambda x: x["name"])

    for i, child in enumerate(sorted_children):
        is_last = i == len(sorted_children) - 1
        for line in render_ascii_tree(child, "", is_last):
            print(line)

    print()
    print("═" * 60)
    print("LEGEND: ◉ hub │ 📋 spec │ 💡 decision │ 📖 guide │ 📚 reference")
    print()

    # Also output JSON for programmatic use
    print("\n--- JSON ---")
    print(json.dumps(tree, indent=2))


if __name__ == "__main__":
    main()
