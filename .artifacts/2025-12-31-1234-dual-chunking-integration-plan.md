# WF-0028 Integration Plan: Wire Dual-Resolution Chunking to PDF Pipeline

**Goal:** Replace legacy single-tier embeddings with dual-resolution chunking (citation units + retrieval chunks) in the PDF processing and search flow.

---

## Context Files to Read

Read these files in order to build full context before implementation:

### 1. Database Schema (understand data model)
```
packages/db/src/schema/pdf.ts
```
- Legacy tables: `pdfEmbedding`
- New tables: `pdfCitationUnit`, `pdfRetrievalChunk`
- Relationships between tables

### 2. Legacy Processing (what to replace)
```
packages/ai/src/modules/pdf/embeddings.ts
```
- `generateDocumentEmbeddings()` - current chunking logic
- `findRelevantContent()` - current search logic
- Understand the metadata structure

### 3. New Dual-Resolution Functions (what to use)
```
packages/ai/src/modules/pdf/dual-embeddings.ts
```
- `processPdfWithDualResolution()` - replacement for generateDocumentEmbeddings
- `storeDualChunks()` - stores to new tables
- `generateDualEmbeddings()` - creates embeddings for retrieval chunks

```
packages/ai/src/modules/pdf/search.ts
```
- `searchWithCitations()` - replacement for findRelevantContent
- Returns retrieval chunks with linked citation units

### 4. Current API Integration Point (where to wire)
```
packages/ai/src/modules/pdf/api.ts
```
- `createDocument()` - calls legacy embeddings (line 44-66)
- `createTools()` - uses legacy search (line 152-186)
- `parseCitations()` - may need updates for new format

### 5. Layout Parser (dependency)
```
packages/ai/src/modules/pdf/layout-parser.ts
```
- `parseDocumentLayout()` - extracts structured elements from PDF
- Provides input to `createDualResolutionChunks()`

---

## Implementation Plan

### Phase 1: Update Document Processing

**File:** `packages/ai/src/modules/pdf/api.ts`

**Task 1.1:** Replace `generateDocumentEmbeddings` with `processPdfWithDualResolution`

```typescript
// BEFORE (lines 44-66)
void (async () => {
  const generated = await generateDocumentEmbeddings(documentData.path);
  await db.insert(pdfEmbedding).values(...);
})();

// AFTER
void (async () => {
  const result = await processPdfWithDualResolution(
    documentData.path,
    documentData.id
  );
  // Storage happens inside processPdfWithDualResolution
  console.log(`Created ${result.citationUnitsCreated} citation units, ${result.retrievalChunksCreated} retrieval chunks`);
})();
```

**Task 1.2:** Add import for new function
```typescript
import { processPdfWithDualResolution } from "./dual-embeddings";
```

### Phase 2: Update Search Tool

**File:** `packages/ai/src/modules/pdf/api.ts`

**Task 2.1:** Replace `findRelevantContent` with `searchWithCitations`

```typescript
// BEFORE (line 168)
const results = await findRelevantContent(query, docId);

// AFTER
const results = await searchWithCitations(query, docId, { limit: 6 });
```

**Task 2.2:** Update tool response format

The `searchWithCitations` returns a different structure:
```typescript
// Old format (EmbeddingSearchResult)
{ id, name, similarity, pageNumber, charStart, charEnd, sectionTitle }

// New format (SearchResult)
{
  chunk: { id, content, pageStart, pageEnd, ... },
  citationUnits: [{ id, content, pageNumber, bbox, ... }],
  similarity
}
```

Need to adapt the tool response to work with both formats or update citation parsing.

### Phase 3: Update Citation Format

**File:** `packages/ai/src/modules/pdf/api.ts`

**Task 3.1:** Update `parseCitations` to use citation unit IDs

Current format: `[[cite:embeddingId:pageNum]]`
New format: `[[cite:citationUnitId:pageNum]]`

The citation unit ID can be used by the frontend to:
1. Fetch precise bounding box via `/citation-units/single/:id`
2. Render pixel-perfect highlights

**Task 3.2:** Update `formatEmbeddingsForCitation` for new structure

```typescript
// Adapt for SearchResult[] instead of EmbeddingSearchResult[]
export function formatSearchResultsForCitation(results: SearchResult[]): string {
  return results.map((r, i) => {
    const firstUnit = r.citationUnits[0];
    return `[Source ${i + 1}]
ID: ${firstUnit?.id ?? r.chunk.id}
Page: ${r.chunk.pageStart}
Content: ${r.chunk.content.substring(0, 500)}
---
To cite, use: [[cite:${firstUnit?.id ?? r.chunk.id}:${r.chunk.pageStart}]]`;
  }).join("\n\n");
}
```

### Phase 4: Backward Compatibility

**Task 4.1:** Keep legacy search as fallback

For documents processed before the upgrade:
```typescript
async function findContent(query: string, documentId: string) {
  // Try new system first
  const newResults = await searchWithCitations(query, documentId);
  if (newResults.length > 0) {
    return formatNewResults(newResults);
  }

  // Fall back to legacy for old documents
  const legacyResults = await findRelevantContent(query, documentId);
  return formatLegacyResults(legacyResults);
}
```

**Task 4.2:** Migration script (optional, for existing documents)

Could add a script to reprocess existing documents with dual-resolution chunking.

---

## Validation Checklist

After implementation:

- [ ] Upload new PDF → verify citation units + retrieval chunks created in DB
- [ ] Ask question → verify searchWithCitations returns results
- [ ] Click citation → verify highlight layer uses bounding box (not word overlap)
- [ ] Old PDFs → verify fallback to legacy search works
- [ ] Run tests: `pnpm --filter @turbostarter/ai test`

---

## Risk Mitigation

1. **Feature flag**: Could add `USE_DUAL_CHUNKING=true` env var to toggle
2. **Parallel writes**: Initially write to BOTH old and new tables during transition
3. **Rollback**: Keep legacy functions available, just not called by default

---

## Estimated Changes

| File | Lines Changed | Complexity |
|------|---------------|------------|
| `api.ts` | ~50-80 | Medium |
| `dual-embeddings.ts` | ~10 (if any) | Low |
| `search.ts` | ~5 (if any) | Low |

Total: ~1 hour of focused work
