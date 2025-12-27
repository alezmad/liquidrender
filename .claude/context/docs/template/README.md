# Cognitive Context Framework Template

> **Version:** 1.0
> **Purpose:** Drop-in template to bootstrap the Cognitive Context Framework in any project

---

## Overview

This template provides everything you need to implement the Cognitive Context Framework - an externalized cognition system for AI agents operating in codebases.

## What's Included

```
template/
├── README.md                           ← You are here
├── setup.sh                            ← One-command installation
├── context/
│   ├── ORIENTATION.template.md         ← Template for cognitive reload file
│   ├── wisdom/.gitkeep                 ← Directory for cached answers
│   ├── indices/.gitkeep                ← Directory for entity/concept indices
│   ├── schemas/
│   │   ├── entities.yaml               ← Entity index schema
│   │   ├── concepts.yaml               ← Concept graph schema
│   │   └── wisdom.yaml                 ← Wisdom file schema
│   ├── scripts/
│   │   └── extract.template.py         ← Template for entity extraction script
│   └── templates/
│       └── progressive-doc.template.md ← Template for progressive documents
├── hooks/
│   └── context-refresh.template.sh     ← Template for git hook
├── cursor-adapter/                     ← Cursor IDE support
│   ├── README.md
│   ├── sync-to-cursor.sh               ← Sync script
│   └── rules/                          ← .mdc templates
└── claude-projects-adapter/            ← Claude Projects support
    ├── README.md
    └── generate-knowledge-file.sh      ← Export script
```

## Quick Start

### 1. Copy the template

```bash
# From your project root
cp -r path/to/.claude/context/docs/template/context .claude/context
cp -r path/to/.claude/context/docs/template/hooks .claude/hooks
```

### 2. Customize ORIENTATION.md

Edit `.claude/context/ORIENTATION.md`:

1. Replace `{{PROJECT_NAME}}` with your project name
2. Replace `{{PROJECT_DESCRIPTION}}` with a one-paragraph description
3. Update `{{COGNITIVE_STANCE}}` with how to think about your codebase
4. Fill in `{{STRUCTURE}}` with your key directories
5. List your `{{CONSTRAINTS}}` (things that must NEVER happen)
6. Add `{{POINTERS}}` for common task types

### 3. Customize the extraction script

Edit `.claude/context/scripts/extract.py`:

1. Replace `{{SOURCE_DIRECTORIES}}` with paths to scan
2. Adjust `{{FILE_PATTERNS}}` for your file types
3. Configure `{{OUTPUT_PATH}}` if needed

### 4. Set up the refresh hook

Edit `.claude/hooks/context-refresh.sh`:

1. Replace `{{SOURCE_GLOB}}` with your component file pattern
2. Adjust `{{EXTRACT_SCRIPT}}` path if needed

Make it executable:

```bash
chmod +x .claude/hooks/context-refresh.sh
```

### 5. Run initial extraction

```bash
python .claude/context/scripts/extract.py
```

### 6. Create your first wisdom file

Copy the progressive document template:

```bash
cp .claude/context/templates/progressive-doc.template.md \
   .claude/context/wisdom/how-to-{{COMMON_TASK}}.md
```

## Template Placeholders

All templates use `{{PLACEHOLDER}}` syntax. Here's a reference:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{PROJECT_NAME}}` | Your project name | "MyApp", "LiquidRender" |
| `{{PROJECT_DESCRIPTION}}` | One-paragraph description | "A DSL-to-React compiler..." |
| `{{COGNITIVE_STANCE}}` | Mental model for the codebase | "Think of this as a compiler pipeline..." |
| `{{STRUCTURE}}` | ASCII tree of key directories | See ORIENTATION template |
| `{{CONSTRAINTS}}` | List of things to NEVER do | "NEVER hardcode colors..." |
| `{{POINTERS}}` | Task-to-location mappings | "Building a component? Read X..." |
| `{{SOURCE_DIRECTORIES}}` | Paths to scan for entities | `["src/components", "src/api"]` |
| `{{FILE_PATTERNS}}` | File extensions to include | `["*.tsx", "*.ts"]` |
| `{{SOURCE_GLOB}}` | Git diff pattern for changes | `"src/components/*.tsx"` |

## Integration

Add to your root `CLAUDE.md`:

```markdown
## Context System

This repository uses the Cognitive Context Framework.

### Session Start

1. Read this file (CLAUDE.md)
2. Read `.claude/context/ORIENTATION.md`
3. For context-heavy tasks, expand relevant index tiers

### Context Directories

- **Cognitive context:** `.claude/context/`
- **Entity indices:** `.claude/context/indices/`
- **Cached wisdom:** `.claude/context/wisdom/`
```

## File Details

### ORIENTATION.template.md

The always-loaded cognitive reload file. Must fit in ~300 tokens. Contains:

- **Identity** - What is this project?
- **Cognitive Stance** - How to think about the codebase
- **Structure** - Key directories
- **Constraints** - What must NEVER happen
- **Pointers** - Where to look for common tasks

### Schemas

Three YAML schemas define the structure:

- **entities.yaml** - Code entities (components, schemas, endpoints)
- **concepts.yaml** - Understanding graph (features, patterns, domains)
- **wisdom.yaml** - Cached answers (progressive documents)

### Extract Script

Template Python script that:

1. Scans configured directories
2. Extracts exports, props, dependencies
3. Generates tiered entity index
4. Records commit hash for drift tracking

### Context Refresh Hook

Bash script that:

1. Checks if entities.json needs refresh
2. Compares current commit to cached commit
3. Only re-extracts if relevant files changed

## Best Practices

### ORIENTATION.md

- Keep under 300 tokens
- Be specific about constraints
- Make pointers actionable

### Wisdom Files

- One topic per file
- Include TL;DR for each section
- Track dependencies in frontmatter
- Update `verified_at` when checking

### Entity Index

- Run extraction after major changes
- Use git hooks for automatic refresh
- Keep tier1 descriptions under 15 words

### Concept Graph

- Start with 5-10 core concepts
- Link to related entities
- Update when architecture changes

## Cross-Tool Support

The Cognitive Context Framework works with multiple AI coding tools.

### Supported Tools

| Tool | Adapter | Setup |
|------|---------|-------|
| **Claude Code** | Native | This template (primary) |
| **Cursor** | `cursor-adapter/` | `.cursor/rules/*.mdc` |
| **Claude Projects** | `claude-projects-adapter/` | Upload knowledge file |

### Cursor

The Cursor adapter converts the framework to `.mdc` format.

```bash
# Option 1: Run the sync script
./cursor-adapter/sync-to-cursor.sh

# Option 2: Copy templates and customize
cp -r cursor-adapter/rules/* .cursor/rules/
```

**Mapping:**
- `ORIENTATION.md` → `orientation.mdc` (alwaysApply: true)
- `wisdom/*.md` → `wisdom-*.mdc` (agent-requested)
- Indices → Referenced via `@context-index`

See `cursor-adapter/README.md` for details.

### Claude Projects (claude.ai)

The Claude Projects adapter creates uploadable knowledge files.

```bash
# Generate knowledge file
./claude-projects-adapter/generate-knowledge-file.sh

# Then upload PROJECT-KNOWLEDGE.md to your Claude Project
```

**Mapping:**
- `ORIENTATION.md` → Project Instructions
- Everything else → PROJECT-KNOWLEDGE.md (knowledge file)

See `claude-projects-adapter/README.md` for details.

### Cross-Tool Workflow

For teams using multiple tools:

1. **Source of truth:** `.claude/context/` (Claude Code format)
2. **Sync to Cursor:** Run `sync-to-cursor.sh` after changes
3. **Export for Claude Projects:** Run `generate-knowledge-file.sh`
4. **Git hooks:** Work with both Claude Code and Cursor

```
.claude/context/ ──┬── (native) ──> Claude Code
                   │
                   ├── sync-to-cursor.sh ──> .cursor/rules/ ──> Cursor
                   │
                   └── generate-knowledge-file.sh ──> PROJECT-KNOWLEDGE.md ──> Claude Projects
```

## Troubleshooting

### Extraction fails

1. Check Python path: `which python`
2. Verify source directories exist
3. Check file permissions

### Hook doesn't run

1. Make executable: `chmod +x .claude/hooks/*.sh`
2. Check git hook configuration
3. Verify CLAUDE_PROJECT_DIR or git root

### Token budget exceeded

1. Reduce ORIENTATION.md scope
2. Shorten tier1 descriptions
3. Move detail to tier2/tier3

---

*Template Version: 1.0*
*Framework: Cognitive Context Framework*
