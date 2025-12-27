# Cognitive Context Framework: 5-Minute Quickstart

Get from zero to working context framework in 5 minutes.

---

## What You'll Get (30 seconds)

After setup, your AI agent will:

- Load **300 tokens** instead of 50,000+ tokens per session
- Find answers in **cached wisdom files** instead of re-reading source code
- Navigate via **entity index** instead of globbing the filesystem
- Know **what to trust** via confidence levels (0.20-1.0)

**Before:** Agent reads 47 component files (50K tokens) to understand patterns.
**After:** Agent reads ORIENTATION.md (300 tokens) + matched wisdom file (500 tokens).

---

## Prerequisites

- Python 3.8+
- Git repository (for commit tracking)
- Claude Code CLI (recommended) or any LLM agent

---

## Step 1: Quick Install (2 minutes)

### Option A: Copy the framework

```bash
# From your project root
mkdir -p .claude/context/{schemas,wisdom,indices,templates,scripts,docs}

# Download core files (replace with your source)
curl -o .claude/context/COGNITIVE-CONTEXT-FRAMEWORK.md [framework-url]
curl -o .claude/context/schemas/entities.yaml [schema-url]
curl -o .claude/context/schemas/concepts.yaml [schema-url]
curl -o .claude/context/schemas/wisdom.yaml [schema-url]
curl -o .claude/context/scripts/extract.py [script-url]
curl -o .claude/context/templates/progressive-doc.md [template-url]
```

### Option B: Clone from existing project

```bash
# Copy entire context directory
cp -r /path/to/source/.claude/context .claude/context

# Remove project-specific files
rm -rf .claude/context/wisdom/*
rm -rf .claude/context/indices/*
```

### Make scripts executable

```bash
chmod +x .claude/context/scripts/extract.py
```

---

## Step 2: Create Your ORIENTATION.md (2 minutes)

Create `.claude/context/ORIENTATION.md`:

```markdown
# ORIENTATION

## Identity

[PROJECT_NAME] is a [ONE_SENTENCE_DESCRIPTION].

## Cognitive Stance

Think of this as a **[MENTAL_MODEL]**: [METAPHOR]. When in doubt, [HEURISTIC].

## Structure

\`\`\`
[MAIN_PACKAGE_PATH]/
├── [FOLDER_1]/          → [PURPOSE_1]
├── [FOLDER_2]/          → [PURPOSE_2]
│   └── [KEY_FILE]       → [WHY_IT_MATTERS]
├── [FOLDER_3]/          → [PURPOSE_3]
└── [DOCS_FOLDER]/       → [DOCS_PURPOSE]
\`\`\`

## Constraints

- **NEVER** [CONSTRAINT_1]
- **NEVER** [CONSTRAINT_2]
- **NEVER** [CONSTRAINT_3]
- **ALWAYS** [POSITIVE_CONSTRAINT]

## Pointers

- **[TASK_TYPE_1]?** → Read \`[FILE_PATH_1]\` first
- **[TASK_TYPE_2]?** → Check \`[FILE_PATH_2]\` for [REASON]
- **[TASK_TYPE_3]?** → \`[FOLDER_PATH]\` holds [CONTENT]
```

### Example (filled in):

```markdown
# ORIENTATION

## Identity

Acme Dashboard is a React analytics platform with real-time data visualization.

## Cognitive Stance

Think of this as a **data pipeline**: Sources → Transforms → Charts. When in doubt, trace data flow from API to component.

## Structure

\`\`\`
src/
├── api/              → Data fetching and caching
├── components/       → React UI components
│   └── charts/       → Recharts wrappers (design tokens!)
├── hooks/            → Shared React hooks
└── docs/             → Component usage guides
\`\`\`

## Constraints

- **NEVER** hardcode colors—use theme tokens
- **NEVER** fetch data in components—use hooks
- **NEVER** skip loading states
- **ALWAYS** handle error boundaries

## Pointers

- **Adding a chart?** → Read \`docs/CHART-PATTERNS.md\` first
- **New API endpoint?** → Check \`api/README.md\` for conventions
- **Styling questions?** → \`components/theme.ts\` is the source of truth
```

---

## Step 3: Generate Entity Index (30 seconds)

Run the extraction script:

```bash
python .claude/context/scripts/extract.py
```

Expected output:

```
Extracting entities from: /path/to/your/project
Output path: /path/to/your/project/.claude/context/indices/entities.json

Generated entities.json:
  Components: 42
  Schemas: 0
  Endpoints: 0
  From commit: abc1234
  Generated: 2025-12-27
```

---

## Step 4: Verify It Works (30 seconds)

### Check entities.json was created

```bash
cat .claude/context/indices/entities.json | head -20
```

You should see:

```json
{
  "meta": {
    "components": 42,
    "schemas": 0,
    "endpoints": 0,
    "generated": "2025-12-27",
    "from_commit": "abc1234"
  },
  "categories": {
    "components": {
      "_index": ["Button", "Card", "DataTable", ...],
      ...
    }
  }
}
```

### Test agent context loading

Ask your agent:

```
What components are available in this project?
```

It should answer from `entities.json` without reading source files.

---

## Step 5: Create Your First Wisdom File (Optional, 1 minute)

Create `.claude/context/wisdom/[topic].md`:

```markdown
---
title: How to [TASK]
purpose: [SHORT_PURPOSE]
answers:
  - [QUESTION_1]?
  - [QUESTION_2]?
read_when: [TRIGGER_CONDITION]
skip_when: [SKIP_CONDITION]
depends_on:
  files:
    - [SOURCE_FILE_1]
    - [SOURCE_FILE_2]
---

# How to [TASK]

> **Read when:** [TRIGGER_CONDITION]

## Sections

| Section | Summary |
|---------|---------|
| [Section 1](#section-1) | [One-line summary] |
| [Section 2](#section-2) | [One-line summary] |

---

## Section 1

> **TL;DR:** [Key insight in one sentence]

[Detailed content...]

---

## Section 2

> **TL;DR:** [Key insight in one sentence]

[Detailed content...]
```

---

## Directory Structure (Final)

```
.claude/context/
├── ORIENTATION.md              # ← 300-token cognitive reload (REQUIRED)
├── COGNITIVE-CONTEXT-FRAMEWORK.md  # ← Philosophy & design (reference)
├── schemas/
│   ├── entities.yaml           # Entity index schema
│   ├── concepts.yaml           # Concept graph schema
│   └── wisdom.yaml             # Wisdom file schema
├── indices/
│   ├── entities.json           # ← Auto-generated (Step 3)
│   └── concepts.json           # ← Curated (optional)
├── wisdom/
│   └── [your-wisdom-files].md  # ← Cached answers (Step 5)
├── templates/
│   └── progressive-doc.md      # Document authoring template
├── scripts/
│   └── extract.py              # Entity extraction script
└── docs/
    └── QUICKSTART.md           # This file
```

---

## Next Steps

1. **Add more wisdom files** — Cache answers to common questions
2. **Customize extract.py** — Add schema/endpoint extraction for your project
3. **Create concepts.json** — Map high-level concepts to entities
4. **Read the spec** — See `COGNITIVE-CONTEXT-FRAMEWORK.md` for deep dive

---

## Troubleshooting

### "No components found"

The default `extract.py` looks for `.tsx` files in a specific path. Edit `COMPONENTS_DIR` in the script:

```python
COMPONENTS_DIR = PROJECT_ROOT / "your" / "components" / "path"
```

### "entities.json is empty"

Check that your component files export functions with PascalCase names:

```tsx
export function MyComponent() { ... }  // ✓ Detected
export const myComponent = () => { ... }  // ✗ Not detected
```

### Agent not using ORIENTATION.md

Ensure your agent's system prompt includes:

```
Read .claude/context/ORIENTATION.md at session start.
```

---

## Quick Reference

| File | Purpose | When to Update |
|------|---------|----------------|
| `ORIENTATION.md` | Session bootstrap | Project structure changes |
| `entities.json` | Code index | After significant code changes |
| `wisdom/*.md` | Cached answers | When patterns are established |
| `concepts.json` | Understanding map | Domain model changes |

---

*Framework version: 2.0*
*Setup time: ~5 minutes*
