# Cognitive Context Framework - Technical Specification

> Version: 1.0
> Status: Stable

---

## Overview

The Cognitive Context Framework provides structured, persistent context for AI coding assistants. This document specifies the file formats, schemas, and integration patterns.

---

## Directory Structure

```
project-root/
├── .cognitive/                    # Portable source of truth
│   ├── ORIENTATION.md             # Always-loaded context (~300 tokens)
│   ├── wisdom/                    # Cached patterns
│   │   └── *.md                   # Progressive wisdom documents
│   ├── indices/                   # Pre-computed lookups
│   │   ├── entities.json          # Entity graph
│   │   └── concepts.json          # Concept graph
│   ├── schemas/                   # Structure definitions
│   │   ├── entities.yaml
│   │   ├── concepts.yaml
│   │   └── wisdom.yaml
│   ├── scripts/                   # Automation
│   │   └── extract.py
│   └── templates/                 # Document templates
│       └── wisdom.template.md
│
├── .cursor/rules/                 # Cursor-specific (synced)
│   ├── orientation.mdc
│   └── wisdom-*.mdc
│
└── sync-cursor.sh                 # Sync script
```

---

## File Formats

### ORIENTATION.md

The always-loaded cognitive reload file.

**Requirements:**
- Maximum ~300 tokens (~400 words)
- Must fit in initial context window
- No external dependencies

**Structure:**

```markdown
# {Project Name} - Cognitive Orientation

## Identity
One-paragraph project description.

## Mental Model
How to think about this codebase.

## Structure
ASCII tree of key directories.

## Hard Constraints
1. Constraint 1
2. Constraint 2
3. Constraint 3

## Quick Pointers
| Task | Location |
|------|----------|
| Task 1 | @wisdom-file |
```

---

### Wisdom Files (.cognitive/wisdom/*.md)

Cached answers to common questions.

**Frontmatter Schema:**

```yaml
---
description: string (max 100 chars)  # Used by agent to decide relevance
confidence: integer (0-100)          # How reliable is this wisdom
verified_at: date (YYYY-MM-DD)       # Last validation date
depends_on: [string]                 # Other wisdom files this needs
related: [string]                    # Related wisdom files
---
```

**Body Structure:**

```markdown
# Title

## TL;DR
One-paragraph summary.

## When to Use
- Use case 1
- Use case 2

## Pattern
```language
code example
```

## Key Points
1. Point 1
2. Point 2

## Anti-Patterns
- What to avoid
```

---

### entities.json

Pre-computed index of code entities.

**Schema:**

```json
{
  "meta": {
    "generated_at": "ISO-8601 timestamp",
    "from_commit": "git short hash",
    "total_entities": integer
  },
  "entities": {
    "tier1": {
      "EntityName": {
        "file": "relative/path.tsx",
        "type": "component|function|class|schema|endpoint",
        "exports": ["export1", "export2"],
        "description": "optional description"
      }
    },
    "tier2": { ... }
  }
}
```

**Tier Definitions:**
- **tier1**: Core entities, frequently used, load first
- **tier2**: Secondary entities, load on demand

---

### concepts.json

Pre-computed concept graph.

**Schema:**

```json
{
  "meta": {
    "generated_at": "ISO-8601 timestamp",
    "total_concepts": integer
  },
  "concepts": {
    "features": {
      "FeatureName": {
        "description": "What this feature does",
        "related_entities": ["Entity1", "Entity2"],
        "key_files": ["path/to/main.ts"]
      }
    },
    "patterns": { ... },
    "domains": { ... }
  }
}
```

---

## Cursor Integration

### .mdc File Format

Cursor uses MDC (Markdown with Configuration) files.

**Structure:**

```markdown
---
description: string              # AI reads to decide relevance
alwaysApply: boolean            # Load in every session
globs: ["pattern/**/*.ts"]       # Auto-load for matching files
---

# Markdown content
```

**Rule Type Matrix:**

| alwaysApply | globs | description | Type |
|-------------|-------|-------------|------|
| true | - | - | Always |
| false | set | - | Auto-Attached |
| false | - | set | Agent-Requested |
| false | - | - | Manual (@mention) |

---

### Mapping

| .cognitive/ | .cursor/rules/ | Rule Type |
|-------------|----------------|-----------|
| ORIENTATION.md | orientation.mdc | Always |
| wisdom/*.md | wisdom-*.mdc | Agent-Requested |
| indices/*.json | (referenced) | Manual |

---

## Sync Protocol

### sync-cursor.sh

Converts `.cognitive/` to `.cursor/rules/`.

**Algorithm:**

1. Read ORIENTATION.md
2. Write orientation.mdc with `alwaysApply: true`
3. For each wisdom/*.md:
   - Extract description from frontmatter
   - Write wisdom-{name}.mdc with description

**Idempotency:** Script is safe to run multiple times.

---

## Extraction Protocol

### extract.py

Generates entities.json from source code.

**Algorithm:**

1. Scan configured source directories
2. For each matching file:
   - Extract exports (functions, classes, components)
   - Classify tier (based on path, export count)
   - Detect type (based on path patterns)
3. Generate JSON with current git commit
4. Write to indices/entities.json

**Triggering:**
- Git post-commit hook (automatic)
- Manual execution (on demand)

---

## Drift Detection

Context validity is commit-based, not time-based.

**Algorithm:**

```
if current_commit != entities.meta.from_commit:
    if files_matching_source_pattern changed:
        regenerate entities.json
    else:
        context still valid
```

---

## Error Handling

### Missing Files

| Missing | Behavior |
|---------|----------|
| ORIENTATION.md | Warn, continue with empty orientation |
| wisdom/ | Continue without wisdom |
| indices/ | Continue without indices |
| scripts/ | Cannot auto-extract |

### Invalid Format

| Invalid | Behavior |
|---------|----------|
| YAML frontmatter | Skip frontmatter, use content only |
| JSON index | Warn, use empty index |
| Entity extraction | Skip file, continue with others |

---

## Version Compatibility

| Framework Version | Cursor Version | Status |
|-------------------|----------------|--------|
| 1.0 | 2.0+ | Supported |
| 1.0 | 1.x | Untested |

---

## Security Considerations

1. **No secrets in context.** Never include API keys, tokens, or credentials.
2. **Extraction script sandboxed.** Script only reads, never writes to source.
3. **Git-ignored sensitivity.** Consider `.cognitive/` in `.gitignore` for private projects.

---

## Extension Points

### Custom Extractors

Extend `extract.py` for project-specific entity detection:

```python
def custom_extract(file_path):
    # Your logic here
    return {"name": "...", "type": "...", "exports": [...]}
```

### Additional Wisdom Files

Create new wisdom files for project-specific patterns:

```bash
cp .cognitive/templates/wisdom.template.md .cognitive/wisdom/my-pattern.md
# Edit and customize
./sync-cursor.sh
```

---

*Specification Version: 1.0*
*Last Updated: 2025-01*
