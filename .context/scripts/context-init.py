#!/usr/bin/env python3
"""
Initialize context structure.
Creates folders, hub files, and graph.yaml.
"""

import os
import json
from pathlib import Path
from datetime import datetime


def create_structure(root: Path, project_name: str = "Project") -> dict:
    """Create the context directory structure."""
    context_dir = root / ".context"

    # Check if already exists
    if context_dir.exists():
        return {
            "status": "exists",
            "message": ".context already exists. Use --force to reinitialize.",
        }

    created = []

    # Create directories
    dirs = [
        ".context",
        ".context/specs",
        ".context/decisions",
        ".context/guides",
        ".context/references",
        ".context/scripts",
    ]

    for d in dirs:
        dir_path = root / d
        dir_path.mkdir(parents=True, exist_ok=True)
        created.append(d)

    # Create CLAUDE.md (hub)
    hub_content = f"""---
role: hub
tokens: ~300
---

# {project_name} Context Hub

> Entry point for AI context loading.

## Quick Navigation

| Need | Go To |
|------|-------|
| System architecture | [specs/](./specs/) |
| Why we decided X | [decisions/](./decisions/) |
| How to implement | [guides/](./guides/) |
| Lookup reference | [references/](./references/) |

## Loading Rules

See [CONTEXT-MAP.md](./CONTEXT-MAP.md) for how context is loaded.

## Structure

```
.context/
├── CLAUDE.md           ← You are here (hub)
├── CONTEXT-MAP.md      ← Loading algorithm
├── graph.yaml          ← Machine-readable graph
├── specs/              ← WHAT to build
├── decisions/          ← WHY we chose
├── guides/             ← HOW to do
└── references/         ← LOOKUP tables
```
"""

    (context_dir / "CLAUDE.md").write_text(hub_content)
    created.append(".context/CLAUDE.md")

    # Create CONTEXT-MAP.md
    map_content = """---
role: reference
tokens: ~800
---

# Context Map

How AI agents load and traverse context in this project.

## Loading Algorithm

```
1. ALWAYS LOAD (on conversation start)
   └── CLAUDE.md (root) → .context/CLAUDE.md (hub)

2. LOAD ON DEMAND (based on task)
   ├── "implement", "build"  → specs/
   ├── "why", "decision"     → decisions/
   ├── "how to", "guide"     → guides/
   └── "lookup", "list"      → references/

3. DEPTH STRATEGY
   └── Start shallow, go deep only when needed
   └── Load max 3-4 docs per task (~4000 tokens)
```

## Token Budget

| Context Type | Target | Max |
|--------------|--------|-----|
| Always loaded | 500 | 800 |
| Per-task context | 2000 | 4000 |
| Deep dive | 4000 | 8000 |

## Document Roles

| Role | Purpose | Load When |
|------|---------|-----------|
| **hub** | Navigation | Always |
| **spec** | Definitions | Implementing |
| **decision** | Rationale | Questioning |
| **guide** | Instructions | Learning |
| **reference** | Lookup | Specific queries |

## Frontmatter Standard

```yaml
---
role: spec | decision | guide | reference | hub
load_when: ["keyword", "triggers"]
tokens: ~1200
pointers:
  up: ../CLAUDE.md
  related: [./other.md]
---
```

## Health Commands

```bash
python .context/scripts/context-check.py   # Validate
python .context/scripts/context-stats.py   # Statistics
python .context/scripts/context-map.py     # Visualize
```
"""

    (context_dir / "CONTEXT-MAP.md").write_text(map_content)
    created.append(".context/CONTEXT-MAP.md")

    # Create graph.yaml
    graph_content = f"""# Context Graph Definition
version: "1.0"
generated: "{datetime.now().isoformat()}"
project: "{project_name}"

structure:
  hub: CLAUDE.md
  map: CONTEXT-MAP.md

  folders:
    specs:
      role: spec
      load_when:
        - implement
        - build
        - create
        - add
        - feature

    decisions:
      role: decision
      load_when:
        - why
        - decision
        - chose
        - rationale
        - alternative

    guides:
      role: guide
      load_when:
        - how to
        - guide
        - tutorial
        - setup
        - configure

    references:
      role: reference
      load_when:
        - lookup
        - list
        - table
        - status
        - catalog

settings:
  token_budget:
    always: 800
    per_task: 4000
    deep_dive: 8000

  stale_threshold_days: 30
  very_stale_threshold_days: 90

health:
  last_audit: null
  broken_edges: 0
  orphans: 0
  total_tokens: 0
"""

    (context_dir / "graph.yaml").write_text(graph_content)
    created.append(".context/graph.yaml")

    # Create .gitkeep files in empty dirs
    for folder in ["specs", "decisions", "guides", "references"]:
        gitkeep = context_dir / folder / ".gitkeep"
        gitkeep.write_text("")
        created.append(f".context/{folder}/.gitkeep")

    return {
        "status": "created",
        "created": created,
        "next_steps": [
            "1. Review .context/CLAUDE.md",
            "2. Run: python .context/scripts/context-scan.py",
            "3. Migrate docs with /context migrate",
        ],
    }


def main():
    import sys

    root = Path.cwd()

    # Get project name from package.json or folder name
    project_name = root.name
    package_json = root / "package.json"
    if package_json.exists():
        try:
            import json
            data = json.loads(package_json.read_text())
            project_name = data.get("name", project_name)
        except:
            pass

    # Check for --force flag
    force = "--force" in sys.argv

    if force and (root / ".context").exists():
        import shutil
        # Backup existing
        backup = root / ".context.backup"
        if backup.exists():
            shutil.rmtree(backup)
        shutil.move(root / ".context", backup)
        print(f"Backed up existing .context to .context.backup")

    result = create_structure(root, project_name)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
