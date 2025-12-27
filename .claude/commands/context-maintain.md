# Cognitive Context Maintenance Wizard

Run a guided maintenance check on the cognitive context system.

## Instructions

You are performing an **agentic maintenance check** on the `.cognitive/` system. Execute ALL steps and report findings.

---

## Step 1: Check File Health

```bash
# List cognitive files with ages
echo "=== Cognitive Context Files ==="
ls -la .cognitive/*.md .cognitive/*.yaml .cognitive/*.json 2>/dev/null

# Count cached wisdom
echo ""
echo "=== Cached Wisdom ==="
ls .cognitive/cache/answers/*.md 2>/dev/null | wc -l
ls .cognitive/cache/answers/ 2>/dev/null
```

Report file ages and flag anything older than 7 days.

---

## Step 2: Run Drift Detection

```bash
npx cognitive drift 2>/dev/null || echo "Drift command not available - will check manually"
```

If drift command unavailable, manually compare:
- Count components in filesystem vs capabilities.yaml
- Check if knowledge.json entity count matches reality

---

## Step 3: Inventory Comparison

### 3.1 Component Count

```bash
# Count actual components
echo "=== Filesystem Components ==="
find . -name "*.tsx" -path "*/components/*" -not -path "./node_modules/*" 2>/dev/null | wc -l

# Count in capabilities.yaml
echo "=== Listed in capabilities.yaml ==="
grep -c "\.tsx\|\.ts" .cognitive/capabilities.yaml 2>/dev/null || echo "0"
```

### 3.2 Package Count

```bash
# Count actual packages
echo "=== package.json dependencies ==="
cat package.json 2>/dev/null | grep -E "^\s+\"" | grep -v "{" | wc -l
```

Compare counts. If filesystem > capabilities.yaml, new items need adding.

---

## Step 4: SUMMARY.md Accuracy

Read `.cognitive/SUMMARY.md` and verify:

1. **File counts** — Are numbers still accurate?
2. **Directory structure** — Does ASCII tree match reality?
3. **Core files table** — Do paths still exist?

```bash
# Quick structure check
ls -d */ 2>/dev/null | head -10
```

---

## Step 5: Generate Report

Output this format:

```markdown
# Cognitive Context Health Report
> Generated: [DATE]

## Health Score: [🟢 Healthy | 🟡 Needs Attention | 🔴 Stale]

## File Ages
| File | Age | Status |
|------|-----|--------|
| SUMMARY.md | [N] days | [emoji] |
| capabilities.yaml | [N] days | [emoji] |
| rules.yaml | [N] days | [emoji] |
| knowledge.json | [N] days | [emoji] |

## Inventory Check
| Category | Listed | Actual | Delta |
|----------|--------|--------|-------|
| Components | [N] | [N] | [+/-N] |
| Packages | [N] | [N] | [+/-N] |
| Wisdom files | [N] | - | - |

## Issues Found
- [ ] [Issue 1 if any]
- [ ] [Issue 2 if any]

## Recommended Actions
| Priority | Action | Effort |
|----------|--------|--------|
| 1 | [action] | [low/med/high] |
| 2 | [action] | [low/med/high] |

## Quick Fix Commands
\`\`\`bash
[commands to fix issues]
\`\`\`
```

---

## Step 6: Offer Fixes

After reporting, ask:

> "I found [N] issues. Would you like me to:
> 1. Fix all automatically
> 2. Fix one at a time (explain each)
> 3. Just show me what to do manually"

If user chooses 1 or 2, proceed with fixes:
- Add missing components to capabilities.yaml
- Update counts in SUMMARY.md
- Regenerate knowledge.json if needed

---

## Quality Checklist

Before completing:
- [ ] All files checked for age
- [ ] Component count compared
- [ ] SUMMARY.md accuracy verified
- [ ] Clear recommendations provided
- [ ] User offered choice to auto-fix

---

*Cognitive Context Maintenance Wizard v1.0*
