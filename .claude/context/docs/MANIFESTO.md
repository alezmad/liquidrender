# The Cognitive Context Manifesto

> **Context is not storage. Context is externalized cognition.**

---

## The Revelation

A senior developer with 10 years on a codebase doesn't carry 50,000 files in their head. They carry something far more valuable: *crystallized understanding*. They know which patterns work and which ones burned the team. They know where dragons lurk and where gold is buried. They know not just WHERE things are, but WHY they are there.

This is wisdom. And until now, every AI session threw it away.

Every conversation started from zero. Load the files. Parse the patterns. Rediscover the insights. Burn the tokens. Forget everything. Repeat tomorrow.

**We refuse to keep rediscovering fire.**

---

## The Problem: Institutional Amnesia

Current approaches to AI context fail in predictable ways:

**Token Explosion.** You have a 200,000 token context window. Congratulations. Your codebase is 2 million tokens. Loading files directly is like drinking from a firehose pointed at your brain. You get wet, but you don't get quenched.

**No Memory.** Session ends, wisdom vanishes. The brilliant insight about why that abstraction exists? Gone. The hard-won understanding of that edge case? Evaporated. Every session is a new hire's first day, forever.

**Raw File Fallacy.** Loading `utils.ts` gives you 400 lines of code. What you actually need is: "This file defines the design token system. Never hardcode colors." That's 15 tokens. The file is 2,000 tokens. You're paying 133x for the privilege of figuring out what someone already knows.

**The Compression Crime.** "Just load everything and let the model figure it out." This is the cognitive equivalent of "just put all your belongings in one room and find what you need by digging." It works. It's also insane.

---

## The Core Insight: The Wisdom Hierarchy

All context is not created equal. There is a hierarchy:

```
WISDOM      ← What to cache
   ↑
KNOWLEDGE
   ↑
INFORMATION
   ↑
DATA        ← What to avoid loading
```

**Data** is raw facts. The bytes in your files. The characters in your configs.

**Information** is organized data. Files with names. Directories with structure.

**Knowledge** is structured understanding. "This component uses these patterns." "This schema enforces these constraints."

**Wisdom** is crystallized answers. "When creating a component, do X, Y, Z in this order because of A, B, C."

Here's the paradigm shift: **Cache the wisdom, not the data.**

Someone already read those files. Someone already figured out the pattern. Someone already made the mistakes and learned from them. That traversal—that journey from confusion to clarity—IS the value.

Wisdom files are not documentation. They are **cached cognition**. They are the answer to a question that took hours to derive, preserved for future sessions that can now access it in seconds.

---

## The Five Laws

These are non-negotiable. They are the physics of this framework.

### 1. Cache the Wisdom, Not the Data

Every piece of cached context should be a derived answer, not a raw source. If you're storing data that still requires interpretation, you're storing the wrong thing.

**The test:** Can this context answer a question directly? Or does it require additional reasoning? If the latter, you haven't cached wisdom—you've just relocated data.

### 2. Stable = Important

What changes every commit is noise. What hasn't changed in six months is foundational.

Your ORM choice hasn't changed in two years. That's load-bearing. Your experimental feature branch changes hourly. That's volatile. Weight context by stability, not recency.

**The test:** If this changed tomorrow, how much would break? That's your importance score.

### 3. Trust is Earned, Not Assumed

Not all context is equally trustworthy. Running code cannot lie. Documentation might. Specifications often do.

The trust hierarchy:
- **1.0** — Runtime truth (tests pass, compiler succeeds)
- **0.95** — Committed code (git is ground truth)
- **0.85** — Curated context (intentionally maintained)
- **0.70** — Cached wisdom (verified when created)
- **0.50** — Stale specs (code may have diverged)
- **0.20** — Exploration (scratch work, never authoritative)

**The test:** If this context conflicts with something else, which one wins? That's your trust score.

### 4. Compress Ruthlessly

Every token must earn its place. Expand on demand, never preemptively.

You don't need the 50-line function body. You need: "validateInput: Throws on empty string, trims whitespace, max 255 chars." That's the signature + the wisdom. The implementation is one Read call away if you actually need it.

**The test:** Would removing 50% of this context lose 50% of its value? If not, you're not compressed enough.

### 5. Shape for the Task

Context is not a noun. It's a verb. You don't HAVE context; you ASSEMBLE it.

Different tasks need different views. Debugging wants stack traces and error patterns. Feature development wants architecture and patterns. Refactoring wants dependencies and impact analysis.

**The test:** Is this context helping THIS task? Or is it just generally available? General availability is a cost, not a benefit.

---

## The Two Graphs: Understanding and Implementation

One graph is not enough. You need two.

### The Concept Graph (WHY)

The concept graph captures understanding-level knowledge. It answers:
- What is this for?
- How does it relate to other concepts?
- What patterns apply here?

```
organizations
└── "Multi-tenancy via Better Auth"
    ├── data-model (org/user/member/invitation)
    ├── rbac (roles, permissions)
    └── active-org (workspace switching)
```

This is what a human expert carries in their head. Not file paths—mental models.

### The Entity Graph (WHERE)

The entity graph captures implementation-level knowledge. It answers:
- Where is this implemented?
- What is its interface?
- What depends on it?

```
components:
  DataTable → ui/data-table.tsx
  LineChart → ui/line-chart.tsx

schemas:
  organization → db/schema/organization.ts
```

This is what an IDE provides. File locations, symbol tables, dependency graphs.

### Why Both?

"I need to understand organizations" requires the concept graph first. It tells you the mental model, the patterns, the relationships. Then the entity graph tells you where to find the implementation.

"I need to fix the DataTable" requires the entity graph first. It tells you the file, the props, the dependencies. Then the concept graph tells you what patterns it should follow.

**Neither alone is sufficient. Together, they are powerful.**

---

## Progressive Disclosure: Documents in Layers

Documents should be WRITTEN in layers so they can be READ in layers.

The 5-tier structure:

**Tier 1: Identity** (~30 tokens)
Just the title and metadata. Answer: "Is this what I'm looking for?"

**Tier 2: Purpose** (~50 tokens)
When to read, when to skip. Answer: "Should I read this now?"

**Tier 3: Structure** (~100 tokens)
Table of sections with summaries. Answer: "Which section has my answer?"

**Tier 4: TL;DRs** (~200 tokens)
One-liner per section. Answer: "What's the key insight?"

**Tier 5: Full Content** (variable)
Complete explanations, examples, edge cases. Answer: "Give me all the details."

Most readers stop at Tier 3 or 4. Only deep dives require Tier 5. This is not laziness—this is efficiency. The framework supports this by design.

---

## The Decay Model: Drift, Not Time

Calendar time does not invalidate context. Drift does.

A specification written 6 months ago that still matches the code is perfectly valid. A specification written yesterday that the code contradicts is already stale.

**What triggers decay:**
- Code commits without spec updates
- Source file modifications that affect cached wisdom
- Dependency version changes

**What does NOT trigger decay:**
- Calendar days passing
- Inactive periods
- Unrelated changes elsewhere

The question is never "how old is this?" The question is "does this still match reality?"

---

## The Vision: Where This Leads

This is not the end state. This is the foundation.

**Context as Compiled Artifact.** Today, we hand-craft wisdom files. Tomorrow, context compilation happens on commit. The build pipeline produces not just artifacts but also the context to work with them.

**Wisdom Unit Tests.** Wisdom files make assertions about the codebase. These assertions should be testable. "This function never throws" is verifiable. "This pattern is used everywhere" is checkable. Wisdom should fail CI when it becomes false.

**Human-LLM Parity.** The endgame is not AI that works with context. It's AI that has the SAME context as the human team. The same understanding. The same institutional memory. The same wisdom.

When a new developer joins, they read the docs, talk to seniors, and slowly build context. When a new AI session starts, it should do the same—but in milliseconds, not months.

**This is externalized cognition. This is preserved wisdom. This is the end of institutional amnesia.**

---

## The Invitation

If you've read this far, you understand the problem. You've felt the frustration of re-explaining your codebase to an AI. You've watched tokens burn on rediscovering what you already knew.

This framework is one answer. Not the only answer. But an answer that respects the core truth:

**The most expensive thing in software is not compute. It's cognition. And cognition should never have to be recomputed when it can be cached.**

Cache your wisdom. Trust selectively. Compress ruthlessly. Shape for the task.

And never start from zero again.

---

*Cognitive Context Framework*
*Version: 1.0*

