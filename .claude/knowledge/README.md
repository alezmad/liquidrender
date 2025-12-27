# Knowledge System

Auto-generated context for AI agents.

## Files

| File | Purpose | Regenerate |
|------|---------|------------|
| `SUMMARY.md` | Always-loaded orientation (~300 tokens) | Manual |
| `knowledge.json` | Entities extracted from code | `python generate.py` |
| `libraries.json` | Dependency summaries | `python generate-libraries.py` |
| `rules.yaml` | Human conventions | Manual |
| `cache/answers/` | Derived knowledge | Manual (add as you work) |

## Regenerate

```bash
# Knowledge from code
python .claude/knowledge/generate.py

# Library index
python .claude/knowledge/generate-libraries.py
```

Run on commit hook or before major work sessions.

## Adding Cached Answers

When you derive knowledge that should persist:

```bash
# Create a new cached answer
echo "# How to X\n\n..." > cache/answers/how-to-x.md
```

Good candidates:
- "How to create a component"
- "How to add an API endpoint"
- "Project architecture overview"
- Common patterns you keep explaining

## Structure

```
.claude/knowledge/
├── README.md              ← You are here
├── SUMMARY.md             ← Tier 0: Always loaded
├── knowledge.json         ← Tier 1: Entity map
├── libraries.json         ← External dependencies
├── rules.yaml             ← Human conventions
├── generate.py            ← Code → knowledge
├── generate-libraries.py  ← Dependencies → index
├── details/               ← Tier 2: Expanded info (future)
└── cache/
    └── answers/           ← Tier 3: Derived knowledge
        └── *.md
```
