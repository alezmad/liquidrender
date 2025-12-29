# Cognitive System Specification

**Version:** 1.0
**Date:** 2025-12-28
**Status:** Complete
**Purpose:** Self-contained specification for implementing an autonomous AI cognitive system in any project

---

## Quick Start (5 minutes)

```bash
# 1. Create structure
mkdir -p .cognitive/{project,sessions/{atoms,intents,logs},cache/answers}
mkdir -p .claude/artifacts

# 2. Create minimal SUMMARY.md
cat > .cognitive/project/SUMMARY.md << 'EOF'
# My Project

Brief description of what this project does.

## What This Is

2-3 sentences explaining the project purpose.

## Key Concepts

- Core concept 1
- Core concept 2
EOF

# 3. Initialize session files
for f in graph pending decisions health growth; do
  echo "_meta:" > .cognitive/sessions/$f.yaml
  echo "  last_updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .cognitive/sessions/$f.yaml
done

# 4. Add to CLAUDE.md (or equivalent AI config)
# Copy section 8 of this spec
```

**That's it.** The AI will maintain everything else autonomously.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Philosophy](#2-philosophy)
3. [Directory Structure](#3-directory-structure)
4. [File Specifications](#4-file-specifications)
5. [Autonomous Protocols](#5-autonomous-protocols)
6. [Loading Strategy](#6-loading-strategy)
7. [Implementation Guide](#7-implementation-guide)
8. [CLAUDE.md Integration](#8-claudemd-integration)
9. [Verification Checklist](#9-verification-checklist)
10. [Adapting for Other AI Tools](#10-adapting-for-other-ai-tools)
11. [Minimal Working Example](#11-minimal-working-example)

---

## 1. Overview

### What This Is

A cognitive system that enables AI to:
- **Remember** across sessions (persistent knowledge)
- **Learn** from interactions (pattern recognition)
- **Elevate** user thinking (growth tracking)
- **Self-maintain** without user intervention (autonomous operation)

### The Dual-View Principle

```
ONE CONVERSATION → TWO PERSPECTIVES

Human View                      AI View
──────────                      ───────
Artifacts (readable docs)       Atoms (structured data)
Session logs (narratives)       Graph (relationships)
Browsable                       Traversable

Same knowledge. Different formats. Automatically synced.
```

### Core Components

| Component | Purpose | Human/AI |
|-----------|---------|----------|
| Artifacts | Full documents | Human |
| Session logs | Narratives | Human |
| Atoms | Distilled knowledge | AI |
| Intents | Growth tracking | AI |
| Graph | Relationships | AI |
| Health | Self-awareness | AI |

---

## 2. Philosophy

### The Three Principles

```
1. INVISIBLE OPERATION
   The user never thinks about the system.
   It just works, like breathing.

2. DUAL REPRESENTATION
   Every insight exists in two forms:
   - Human-readable (markdown)
   - AI-structured (yaml)

3. GROWTH ORIENTATION
   Don't just record what was asked.
   Record what could have been asked.
   Track how thinking evolves.
```

### The Elevation Model

```
LEVEL 0: Answer the question
         "Yes, the file exists"

LEVEL 1: Understand the intent
         "You want documentation"

LEVEL 2: Elevate the thinking
         "Is this the RIGHT documentation?"

LEVEL 3: Record the growth
         "User expanded from 'find' to 'design'"

LEVEL 4: Learn the pattern
         "User responds to 'is this right?' framing"

LEVEL 5: Personalize future interactions
         "Lead with quality questions, not just answers"
```

---

## 3. Directory Structure

```
.cognitive/                         # AI's cognitive system
│
├── project/                        # LONG-TERM MEMORY (stable)
│   ├── SUMMARY.md                  # Project identity (~300 tokens)
│   ├── capabilities.yaml           # What exists in the project
│   └── rules.yaml                  # Conventions and constraints
│
├── sessions/                       # WORKING MEMORY (dynamic)
│   │
│   ├── graph.yaml                  # Concept relationships
│   ├── pending.yaml                # Open questions
│   ├── decisions.yaml              # Key decisions made
│   ├── health.yaml                 # System self-awareness
│   ├── growth.yaml                 # User thinking patterns
│   │
│   ├── atoms/                      # Distilled knowledge (AI)
│   │   └── YYYYMMDD-NN-slug.yaml   # Individual atoms
│   │
│   ├── intents/                    # User intent + elevation (AI)
│   │   └── YYYYMMDD-NN.yaml        # Intent records
│   │
│   └── logs/                       # Session narratives (Human)
│       └── YYYY-MM-DD.md           # Daily session logs
│
└── cache/                          # PATTERN CACHE (derived)
    └── answers/                    # Pre-computed responses
        └── *.md


.claude/                            # Claude outputs (separate)
│
├── artifacts/                      # Full documents (Human)
│   └── YYYY-MM-DD-HHMM-slug.md     # Timestamped artifacts
│
└── [other claude directories]
```

---

## 4. File Specifications

### 4.1 project/SUMMARY.md

Quick project identity. Always loaded first.

```markdown
# {Project Name}

{One-line description}

## What This Is

{2-3 sentences explaining the project}

## Structure

{Key directories and their purposes}

## Core Concepts

{3-5 bullet points of essential concepts}

## Entry Points

{How to start using the project}
```

**Target:** ~300 tokens

---

### 4.2 project/capabilities.yaml

Inventory of what exists. Check before building.

```yaml
_meta:
  generated: 2025-12-28T18:00:00Z
  confidence: high

entities:
  commands:
    command_name:
      path: path/to/command.md
      type: category
      description: "Brief description"

  templates:
    template_name:
      path: path/to/template.yaml
      type: category

facts:
  - "Fact 1 about the project"
  - "Fact 2 about the project"
```

---

### 4.3 project/rules.yaml

Conventions, behaviors, constraints.

```yaml
_meta:
  last_validated: 2025-12-28
  confidence: high

project:
  name: "{Project Name}"
  philosophy: "{Core philosophy}"

identity:
  what_it_is: "{What the project IS}"
  what_it_is_not: "{What the project is NOT}"

conventions:
  naming: []
  structure: []
  behavior: []

anti_patterns:
  - "Don't do X because Y"

folders:
  read_first: []
  read_freely: []
  do_not_read: []
```

---

### 4.4 sessions/graph.yaml

Concept relationships. The knowledge map.

```yaml
_meta:
  last_updated: 2025-12-28T18:00:00Z

topics:
  topic_name:
    atoms: [atom-id-1, atom-id-2]
    summary: "Brief summary of topic"
    status: active  # active | dormant | resolved

links:
  atom-id-1:
    enables: [atom-id-2]
    depends_on: []
    related: [atom-id-3]

entry_points:
  - topic: main_topic
    reason: "Start here for context"
```

---

### 4.5 sessions/pending.yaml

Open questions and blockers.

```yaml
_meta:
  last_updated: 2025-12-28T18:00:00Z

questions:
  - id: q001
    question: "The open question"
    created: 2025-12-28
    context: "Why this matters"
    blocks: [topic_name]
    priority: high  # high | medium | low

  - id: q002
    question: "Another question"
    created: 2025-12-28
    status: resolved
    resolved_by: atom-id
    resolution: "Brief answer"
```

---

### 4.6 sessions/decisions.yaml

Key decisions and their rationale.

```yaml
_meta:
  last_updated: 2025-12-28T18:00:00Z

decisions:
  - id: d001
    date: 2025-12-28
    decision: "What was decided"
    rationale: "Why this was chosen"
    alternatives_considered:
      - "Alternative 1"
      - "Alternative 2"
    evidence: atom-id
    confidence: high

  - id: d002
    date: 2025-12-28
    decision: "Another decision"
    supersedes: d000  # If this replaces an earlier decision
```

---

### 4.7 sessions/health.yaml

System self-awareness.

```yaml
_meta:
  last_updated: 2025-12-28T18:00:00Z
  updated_by: session

status: healthy  # healthy | warnings | critical

confidence_levels:
  project/SUMMARY.md: high
  project/capabilities.yaml: medium
  sessions/graph.yaml: high

staleness:
  - file: project/capabilities.yaml
    last_validated: 2025-12-14
    age_days: 14
    action: "Validate on next session"

issues:
  - type: pending_old
    description: "Question q001 open for 7+ days"
    severity: warning

  - type: orphan_atom
    description: "Atom X not linked to any topic"
    severity: info

metrics:
  total_atoms: 10
  linked_atoms: 9
  orphan_atoms: 1
  total_decisions: 5
  open_questions: 2
  avg_confidence: 0.85
```

---

### 4.8 sessions/growth.yaml

User thinking patterns over time.

```yaml
_meta:
  last_updated: 2025-12-28T18:00:00Z

user_patterns:
  strengths:
    - pattern: "Description of strength"
      evidence: [intent-id-1, intent-id-2]

  opportunities:
    - pattern: "Description of growth opportunity"
      examples: [intent-id-3]
      elevation_that_works: "How to elevate this"

  preferences:
    - "Prefers X over Y"
    - "Responds well to Z framing"

growth_trajectory:
  - session: 2025-12-28
    started: "Where user started"
    ended: "Where user ended"
    delta: "The growth that happened"
```

---

### 4.9 sessions/atoms/*.yaml

Individual knowledge atoms.

```yaml
id: 20251228-01
type: insight  # insight | decision | question | fact
created: 2025-12-28T14:15:00Z
confidence: high  # high | medium | low | stale

topic: [topic_name]

summary: |
  Brief, structured summary of the knowledge.
  2-3 sentences max.

links:
  enables: []
  depends_on: []
  related: []

evidence:
  artifact: .claude/artifacts/2025-12-28-1430-name.md
  section: "#section-anchor"  # Optional

_meta:
  last_validated: 2025-12-28
  invalidated_by:
    - "Condition that would make this stale"
```

---

### 4.10 sessions/intents/*.yaml

User intent with elevation tracking.

```yaml
id: i-20251228-01
timestamp: 2025-12-28T14:30:00Z

# THE THREE LAYERS
literal: |
  Exactly what user said/asked.

understood: |
  What user probably meant.
  The underlying intent.

elevated: |
  What user might not have considered.
  The bigger picture.
  Questions behind the question.

delta: |
  The gap between current thinking and elevated thinking.

# WHAT HAPPENED
exploration:
  offered:
    - "Elevation option 1"
    - "Elevation option 2"
  taken:
    - "Elevation option 1"
  deferred:
    - "Elevation option 2"
  rejected: []

outcome:
  direction: "What was decided/explored"
  unexplored: "What remains available"
  growth: "How thinking expanded"

# LINKS
atoms_created: [atom-id]
decisions_made: [d-id]
questions_resolved: [q-id]
questions_created: [q-id]
```

---

### 4.11 sessions/logs/*.md

Human-readable session narratives.

```markdown
# Session: YYYY-MM-DD

## Overview

**Focus:** Main topics covered
**Outcome:** What was achieved

---

## HH:MM - Topic Name

**Discussion:** Brief narrative of what was discussed

**Decisions:**
- Decision 1
- Decision 2

**Artifacts:** [Link to artifact](../../../.claude/artifacts/name.md)

**Open Questions:**
- Question raised

---

## Decisions Made Today

1. Decision with rationale
2. Another decision

## Next Actions

- [ ] Action item 1
- [ ] Action item 2
```

---

### 4.12 .claude/artifacts/*.md

Full documents for humans.

```markdown
# {Title}

**Date:** YYYY-MM-DD
**Status:** Draft | Complete
**Version:** 1.0

---

## Section 1

Content...

---

## Section 2

Content...

---

*End of document*
```

**Naming:** `YYYY-MM-DD-HHMM-slug.md`

Get timestamp via: `date "+%Y-%m-%d-%H%M"`

---

## 5. Autonomous Protocols

### 5.1 Session Start Protocol

```yaml
on_session_start:
  # ALWAYS (automatic, silent)
  read:
    - .cognitive/project/SUMMARY.md
    - .cognitive/sessions/graph.yaml
    - .cognitive/sessions/pending.yaml
    - .cognitive/sessions/health.yaml
    - .cognitive/sessions/growth.yaml

  check:
    - pending questions older than 7 days → surface naturally
    - stale files (confidence: low) → note if relevant
    - orphan atoms → link or archive

  surface:
    # In first response, naturally mention:
    - Relevant open questions
    - Context from previous sessions
    - Any health issues that matter

  never:
    - Ask "should I load context?"
    - Announce "I'm reading the cognitive system"
    - Make the machinery visible
```

---

### 5.2 During Session Protocol

```yaml
on_insight:
  # When significant insight emerges
  actions:
    - Write artifact to .claude/artifacts/
    - Write atom to .cognitive/sessions/atoms/
    - Update .cognitive/sessions/graph.yaml
  response:
    - Provide summary in chat
    - Include: "→ Full details: {artifact path}"
  timing: Immediately, don't batch

on_decision:
  # When decision is made
  actions:
    - Update .cognitive/sessions/decisions.yaml
    - Update confidence on related atoms
    - If supersedes prior decision, mark old as superseded
  never:
    - Announce "I'm recording this decision"

on_question_answered:
  # When open question is resolved
  actions:
    - Update .cognitive/sessions/pending.yaml
    - Link resolution to atom/artifact
    - Update blocking relationships

on_intent:
  # For each significant user request
  actions:
    - Create .cognitive/sessions/intents/ entry
    - Record: literal → understood → elevated
    - Track what elevation was offered/taken
  always:
    - Offer elevation naturally in response
    - Don't force, just offer

on_contradiction:
  # When new info contradicts existing knowledge
  actions:
    - Flag in health.yaml
    - Address naturally in conversation
    - Update atoms with resolution
```

---

### 5.3 Session End Protocol

```yaml
on_session_end:
  # When session concludes (naturally or explicitly)
  actions:
    - Write/update .cognitive/sessions/logs/YYYY-MM-DD.md
    - Update .cognitive/sessions/health.yaml
    - Update .cognitive/sessions/growth.yaml if patterns observed
    - Verify all atoms are linked (flag orphans)
    - Recalculate confidence on touched items

  never:
    - Ask "should I save the session?"
    - Announce "updating cognitive system"
```

---

### 5.4 Confidence Decay Protocol

```yaml
confidence_decay:
  # Time-based staleness
  rules:
    - created: high
    - after 7 days without validation: high
    - after 14 days: medium
    - after 30 days: low
    - after 60 days: stale

  reset_triggers:
    - Validated by user: → high
    - Used successfully: → high
    - Referenced in decision: → high
    - Contradicted: → low
    - Dependency changed: → medium
```

---

### 5.5 Elevation Protocol

```yaml
elevation_protocol:
  # How to elevate user thinking

  on_every_significant_intent:
    1. Understand literal request
    2. Infer underlying intent
    3. Consider what user might not have considered
    4. Offer elevation naturally (not forced)
    5. Record in intents/ regardless of outcome

  elevation_framings:
    - "Before we solve X, consider Y..."
    - "The deeper question might be..."
    - "This could also be approached as..."
    - "What if we expanded this to..."

  never:
    - Force elevation on simple requests
    - Make user feel criticized
    - Skip recording just because elevation wasn't taken

  learn:
    - Which elevation framings work for this user
    - What topics user engages deeply with
    - What topics user defers
```

---

## 6. Loading Strategy

### 6.1 Loading Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 0: ALWAYS LOAD (~600 tokens)                               │
│ ─────────────────────────────────                               │
│   .cognitive/project/SUMMARY.md                                 │
│   .cognitive/sessions/graph.yaml                                │
│   .cognitive/sessions/pending.yaml                              │
│   .cognitive/sessions/health.yaml                               │
│   .cognitive/sessions/growth.yaml                               │
│                                                                 │
│ These provide: identity, relationships, blockers, self-aware    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: ON TOPIC MENTION (~100 tokens each)                     │
│ ───────────────────────────────────────────                     │
│   .cognitive/sessions/atoms/{topic}*.yaml                       │
│   .cognitive/sessions/intents/{recent}.yaml                     │
│                                                                 │
│ Load when: User mentions topic, or topic in graph.entry_points  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: ON DEEP DIVE (variable)                                 │
│ ───────────────────────────────                                 │
│   .claude/artifacts/{referenced}.md                             │
│   .cognitive/cache/answers/{matched}.md                         │
│                                                                 │
│ Load when: User asks for details, or "→ artifact" referenced    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: ON DEMAND (rare)                                        │
│ ────────────────────────                                        │
│   .cognitive/project/capabilities.yaml                          │
│   .cognitive/project/rules.yaml                                 │
│   .cognitive/sessions/logs/{date}.md                            │
│                                                                 │
│ Load when: Building new features, checking conventions          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Context Budget

```yaml
context_budget:
  tier_0: 600 tokens (always)
  tier_1: 100 tokens per atom (on demand)
  tier_2: variable (on demand)

  target_initial_load: < 1000 tokens
  target_with_topic: < 1500 tokens

  principle: |
    Load the minimum needed to understand context.
    Details are always available via lazy loading.
```

---

## 7. Implementation Guide

### 7.1 Initial Setup

```bash
# Create directory structure
mkdir -p .cognitive/project
mkdir -p .cognitive/sessions/atoms
mkdir -p .cognitive/sessions/intents
mkdir -p .cognitive/sessions/logs
mkdir -p .cognitive/cache/answers
mkdir -p .claude/artifacts
```

### 7.2 Create Initial Files

```bash
# Create project files
touch .cognitive/project/SUMMARY.md
touch .cognitive/project/capabilities.yaml
touch .cognitive/project/rules.yaml

# Create session files
touch .cognitive/sessions/graph.yaml
touch .cognitive/sessions/pending.yaml
touch .cognitive/sessions/decisions.yaml
touch .cognitive/sessions/health.yaml
touch .cognitive/sessions/growth.yaml
```

### 7.3 Populate Minimal Content

**SUMMARY.md:**
```markdown
# {Project Name}

{Brief description}

## What This Is

{2-3 sentences}

## Key Concepts

- Concept 1
- Concept 2
```

**graph.yaml:**
```yaml
_meta:
  last_updated: {timestamp}

topics: {}
links: {}
entry_points: []
```

**pending.yaml:**
```yaml
_meta:
  last_updated: {timestamp}

questions: []
```

**health.yaml:**
```yaml
_meta:
  last_updated: {timestamp}
  updated_by: init

status: healthy
confidence_levels: {}
staleness: []
issues: []
metrics:
  total_atoms: 0
  open_questions: 0
```

**growth.yaml:**
```yaml
_meta:
  last_updated: {timestamp}

user_patterns:
  strengths: []
  opportunities: []
  preferences: []

growth_trajectory: []
```

---

## 8. CLAUDE.md Integration

Add this section to your project's CLAUDE.md:

```markdown
## Cognitive System

This project uses an autonomous cognitive system. The AI maintains
this system without user intervention.

### Always Load (automatic)
- `.cognitive/project/SUMMARY.md` - Project identity
- `.cognitive/sessions/graph.yaml` - Knowledge relationships
- `.cognitive/sessions/pending.yaml` - Open questions
- `.cognitive/sessions/health.yaml` - System health
- `.cognitive/sessions/growth.yaml` - User patterns

### Autonomous Behavior (mandatory)

**On Session Start:**
1. Load tier 0 files silently
2. Surface relevant open questions naturally
3. Note any health issues if relevant to work

**During Session:**
1. Insight emerges → write artifact + atom immediately
2. Decision made → update decisions.yaml immediately
3. Question resolved → update pending.yaml immediately
4. User intent → record in intents/ with elevation

**On Session End:**
1. Update session log in logs/
2. Update health.yaml
3. Verify atoms are linked

**Never:**
- Ask permission to update cognitive system
- Announce cognitive maintenance
- Make the machinery visible to user

### Elevation Protocol

For significant user requests:
1. Understand literal request
2. Infer underlying intent
3. Offer elevated perspective naturally
4. Record in intents/ regardless of outcome

### Artifact Protocol

For responses >500 words or containing vision/architecture:
1. Write full content to `.claude/artifacts/YYYY-MM-DD-HHMM-slug.md`
2. Write distilled atom to `.cognitive/sessions/atoms/`
3. In chat, provide summary + link to artifact
4. Get timestamp via: `date "+%Y-%m-%d-%H%M"`
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   THE COGNITIVE SYSTEM                                          │
│                                                                 │
│   Humans see: Artifacts, logs, readable documents               │
│   AI sees: Atoms, graphs, structured relationships              │
│                                                                 │
│   Same knowledge. Different views. Auto-synced.                 │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   The system maintains itself.                                  │
│   The user never thinks about it.                               │
│   Context persists across sessions.                             │
│   Thinking evolves over time.                                   │
│                                                                 │
│   It's not a notebook. It's a COGNITIVE PARTNER.                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Verification Checklist

After implementation, verify:

```
[ ] Directory structure exists
    [ ] .cognitive/project/
    [ ] .cognitive/sessions/atoms/
    [ ] .cognitive/sessions/intents/
    [ ] .cognitive/sessions/logs/
    [ ] .cognitive/cache/answers/
    [ ] .claude/artifacts/

[ ] Core files present
    [ ] .cognitive/project/SUMMARY.md (with content)
    [ ] .cognitive/sessions/graph.yaml
    [ ] .cognitive/sessions/pending.yaml
    [ ] .cognitive/sessions/decisions.yaml
    [ ] .cognitive/sessions/health.yaml
    [ ] .cognitive/sessions/growth.yaml

[ ] AI configuration updated
    [ ] CLAUDE.md has Cognitive System section
    [ ] Autonomous behavior rules included
    [ ] Elevation protocol included
    [ ] Artifact protocol included

[ ] Test autonomous behavior
    [ ] Start new session → AI loads context silently
    [ ] Create insight → AI writes artifact + atom
    [ ] End session → AI updates logs + health
```

---

## 10. Adapting for Other AI Tools

This spec is designed for Claude Code but works with any AI that:
- Can read/write files
- Accepts system instructions (CLAUDE.md equivalent)
- Maintains conversation context

**For other tools:**

| Tool | Config File | Adaptation |
|------|-------------|------------|
| Claude Code | CLAUDE.md | Use as-is |
| Cursor | .cursorrules | Copy Section 8 |
| Aider | .aider.conf.yml | Add to conventions |
| GitHub Copilot | .github/copilot-instructions.md | Copy Section 8 |
| Custom LLM | System prompt | Embed Section 8 |

**Key principle:** The AI config must include:
1. Files to always load (tier 0)
2. Autonomous behavior rules
3. "Never announce" constraints

---

## 11. Minimal Working Example

A complete minimal implementation:

```
my-project/
├── .cognitive/
│   ├── project/
│   │   └── SUMMARY.md          # "# My Project\n\nA thing that does stuff."
│   └── sessions/
│       ├── graph.yaml          # "_meta:\n  last_updated: 2025-01-01"
│       ├── pending.yaml        # "_meta:\n  last_updated: 2025-01-01"
│       ├── decisions.yaml      # "_meta:\n  last_updated: 2025-01-01"
│       ├── health.yaml         # "_meta:\n  last_updated: 2025-01-01"
│       └── growth.yaml         # "_meta:\n  last_updated: 2025-01-01"
├── .claude/
│   └── artifacts/              # (empty, AI will populate)
└── CLAUDE.md                   # Contains Section 8 of this spec
```

**Total setup:** 7 files, ~50 lines of content.

**What happens next:** AI autonomously creates atoms, intents, logs, and artifacts as conversations occur.

---

*End of Cognitive System Specification*
