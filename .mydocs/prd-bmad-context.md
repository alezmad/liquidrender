# BMAD PRD Context Reference

**Purpose:** Load this document to understand BMAD PRD standards for editing or generating PRDs without running the full workflow, while maintaining quality and structure consistency.

**Usage:** Read this document before creating or editing any PRD to ensure alignment with BMAD methodology.

---

## Table of Contents

1. [Document Structure](#1-document-structure)
2. [Functional Requirements Standards](#2-functional-requirements-standards)
3. [Non-Functional Requirements Standards](#3-non-functional-requirements-standards)
4. [Success Criteria Standards](#4-success-criteria-standards)
5. [User Journey Standards](#5-user-journey-standards)
6. [Project Classification](#6-project-classification)
7. [Scoping Standards](#7-scoping-standards)
8. [Quality Validation](#8-quality-validation)
9. [Documentation Standards](#9-documentation-standards)
10. [Real Example Reference](#10-real-example-reference)

---

## 1. Document Structure

### Required PRD Sections (In Order)

```markdown
---
# YAML Frontmatter
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments: []
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
lastStep: 11
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{date}}'
status: 'Ready for Implementation'
---

# Product Requirements Document - {{project_name}}

**Author:** {{user_name}}
**Date:** {{date}}
**Status:** Ready for Implementation

## Executive Summary
## Project Classification
## Success Criteria
### User Success
### Business Success
### Technical Success
### Measurable Outcomes
## Product Scope
### Phase 1 Scope: IN/OUT
### MVP - Minimum Viable Product
### Growth Features (Post-MVP)
### Vision (Future)
## User Journeys
### Journey Requirements Summary
## Domain Strategy (if applicable)
## Innovation & Novel Patterns (if applicable)
## Project Type Specific Requirements
## Functional Requirements
### [Capability Area 1]
### [Capability Area 2]
...
## Non-Functional Requirements
### Performance (if relevant)
### Security (if relevant)
### Scalability (if relevant)
### Accessibility (if relevant)
### Integration (if relevant)
### Reliability (if relevant)
## Technical Specifications (optional - detailed specs)
## Observability & QA Requirements (optional)
## Implementation Plan (optional)
## UX Patterns & Microinteractions (optional)
## Admin Panel Requirements (optional)
```

### Executive Summary Structure

The Executive Summary must contain:

1. **Core Promise** - One sentence explaining the product's value
2. **The Paradigm** (optional) - Visual diagram if the product has a novel approach
3. **What Makes This Special** - 5-6 key differentiators (numbered list)

Example:
```markdown
## Executive Summary

LiquidRender transforms **any data source** into instant, beautiful dashboards.

**Core Promise:** Seconds, not hours. The "holy shit" moment when users see their data transformed.

### The Paradigm
[Optional ASCII/text diagram showing the core concept]

### What Makes This Special

1. **Zero friction entry** — No signup, no setup
2. **Instant gratification** — Dashboard in <10 seconds
3. **Identity shift** — Users realize they ARE data people
4. **Viral by design** — Each share is a demo
5. **Novel paradigm** — AI generates validated schemas
6. **Universal access** — Files, surveys, APIs, databases
```

---

## 2. Functional Requirements Standards

### THE CAPABILITY CONTRACT

**Critical:** FRs define THE CAPABILITY CONTRACT for the entire product:
- UX designers will ONLY design what's listed here
- Architects will ONLY support what's listed here
- Epic breakdown will ONLY implement what's listed here
- **If a capability is missing from FRs, it will NOT exist in the final product**

### FR Format

```
FR#: [Actor] can [capability] [context/constraint if needed]
```

### Properties of Good FRs

| Property | Correct | Incorrect |
|----------|---------|-----------|
| Testable | "Users can save dashboards" | "Users can use the app" |
| Implementation-agnostic | "Users can customize appearance" | "Users toggle dark/light theme stored in LocalStorage" |
| WHO and WHAT, not HOW | "System validates input data" | "API accepts JSON payloads and validates with Zod" |
| No UI details | "Users can filter results" | "Users click dropdown to filter" |
| No performance numbers | "System can cache schemas" | "Cache hit rate >30%" (that's an NFR) |
| No tech choices | "Users can authenticate" | "Users authenticate via Google OAuth" |

### FR Organization

**Group by capability area, NOT technology:**

| Good Grouping | Bad Grouping |
|---------------|--------------|
| "User Management" | "Authentication System" |
| "Content Discovery" | "Search Algorithm" |
| "Team Collaboration" | "WebSocket Infrastructure" |
| "Dashboard Generation" | "AI Pipeline" |
| "Data Input" | "File Parsers" |

**Target:** 5-8 capability areas, 20-50 total FRs for typical projects

### FR Examples

**Data Input & Parsing:**
```markdown
- FR1: Users can upload files via drag-and-drop without authentication
- FR2: System can parse Excel files (.xlsx, .xls) and extract tabular data
- FR3: System can detect column types (numeric, date, text, currency) from parsed data
- FR4: Users can view parsing errors with actionable feedback when files fail
```

**Dashboard Generation:**
```markdown
- FR7: System can generate a dashboard schema from parsed data using AI
- FR8: System can validate all AI-generated schemas before rendering
- FR9: System can render dashboards from validated schema
- FR10: Users can view automatically extracted KPIs with trend indicators
```

**Sharing & Viral Loop:**
```markdown
- FR21: Users can generate a shareable link for any dashboard
- FR22: Recipients can view shared dashboards without authentication
- FR23: Shared dashboards display attribution ("Made with [Product]")
- FR24: Attribution links direct viewers to the landing page
```

### FR Validation Checklist

Before finalizing FRs:

1. [ ] Did I cover EVERY capability mentioned in the MVP scope section?
2. [ ] Did I include domain-specific requirements as FRs?
3. [ ] Did I cover the project-type specific needs?
4. [ ] Could a UX designer read ONLY the FRs and know what to design?
5. [ ] Could an Architect read ONLY the FRs and know what to support?
6. [ ] Are there any user actions or system behaviors discussed that have no FR?
7. [ ] Am I stating capabilities (WHAT) or implementation (HOW)?
8. [ ] Is each FR clear enough that someone could test whether it exists?
9. [ ] Did I avoid vague terms like 'good', 'fast', 'easy'?

---

## 3. Non-Functional Requirements Standards

### Selective Approach

**Only document NFRs that matter for THIS product.** Skip irrelevant categories entirely to prevent requirement bloat.

### When to Include Each Category

| Category | Include When... |
|----------|-----------------|
| **Performance** | User-facing response times impact success; real-time interactions are critical; performance is a competitive differentiator |
| **Security** | Handling sensitive user data; processing payments; subject to compliance regulations; protecting IP |
| **Scalability** | Expecting rapid user growth; handling variable traffic patterns; supporting enterprise-scale usage |
| **Accessibility** | Serving broad public audiences; subject to accessibility regulations; targeting users with disabilities |
| **Integration** | Connecting with external systems; supporting specific APIs or data formats |
| **Reliability** | Downtime causes significant problems; data loss is unacceptable |

### NFR Format: Specific and Measurable

| Bad (Vague) | Good (Specific) |
|-------------|-----------------|
| "The system should be fast" | "Dashboard generation latency <10 seconds P95" |
| "The system should be secure" | "All data encrypted at rest (AES-256) and in transit (TLS 1.3)" |
| "The system should scale" | "System supports 10x user growth with <10% performance degradation" |
| "Good uptime" | "99.5% API availability during launch window" |
| "Fast page loads" | "Landing page LCP <2.5 seconds" |

### NFR Examples by Category

**Performance:**
```markdown
### Performance

- NFR-P1: Dashboard generation latency <10 seconds P95
- NFR-P2: File parsing <2 seconds
- NFR-P3: Dashboard load (cached) <3 seconds
- NFR-P4: Landing page LCP <2.5 seconds
- NFR-P5: API response <500ms P95 (non-AI endpoints)
```

**Security:**
```markdown
### Security

- NFR-S1: TLS 1.3 for all connections
- NFR-S2: AES-256 encryption at rest
- NFR-S3: Secure session cookies (HttpOnly, SameSite, Secure)
- NFR-S4: Rate limiting: 60 req/min (anon), 300 req/min (auth)
- NFR-S5: File upload max 10MB
- NFR-S6: Input validation via Zod on all endpoints
```

**Reliability:**
```markdown
### Reliability

- NFR-R1: 99.5% API availability
- NFR-R2: Graceful degradation (fallback on AI failure)
- NFR-R3: No data loss for authenticated user data
```

**Cost Control (if relevant):**
```markdown
### Cost Control

- NFR-C1: AI cost per operation <$0.05
- NFR-C2: Token budget per generation <8K tokens
- NFR-C3: Cache hit rate >30%
- NFR-C4: Infrastructure cost <$100/month (MVP)
```

---

## 4. Success Criteria Standards

### Three Categories Required

Every PRD must define success across three dimensions:

1. **User Success** - What makes a user say "this was worth it"
2. **Business Success** - Measurable business outcomes
3. **Technical Success** - Technical requirements that enable the product

### User Success Format

Use tables for clarity:

```markdown
### User Success

**The "[Key Moment]" Moment:**
[Narrative description of the emotional peak of the user experience]

**User Success Indicators:**

| Indicator | Metric | Target |
|-----------|--------|--------|
| Instant gratification | Time to first value | <10 seconds |
| Trust confirmed | Second action rate | >40% within session |
| Worth sharing | Output shared externally | >15% |
| Return value | Day 7 active return | >20% |
| Worth paying | Upgrade to paid tier | >5% |

**What "Success" Means:**

| Persona | Success Statement | Observable Behavior |
|---------|-------------------|---------------------|
| **Maria** | "I sent it in 5 minutes instead of 3 hours" | Shares + goes to bed |
| **Diego** | "My client said it looks professional" | Creates for multiple clients |
```

### Business Success Format

```markdown
### Business Success

**[Timeframe] Launch Targets (Hard Numbers):**

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Core action | 1,000 | Product is being used |
| Registered users | 300+ | Value proven |
| Viral actions | 150+ | Viral loop functioning |
| Day 7 retention | 60+ users | Sticky value |
| Paying users | 50 | Revenue validated |
| MRR | $500+ | Sustainable economics |

**Decision Points:**

| Outcome | Signal | Action |
|---------|--------|--------|
| 4-5/5 targets hit | PMF signal | Proceed to Phase 2 |
| 2-3/5 targets hit | Core value exists | Iterate on conversion |
| <2/5 targets hit | Fundamental issue | Pause, investigate |
```

### Technical Success Format

```markdown
### Technical Success

**Core Technical Requirements:**

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Core success rate | >80% | Valid output / total attempts |
| Generation time | <10 seconds p95 | Time from input to output |
| Validation rate | 100% | All AI output passes validation |
| Cache hit rate | >30% | Cached responses / total requests |
| API availability | >99.5% | Uptime during launch window |
```

### Measurable Outcomes

Always include a **North Star Metric** with rationale:

```markdown
### Measurable Outcomes

**North Star Metric: [Metric Name]**

Why this metric:
- [Reason 1: Shows activation happened]
- [Reason 2: Shows user satisfaction]
- [Reason 3: Drives growth/virality]
- [Reason 4: Represents real value delivered]

**Metrics Definitions (Single Source of Truth):**

| Metric | Definition | Target |
|--------|------------|--------|
| [Metric 1] | [Precise definition] | [Target value] |
| [Metric 2] | [Precise definition] | [Target value] |
```

---

## 5. User Journey Standards

### Minimum Coverage

Every PRD must include **3-4 journeys minimum** covering:

1. **Primary User - Success Path**: Core experience journey
2. **Primary User - Edge Case**: Error recovery, alternative goals
3. **Secondary User**: Admin/Operations/Support journey
4. **Viral/External**: How others discover the product (if applicable)
5. **API/Integration**: Developer journey (if applicable)

### Journey Format: Narrative Stories

Journeys must be **rich narrative stories**, not bulleted lists of steps.

**Story Structure:**
- **Opening Scene**: Where and how do we meet them? What's their current pain?
- **Rising Action**: What steps do they take? What do they discover?
- **Climax**: The critical moment where the product delivers real value
- **Resolution**: How does their situation improve? What's their new reality?

### Journey Example

```markdown
### Journey 1: Maria Santos - The Midnight Dashboard (Phase 1: File -> Dashboard)

Maria is a 32-year-old Marketing Coordinator at a B2B SaaS startup. Tonight, like many nights, she's staring at an Excel spreadsheet at 11:47 PM. Her VP needs the Q4 performance report for tomorrow's board meeting. The data is there—Google Ads spend, LinkedIn impressions, HubSpot conversions—but it's ugly. Rows and columns that mean nothing to anyone but her.

She's tried making it "pretty" before. Three hours with Excel charts. Still ugly. She's not "a data person." She just needs to go to bed.

Frustrated, she types "Excel to dashboard fast" into Google. She clicks on [Product]. The page says "Drop any file." She thinks "yeah, right" but drags her Excel anyway.

Two seconds later, her screen transforms. KPIs at the top—total spend, conversion rate, cost per lead—with little green arrows showing trends. Below that, a bar chart of spend by channel. A line chart showing conversions over time. A clean table with the raw data. All of it using HER numbers.

"No fucking way."

She clicks around. Everything works. She drags another file—just to make sure it wasn't luck. Same magic. This is real.

She clicks "Share", gets a link, sends it to her VP with "Q4 Report attached", and goes to bed. Tomorrow morning, she'll have an email: "Great job, Maria. This looks very professional."

**Requirements Revealed:**
- Zero-friction file upload (drag-and-drop)
- Sub-10-second AI dashboard generation
- Automatic KPI extraction with trend indicators
- Chart type selection (bar, line, pie)
- Clean data table formatting
- One-click shareable link generation
- No signup required for first dashboard
```

### Journey Requirements Summary

After all journeys, include a summary table:

```markdown
### Journey Requirements Summary

| Journey | User Type | Entry Point | Phase | Platform | Key Requirements |
|---------|-----------|-------------|-------|----------|------------------|
| Maria v1 | Primary | File Drop | 1 | Web | File parsing, AI generation, share links |
| Maria v2 | Primary | Survey Create | 2 | Web | Survey builder, response collection |
| Diego | Consultant | Survey + Brand | 2 | Web | Templates, white-label, scores |
| Carlos | Viral | Shared Link | 1 | Web | Attribution, compelling view |
| Admin Elena | Internal | Admin Panel | All | Web | Metrics, monitoring, cost control |
```

---

## 6. Project Classification

### Required Classification Fields

```markdown
## Project Classification

**Technical Type:** [Web App | Mobile App | API Backend | Full Stack | CLI Tool | Desktop App]
**Secondary Type:** [If applicable, e.g., "Developer Tool"]
**Domain:** [e-commerce | fintech | healthcare | social | education | productivity | media | iot | government | gaming | general]
**Complexity:** [Low | Medium | High]
**Project Context:** [Greenfield | Brownfield on [existing stack]]
```

### Domain Complexity Reference

| Domain | Complexity | Key Concerns |
|--------|------------|--------------|
| e_commerce | Medium | Payment processing, inventory, checkout |
| fintech | High | PCI compliance, fraud detection, trading algorithms |
| healthcare | High | HIPAA compliance, FDA regulations, medical data security |
| social | High | Social graphs, feed ranking, privacy |
| education | Medium | LMS patterns, progress tracking, video streaming |
| productivity | Medium | Collaboration, real-time editing, integrations |
| media | High | CDN architecture, video encoding, streaming |
| iot | High | Device communication, real-time data, edge computing |
| government | High | Accessibility, security clearance, audit trails |
| gaming | High | Real-time multiplayer, matchmaking, game engines |

### Project Type Reference

| Type | Detection Signals | Typical Starters |
|------|-------------------|------------------|
| web_app | website, browser, frontend, UI | Next.js, Vite, Remix |
| mobile_app | mobile, iOS, Android, app | React Native, Expo, Flutter |
| api_backend | API, REST, GraphQL, service | NestJS, Express, Fastify |
| full_stack | full-stack, web+mobile | T3 App, RedwoodJS, Blitz |
| cli_tool | CLI, command line, terminal | oclif, Commander |
| desktop_app | desktop, Electron, native | Electron, Tauri |

---

## 7. Scoping Standards

### Phase 1 Scope Format

Use clear IN/OUT tables:

```markdown
### Phase 1 Scope: IN/OUT (LOCKED)

#### IN SCOPE - Phase 1

| Feature | Week | Description |
|---------|------|-------------|
| File upload | 1 | Excel, CSV, JSON - no signup required |
| File parsing | 1 | Extract tabular data with type detection |
| Core engine | 1 | Validated schema system |
| Component catalog | 1 | 7 basic block types |
| AI generation | 2 | Mastra + Claude Sonnet |
| Semantic cache | 2 | Redis by file hash |
| Fallback templates | 2 | When AI fails |
| Landing page | 3 | Zero-friction entry |

#### OUT OF SCOPE - Phase 1

| Feature | Phase | Reason |
|---------|-------|--------|
| Advanced diagrams | 2 | Doesn't contribute to core value |
| API connections | 3 | OAuth complexity |
| Mobile app | 5 | Need content first |
| Voice input | Future | Nice-to-have |
| Dashboard editing | Future | Phase 1 is read-only |

**Phase 1 Principle:** [State the core principle for what makes the cut]
```

### MVP Definition

```markdown
### MVP - Minimum Viable Product

Core user journeys supported:
- Journey 1: [Name] - [Description] (the core experience)
- Journey 2: [Name] - [Description] (retention validation)
- Journey 3: [Name] - [Description] (professional use case)
- Journey 4: [Name] - [Description] (viral loop trigger)
```

### Growth and Vision

```markdown
### Growth Features (Post-MVP)

**Phase 2: [Theme]**
- [Feature list]

**Phase 3: [Theme]**
- [Feature list]

### Vision (Future)

**Phase 4+: [Theme]**
- [Feature list]

**12-Month Vision:**
- [Metric targets]
- [Team size]
- [Revenue goals]
```

---

## 8. Quality Validation

### PRD Completeness Checklist

Before marking a PRD as complete:

**Structure:**
- [ ] All required sections present
- [ ] YAML frontmatter complete and valid
- [ ] Sections in correct order
- [ ] Status set to "Ready for Implementation"

**Executive Summary:**
- [ ] Core promise clearly stated
- [ ] 5-6 differentiators listed
- [ ] Paradigm diagram (if novel approach)

**Success Criteria:**
- [ ] User success metrics defined with targets
- [ ] Business success metrics defined with targets
- [ ] Technical success metrics defined
- [ ] North Star Metric identified with rationale
- [ ] Decision points defined (what happens if targets missed)

**Scope:**
- [ ] Clear IN/OUT table for Phase 1
- [ ] MVP journeys identified
- [ ] Growth features mapped to phases
- [ ] Vision documented

**User Journeys:**
- [ ] Minimum 3-4 narrative journeys
- [ ] Primary user success path covered
- [ ] Secondary users covered (admin, support)
- [ ] Viral/discovery path covered (if applicable)
- [ ] Journey requirements summary table

**Functional Requirements:**
- [ ] Organized by capability area (5-8 areas)
- [ ] 20-50 FRs for typical project
- [ ] Format: "FR#: [Actor] can [capability]"
- [ ] No implementation details in FRs
- [ ] All MVP capabilities covered
- [ ] Validation checklist passed

**Non-Functional Requirements:**
- [ ] Only relevant categories included
- [ ] All NFRs specific and measurable
- [ ] No vague requirements

### FR-to-Epic Traceability

Every FR must eventually trace to:
1. An Epic
2. Stories within that Epic
3. Implementation tasks

**Validation:** At implementation readiness check:
- 100% of FRs must be covered in epics and stories
- Any gaps must be explained

---

## 9. Documentation Standards

### CommonMark Compliance

All PRD documentation must follow CommonMark specification:

**Headers:**
- Use ATX-style ONLY: `#` `##` `###`
- Single space after `#`: `# Title` (NOT `#Title`)
- No trailing `#`
- Don't skip levels (h1->h2->h3, not h1->h3)

**Code Blocks:**
- Always use fenced blocks with language identifier
- NOT indented code blocks

**Lists:**
- Consistent markers within list (all `-` or all `*`)
- Proper indentation for nested items

**Critical Rule: NO TIME ESTIMATES**

NEVER document:
- Workflow execution time
- Task duration estimates
- Implementation time ranges
- Any temporal measurements

Focus on workflow steps, dependencies, and outputs. Let users determine their own timelines.

### Writing Style

- **Active voice:** "Click the button" NOT "The button should be clicked"
- **Present tense:** "The function returns" NOT "The function will return"
- **Direct language:** "Use X for Y" NOT "X can be used for Y"
- **Second person:** "You configure" NOT "Users configure"
- **One idea per sentence**
- **One topic per paragraph**

---

## 10. Real Example Reference

The canonical example PRD is located at:
```
_bmad-output/prd-liquidrender-v1.md
```

This PRD demonstrates:
- Complete section structure
- Proper FR formatting and organization
- Measurable success criteria with tables
- Rich narrative user journeys
- Selective NFRs
- Phase-based scoping
- Technical specifications (detailed specs section)
- UX patterns documentation
- Admin panel requirements

**When in doubt, reference this document for formatting and structure examples.**

---

## Quick Reference Cards

### FR Quick Reference

```
Format:     FR#: [Actor] can [capability]
Grouping:   By capability area, NOT technology
Target:     5-8 areas, 20-50 FRs total
Altitude:   WHAT capability, not HOW implemented
Test:       Could someone verify this exists? Yes = good FR
```

### NFR Quick Reference

```
Include:    Only categories that matter for THIS product
Format:     Specific, measurable targets
Example:    "<10s P95" not "should be fast"
Categories: Performance, Security, Scalability, Accessibility, Integration, Reliability
```

### Journey Quick Reference

```
Minimum:    3-4 journeys
Coverage:   Primary success, edge case, secondary user, viral path
Format:     Rich narrative story, not bullet steps
Structure:  Opening -> Rising Action -> Climax -> Resolution
Output:     Requirements revealed at end of each journey
```

---

**END OF CONTEXT DOCUMENT**

*Load this document before PRD work to ensure BMAD standards compliance.*
