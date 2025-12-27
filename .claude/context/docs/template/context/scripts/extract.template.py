#!/usr/bin/env python3
"""
Entity Extraction Script Template
Scans source files and generates a tiered entity index for the Cognitive Context Framework.

SETUP INSTRUCTIONS:
1. Replace all {{PLACEHOLDER}} values with your project specifics
2. Adjust the extraction logic for your file types
3. Rename to extract.py
4. Run: python .claude/context/scripts/extract.py
"""

import json
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

# ============================================================
# CONFIGURATION - Customize these for your project
# ============================================================

# Project root (auto-detected)
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # Adjust depth as needed

# Directories to scan for entities
# Replace {{SOURCE_DIRECTORIES}} with your paths
SOURCE_DIRECTORIES = {
    "components": PROJECT_ROOT / "{{COMPONENT_PATH}}",  # e.g., "src/components"
    # "schemas": PROJECT_ROOT / "{{SCHEMA_PATH}}",      # e.g., "db/schema"
    # "endpoints": PROJECT_ROOT / "{{ENDPOINT_PATH}}",  # e.g., "src/api"
}

# File patterns to include (glob patterns)
FILE_PATTERNS = {
    "components": "*.tsx",   # React components
    # "schemas": "*.ts",     # TypeScript schemas
    # "endpoints": "*.ts",   # API routes
}

# Output path for entities.json
OUTPUT_PATH = PROJECT_ROOT / ".claude" / "context" / "indices" / "entities.json"

# ============================================================
# EXTRACTION LOGIC
# ============================================================


def get_current_commit() -> str:
    """Get the current git commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def extract_component_info(file_path: Path) -> dict[str, Any] | None:
    """
    Extract component information from a TypeScript/React file.

    Customize this function for your project's component structure.
    """
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

    # Extract component name from filename (customize as needed)
    name = file_path.stem
    if name.startswith("_") or name == "index" or name == "utils":
        return None

    # Extract exports
    export_matches = re.findall(r"export\s+(?:const|function|class)\s+(\w+)", content)
    exports = list(set(export_matches)) if export_matches else [name]

    # Extract props (customize regex for your prop patterns)
    # This example looks for: interface XxxProps { ... }
    props_match = re.search(r"interface\s+\w*Props\s*\{([^}]+)\}", content)
    props = []
    if props_match:
        prop_lines = props_match.group(1)
        props = re.findall(r"(\w+)\s*[?:]", prop_lines)

    # Extract imports/dependencies (customize for your needs)
    import_matches = re.findall(r'from\s+["\']([^"\']+)["\']', content)
    deps = [d for d in import_matches if not d.startswith(".")]

    # Generate a one-line purpose (customize heuristic)
    # This example uses the first JSDoc comment or infers from name
    doc_match = re.search(r"/\*\*\s*\n?\s*\*\s*(.+?)(?:\n|\*/)", content)
    if doc_match:
        purpose = doc_match.group(1).strip()[:100]
    else:
        # Infer from component name (basic heuristic)
        purpose = f"{name} component"

    return {
        "tier1": purpose,
        "tier2": {
            "path": str(file_path.relative_to(PROJECT_ROOT)),
            "props": props[:10],  # Limit to 10 props
            "deps": deps[:5],     # Limit to 5 deps
            "exports": exports[:5],
        },
    }


def extract_entities(category: str, directory: Path, pattern: str) -> dict[str, Any]:
    """Extract all entities from a directory."""
    entities = {"_index": []}

    if not directory.exists():
        return entities

    files = list(directory.glob(pattern))

    for file_path in sorted(files):
        if category == "components":
            info = extract_component_info(file_path)
        # Add more extraction functions for other categories:
        # elif category == "schemas":
        #     info = extract_schema_info(file_path)
        # elif category == "endpoints":
        #     info = extract_endpoint_info(file_path)
        else:
            continue

        if info:
            name = file_path.stem
            # Convert kebab-case to PascalCase for component names
            if category == "components":
                name = "".join(word.capitalize() for word in name.replace("-", "_").split("_"))

            entities["_index"].append(name)
            entities[name] = info

    return entities


def generate_index(quiet: bool = False) -> dict[str, Any]:
    """Generate the complete entity index."""
    index = {
        "meta": {
            "generated": datetime.now().strftime("%Y-%m-%d"),
            "from_commit": get_current_commit(),
        },
        "categories": {},
    }

    for category, directory in SOURCE_DIRECTORIES.items():
        pattern = FILE_PATTERNS.get(category, "*.ts")
        entities = extract_entities(category, directory, pattern)

        # Update meta counts
        count = len(entities.get("_index", []))
        index["meta"][category] = count

        # Add to categories
        index["categories"][category] = entities

        if not quiet:
            print(f"  {category}: {count} entities")

    return index


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Extract entity index")
    parser.add_argument("--output", "-o", type=Path, default=OUTPUT_PATH,
                        help="Output file path")
    parser.add_argument("--quiet", "-q", action="store_true",
                        help="Suppress output")
    args = parser.parse_args()

    if not args.quiet:
        print(f"Extracting entities from {PROJECT_ROOT}...")

    index = generate_index(quiet=args.quiet)

    # Ensure output directory exists
    args.output.parent.mkdir(parents=True, exist_ok=True)

    # Write index
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    if not args.quiet:
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()


# ============================================================
# CUSTOMIZATION GUIDE
# ============================================================
#
# 1. SOURCE_DIRECTORIES
#    Map category names to directory paths:
#    {
#        "components": PROJECT_ROOT / "src/components",
#        "schemas": PROJECT_ROOT / "prisma/schema",
#        "endpoints": PROJECT_ROOT / "app/api",
#    }
#
# 2. FILE_PATTERNS
#    Glob patterns for each category:
#    {
#        "components": "*.tsx",
#        "schemas": "*.prisma",
#        "endpoints": "route.ts",
#    }
#
# 3. Extraction Functions
#    Create category-specific extractors:
#    - extract_component_info() - React/Vue/Svelte components
#    - extract_schema_info() - Database schemas
#    - extract_endpoint_info() - API routes
#
# 4. Purpose Inference
#    The tier1 "purpose" field should be:
#    - Under 15 words
#    - Actionable/descriptive
#    - Extracted from docs or inferred from name
#
# 5. Props/Columns/Parameters
#    Extract interface signatures:
#    - Components: prop names
#    - Schemas: column names
#    - Endpoints: query/body params
#
# ============================================================
