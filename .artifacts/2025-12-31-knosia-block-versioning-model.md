# Knosia: Block Versioning Model

*Versions vs Branches — Implementation & UX Specification*

---

## Core Distinction

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   VERSION = History stack on ONE node                               │
│   ─────────────────────────────────────                             │
│   • Same blockId, multiple content snapshots                        │
│   • Triggered by: User edits question/note                          │
│   • UX: "I want to refine this"                                     │
│   • Linear flow stays linear                                        │
│                                                                     │
│   BRANCH = NEW nodes forking from parent                            │
│   ────────────────────────────────────────                          │
│   • Different blockIds, parent-child relationship                   │
│   • Triggered by: User clicks "Branch from here"                    │
│   • UX: "I want to explore something else"                          │
│   • Creates parallel exploration path                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Level

```
VERSION:  Block A [v1, v2, v3]     ← One node, array of snapshots

BRANCH:   Block A → Block B        ← Two nodes, parent-child relationship
              └──→ Block C
```

---

## Data Model

### Block with Versions

```typescript
interface Block {
  id: string;                    // Stable block ID
  notebookId: string;
  parentBlockId: string | null;  // For graph structure
  branchId: string;              // Which branch this block belongs to

  // Version history (array of snapshots)
  versions: BlockVersion[];
  currentVersionIndex: number;

  createdAt: Date;
  updatedAt: Date;
}

interface BlockVersion {
  versionNumber: number;         // v1, v2, v3...
  content: BlockContent;         // Question, answer, note, chart data
  createdAt: Date;
  createdBy: string;             // userId or 'knosia'
}

interface BlockContent {
  type: 'question' | 'answer' | 'note' | 'chart';
  text?: string;
  data?: any;                    // Chart data, etc.
}
```

### Branch

```typescript
interface Branch {
  id: string;
  notebookId: string;
  name: string;                  // 'main', 'pricing-analysis', etc.

  // Where this branch forked from
  forkedFromBlockId: string | null;
  forkedFromVersionNumber: number | null;  // Can branch from old version!

  createdAt: Date;
  createdBy: string;
}
```

---

## User Actions & Results

| User Action | Result | Implementation |
|-------------|--------|----------------|
| Edit question | New version of same block | Push to `versions[]`, increment `currentVersionIndex` |
| Click "Branch from here" | New branch + new block | Create `Branch`, create `Block` with `parentBlockId` |
| Click "Branch from v1" | New branch from old version | Create `Branch` with `forkedFromVersionNumber: 1` |
| View old version | Show historical content | Read `versions[n]` |
| Restore old version | Make old version current | Set `currentVersionIndex = n` |

---

## UX: Version Dropdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─── Block ──────────────────────────────────────────────── v3 ▼ ─┐│
│  │ Q: What's causing APAC churn to increase?                       ││
│  │                                                                 ││
│  │ 🤖 I've identified three factors...                             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Click v3 ▼ ────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  v3 (current)                              Just now             ││
│  │  "What's causing APAC churn to increase?"                       ││
│  │                                                                 ││
│  │  v2                                        10 min ago           ││
│  │  "Why is APAC churn going up?"                                  ││
│  │  [View] [Restore] [Branch from this]                            ││
│  │                                                                 ││
│  │  v1                                        15 min ago           ││
│  │  "Show me APAC churn"                                           ││
│  │  [View] [Restore] [Branch from this]                            ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Decision Tree

```
User wants to change something
           │
           ▼
    ┌──────────────────┐
    │ Is this refining │
    │ the same thought?│
    └────────┬─────────┘
             │
     ┌───────┴───────┐
     │               │
    YES             NO
     │               │
     ▼               ▼
  VERSION         BRANCH
     │               │
     ▼               ▼
  Same block,    New block,
  new version    new path
```

---

## What Gets Versioned

| Block Type | Version Trigger | Paired Content |
|------------|-----------------|----------------|
| Question | User edits text | Answer auto-versions when Q changes |
| Answer | Regenerate / Q changes | Paired with Question version |
| Note | User edits text | Standalone |
| Chart | Regenerate | Paired with data query |

---

## Branch from Old Version

The power feature: explore "what if I had asked differently?"

```
Current state:
─────────────────────────────────────────────────────────────

  Block 1: "Show me APAC data"
      │
      ▼
  Block 2: [v1: "Show me APAC churn"]      ← Original question
           [v2: "Why is APAC churn up?"]
           [v3: "What's causing churn?"]   ← Current
      │
      ▼
  Block 3: (continues from v3 answer)


After "Branch from v1":
─────────────────────────────────────────────────────────────

  Block 1: "Show me APAC data"
      │
      ├─────────────────────────────────────┐
      ▼                                     ▼
  Block 2 (main)                     Block 2-alt (new branch)
  [v1, v2, v3]                       Starts from v1 context
      │                                     │
      ▼                                     ▼
  Block 3                            New exploration
  (continues)                        (different path)
```

---

## Key Principles

1. **Versions don't create graph complexity** — they're internal to a block
2. **Branches are intentional** — require explicit user action
3. **Linear stays linear** — editing doesn't accidentally branch
4. **History is preserved** — but tucked away in dropdown
5. **Time travel is possible** — branch from any past version

---

## Database Schema Sketch

```sql
-- Blocks table
CREATE TABLE notebook_blocks (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  parent_block_id TEXT,          -- Graph structure
  current_version_index INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Block versions (history)
CREATE TABLE block_versions (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content_type TEXT NOT NULL,    -- 'question', 'answer', 'note', 'chart'
  content_text TEXT,
  content_data JSONB,
  created_at TIMESTAMP,
  created_by TEXT
);

-- Branches
CREATE TABLE notebook_branches (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL,
  name TEXT NOT NULL,
  forked_from_block_id TEXT,
  forked_from_version_number INTEGER,
  created_at TIMESTAMP,
  created_by TEXT
);
```

---

## Summary

| Concept | Storage | Graph Impact | User Trigger |
|---------|---------|--------------|--------------|
| **Version** | Array in block | None (same node) | Edit content |
| **Branch** | New nodes | Adds nodes | Click "Branch" |
| **Branch from version** | New nodes + version ref | Adds nodes | Click "Branch from vN" |
