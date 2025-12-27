# Context System Management

Complete command suite for AI-first documentation architecture.

## Token-Saving Architecture

**Scripts do mechanical work (0 tokens). AI makes decisions.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW                                                               │
│                                                                         │
│  1. Run script     →  python .context/scripts/context-scan.py          │
│  2. Script outputs →  JSON report                                       │
│  3. AI reads JSON  →  Makes decisions (classify, suggest, fix)         │
│  4. AI executes    →  Moves files, writes frontmatter                  │
│                                                                         │
│  Result: Scripts do 80% of work. AI does 20% (the smart part).        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Available Scripts

| Script | Purpose | Run |
|--------|---------|-----|
| `context-init.py` | Create structure | `python .context/scripts/context-init.py` |
| `context-scan.py` | Find all docs | `python .context/scripts/context-scan.py` |
| `context-check.py` | Validate links | `python .context/scripts/context-check.py` |
| `context-stats.py` | Token statistics | `python .context/scripts/context-stats.py` |
| `context-map.py` | Visualize graph | `python .context/scripts/context-map.py` |

## Command Reference

```
/context <operation> [args]
```

| Phase | Command | Script | AI Does |
|-------|---------|--------|---------|
| **Bootstrap** | `init` | ✅ `context-init.py` | Review output |
| **Bootstrap** | `setup` | — | Configure settings |
| **Migrate** | `scan` | ✅ `context-scan.py` | Review findings |
| **Migrate** | `classify` | — | Analyze content, assign roles |
| **Migrate** | `migrate` | — | Move files, update pointers |
| **Migrate** | `rewrite` | — | Write frontmatter |
| **Maintain** | `audit` | ✅ `context-check.py` | Decide fixes |
| **Maintain** | `repair` | — | Fix broken pointers |
| **Maintain** | `ingest <file>` | — | Analyze, place, link |
| **Maintain** | `split <file>` | — | Decide split strategy |
| **Maintain** | `prune` | — | Judge value, archive |
| **Maintain** | `optimize` | ✅ `context-stats.py` | Suggest improvements |
| **Validate** | `check` | ✅ `context-check.py` | — |
| **Validate** | `stats` | ✅ `context-stats.py` | — |
| **Visualize** | `map` | ✅ `context-map.py` | — |

---

# PHASE 1: BOOTSTRAP

## /context init

Create the context structure from scratch.

### What it does

```bash
# Creates this structure:
.context/
├── CLAUDE.md           # Hub (entry point)
├── CONTEXT-MAP.md      # How AI loads context
├── graph.yaml          # Machine-readable graph
├── specs/              # WHAT to build
│   └── .gitkeep
├── decisions/          # WHY we chose
│   └── .gitkeep
├── guides/             # HOW to do
│   └── .gitkeep
└── references/         # LOOKUP tables
    └── .gitkeep
```

### Creates these files

**`.context/CLAUDE.md`** (hub):
```markdown
# Context Hub

Entry point for AI context loading.

## Quick Navigation

| Need | Go To |
|------|-------|
| System architecture | [specs/](./specs/) |
| Why we decided X | [decisions/](./decisions/) |
| How to implement | [guides/](./guides/) |
| Lookup reference | [references/](./references/) |

## Loading Rules

See [CONTEXT-MAP.md](./CONTEXT-MAP.md) for how context is loaded.
```

**`.context/graph.yaml`**:
```yaml
# Context Graph Definition
version: 1.0
generated: [date]

structure:
  hub: CLAUDE.md
  folders:
    specs:
      role: spec
      load_when: [implement, build, create, add]
    decisions:
      role: decision
      load_when: [why, decision, chose, rationale]
    guides:
      role: guide
      load_when: [how to, guide, tutorial, setup]
    references:
      role: reference
      load_when: [lookup, list, table, status]

health:
  last_audit: null
  broken_edges: 0
  orphans: 0
  total_tokens: 0
```

---

## /context setup

Interactive configuration of the context system.

### Questions asked

1. **Project name?** → Used in hub title
2. **Existing docs locations?** → Where to scan for migration
3. **Token budget per task?** → Default 4000
4. **Human docs folder?** → `docs/` or skip
5. **Archive location?** → `.archived/` or custom

### Generates

- Updated `graph.yaml` with project settings
- `.contextignore` file for exclusions
- Integration with root `CLAUDE.md`

---

# PHASE 2: MIGRATE

## /context scan

Find all documentation in the project.

### Scans these locations

```
- ./*.md (root)
- docs/**/*.md
- .mydocs/**/*.md
- .scratch/**/*.md
- _bmad-output/**/*.md
- packages/**/docs/**/*.md
- packages/**/*.md (README, etc.)
```

### Output

```markdown
## Document Scan Report

### Found: 47 markdown files

| Location | Count | Likely Role |
|----------|-------|-------------|
| _bmad-output/ | 12 | specs, decisions |
| .mydocs/ | 8 | notes, drafts |
| docs/ | 15 | guides, references |
| packages/*/docs/ | 10 | references |
| root | 2 | hubs |

### Already in .context/: 5 files

### Candidates for migration: 42 files

Run `/context classify` to analyze each document.
```

---

## /context classify

Analyze each document and detect its role.

### Role Detection

For each document, analyze:

1. **Content patterns:**
   - "should", "must", "will" → SPEC
   - "we decided", "because", "alternative" → DECISION
   - "step 1", "how to", "first" → GUIDE
   - tables, lists, status → REFERENCE

2. **Filename patterns:**
   - `*-SPEC.md`, `*-ARCHITECTURE.md` → SPEC
   - `*-DECISION.md`, `ADR-*.md` → DECISION
   - `*-GUIDE.md`, `HOWTO-*.md` → GUIDE
   - `*-STATUS.md`, `*-REF.md` → REFERENCE

3. **Location patterns:**
   - `_bmad-output/` → likely SPEC or DECISION
   - `docs/` → likely GUIDE or REFERENCE
   - `.mydocs/`, `.scratch/` → likely DRAFT (don't migrate)

### Output

```markdown
## Classification Report

| File | Detected Role | Confidence | Suggested Location |
|------|---------------|------------|-------------------|
| _bmad-output/ARCH.md | spec | 95% | .context/specs/ARCHITECTURE.md |
| _bmad-output/API.md | spec (60%) + decision (40%) | — | SPLIT recommended |
| docs/setup.md | guide | 90% | .context/guides/SETUP.md |
| .mydocs/notes.md | draft | 80% | SKIP (keep in .mydocs) |

### Needs Human Decision: 5 files
[list files with <70% confidence or mixed roles]

### Ready to Migrate: 37 files
```

---

## /context migrate

Move classified docs to context structure.

### For each file

1. **Check classification** (from classify step)
2. **Determine destination:**
   - SPEC → `.context/specs/`
   - DECISION → `.context/decisions/`
   - GUIDE → `.context/guides/`
   - REFERENCE → `.context/references/`
3. **Handle conflicts:**
   - If destination exists, ask: merge/rename/skip
4. **Update pointers:**
   - Find all references to old path
   - Update to new path
5. **Create redirect (optional):**
   - Leave stub at old location pointing to new

### Options

```
/context migrate              # Interactive, asks for each file
/context migrate --auto       # Use classification, no prompts
/context migrate --dry-run    # Show what would happen
```

### Output

```markdown
## Migration Report

### Moved: 32 files
| From | To | Pointers Updated |
|------|-----|-----------------|
| _bmad-output/ARCH.md | .context/specs/ARCHITECTURE.md | 5 |

### Skipped: 10 files
| File | Reason |
|------|--------|
| .mydocs/notes.md | Draft, not for context |

### Needs Attention: 5 files
| File | Issue |
|------|-------|
| _bmad-output/API.md | Mixed roles, run /context split |
```

---

## /context rewrite

Add frontmatter to all context documents.

### Adds to each file

```yaml
---
role: spec
load_when: [implement, build]
tokens: ~1200
pointers:
  up: ../CLAUDE.md
  related: []
last_updated: 2024-12-27
---
```

### Also adds navigation header

```markdown
> ↑ [Hub](../CLAUDE.md) | Role: spec | ~1200 tokens
```

### Options

```
/context rewrite              # All files in .context/
/context rewrite <file>       # Single file
/context rewrite --check      # Show files missing frontmatter
```

---

# PHASE 3: MAINTAIN

## /context audit

Full health check of the context graph.

### Checks

1. **Graph integrity:**
   - All docs reachable from hub
   - No orphan docs
   - No broken pointers

2. **Frontmatter validity:**
   - All docs have frontmatter
   - Role is valid
   - Pointers exist

3. **Token efficiency:**
   - Docs under budget
   - Paths optimized

4. **Freshness:**
   - Last updated dates
   - Stale detection

### Output

Full health report (see earlier examples)

---

## /context repair

Fix issues found by audit.

### Fixes

- Broken pointers → update or remove
- Missing frontmatter → generate
- Orphan docs → link to hub or suggest prune
- Invalid roles → prompt for correction

---

## /context ingest <file>

Bring external doc into context.

### Process

1. Analyze file for role
2. Suggest destination
3. Add frontmatter
4. Create hub pointer
5. Move or copy file
6. Archive original (optional)

---

## /context split <file>

Separate a multi-role document.

### When to use

- Doc has >30% secondary role
- Audit flagged as "role confusion"

### Process

1. Analyze sections by role
2. Propose split plan
3. Create new files with proper frontmatter
4. Update all pointers
5. Archive original

---

## /context prune

Remove stale documents.

### Candidates

- No incoming pointers
- >90 days since update
- Contradicts implementation
- Marked superseded

### Process

1. List candidates
2. Check for valuable content
3. Extract knowledge if needed
4. Archive or delete
5. Update hub pointers

---

## /context optimize

Improve token efficiency.

### Optimizations

- Split large docs (>3000 tokens)
- Add shortcuts for long paths
- Merge tiny docs (<200 tokens)
- Remove duplicate content

---

# PHASE 4: VALIDATE

## /context check

Validate graph integrity.

### Checks

```
✓ Hub file exists
✓ graph.yaml valid
✓ All folders exist
✓ All frontmatter valid
✓ All pointers resolve
✓ No circular references
✓ Role consistency
```

### Output

```
Context Check: PASSED (7/7)
or
Context Check: FAILED
  ✗ 2 broken pointers
  ✗ 1 missing frontmatter
```

---

## /context test

Test traversal paths for common tasks.

### Tests

```
Test: "implement a new component"
  Path: hub → specs/ARCHITECTURE.md → specs/COMPONENT-GUIDE.md
  Tokens: 2,400
  Result: ✓ PASS (under 4000 budget)

Test: "understand auth flow"
  Path: hub → specs/AUTH.md → decisions/AUTH-APPROACH.md
  Tokens: 1,800
  Result: ✓ PASS

Test: "debug billing issue"
  Path: hub → specs/BILLING.md → ... (5 hops)
  Tokens: 8,200
  Result: ✗ FAIL (over budget, needs shortcut)
```

---

## /context stats

Show statistics about the context graph.

### Output

```
CONTEXT STATISTICS
══════════════════

Structure:
  Total docs:     47
  Hubs:           2
  Specs:          15
  Decisions:      8
  Guides:         12
  References:     10

Tokens:
  Total:          42,000
  Average:        894
  Largest:        3,200 (specs/ARCHITECTURE.md)
  Smallest:       180 (decisions/NAMING.md)

Health:
  Coverage:       94% (docs with frontmatter)
  Freshness:      87% (updated in 30 days)
  Link health:    100% (no broken pointers)

Efficiency:
  Avg path depth: 2.1
  Max path depth: 3
  Avg task tokens: 2,400
```

---

# VISUALIZE

## /context map

Show visual graph (see earlier examples).

---

# QUICK START

For a new project:
```
/context init
/context setup
```

For an existing project like this one:
```
/context scan
/context classify
/context migrate --dry-run
/context migrate
/context rewrite
/context check
```

Weekly maintenance:
```
/context audit
/context repair
```

Monthly optimization:
```
/context stats
/context optimize
/context prune
```
