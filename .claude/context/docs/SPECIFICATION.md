# Cognitive Context Framework Specification

> **Version:** 1.0
> **Status:** Reference Implementation
> **Purpose:** Complete technical specification for implementing the Cognitive Context Framework

---

## 1. Overview

### 1.1 What This Framework Is

The Cognitive Context Framework is an **externalized cognition system** for AI agents operating in codebases. It provides:

- **Wisdom caching** - Pre-computed answers to common questions
- **Progressive disclosure** - Tiered access from minimal to complete
- **Dual-graph navigation** - Concepts for understanding, entities for implementation
- **Confidence tracking** - Trust levels from 0.20 to 1.0
- **Drift-based decay** - Invalidation tied to code changes, not calendar time

The framework enables AI agents to operate with senior-developer-level contextual awareness without loading entire codebases into context.

### 1.2 Core Components

| Component | Purpose | Token Budget |
|-----------|---------|--------------|
| **ORIENTATION.md** | Cognitive reload file | ~300 tokens |
| **entities.json** | Code entity index | ~50 (tier0), expandable |
| **concepts.json** | Understanding graph | ~50 (tier0), expandable |
| **wisdom/*.md** | Cached answers | ~200-1000 per file |
| **schemas/*.yaml** | Structure definitions | Reference only |

### 1.3 How Components Work Together

```
Session Start
     │
     ▼
Load ORIENTATION.md (300 tokens)
     │
     ▼
Analyze Task
     │
     ├── Matches wisdom file? ──────► Load cached answer
     │
     ├── Mentions concept? ─────────► Concept graph → entity graph → source
     │
     └── Mentions entity? ──────────► Entity index → summary → source on demand
```

---

## 2. Directory Structure

### 2.1 Complete File Tree

```
.claude/
├── context/
│   ├── ORIENTATION.md                 # Always-loaded cognitive reload (~300 tokens)
│   ├── COGNITIVE-CONTEXT-FRAMEWORK.md # Philosophy and design document
│   │
│   ├── docs/
│   │   └── SPECIFICATION.md           # This file (technical reference)
│   │
│   ├── schemas/
│   │   ├── entities.yaml              # Entity index structure definition
│   │   ├── concepts.yaml              # Concept graph structure definition
│   │   └── wisdom.yaml                # Wisdom file structure definition
│   │
│   ├── indices/
│   │   ├── entities.json              # Auto-generated entity index
│   │   └── concepts.json              # Curated concept graph
│   │
│   ├── wisdom/
│   │   └── *.md                       # Cached answers (progressive docs)
│   │
│   ├── templates/
│   │   └── progressive-doc.md         # Template for authoring new docs
│   │
│   └── scripts/
│       └── extract.py                 # Entity extraction automation
│
└── hooks/
    └── context-refresh.sh             # Smart refresh on git activity
```

### 2.2 Purpose of Each Component

| Path | Purpose | Maintenance |
|------|---------|-------------|
| `ORIENTATION.md` | Minimal cognitive reload for session start | Curated |
| `schemas/*.yaml` | Define structure for indices and wisdom | Curated |
| `indices/entities.json` | Compressed entity index | Auto-generated |
| `indices/concepts.json` | Understanding-level graph | Curated |
| `wisdom/*.md` | Pre-computed answers to common questions | Curated |
| `templates/` | Authoring templates for new content | Curated |
| `scripts/extract.py` | Extraction automation | Maintained |
| `hooks/context-refresh.sh` | Git-triggered refresh | Maintained |

### 2.3 Token Budgets

| Layer | Typical Tokens | Loading Strategy |
|-------|---------------|------------------|
| ORIENTATION.md | ~300 | Always loaded at session start |
| Index tier0 (counts) | ~50 | Always loaded with orientation |
| Index tier1 (names) | ~100 per category | Load when category mentioned |
| Index tier2 (summaries) | ~50 per entity | Load when entity mentioned |
| Index tier3 (source) | Variable | Load when modification required |
| Wisdom file | ~200-1000 | Load when task matches |
| Full source | Variable | Load on explicit demand |

---

## 3. Schemas

### 3.1 entities.yaml - Entity Index Structure

The entity schema defines the structure for auto-extracted code entities.

```yaml
version: 1

description: |
  Maximally compressed index of code entities.
  Progressive tiers: meta → index → summary → source.
  LLM expands tiers on demand.

structure:
  meta:
    description: "Root counts (Tier 0, always loaded)"
    example:
      components: 47
      schemas: 10
      endpoints: 25
      generated: "2025-12-27"
      from_commit: "abc123"

  categories:
    components:
      _index:
        description: "List of names (Tier 1)"
        type: array
        example: ["DataTable", "LineChart", "BarChart"]

      "[name]":
        tier1:
          description: "One-liner purpose"
          type: string
          max_tokens: 15

        tier2:
          description: "Interface summary"
          properties:
            path: "Relative file path"
            props: "Array of prop names"
            deps: "Array of dependencies"
            exports: "Array of export names"

        tier3:
          description: "Full source (deferred)"
          value: "READ_FROM_DISK"

    schemas:
      # Similar structure for database schemas

    endpoints:
      # Similar structure for API endpoints

expansion_triggers:
  tier0_to_tier1:
    - "Task mentions category keyword"
    - "User asks 'what X exist?'"

  tier1_to_tier2:
    - "Task mentions specific entity name"
    - "Following dependency chain"

  tier2_to_tier3:
    - "Task requires modification"
    - "Debugging"
    - "User explicitly requests source"

token_budget:
  tier0: ~50
  tier1_per_category: ~100
  tier2_per_entity: ~50
  tier3: variable (read from disk)
```

### 3.2 concepts.yaml - Concept Graph Structure

The concept schema defines understanding-level knowledge organization.

```yaml
version: 1

description: |
  Concept graph for navigating understanding.
  Maps features, patterns, and domains to sub-concepts and related entities.
  Used when task requires understanding before implementation.

structure:
  meta:
    description: "Root concept categories"
    example:
      features: 12
      patterns: 8
      domains: 5

  concepts:
    "[concept_name]":
      tier1:
        description: "One-sentence definition"
        type: string
        max_tokens: 20

      tier2:
        description: "Structure and relationships"
        properties:
          summary: "2-3 sentence explanation"
          children: "Array of sub-concept names"
          related_entities: "Array of entity names"
          docs: "Array of doc file paths"

      tier3:
        description: "Deep knowledge"
        properties:
          key_patterns: "Important implementation patterns"
          gotchas: "Common mistakes"
          see_also: "Related concepts"

  relationships:
    description: "Edges between concepts"
    types:
      - "is_part_of"      # child → parent
      - "depends_on"      # concept requires another
      - "conflicts_with"  # mutual exclusion
      - "implements"      # concept → entities

navigation:
  entry_points:
    - "features/"     # User-facing capabilities
    - "patterns/"     # Reusable approaches
    - "domains/"      # Knowledge areas

  traversal:
    understanding: "Start at feature → drill into sub-concepts"
    implementation: "Match concept → find related entities → read source"
```

### 3.3 wisdom.yaml - Wisdom File Structure

The wisdom schema defines the structure for cached answers.

```yaml
version: 1

description: |
  Wisdom files are CACHED TRAVERSALS.
  Someone already navigated the graph.
  Someone already read the files.
  Someone already figured it out.
  This is the answer they found.

frontmatter:
  required:
    title:
      description: "Clear, searchable title"
      example: "How to Create a LiquidRender Component"

    purpose:
      description: "What this wisdom helps with"
      example: "Creating or modifying LiquidRender components"

    answers:
      description: "Questions this wisdom answers"
      type: array

  optional:
    read_when:
      description: "Trigger conditions"

    skip_when:
      description: "When NOT to use this"

    depends_on:
      description: "What could invalidate this wisdom"
      properties:
        entities: "Array of entity names"
        files: "Array of file paths"
        concepts: "Array of concept names"

    confidence:
      description: "Trust level (0.0-1.0)"
      default: 0.70

    verified_at:
      description: "Last verification date"

    verified_against:
      description: "Commit hash when verified"

body_structure:
  sections:
    - name: "Sections table"
      purpose: "Quick navigation with summaries"
      format: "Markdown table: Section | Summary"

    - name: "Per-section TL;DR"
      purpose: "Key insight without full read"
      format: "> **TL;DR:** one-line summary"

    - name: "Full content"
      purpose: "Complete explanation with examples"

matching:
  strategies:
    - "Keyword match on title and answers"
    - "Semantic similarity on purpose"
    - "Dependency overlap with task entities"

  priority:
    - "Exact answer match"
    - "Purpose match"
    - "Keyword overlap"

invalidation:
  triggers:
    - "Depended entity renamed/moved"
    - "Depended file significantly changed"
    - "Pattern deprecated"

  not_triggers:
    - "Unrelated file changed"
    - "Cosmetic refactor"
    - "New entities added"
```

---

## 4. Core Files

### 4.1 ORIENTATION.md Specification

ORIENTATION.md is the always-loaded cognitive reload file. It must:

1. **Fit in ~300 tokens** - Absolute maximum, aim for less
2. **Establish identity** - What is this project?
3. **Provide cognitive stance** - How should the agent think about this?
4. **Show structure** - Where are the key files?
5. **List constraints** - What must NEVER happen?
6. **Provide pointers** - Where to look for common tasks

**Required sections:**

```markdown
# ORIENTATION

## Identity
[One paragraph describing the project]

## Cognitive Stance
[Mental model for approaching this codebase]

## Structure
[ASCII tree of key directories]

## Constraints
- **NEVER** [constraint 1]
- **NEVER** [constraint 2]
...

## Pointers
- **[Task type]?** → [Where to look]
...
```

### 4.2 Progressive Document Structure (5 Tiers)

Every document in the framework follows a 5-tier progressive structure:

| Tier | Tokens | Content | Question Answered |
|------|--------|---------|-------------------|
| **Tier 1** | ~30 | Title + frontmatter | "Is this what I'm looking for?" |
| **Tier 2** | ~50 | Read when / Skip when callouts | "Should I read this now?" |
| **Tier 3** | ~100 | Sections table with summaries | "What section has my answer?" |
| **Tier 4** | ~200 | TL;DR per section | "What's the key insight?" |
| **Tier 5** | Variable | Full content | "Give me all the details" |

**Template structure:**

```markdown
---
title: "[Document Title]"
purpose: "[What this helps with]"
answers:
  - "[Question 1]"
  - "[Question 2]"
read_when: "[Trigger condition]"
skip_when: "[Skip condition]"
depends_on:
  files: []
  entities: []
  concepts: []
confidence: 0.70
verified_at: "[YYYY-MM-DD]"
---

# [Document Title]

> **Read when:** [Trigger condition]
>
> **Skip when:** [Skip condition]

## Sections

| Section | Summary |
|---------|---------|
| [Section 1](#section-1) | [10-word summary] |
| [Section 2](#section-2) | [10-word summary] |

---

## Section 1

> **TL;DR:** [One-sentence key insight]

[Full content...]

---

## Section 2

> **TL;DR:** [One-sentence key insight]

[Full content...]

---

## See Also

- [Related doc](path) - Brief description
```

### 4.3 Wisdom File Format

Wisdom files are cached traversals - answers someone already figured out.

**Frontmatter requirements:**

```yaml
---
title: "How to [Do Something]"
purpose: "[What task this helps with]"
answers:
  - "[Specific question 1]"
  - "[Specific question 2]"
read_when: "[When to read this]"
depends_on:
  files:
    - "[path/to/source.ts]"
  entities:
    - "[EntityName]"
  concepts:
    - "[concept-name]"
confidence: 0.70
verified_at: "2025-12-27"
---
```

**Body requirements:**
1. Sections table at the top
2. TL;DR block for each section
3. Actionable content (not just descriptions)
4. Code examples where applicable

---

## 5. Indices

### 5.1 entities.json Format

The entity index follows a strict tiered structure:

```json
{
  "meta": {
    "components": 47,
    "schemas": 10,
    "endpoints": 25,
    "generated": "2025-12-27",
    "from_commit": "abc123"
  },
  "categories": {
    "components": {
      "_index": ["DataTable", "LineChart", "BarChart"],
      "DataTable": {
        "tier1": "Sortable, responsive table with auto-column detection",
        "tier2": {
          "path": "packages/liquid-render/src/renderer/components/data-table.tsx",
          "props": ["data", "columns", "onSort"],
          "deps": ["react"],
          "exports": ["DataTable", "StaticTable"]
        }
      }
    },
    "schemas": {
      "_index": []
    },
    "endpoints": {
      "_index": []
    }
  }
}
```

### 5.2 concepts.json Format

The concept graph captures understanding-level knowledge:

```json
{
  "v": 1,
  "generated": "2025-12-27",
  "meta": {
    "features": 4,
    "patterns": 3,
    "domains": 3
  },
  "concepts": {
    "design-tokens": {
      "tier1": "Consistent theming via centralized utils.ts design system",
      "tier2": {
        "summary": "Shadcn-inspired design tokens provide CSS variable references...",
        "children": ["colors", "spacing", "typography"],
        "related_entities": ["tokens", "chartColors"],
        "docs": ["docs/COMPONENT-GUIDE.md"]
      },
      "tier3": {
        "key_patterns": ["tokens.colors.* for all colors..."],
        "gotchas": ["Never hardcode hex colors..."],
        "see_also": ["component-structure"]
      }
    }
  },
  "relationships": [
    { "from": "charts", "to": "design-tokens", "type": "depends_on" }
  ]
}
```

### 5.3 Index Generation

**entities.json** is auto-generated by `extract.py`:

```bash
python .claude/context/scripts/extract.py
python .claude/context/scripts/extract.py --output custom-path.json
```

**concepts.json** is manually curated but follows the schema.

### 5.4 Expansion Triggers

The agent expands from tier to tier based on task analysis:

| Trigger | Action |
|---------|--------|
| Task mentions category keyword (e.g., "component") | tier0 → tier1 |
| User asks "what X exist?" | tier0 → tier1 |
| Task mentions specific entity name | tier1 → tier2 |
| Following dependency chain | tier1 → tier2 |
| Task requires modification | tier2 → tier3 |
| Debugging | tier2 → tier3 |
| User explicitly requests source | tier2 → tier3 |

---

## 6. Automation

### 6.1 extract.py - Entity Extraction

**Purpose:** Scan codebase and generate `indices/entities.json`.

**What it does:**
1. Scans configured directories for source files
2. Extracts exports, props, dependencies from TypeScript files
3. Infers purpose from component names and comments
4. Generates tiered index with meta counts
5. Records git commit hash for drift tracking

**Execution:**

```bash
# Default output
python .claude/context/scripts/extract.py

# Custom output path
python .claude/context/scripts/extract.py --output /path/to/entities.json
```

**Configuration points:**

```python
# Paths to scan (in extract.py)
COMPONENTS_DIR = PROJECT_ROOT / "packages" / "liquid-render" / "src" / "renderer" / "components"

# Default output
DEFAULT_OUTPUT = PROJECT_ROOT / ".claude" / "context" / "indices" / "entities.json"
```

### 6.2 context-refresh.sh - Smart Refresh

**Purpose:** Check if entities.json needs refresh based on git commits.

**What it does:**
1. Gets current commit hash
2. Compares to `from_commit` in entities.json
3. If different, checks if component files changed
4. Only re-extracts if component files actually changed

**Execution:**

```bash
.claude/hooks/context-refresh.sh
```

**Logic:**

```bash
# Only refresh if:
# 1. entities.json is missing, OR
# 2. Current commit differs from cached commit AND component files changed

if [[ "$CURRENT_COMMIT" != "$CACHED_COMMIT" ]]; then
    CHANGED_COMPONENTS=$(git diff --name-only "$CACHED_COMMIT" HEAD -- "*.tsx" | wc -l)
    if [[ "$CHANGED_COMPONENTS" -gt 0 ]]; then
        python "$EXTRACT_SCRIPT"
    fi
fi
```

### 6.3 Git Hooks - post-commit Integration

**Setup:**

```bash
# .git/hooks/post-commit
#!/bin/bash
.claude/hooks/context-refresh.sh
```

Or via Husky:

```json
// package.json
{
  "husky": {
    "hooks": {
      "post-commit": ".claude/hooks/context-refresh.sh"
    }
  }
}
```

### 6.4 SessionStart Hooks - Claude Code Integration

**In CLAUDE.md or .claude/CLAUDE.local.md:**

```markdown
## Session Start Actions

1. Load `.claude/context/ORIENTATION.md`
2. Run `.claude/hooks/context-refresh.sh` if entities.json is stale
3. Load `indices/entities.json` tier0 (meta counts)
4. Load `indices/concepts.json` tier0 (meta counts)
```

---

## 7. Confidence & Trust

### 7.1 Trust Hierarchy

| Level | Source | Confidence | Notes |
|-------|--------|------------|-------|
| **Verified Runtime** | Test results, compiler output | 1.0 | Cannot lie |
| **Committed Code** | Type definitions, implementations | 0.95 | Git is truth |
| **Curated Framework** | CLAUDE.md, ORIENTATION.md | 0.85 | Intentionally stable |
| **Architecture Decisions** | ADRs, architecture.md | 0.80 | Changes rarely |
| **Specifications (fresh)** | PRD, specs < 30 days aligned | 0.75 | Intent documents |
| **Cached Wisdom** | wisdom/*.md | 0.70 | Verified when created |
| **External Docs** | MCP-fetched, official docs | 0.65 | May be version-mismatched |
| **User Instructions (clear)** | Explicit requests | 0.60 | May not be optimal |
| **Specifications (stale)** | Specs with code divergence | 0.50 | Check code first |
| **User Instructions (vague)** | Incomplete intent | 0.45 | Clarify before acting |
| **External (unverified)** | Web fetches | 0.40 | Verify applicability |
| **Uncommitted Code** | WIP changes | 0.30 | May be reverted |
| **Exploration** | .scratch/, hypotheticals | 0.20 | Never authoritative |

### 7.2 Conflict Resolution Rules

```
RULE 1: Higher confidence wins (with exceptions)
RULE 2: User intent can override, but FLAG the conflict
RULE 3: When uncertain, CLARIFY don't ASSUME
```

**Resolution process:**

1. Identify conflicting sources
2. Compare confidence levels
3. If user intent conflicts with high-confidence source, WARN
4. If equal confidence, prefer more specific over general
5. Document resolution decision

### 7.3 Decay Model (Drift-Based)

**Core principle:** Time is a proxy for drift. If no one's working, there's no drift.

**What triggers decay:**

| Source | Decay Triggers |
|--------|----------------|
| Specifications | Code commits without spec update |
| Cached Wisdom | Source files in `depends_on` modified |
| External Docs | Dependency version changed |

**What does NOT trigger decay:**

| Source | Non-Triggers |
|--------|--------------|
| All | Calendar time alone |
| All | Unrelated file changes |
| All | Cosmetic refactors |
| All | New entities added |

**Invalidation rules:**

```
INVALIDATE when:
  - Depended entity renamed/moved
  - Depended schema columns changed
  - Depended pattern deprecated
  - Depended file significantly changed

DO NOT INVALIDATE when:
  - Unrelated file changed
  - Cosmetic refactor (formatting, comments)
  - Addition of new entities (doesn't break existing)
```

---

## 8. Integration

### 8.1 Two-Layer Model

The Cognitive Context Framework operates alongside project-specific context:

```
CLAUDE.md (root)
     │
     ├── .claude/context/           ← Cognitive layer (this framework)
     │   ├── ORIENTATION.md
     │   ├── indices/
     │   └── wisdom/
     │
     └── .context/                  ← Project layer (domain knowledge)
         ├── CLAUDE.md
         └── [project docs]
```

### 8.2 Reading Order

**Session start:**

1. `CLAUDE.md` (root) - Repository rules
2. `.claude/context/ORIENTATION.md` - Cognitive reload
3. Load tier0 from indices (meta counts)

**Task execution:**

1. Analyze task for concept/entity mentions
2. Expand relevant index tiers
3. Match wisdom files by task keywords
4. Load from `.context/` if domain-specific
5. Load from `_bmad-output/` if implementing features

### 8.3 CLAUDE.md Integration

Add to root `CLAUDE.md`:

```markdown
## Context System

This repository uses the Cognitive Context Framework:

- **Cognitive context:** `.claude/context/`
- **Project context:** `.context/`
- **Project decisions:** `_bmad-output/`

### Session Start

1. Read this file (CLAUDE.md)
2. Read `.claude/context/ORIENTATION.md`
3. For context-heavy tasks, read `.context/CLAUDE.md`

### Context Priority

When sources conflict:
1. User's explicit instruction (highest)
2. This file (CLAUDE.md)
3. `.claude/context/` (cognitive framework)
4. `.context/` (project context)
5. `_bmad-output/` (project decisions)
```

---

## 9. Commands (Future)

### 9.1 /context:generate

Generate or regenerate context indices:

```
/context:generate              # Full regeneration
/context:generate entities     # Entities only
/context:generate concepts     # Concepts only (validates YAML)
```

**Behavior:**
1. Run extract.py for entities
2. Validate concepts.json against schema
3. Report counts and token budgets

### 9.2 /context:status

Check context system health:

```
/context:status
```

**Output:**

```
Context Status:
  ORIENTATION.md: 287 tokens (limit: 300)
  entities.json: 47 components, commit fb65f8b
  concepts.json: 10 concepts, 12 relationships
  wisdom/: 2 files

Staleness:
  entities.json: Current (matches HEAD)
  wisdom/how-to-create-component.md: 3 deps changed since verification
```

### 9.3 /context:verify

Verify wisdom files against current codebase:

```
/context:verify                        # All wisdom files
/context:verify how-to-create-component # Specific file
```

**Behavior:**
1. Check if `depends_on` files exist
2. Check if files changed since `verified_at`
3. Report confidence adjustments
4. Optionally update `verified_at`

### 9.4 /context:cache

Cache a new wisdom file from current conversation:

```
/context:cache "How to create a chart component"
```

**Behavior:**
1. Prompt for questions this wisdom answers
2. Extract key insights from conversation
3. Generate progressive document
4. Set `verified_at` to today
5. Track `depends_on` from mentioned files

---

## 10. Implementation Checklist

### 10.1 Minimum Viable Implementation

- [ ] Create `.claude/context/` directory structure
- [ ] Write ORIENTATION.md (~300 tokens)
- [ ] Create entity schema (entities.yaml)
- [ ] Implement extract.py for component extraction
- [ ] Generate initial entities.json
- [ ] Write at least one wisdom file

### 10.2 Full Implementation

- [ ] All three schemas defined
- [ ] concepts.json curated with relationships
- [ ] Multiple wisdom files for common tasks
- [ ] context-refresh.sh hook implemented
- [ ] Git post-commit hook configured
- [ ] Integration documented in CLAUDE.md
- [ ] Progressive document template available

### 10.3 Advanced Features

- [ ] /context commands implemented
- [ ] Automatic staleness detection
- [ ] Wisdom file generation from conversations
- [ ] Cross-repository concept sharing
- [ ] Token budget monitoring

---

## Appendix: Quick Reference

### File Purposes

| File | One-Line Purpose |
|------|------------------|
| ORIENTATION.md | 300-token cognitive reload |
| entities.yaml | Entity index schema |
| concepts.yaml | Concept graph schema |
| wisdom.yaml | Wisdom file schema |
| entities.json | Auto-extracted code index |
| concepts.json | Understanding-level graph |
| wisdom/*.md | Cached answers |
| extract.py | Entity extraction script |
| context-refresh.sh | Git-triggered refresh |

### Token Targets

| Layer | Target | Maximum |
|-------|--------|---------|
| ORIENTATION.md | ~250 | 300 |
| Index tier0 | ~50 | 100 |
| Index tier1 | ~100/category | 200 |
| Index tier2 | ~50/entity | 100 |
| Wisdom TL;DRs | ~200/file | 500 |
| Wisdom full | ~1000/file | 2000 |

### Confidence Quick Reference

| Range | Meaning |
|-------|---------|
| 0.90-1.0 | Runtime verified, committed code |
| 0.70-0.89 | Curated context, cached wisdom |
| 0.50-0.69 | External docs, user instructions |
| 0.20-0.49 | Uncommitted, exploration, vague |

---

*Specification Version: 1.0*
*Framework: Cognitive Context Framework*
*Last Updated: 2025-12-27*
