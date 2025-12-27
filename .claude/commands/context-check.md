# Quick Context Health Check

Fast preflight check (~5 seconds). Run at session start or before major work.

## Instructions

Run these checks silently and output a ONE-LINE status:

```bash
# Get file ages in days
summary_age=$(( ($(date +%s) - $(stat -f %m .cognitive/SUMMARY.md 2>/dev/null || echo 0)) / 86400 ))
caps_age=$(( ($(date +%s) - $(stat -f %m .cognitive/capabilities.yaml 2>/dev/null || echo 0)) / 86400 ))

# Count components
listed=$(grep -c "\.tsx" .cognitive/capabilities.yaml 2>/dev/null || echo 0)
actual=$(find . -name "*.tsx" -path "*/components/*" -not -path "./node_modules/*" 2>/dev/null | wc -l | tr -d ' ')

# Calculate drift
drift=$((actual - listed))
```

## Output Format

**If healthy (files < 7 days, drift < 3):**
```
✅ Cognitive context healthy (SUMMARY: Xd, capabilities: Xd, drift: +X)
```

**If needs attention (files 7-14 days OR drift 3-10):**
```
⚠️ Cognitive context stale — run /context-maintain (SUMMARY: Xd, drift: +X)
```

**If critical (files > 14 days OR drift > 10):**
```
🔴 Cognitive context outdated — run /context-maintain now (SUMMARY: Xd, drift: +X)
```

## Optional: Add to Session Start

Tell user they can add this to CLAUDE.md:
```markdown
> **Session start:** Run /context-check silently. Only speak if ⚠️ or 🔴.
```

---

*This check should complete in under 5 seconds. Do not elaborate unless issues found.*
