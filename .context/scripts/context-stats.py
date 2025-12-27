#!/usr/bin/env python3
"""
Generate context statistics.
Output: JSON with token counts, structure analysis, efficiency metrics.
"""

import os
import json
from pathlib import Path
from datetime import datetime, timedelta
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


def analyze_context(root: Path) -> dict:
    """Generate comprehensive statistics."""
    context_dir = root / ".context"

    if not context_dir.exists():
        return {"error": ".context not found"}

    files = []
    by_role = defaultdict(list)
    by_folder = defaultdict(list)

    now = datetime.now()
    stale_threshold = now - timedelta(days=30)
    very_stale_threshold = now - timedelta(days=90)

    for path in context_dir.rglob("*.md"):
        content = path.read_text(encoding="utf-8")
        rel_path = path.relative_to(root)
        stat = path.stat()
        modified = datetime.fromtimestamp(stat.st_mtime)

        frontmatter = parse_frontmatter(content)
        tokens = count_tokens(content)

        role = frontmatter.get("role", "unknown") if frontmatter else "no-frontmatter"

        file_info = {
            "path": str(rel_path),
            "tokens": tokens,
            "role": role,
            "modified": modified.isoformat(),
            "days_old": (now - modified).days,
            "is_stale": modified < stale_threshold,
            "is_very_stale": modified < very_stale_threshold,
        }

        files.append(file_info)
        by_role[role].append(file_info)

        # Group by first subfolder
        parts = rel_path.parts
        folder = parts[1] if len(parts) > 1 else "root"
        by_folder[folder].append(file_info)

    # Calculate statistics
    total_tokens = sum(f["tokens"] for f in files)
    token_list = [f["tokens"] for f in files]

    # Sort for largest/smallest
    sorted_by_tokens = sorted(files, key=lambda f: f["tokens"], reverse=True)

    # Freshness analysis
    fresh = [f for f in files if not f["is_stale"]]
    stale = [f for f in files if f["is_stale"] and not f["is_very_stale"]]
    very_stale = [f for f in files if f["is_very_stale"]]

    # Role summary
    role_summary = {}
    for role, role_files in by_role.items():
        role_summary[role] = {
            "count": len(role_files),
            "tokens": sum(f["tokens"] for f in role_files),
            "avg_tokens": sum(f["tokens"] for f in role_files) // max(len(role_files), 1),
        }

    # Folder summary
    folder_summary = {}
    for folder, folder_files in by_folder.items():
        folder_summary[folder] = {
            "count": len(folder_files),
            "tokens": sum(f["tokens"] for f in folder_files),
        }

    # Efficiency warnings
    warnings = []

    # Large files (>3000 tokens)
    large_files = [f for f in files if f["tokens"] > 3000]
    if large_files:
        warnings.append({
            "type": "large_files",
            "message": f"{len(large_files)} files over 3000 tokens",
            "files": [f["path"] for f in large_files],
        })

    # Very stale files
    if very_stale:
        warnings.append({
            "type": "very_stale",
            "message": f"{len(very_stale)} files not updated in 90+ days",
            "files": [f["path"] for f in very_stale],
        })

    # Missing frontmatter
    no_fm = [f for f in files if f["role"] == "no-frontmatter"]
    if no_fm:
        warnings.append({
            "type": "missing_frontmatter",
            "message": f"{len(no_fm)} files without frontmatter",
            "files": [f["path"] for f in no_fm],
        })

    return {
        "generated": now.isoformat(),
        "summary": {
            "total_files": len(files),
            "total_tokens": total_tokens,
            "avg_tokens": total_tokens // max(len(files), 1),
            "max_tokens": max(token_list) if token_list else 0,
            "min_tokens": min(token_list) if token_list else 0,
        },
        "freshness": {
            "fresh": len(fresh),
            "stale_30d": len(stale),
            "stale_90d": len(very_stale),
            "freshness_pct": round(len(fresh) / max(len(files), 1) * 100, 1),
        },
        "by_role": role_summary,
        "by_folder": folder_summary,
        "largest_files": [
            {"path": f["path"], "tokens": f["tokens"]}
            for f in sorted_by_tokens[:10]
        ],
        "smallest_files": [
            {"path": f["path"], "tokens": f["tokens"]}
            for f in sorted_by_tokens[-5:]
        ],
        "warnings": warnings,
        "files": files,
    }


def main():
    root = Path.cwd()
    result = analyze_context(root)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
