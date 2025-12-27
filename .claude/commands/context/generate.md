# /context generate

Regenerate knowledge from code. Run when codebase changes significantly.

## Steps

1. Run the generation scripts:

```bash
python .claude/knowledge/generate.py
python .claude/knowledge/generate-libraries.py
```

2. Report what was generated:
   - Number of components, modules, schemas
   - Number of libraries indexed
   - Any warnings or issues

3. Check if SUMMARY.md needs updating:
   - If component count changed significantly
   - If new modules were added
   - Suggest edits if needed, don't auto-update

## Do NOT regenerate
- `rules.yaml` (human-maintained)
- `capabilities.yaml` (human-curated)
- `cache/answers/*` (preserved derived knowledge)
