# Progressive Document Template

<!--
  HOW TO USE THIS TEMPLATE
  ========================
  1. Copy this file to your target location
  2. Replace all [bracketed placeholders] with actual content
  3. Delete this instruction block and unnecessary comments
  4. Keep the structure - it enables progressive disclosure

  PROGRESSIVE DISCLOSURE PRINCIPLE
  ================================
  Readers should be able to stop at any point and still have value:
  - Frontmatter alone tells them IF they need this doc
  - Sections table lets them jump to relevant parts
  - TL;DR blocks give 80% of value in 20% of time
  - Full content is there for those who need depth
-->

---
# ============================================
# FRONTMATTER - Machine-readable metadata
# ============================================
# This section helps AI agents and tooling understand the document
# without parsing the full content.

# REQUIRED FIELDS
# ---------------
title: "[Document Title]"
# Human-readable title for display and search

purpose: "[What this document helps with - one sentence]"
# Why does this document exist? What problem does it solve?

answers:
  - "[First question this document answers]"
  - "[Second question this document answers]"
  - "[Third question this document answers]"
# List the specific questions someone might ask that lead here.
# These power semantic search and help AI routing.

# OPTIONAL FIELDS
# ---------------
read_when: "[Trigger condition - when should someone read this?]"
# Example: "You're implementing a new component"
# Example: "You hit a TypeScript error you don't understand"

skip_when: "[Skip condition - when is this NOT relevant?]"
# Example: "You're just reviewing existing code"
# Example: "You need runtime configuration, not build config"

depends_on:
  files: []
  # List of file paths this doc references
  # Example: ["src/config.ts", "package.json"]

  entities: []
  # Named things (functions, classes, configs) this doc explains
  # Example: ["createRenderer", "LiquidConfig", "TokenSystem"]

  concepts: []
  # Abstract concepts required to understand this doc
  # Example: ["dependency injection", "design tokens"]

confidence: 0.70
# How confident are we this doc is accurate? (0.0 to 1.0)
# 0.50 = Draft/experimental
# 0.70 = Working knowledge, might have gaps
# 0.85 = Well-tested, few known issues
# 0.95 = Authoritative, regularly verified

verified_at: "[YYYY-MM-DD]"
# Last date someone confirmed this doc matches reality
---

<!--
  DOCUMENT BODY BEGINS
  ====================
  The body follows a strict progressive disclosure pattern:
  1. Title + callouts (5 seconds to understand relevance)
  2. Sections table (15 seconds to find what you need)
  3. TL;DR per section (1 minute for key insights)
  4. Full content (5+ minutes for complete understanding)
-->

# [Document Title]

<!--
  CALLOUT BLOCK
  =============
  These callouts help readers immediately decide if this doc is for them.
  Use the same language as frontmatter but formatted for humans.
-->

> **Read when:** [Describe the trigger condition in plain language]
>
> **Skip when:** [Describe when this doc is NOT what they need]

## Sections

<!--
  NAVIGATION TABLE
  ================
  Every section gets a one-line summary. Readers scan this to:
  - Decide if the doc has what they need
  - Jump directly to the relevant section
  - Get a mental model of the doc's structure

  Keep summaries under 60 characters for clean formatting.
-->

| Section | Summary |
|---------|---------|
| [Section 1](#section-1) | [What this section covers in ~10 words] |
| [Section 2](#section-2) | [What this section covers in ~10 words] |
| [Section 3](#section-3) | [What this section covers in ~10 words] |

---

## Section 1

<!--
  TL;DR BLOCK
  ===========
  The single most important insight from this section.

  Rules for good TL;DRs:
  - One sentence, ideally under 100 characters
  - Actionable when possible ("Use X for Y" not "X is...")
  - Stands alone without context
  - 80% of readers should get what they need from just this
-->

> **TL;DR:** [The key insight in one sentence. Most readers stop here.]

<!--
  FULL CONTENT
  ============
  Only readers who need depth continue past the TL;DR.

  Good full content includes:
  - Explanations of WHY, not just WHAT
  - Code examples with comments
  - Edge cases and gotchas
  - Links to related resources
-->

[Full explanatory content goes here...]

### Subsection (if needed)

<!--
  Use subsections for:
  - Step-by-step procedures
  - Multiple related examples
  - Detailed edge cases

  Don't use subsections for:
  - Content that should be its own section
  - Minor points (just use paragraphs)
-->

[Detailed content for this subsection...]

---

## Section 2

> **TL;DR:** [Key insight for section 2]

[Full content for section 2...]

---

## Section 3

> **TL;DR:** [Key insight for section 3]

[Full content for section 3...]

---

## See Also

<!--
  RELATED DOCUMENTS
  =================
  Help readers continue their journey by linking to:
  - Prerequisites (docs they should have read first)
  - Deep dives (more detail on specific topics)
  - Related concepts (tangentially related docs)
  - External resources (official docs, tutorials)

  Format: Brief description of what they'll find
-->

- [Related Document 1](path/to/doc.md) - Brief description of what it covers
- [Related Document 2](path/to/doc.md) - Brief description of what it covers
- [External Resource](https://example.com) - What this external resource provides

---

<!--
  TEMPLATE CHECKLIST
  ==================
  Before publishing, verify:

  [ ] Frontmatter has all required fields filled in
  [ ] Title matches the frontmatter title
  [ ] "Read when" and "Skip when" are specific and actionable
  [ ] Sections table has entries for ALL sections
  [ ] Every section has a TL;DR block
  [ ] TL;DRs are single sentences that stand alone
  [ ] All internal links work
  [ ] Code examples are tested and correct
  [ ] confidence score reflects actual confidence
  [ ] verified_at is set to today's date

  Delete this checklist before publishing.
-->
