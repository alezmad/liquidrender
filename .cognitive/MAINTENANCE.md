# Keeping Cognitive Context Up to Date

Once installed, Cognitive Context needs occasional maintenance to stay accurate.

---

## Quick Reference

| When | Action | Command/Prompt |
|------|--------|----------------|
| Weekly or after major changes | Check for drift | `npx cognitive drift` |
| Added new components | Update inventory | Prompt AI (see below) |
| Changed conventions | Update rules | Edit `rules.yaml` manually |
| Context feels stale | Full refresh | Prompt AI (see below) |

---

## Automatic vs Manual

| File | Update Method | Frequency |
|------|---------------|-----------|
| `knowledge.json` | **Automatic** via `cognitive sync` | After code changes |
| `capabilities.yaml` | **AI-assisted** (scan for new components) | When adding features |
| `rules.yaml` | **Manual** (human conventions) | When conventions change |
| `SUMMARY.md` | **AI-assisted** or manual | When structure changes |
| `cache/answers/*.md` | **On-demand** (create when needed) | As patterns emerge |

---

## Maintenance Prompts

### 1. Check What's Drifted

```
Run `npx cognitive drift` and tell me what's out of sync.
```

### 2. Update Component Inventory

```
Scan for new components added since last update.

Compare what exists in the codebase vs what's listed in .cognitive/capabilities.yaml.

Add any missing components to capabilities.yaml.
```

### 3. Full Context Refresh

```
Review and update .cognitive/ files:

1. Run `npx cognitive sync` to regenerate knowledge.json
2. Scan for new components → update capabilities.yaml
3. Check if SUMMARY.md stats are still accurate
4. Ask me if any conventions have changed → update rules.yaml

Report what you updated.
```

### 4. Add New Wisdom File

```
I frequently need to [describe pattern].

Create a wisdom file at .cognitive/cache/answers/[topic].md with:
- The pattern from THIS codebase
- Real code examples (not generic)
- Common mistakes to avoid
```

---

## Recommended Workflow

### Option A: Drift Detection (Low Effort)

Run weekly or before major features:

```bash
npx cognitive drift
```

This compares `knowledge.json` against actual code and reports:
- New files not in knowledge
- Deleted files still in knowledge
- Modified exports

### Option B: AI-Assisted Maintenance (Thorough)

Monthly or after significant changes, prompt your AI:

```
Check if .cognitive/ is up to date:

1. Are there new components not in capabilities.yaml?
2. Is SUMMARY.md still accurate (file counts, structure)?
3. Are there patterns we use frequently that should be cached?

Update what's needed and summarize changes.
```

### Option C: Git Hook (Automated)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npx cognitive drift --quiet || echo "⚠️  Cognitive context may be stale"
```

---

## Signs Your Context Is Stale

- AI suggests creating components that already exist
- AI uses old patterns you've moved away from
- `SUMMARY.md` mentions wrong file counts
- AI doesn't know about recently added features

**Fix:** Run a full refresh (prompt #3 above)

---

## What NOT to Maintain Manually

| File | Why |
|------|-----|
| `knowledge.json` | Auto-generated; use `cognitive sync` |
| Adapter outputs (`.cursor/rules/`) | Regenerated from `.cognitive/`; use `sync-all.sh` |

---

## Sync to Multiple Tools

After updating `.cognitive/`, sync to all AI tools:

```bash
bash .cognitive/adapters/sync-all.sh
```

This updates Cursor rules, Claude commands, etc. from the source of truth.
