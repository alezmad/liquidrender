# .context/skills - Project Skills

This folder contains Agent Skills that extend Claude's capabilities.

## Structure

```
skills/
├── CLAUDE.md              ← You are here
├── public/                ← Production-ready skills
│   ├── docx/              ← Word document processing
│   ├── pdf/               ← PDF processing & forms
│   ├── pptx/              ← PowerPoint creation
│   ├── xlsx/              ← Excel processing
│   ├── frontend-design/   ← Frontend design patterns
│   └── product-self-knowledge/
└── examples/              ← Example/experimental skills
    ├── algorithmic-art/
    ├── brand-guidelines/
    ├── canvas-design/
    ├── mcp-builder/
    ├── skill-creator/
    ├── theme-factory/
    └── ...
```

## What are Skills?

Skills are modular capabilities packaged as folders with a `SKILL.md` file. Claude autonomously decides when to use them based on your request and the Skill's description.

## How Skills Work

- **Model-invoked**: Claude decides when to use them (not user-invoked like slash commands)
- **Auto-discovered**: Skills in this folder are automatically available
- **Progressive disclosure**: Claude reads supporting files only when needed

## Creating a New Skill

1. Create folder: `skills/public/my-skill/` or `skills/examples/my-skill/`
2. Add `SKILL.md` with YAML frontmatter:

```yaml
---
name: my-skill-name
description: What it does and when to use it.
---

# My Skill Name

## Instructions
Step-by-step guidance.

## Examples
Concrete usage examples.
```

## Key Rules

- **name**: lowercase letters, numbers, hyphens only (max 64 chars)
- **description**: what it does + when to use it (max 1024 chars)
- Use `allowed-tools` to restrict tool access if needed
- Keep Skills focused on one capability
