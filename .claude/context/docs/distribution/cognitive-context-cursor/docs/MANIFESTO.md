# The Cognitive Context Manifesto

> Context is not storage. Context is externalized cognition.

---

## The Problem We Solve

Every AI coding session starts the same way: the agent knows nothing about your project. It doesn't remember your architecture decisions, your coding patterns, or the mistakes you've already made together.

You repeat yourself. The AI makes suggestions that violate your constraints. Productivity suffers.

**This is not an AI limitation. This is a context architecture failure.**

---

## Our Philosophy

### 1. Context as Cognition, Not Storage

Traditional context systems treat files as data to retrieve. We treat context as **externalized thinking** — pre-computed patterns, crystallized decisions, and reusable mental models.

The difference:
- **Storage:** "Here's a file about components."
- **Cognition:** "Here's how to think about components in this codebase."

### 2. Two Graphs, Not One

Understanding code requires two perspectives:

| Graph | Purpose | Example |
|-------|---------|---------|
| **Entity Graph** | What exists | "Button component in src/Button.tsx" |
| **Concept Graph** | What it means | "Button implements the design system pattern" |

Most tools only provide entities. We provide both.

### 3. Wisdom Over Information

Information answers "what."
Wisdom answers "how" and "when."

A wisdom file doesn't just document a pattern — it explains when to use it, what to avoid, and why.

### 4. Progressive Disclosure

Not all context is equal. We structure information in tiers:

1. **Identity** (~100 tokens) — What is this project?
2. **Constraints** (~100 tokens) — What must never happen?
3. **Pointers** (~100 tokens) — Where to look for more?
4. **Wisdom** (on-demand) — Deep patterns, loaded when relevant

The AI loads what it needs, when it needs it.

### 5. Confidence-Rated Information

Every piece of wisdom has a confidence score:
- **95%+** — Battle-tested, use without question
- **80-94%** — Generally reliable, verify edge cases
- **<80%** — Experimental, validate before using

This teaches the AI when to trust the context and when to question it.

---

## The Architecture

```
.cognitive/                    # Source of truth
├── ORIENTATION.md             # Always-loaded identity
├── wisdom/                    # Cached patterns
│   └── *.md
├── indices/                   # Pre-computed lookups
│   ├── entities.json
│   └── concepts.json
└── scripts/
    └── extract.py             # Automated extraction

.cursor/rules/                 # Tool-specific format
├── orientation.mdc            # alwaysApply: true
└── wisdom-*.mdc               # Agent-requested
```

**Key insight:** The `.cognitive/` directory is portable across tools. Only the sync step is tool-specific.

---

## Core Principles

1. **LLM consumes, infrastructure produces.** The AI should never generate its own context. Extraction scripts run outside the session.

2. **Drift-based invalidation.** Context expires on commits, not calendars. If the code hasn't changed, the context is still valid.

3. **One source of truth.** Edit in `.cognitive/`, sync to tool-specific formats. Never edit the synced files directly.

4. **Fail gracefully.** Missing context is better than wrong context. The framework degrades to basic operation without crashing.

---

## What This Enables

- **Persistent memory** across sessions
- **Consistent patterns** across the codebase
- **Reduced repetition** in prompts
- **Team alignment** on AI behavior
- **Portable context** across tools

---

## Join Us

This is version 1.0. We're building toward a future where AI coding assistants truly understand your codebase — not through brute-force file reading, but through structured cognition.

**Context is cognition.**

---

*Cognitive Context Framework v1.0*
