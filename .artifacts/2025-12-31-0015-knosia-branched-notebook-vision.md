# Knosia: Branched Notebook & Knowledge Graph Vision

> **Conversations aren't linear. Thinking isn't linear. Why should notebooks be?**

---

## The Core Insight

Traditional chat is ephemeral and linear. But data exploration is:
- **Branching** — "What if I had asked this instead?"
- **Annotated** — "CFO disputed this" / "Check source"
- **Connected** — "This relates to that earlier finding"
- **Spatial** — Mental models aren't lists, they're maps

---

## Three Evolution Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  LAYER 1: LINEAR CHAT           What everyone has                   │
│  ─────────────────────          Q → A → Q → A → ...                 │
│                                                                     │
│  LAYER 2: BRANCHED NOTEBOOK     Git for conversations               │
│  ─────────────────────          Fork, explore, compare, merge       │
│                                                                     │
│  LAYER 3: KNOWLEDGE GRAPH       Spatial thinking canvas             │
│  ─────────────────────          Connect insights, build maps        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 2: Branched Notebook

### Git Graph Navigation Panel

Using a vertical git graph component (like [gitgraph.js](https://www.nicoespeon.com/gitgraph.js/)) as the navigation system.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                         │
│ │ ○ main  │  ┌─────────────────────────────────────────────────────┐│
│ │ │       │  │                                                     ││
│ │ ○       │  │  Q: What's our revenue trend?                       ││
│ │ │       │  │                                                     ││
│ │ ○───○   │  │  A: Revenue is up 12% MoM...                        ││
│ │ │   │   │  │     [chart]                                         ││
│ │ │   ○   │  │                                                     ││
│ │ │   │   │  │  ─────────────────────────────────────────────────  ││
│ │ ○◀──┘   │  │                                                     ││
│ │ │       │  │  Q: Break it down by region                         ││
│ │ ●←YOU   │  │                                                     ││
│ │         │  │  A: APAC leads with 18% growth...                   ││
│ │ [+]     │  │                                                     ││
│ └─────────┘  └─────────────────────────────────────────────────────┘│
│  ◀ collapse                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Git Concepts → Knosia Concepts

| Git | Knosia Notebook |
|-----|-----------------|
| Repository | Conversation/Notebook |
| Branch | Exploration path |
| Commit/Node | Block (Q&A pair) |
| HEAD | Current viewing position |
| Checkout | Jump to any point |
| Merge | Combine insights from branches |
| Tag | Named insight ("Key finding") |
| Diff | Compare branches side-by-side |

---

### Panel States

**Collapsed (mobile default):**
```
┌──┐ ┌────────────────────────────────────────────────────────────────┐
│☰ │ │                                                                │
│  │ │  Current conversation content...                               │
│  │ │                                                                │
└──┘ └────────────────────────────────────────────────────────────────┘
```

**Expanded (desktop default):**
```
┌───────────┬─────────────────────────────────────────────────────────┐
│           │                                                         │
│  ○ main   │  Current conversation content...                        │
│  │        │                                                         │
│  ○───○    │                                                         │
│  │   │    │                                                         │
│  ●   ○    │                                                         │
│           │                                                         │
└───────────┴─────────────────────────────────────────────────────────┘
```

**Full tree view (toggle):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  main                    by-region              by-product          │
│  ────                    ─────────              ──────────          │
│    ○ Revenue overview                                               │
│    │                                                                │
│    ○ Q3 trends                                                      │
│    │                                                                │
│    ├─────────────────────○ APAC deep dive                           │
│    │                     │                                          │
│    │                     ○ APAC pricing                             │
│    │                     │                                          │
│    │                     ● (you are here)                           │
│    │                                                                │
│    ├─────────────────────────────────────○ Product mix              │
│    │                                     │                          │
│    │                                     ○ Enterprise vs SMB        │
│    │                                                                │
│    ○ Key insights (merged)                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Interactions

| Action | Result |
|--------|--------|
| **Click node** | Jump to that block |
| **Hover node** | Preview tooltip with block summary |
| **Right-click node** | Context menu: Branch / Note / Tag / Compare |
| **Double-click branch label** | Rename branch |
| **Drag node to another branch** | Move block (with confirmation) |
| **Click [+] at bottom** | Create new branch from current position |

---

### Block Notes

Annotations that attach to any block:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Q: What's our churn rate by region?                                 │
├─────────────────────────────────────────────────────────────────────┤
│ A: APAC: 4.2%  |  EMEA: 2.1%  |  NA: 1.8%                          │
│                                                                     │
│    ┌──────────────────────────────────────────┐                     │
│    │ 📝 Sarah disputed APAC number in Oct     │  ← Personal note   │
│    │    meeting. Check with data team.        │                     │
│    └──────────────────────────────────────────┘                     │
│                                                                     │
│    ┌──────────────────────────────────────────┐                     │
│    │ 👥 @mike: Can you verify this?           │  ← Team note       │
│    └──────────────────────────────────────────┘                     │
│                                                                     │
│    ┌──────────────────────────────────────────┐                     │
│    │ 🤖 Confidence: 94%. Source: analytics_db │  ← AI metadata     │
│    └──────────────────────────────────────────┘                     │
│                                                                     │
│                                    [+ Add note]  [🏷️ Tag]  [⑂ Branch]│
└─────────────────────────────────────────────────────────────────────┘
```

**Note Types:**
- **Personal** — Only you see (yellow)
- **Team** — Shared with workspace (blue)
- **AI** — Auto-generated metadata (gray)
- **Linked** — Reference to another block/notebook (purple)

---

### Branching Flow

**Step 1: User clicks "Branch from here"**
```
                    ○ Revenue overview
                    │
                    ○ Q3 trends
                    │
           ────────►○ Regional breakdown  ← Right-click: "Branch from here"
                    │
                    ○ (current)
```

**Step 2: Dialog appears**
```
┌─────────────────────────────────────────┐
│ Create Branch                           │
├─────────────────────────────────────────┤
│                                         │
│ Branch name: [By product mix        ]   │
│                                         │
│ Starting question (optional):           │
│ [Break down by product instead      ]   │
│                                         │
│           [Cancel]  [Create Branch]     │
└─────────────────────────────────────────┘
```

**Step 3: New branch created, user switched to it**
```
                    ○ Revenue overview
                    │
                    ○ Q3 trends
                    │
                    ○───────────○ By product mix  ← Now on this branch
                    │           │
                    ○ (main)    ● (you are here)
```

---

### Branch Comparison

Side-by-side view for comparing exploration paths:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Compare: [main ▼]  vs  [by-region ▼]                    [Exit compare]│
├────────────────────────────┬────────────────────────────────────────┤
│ main                       │ by-region                              │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                        │
│ Q: Break down revenue      │ Q: Show APAC specifically              │
│                            │                                        │
│ A: By product:             │ A: APAC revenue:                       │
│    Enterprise: 60%         │    Japan: 45%                          │
│    SMB: 40%                │    Australia: 30%                      │
│                            │    SEA: 25%                            │
│                            │                                        │
│ Insight: Enterprise drives │ Insight: Japan is the key driver,     │
│ most revenue but SMB is    │ but SEA is growing fastest at 34%     │
│ growing faster             │ YoY                                    │
│                            │                                        │
├────────────────────────────┴────────────────────────────────────────┤
│                        [Merge insights to main]                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Merging Insights

When you want to bring learnings from a branch back to main:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Merge "by-region" into "main"                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Select insights to merge:                                           │
│                                                                     │
│ ☑ APAC breakdown (Japan 45%, Australia 30%, SEA 25%)               │
│ ☑ SEA growth insight (34% YoY - fastest growing)                   │
│ ☐ Japan market analysis (detailed breakdown)                        │
│ ☐ Currency impact notes                                             │
│                                                                     │
│ Merge as:                                                           │
│ ○ New block in main                                                 │
│ ● Summary block (AI-generated synthesis)                            │
│ ○ Linked reference (keep in branch, link from main)                 │
│                                                                     │
│                              [Cancel]  [Merge Selected]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 3: Knowledge Graph (Canvas Mode)

Beyond trees — full spatial thinking:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Zoom: 50%]  [Auto-arrange]  [Show links]  [Filter: insights only] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                                                                     │
│      ┌───────────┐                     ┌───────────┐                │
│      │ Revenue   │─────────────────────│ Churn     │                │
│      │ +12% MoM  │                     │ APAC 4.2% │                │
│      └─────┬─────┘                     └─────┬─────┘                │
│            │                                 │                      │
│            │       ┌───────────────┐         │                      │
│            └───────│ Q3 anomaly    │─────────┘                      │
│                    │ needs digging │                                │
│                    └───────┬───────┘                                │
│                            │                                        │
│           ┌────────────────┼────────────────┐                       │
│           │                │                │                       │
│      ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐                 │
│      │ APAC    │     │ Pricing   │    │ Product   │                 │
│      │ deep    │─────│ change    │────│ mix shift │                 │
│      │ dive    │     │ impact    │    │           │                 │
│      └─────────┘     └───────────┘    └───────────┘                 │
│                                                                     │
│   [Drag to connect]  [Double-click to expand]  [Right-click: menu] │
└─────────────────────────────────────────────────────────────────────┘
```

**Canvas interactions:**
- **Drag blocks** to arrange spatially
- **Draw connections** between related insights
- **Cluster related items** automatically or manually
- **Zoom in** to see full block content
- **Zoom out** to see relationship map
- **Export** as shareable image or interactive view

---

## Branch Templates

Save successful exploration patterns as reusable templates:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Templates                                                    [+ New]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📊 Quarterly Business Review                                    │ │
│ │                                                                 │ │
│ │ main: Revenue overview → Key metrics                            │ │
│ │   ├── by-region: Regional breakdown                             │ │
│ │   ├── by-product: Product analysis                              │ │
│ │   ├── vs-forecast: Variance analysis                            │ │
│ │   └── merge: Executive summary                                  │ │
│ │                                                                 │ │
│ │ [Use Template]  [Edit]  [Duplicate]                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Churn Investigation                                          │ │
│ │                                                                 │ │
│ │ main: Current churn rate → Trend analysis                       │ │
│ │   ├── by-segment: Customer segment breakdown                    │ │
│ │   ├── by-reason: Exit survey analysis                           │ │
│ │   └── correlations: Factor analysis                             │ │
│ │                                                                 │ │
│ │ [Use Template]  [Edit]  [Duplicate]                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Using a template pre-creates the branch structure with suggested starting questions.**

---

## Data Model

```typescript
interface Notebook {
  id: string;
  title: string;
  type: 'conversation' | 'meeting' | 'briefing';
  createdAt: Date;
  updatedAt: Date;

  // Git-like structure
  branches: Branch[];
  currentBranch: string;
  currentNode: string;
}

interface Branch {
  id: string;
  name: string;
  parentBranch?: string;
  forkPoint?: string;  // Node ID where this branch forked
  nodes: Node[];
  mergedInto?: string; // Branch ID if merged
}

interface Node {
  id: string;
  branchId: string;
  parentNode?: string;

  // Content
  type: 'question' | 'answer' | 'insight' | 'note';
  content: LiquidBlock[];  // Can be multiple blocks

  // Metadata
  notes: Note[];
  tags: string[];
  linkedNodes: string[];  // Cross-references

  // Git metadata
  createdAt: Date;
  author: string;
}

interface Note {
  id: string;
  nodeId: string;
  type: 'personal' | 'team' | 'ai' | 'linked';
  content: string;
  author: string;
  createdAt: Date;
  visibility: 'private' | 'workspace' | 'public';
}
```

---

## Implementation Roadmap

| Phase | Feature | Effort | Value |
|-------|---------|--------|-------|
| **V1.5** | Block notes (personal) | 3 days | High |
| **V1.5** | Git graph panel (view only) | 4 days | Medium |
| **V2** | Simple branching | 1 week | Very High |
| **V2** | Branch navigation | 3 days | High |
| **V2** | Branch comparison | 4 days | High |
| **V2** | Team notes | 3 days | Medium |
| **V3** | Merge insights | 1 week | High |
| **V3** | Branch templates | 4 days | High |
| **V3** | Cross-linking | 1 week | Medium |
| **V4** | Canvas mode | 3 weeks | Very High |

**Sweet Spot: Notes + Git Graph + Simple Branching = 2 weeks**

---

## Technical Stack

| Component | Library/Approach |
|-----------|------------------|
| Git graph visualization | [@gitgraph/react](https://www.npmjs.com/package/@gitgraph/react) or custom SVG |
| Collapsible panel | Radix Collapsible / custom |
| Canvas mode (V4) | React Flow / tldraw |
| Data structure | Normalized store (branches, nodes, notes as separate collections) |
| Persistence | Postgres with JSONB for flexible block content |

---

## Competitive Moat

No one else has this:

| Competitor | What They Have | What They Lack |
|------------|----------------|----------------|
| ChatGPT | Linear conversations | No branching, no data |
| Notion AI | Pages with AI | No conversation branching |
| Jupyter | Linear notebooks | No branching, no natural language |
| Observable | Reactive notebooks | No AI, complex for non-devs |
| **Knosia** | Branched + AI + Data | ✓ The full stack |

---

## The Philosophical Shift

> **Chat is for answers. Notebooks are for thinking.**

| Traditional Chat | Knosia Branched Notebook |
|------------------|--------------------------|
| Ephemeral | Persistent knowledge |
| Linear | Multi-path exploration |
| Isolated | Connected insights |
| Individual | Collaborative |
| Text-based | Spatial + visual |

**You're not building a chatbot. You're building a thinking tool for teams.**

---

*Document created: 2025-12-31*
*Vision: Git-style branching for data conversations*
