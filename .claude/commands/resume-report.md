# Project Resumption Report

Generate a comprehensive "cognitive reload" report for a developer resuming work on this project after time away.

## Instructions

You are generating a **Project Resumption Report**. The goal is not just information — it's **cognitive reload**. Rebuild the developer's mental model in layers, from orbit to ground level.

Execute ALL of the following steps and compile into a single, beautifully formatted markdown report.

---

## Step 1: Gather Raw Data

Run these commands to collect project state:

```bash
# Git state
git status --short
git log --oneline -15 --date=short --format="%h %ad %s"
git log --oneline -5 --name-only
git branch -a
git stash list

# Recent CODE files (top 20 - excludes markdown)
# Supports: TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, Ruby, PHP, Swift, Kotlin, Scala, C#
find . -type f \( \
  -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \
  -o -name "*.py" -o -name "*.pyw" \
  -o -name "*.java" -o -name "*.kt" -o -name "*.kts" -o -name "*.scala" \
  -o -name "*.go" \
  -o -name "*.rs" \
  -o -name "*.c" -o -name "*.cpp" -o -name "*.cc" -o -name "*.cxx" -o -name "*.h" -o -name "*.hpp" \
  -o -name "*.rb" \
  -o -name "*.php" \
  -o -name "*.swift" \
  -o -name "*.cs" \
  -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \
  -o -name "*.sql" \
  -o -name "*.sh" -o -name "*.bash" -o -name "*.zsh" \
  -o -name "*.vue" -o -name "*.svelte" \
  \) \
  -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" \
  -not -path "./.next/*" -not -path "./build/*" -not -path "./target/*" \
  -not -path "./__pycache__/*" -not -path "./venv/*" -not -path "./.venv/*" \
  -not -path "./vendor/*" -not -path "./.gradle/*" \
  -exec stat -f '%Sm|%N' -t '%Y-%m-%d %H:%M' {} \; 2>/dev/null | sort -rn | head -20

# Recent MARKDOWN docs (top 10 - separate table)
find . -name "*.md" -o -name "*.mdx" -type f \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec stat -f '%Sm|%N' -t '%Y-%m-%d %H:%M' {} \; 2>/dev/null | sort -rn | head -10

# For Linux systems (alternative):
# find . -type f \( -name "*.ts" -o -name "*.py" -o -name "*.java" ... \) \
#   -not -path "./node_modules/*" -not -path "./.git/*" \
#   -printf '%T+ %p\n' 2>/dev/null | sort -rn | head -20

# Check for workflow system
ls -la .workflows/ 2>/dev/null || echo "No workflow system"
ls -la .workflows/active/ 2>/dev/null || echo "No active workflows"

# Package.json scripts
cat package.json 2>/dev/null | grep -A 30 '"scripts"' | head -35

# Check for TODO/FIXME comments in recent files
grep -r "TODO\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.tsx" -l . 2>/dev/null | head -10

# Test status (if available)
npm test --if-present 2>/dev/null || pnpm test 2>/dev/null || echo "Tests not configured or failed"
```

---

## Step 2: Generate Report Structure

Compile findings into this EXACT structure:

### REPORT FORMAT:

```markdown
# Project Resumption Report
> Generated: [DATE] | Project: [NAME] | Last Activity: [DATE]

---

## 1. Executive Snapshot

| Metric | Value |
|--------|-------|
| Last Commit | `[hash]` - [date] |
| Days Since Activity | [N] |
| Active Workflow | [name or "None"] |
| Uncommitted Changes | [count] files |
| Untracked Files | [count] files |
| Health Status | [emoji] [status] |

```
Progress: [visual bar if workflow exists]
```

---

## 2. Narrative Context

[Write 2-3 sentences describing WHAT the developer was working on, in story form.
Infer from recent commits, modified files, and any active workflows.
Be specific about features, not just "made changes".]

---

## 3. State of the World

### Codebase Health Matrix

| Area | Status | Last Touch | Notes |
|------|--------|------------|-------|
| [area] | [emoji] | [date] | [observation] |

### Uncommitted Work (CRITICAL)

| Status | File | Risk Level |
|--------|------|------------|
| [M/A/?] | [path] | [Low/Medium/High] |

---

## 4. Open Threads

### Active Work Items

| Thread | Type | Status | Last Action | Resume Hint |
|--------|------|--------|-------------|-------------|
| [name] | [type] | [status] | [action] | [hint] |

### Dangling Questions
[Infer from context what decisions or questions might be pending]

- [ ] [question 1]
- [ ] [question 2]

---

## 5. Top 20 Latest Modified Code Files

**READ EACH FILE** and provide intelligent comments about its purpose and relevance.

| # | Modified | File | Lang | Type | Comment |
|---|----------|------|------|------|---------|
| 1 | [datetime] | `[path]` | [lang] | [emoji] | [What is this file? Why was it modified?] |
| 2 | [datetime] | `[path]` | [lang] | [emoji] | [Intelligent observation about the file's role] |
| 3 | [datetime] | `[path]` | [lang] | [emoji] | [Context about recent changes or purpose] |
| ... | ... | ... | ... | ... | ... |
| 20 | [datetime] | `[path]` | [lang] | [emoji] | [Comment] |

**Language Detection:**
- TS/JS: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`
- Python: `.py`, `.pyw`
- Java/JVM: `.java`, `.kt`, `.scala`
- Go: `.go`
- Rust: `.rs`
- C/C++: `.c`, `.cpp`, `.h`, `.hpp`
- Others: `.rb`, `.php`, `.swift`, `.cs`
- Config: `.json`, `.yaml`, `.toml`, `.sql`, `.sh`

**Type Legend:**
- 🧩 Component/UI
- ⚙️ Logic/Service
- 🧪 Test
- 🔧 Build/Tool
- 📊 Data/Schema
- 🎨 Style/Theme
- ⚡ API/Endpoint
- 🗄️ Database/Migration

---

## 6. Top 10 Latest Documentation Files

| # | Modified | File | Comment |
|---|----------|------|---------|
| 1 | [datetime] | `[path]` | [What decision/context does this doc capture?] |
| 2 | [datetime] | `[path]` | [Summary of document purpose] |
| ... | ... | ... | ... |
| 10 | [datetime] | `[path]` | [Comment] |

**Doc Type Indicators:**
- 📋 Spec/Requirements
- 🏗️ Architecture/Design
- 📖 Guide/Tutorial
- 📝 Notes/Scratch
- ✅ Status/Tracking
- 🔄 Workflow/Process

**Comment Guidelines:**
- For source files: Describe what the module does and why it might have been touched
- For docs: Summarize what decision or context it captures
- For configs: Note what setting or dependency changed
- For tests: Indicate what functionality is being validated
- Flag any files that seem incomplete or in-progress

---

## 7. File Archaeology

### Activity Heatmap (Last 7 Days)

```
[Visual heatmap showing file activity by time period]
Last 24h    [████████████████████] [filename]
Last 3d     [████████████        ] [filename]
Last 7d     [████████            ] [filename]
```

### Hot Zones
[List top 5 directories with most recent activity and file counts]

| Directory | Files Modified | Last Touch | Focus Area |
|-----------|----------------|------------|------------|
| [path] | [N] | [date] | [what's happening here] |

---

## 8. Git Timeline

```
[ASCII visualization of recent commits with branch points]
─────●─────────●─────────●─────────○ HEAD
     │         │         │         │
  [commit]  [commit]  [commit]  [uncommitted]
```

---

## 9. Recommended Actions

| Priority | Action | Command/Location | Est. Time |
|----------|--------|------------------|-----------|
| [emoji] 1 | [action] | `[command]` | [time] |
| [emoji] 2 | [action] | `[command]` | [time] |
| [emoji] 3 | [action] | `[command]` | [time] |

---

## 10. Decision Points Ahead

[Identify upcoming forks/decisions based on current state]

```
[ASCII decision tree if applicable]
```

---

## 11. Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  QUICK RESUME COMMANDS                              │
├─────────────────────────────────────────────────────┤
│  [action]           │  [command]                    │
│  [action]           │  [command]                    │
│  [action]           │  [command]                    │
└─────────────────────────────────────────────────────┘
```

---

## 12. Ambient Context

[Note any background systems, frameworks, or ongoing initiatives
that aren't urgent but provide context]

- **[System]**: [brief description]

---

*Report generated by Claude Code | This is a cognitive reload, not just documentation*
```

---

## Step 3: Quality Checklist

Before outputting, verify:

- [ ] Executive snapshot has real data, not placeholders
- [ ] Narrative tells a STORY, not bullet points
- [ ] **Top 20 CODE files table is COMPLETE with intelligent comments for EACH file**
- [ ] **Top 10 DOCUMENTATION files table is COMPLETE with comments**
- [ ] Each file comment explains PURPOSE and RELEVANCE, not just filename
- [ ] Language column correctly identifies file type (TS, Python, Java, Go, etc.)
- [ ] All uncommitted files are listed with risk assessment
- [ ] Recommended actions are SPECIFIC and ACTIONABLE
- [ ] Quick reference commands are TESTED and CORRECT
- [ ] Emojis used consistently: 🟢 good, 🟡 warning, 🔴 critical, 📝 docs, ⚠️ attention

---

## Output

Generate the full report in a single markdown code block, ready to be saved or displayed.

**CRITICAL: File Tables**

**Top 20 Code Files:**
- You MUST read each of the 20 code files to provide intelligent comments
- Include language detection (TS, Python, Java, Go, Rust, etc.)
- Comments should be 10-20 words explaining WHAT the file does and WHY it matters
- Group related files mentally to identify patterns (e.g., "all these are part of X feature")
- Flag any files that appear incomplete, experimental, or need attention

**Top 10 Documentation Files:**
- Summarize what decision, context, or knowledge each doc captures
- Identify specs, architecture docs, notes, and status files
- Flag any docs that seem outdated or need updating

If a `.workflows/` system exists, integrate workflow status prominently.
If `CLAUDE.md` or `.context/` exists, reference the project's self-documentation.

**The report should answer in 30 seconds:**
1. "What was I thinking?"
2. "What's broken?"
3. "What do I do right now?"
