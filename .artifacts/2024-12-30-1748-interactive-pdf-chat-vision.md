# Interactive PDF Chat Vision

> The PDF isn't a static document you're asking questions about. It's an active participant in the conversation—with memory, opinions, and the ability to *show* rather than just tell.

---

## User's Original Vision

- Click on chat content that references PDF → PDF navigates to that location
- Referenced text gets highlighted
- User can resume previous view position

---

## Elevated Vision

### 1. Bidirectional Linking

Not just Chat → PDF, but PDF → Chat as well:

```
CHAT → PDF: Click citation, PDF navigates and highlights
PDF → CHAT: Select text in PDF, see which messages referenced it
           (or ask "What did we discuss about this?")
```

When you select text in the PDF, a subtle indicator shows: "Referenced in 3 messages" — click to see the conversation thread about that specific content.

---

### 2. Citations as First-Class UI Elements

Instead of hoping users notice clickable text, make citations explicit and beautiful:

```
AI Response:
"The contract specifies a 30-day termination clause [1] but
includes an exception for force majeure events [2] that could
extend this to 90 days [1, p.7]."

┌─────────────────────────────────┐
│ [1] Section 4.2, Page 3         │  ← hoverable preview, clickable
│ [2] Section 8.1, Page 7         │
└─────────────────────────────────┘
```

**Interaction patterns:**
- **Hover** = preview thumbnail of that PDF region (like Google Docs link previews)
- **Click** = navigate with highlight
- **Keyboard shortcut** (e.g., `1`, `2`) = cycle through citations
- **⌘+Click** = open in compare mode (split view)

---

### 3. The "Evidence Trail" Margin

A vertical margin on the PDF showing where the conversation has touched:

```
┌─────────────────────────────────────┐
│ [●] Page 1                          │  ← dot = referenced in chat
│ [ ] Page 2                          │
│ [●] Page 3 ████░░░                  │  ← heat indicator (heavily discussed)
│ [ ] Page 4                          │
│ [●] Page 5                          │
└─────────────────────────────────────┘
```

- Click any marker to see related chat messages
- Visual understanding of document exploration coverage
- Heat intensity = how many times/messages referenced that page

---

### 4. Smart Navigation

Don't just scroll—*present*:

```
Navigation Sequence:
1. Animate smoothly (300ms ease-out)
2. Zoom to fit the referenced paragraph
3. Dim surrounding content (focus mode)
4. Pulse the highlight once, then settle to subtle yellow
5. Show floating "← Back" button (or ⌘+[ keyboard shortcut)
```

**Navigation History Stack** (like browser):
- Forward/back through every location visited
- Whether via chat click or manual scroll
- Visual breadcrumb trail: "Page 3 → Page 7 → Page 3 → Page 12"

---

### 5. Confidence Indicators

Not all references are equal. Show AI confidence:

```
"The penalty is $50,000 [1 ●●●○] or $75,000 [2 ●●○○]"

●●●● = exact match found (verbatim text)
●●●○ = strong semantic match
●●○○ = related content (AI inferred)
●○○○ = weak match (flagged for verification)
```

Benefits:
- Builds trust with users
- Users know when to double-check
- Transparency about AI reasoning

---

### 6. Persistent Annotations Layer

Highlights don't disappear—each click builds a **study layer**:

```
┌─────────────────────────────────────┐
│ [Toggle] Show all highlights        │
│                                     │
│ This session: 12 highlights         │
│ Across 5 pages                      │
│                                     │
│ [Export ▼]                          │
│   • Summary with citations (MD)     │
│   • Annotated PDF (highlighted)     │
│   • Flashcards from Q&A pairs       │
│   • Share link (view-only)          │
└─────────────────────────────────────┘
```

The chat becomes a lens that permanently marks up the document.

---

### 7. Multi-Region Compare Mode

When the AI compares two sections:

```
"Section 3 contradicts Section 7..."
              [Compare Side-by-Side]
```

Click → PDF splits into two synchronized panels:

```
┌─────────────────┬─────────────────┐
│    Section 3    │    Section 7    │
│    Page 3       │    Page 7       │
│                 │                 │
│  [highlighted]  │  [highlighted]  │
│                 │                 │
└─────────────────┴─────────────────┘
         [Exit Compare Mode]
```

This is how lawyers, researchers, and analysts actually work.

---

## Technical Architecture

### Enhanced Embedding Schema

```typescript
// Current: just content + embedding
interface CurrentEmbedding {
  id: string;
  documentId: string;
  content: string;
  embedding: number[]; // 1536 dims
}

// Enhanced: content + location + embedding
interface EnhancedEmbedding {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    pageNumber: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    charStart: number;
    charEnd: number;
    sectionTitle?: string;
    paragraphIndex?: number;
  };
}
```

### Database Schema Changes

```sql
-- Add columns to pdf.embedding
ALTER TABLE pdf.embedding ADD COLUMN page_number INTEGER;
ALTER TABLE pdf.embedding ADD COLUMN char_start INTEGER;
ALTER TABLE pdf.embedding ADD COLUMN char_end INTEGER;
ALTER TABLE pdf.embedding ADD COLUMN section_title TEXT;
ALTER TABLE pdf.embedding ADD COLUMN bounding_box JSONB;

-- New table for navigation history
CREATE TABLE pdf.navigation_history (
  id TEXT PRIMARY KEY,
  chat_id TEXT REFERENCES pdf.chat(id),
  user_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  scroll_position REAL,
  zoom_level REAL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- New table for persistent highlights
CREATE TABLE pdf.highlight (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES pdf.document(id),
  message_id TEXT REFERENCES pdf.message(id),
  embedding_id TEXT REFERENCES pdf.embedding(id),
  page_number INTEGER NOT NULL,
  bounding_box JSONB,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AI Response Structure

```typescript
// AI returns structured format with citations
interface ChatResponseWithCitations {
  content: string; // The message text with [1], [2] markers
  citations: Citation[];
}

interface Citation {
  index: number;           // [1], [2], etc.
  embeddingId: string;     // Reference to pdf.embedding
  relevance: number;       // 0-1 confidence score
  pageNumber: number;      // For quick reference
  excerpt: string;         // Short preview text
}

// Example response:
{
  content: "The contract specifies a 30-day termination clause [1] but includes an exception for force majeure events [2].",
  citations: [
    {
      index: 1,
      embeddingId: "emb_abc123",
      relevance: 0.94,
      pageNumber: 3,
      excerpt: "Either party may terminate with 30 days written notice..."
    },
    {
      index: 2,
      embeddingId: "emb_def456",
      relevance: 0.87,
      pageNumber: 7,
      excerpt: "In the event of force majeure, the termination period..."
    }
  ]
}
```

### Frontend Components

```
apps/web/src/modules/pdf/
├── layout/
│   ├── preview/
│   │   ├── index.tsx              # PDF viewer
│   │   ├── pdf-viewer.css
│   │   ├── highlight-layer.tsx    # NEW: Overlay for highlights
│   │   ├── evidence-margin.tsx    # NEW: Heat map margin
│   │   └── navigation-stack.tsx   # NEW: Back/forward history
│   └── chat/
│       ├── index.tsx
│       ├── messages.tsx
│       ├── citation.tsx           # NEW: Clickable citation component
│       └── citation-preview.tsx   # NEW: Hover preview popover
├── hooks/
│   ├── use-pdf-navigation.ts      # NEW: Navigation history + scroll
│   ├── use-citations.ts           # NEW: Citation interaction
│   └── use-highlights.ts          # NEW: Persistent highlight state
└── context/
    └── pdf-viewer-context.tsx     # NEW: Shared state between chat & viewer
```

### PDF Viewer API

```typescript
interface PDFViewerAPI {
  // Navigation
  navigateTo(options: {
    page: number;
    boundingBox?: BoundingBox;
    highlight?: boolean;
    animate?: boolean;
  }): void;

  // History
  goBack(): void;
  goForward(): void;
  getHistory(): NavigationEntry[];

  // Highlights
  addHighlight(highlight: Highlight): void;
  removeHighlight(id: string): void;
  getHighlights(): Highlight[];

  // State
  getCurrentPage(): number;
  getScrollPosition(): number;
  getZoomLevel(): number;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Extract page numbers during PDF parsing
- [ ] Store page metadata in embeddings table
- [ ] Modify AI prompt to return structured citations
- [ ] Render basic clickable citation markers in chat
- [ ] Basic scroll-to-page on click

### Phase 2: Navigation (Week 2)
- [ ] Smooth scroll animation
- [ ] Text highlighting on the target page
- [ ] Navigation history stack (back/forward)
- [ ] "Back to previous" floating button
- [ ] Keyboard shortcuts (⌘+[, ⌘+])

### Phase 3: Enhanced UX (Week 3)
- [ ] Hover preview popovers for citations
- [ ] Confidence indicators on citations
- [ ] Evidence trail margin (page markers)
- [ ] Focus mode (dim surrounding content)

### Phase 4: Bidirectional (Week 4)
- [ ] PDF text selection detection
- [ ] "Related messages" lookup for selected text
- [ ] Inline "Ask about this" action
- [ ] Persistent highlights layer

### Phase 5: Advanced (Future)
- [ ] Compare mode (split view)
- [ ] Export annotations
- [ ] Heat map visualization
- [ ] Flashcard generation

---

## Use Cases Unlocked

| Use Case | How It Helps |
|----------|--------------|
| **Legal review** | Every claim is verifiable, one click |
| **Academic research** | Build bibliography as you chat |
| **Contract negotiation** | Compare clauses side-by-side |
| **Onboarding/training** | Interactive document walkthroughs |
| **Audit/compliance** | Evidence trail is built automatically |
| **Due diligence** | Track what's been reviewed vs. not |
| **Study/learning** | Export highlights as study guide |

---

## Open Questions

1. **Bounding box extraction**: Can we get character-level positions from pdf.js, or only page numbers?
2. **Multi-document**: How do citations work when chat has multiple PDFs?
3. **Performance**: How to handle very long documents (1000+ pages)?
4. **Mobile**: How does the split view work on mobile? (Probably: toggle between views)
5. **Collaboration**: Should highlights be per-user or shared within organization?

---

## References

- Current PDF implementation: `.artifacts/2024-12-30-pdf-feature-context.md`
- PDF viewer component: `apps/web/src/modules/pdf/layout/preview/`
- Embeddings logic: `packages/ai/src/modules/pdf/embeddings.ts`
