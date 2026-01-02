# Precise PDF Highlighting via Tool-Based Citations

## Overview

Replace chunk-level citations with precise text highlighting. Instead of the LLM citing entire chunks (`[[cite:chunkId:page]]`), it calls a `highlightText` tool with exact phrases to highlight in the PDF.

## Current vs Proposed

```
CURRENT FLOW:
┌──────────┐    ┌─────────────────┐    ┌────────────────┐
│ Question │───▶│ findRelevantContent │───▶│ Chunks (500 chars) │
└──────────┘    └─────────────────┘    └────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ LLM Response    │
              │ "...[[cite:abc:5]]" │
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ Highlight ENTIRE│
              │ chunk on page 5 │
              └─────────────────┘

PROPOSED FLOW:
┌──────────┐    ┌─────────────────┐    ┌────────────────┐
│ Question │───▶│ findRelevantContent │───▶│ Chunks (context) │
└──────────┘    └─────────────────┘    └────────────────┘
                        │
                        ▼
              ┌─────────────────────────────┐
              │ LLM writes + calls tool:    │
              │ highlightText({             │
              │   text: "revenue was $5M",  │
              │   page: 5                   │
              │ })                          │
              └─────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ Highlight EXACT │
              │ phrase on pg 5  │
              └─────────────────┘
```

## Implementation

### 1. New Tool Definition

**File:** `packages/ai/src/modules/pdf/api.ts`

```typescript
import { tool } from "ai";
import * as z from "zod";
import { generateId } from "@turbostarter/shared/utils";

/**
 * Tool for precise text highlighting in PDFs.
 * LLM calls this to highlight specific phrases that support its answer.
 */
const createHighlightTool = () => ({
  highlightText: tool({
    description: `Highlight a specific phrase from the PDF document to support your answer.
    Use this tool for EACH fact you cite. The text must be an EXACT quote from the document.
    Keep highlights short (10-100 characters) - single sentences or key phrases only.`,
    parameters: z.object({
      text: z
        .string()
        .min(10)
        .max(200)
        .describe("Exact phrase from the document to highlight. Must match document text exactly."),
      page: z
        .number()
        .int()
        .positive()
        .describe("Page number where this text appears (1-indexed)"),
      relevance: z
        .string()
        .optional()
        .describe("Brief note on why this supports your answer (for user context)"),
    }),
    execute: async ({ text, page, relevance }) => {
      const citationId = generateId();

      // Return structured citation for the stream
      return {
        citationId,
        text,
        page,
        relevance: relevance ?? null,
        timestamp: Date.now(),
      };
    },
  }),
});

// Type for citation from tool
export interface PreciseCitation {
  citationId: string;
  text: string;
  page: number;
  relevance: string | null;
  timestamp: number;
}
```

### 2. Updated Tools Factory

**File:** `packages/ai/src/modules/pdf/api.ts`

```typescript
// Combine search + highlight tools
const createTools = (documentIds?: string[]) => {
  const searchTool = {
    findRelevantContent: tool({
      description: `Search the PDF document for information relevant to the user's question.
      After finding relevant content, use highlightText to cite specific phrases.`,
      parameters: z.object({
        query: z.string().describe("Search query to find relevant information"),
      }),
      execute: async ({ query }) => {
        if (documentIds && documentIds.length > 0) {
          const results = await Promise.all(
            documentIds.map((docId) => hybridSearch(query, docId, 6))
          );
          return {
            results: results.flat().slice(0, 6),
            instructions: "Use highlightText tool to cite specific phrases from these results.",
          };
        }
        const results = await findRelevantContent(query);
        return {
          results: results.map((r) => ({
            content: r.name,
            page: r.pageNumber,
            similarity: r.similarity,
          })),
          instructions: "Use highlightText tool to cite specific phrases from these results.",
        };
      },
    }),
  };

  const highlightTool = createHighlightTool();

  return { ...searchTool, ...highlightTool };
};
```

### 3. Updated System Prompt

**File:** `packages/ai/src/modules/pdf/constants.ts`

```typescript
export const PROMPTS = {
  SYSTEM: `You are a helpful assistant that answers questions about PDF documents.

CITATION RULES:
1. After searching with findRelevantContent, use highlightText to cite specific phrases
2. Each fact you mention should have a corresponding highlightText call
3. Use EXACT quotes from the document (10-100 characters)
4. Call highlightText BEFORE mentioning the fact in your response
5. Keep highlights focused - single sentences or key phrases, not paragraphs

RESPONSE FORMAT:
- Answer naturally in prose
- Don't include citation markers like [1] or [[cite:...]] in your text
- The highlights will appear automatically in the PDF viewer

Example flow:
1. User asks: "What was the Q4 revenue?"
2. You call: findRelevantContent({ query: "Q4 revenue" })
3. You find relevant chunks mentioning "$5.2 million in Q4"
4. You call: highlightText({ text: "$5.2 million in Q4", page: 12 })
5. You respond: "The Q4 revenue was $5.2 million, showing 15% growth."
`,
};
```

### 4. Stream Processing for Citations

**File:** `packages/ai/src/modules/pdf/api.ts`

```typescript
export const streamChatWithDocuments = async ({
  chatId,
  signal,
  documentIds,
  ...message
}: PdfMessagePayload & { signal: AbortSignal; chatId: string; documentIds?: string[] }) => {
  await createMessage({ ...message, chatId });
  const messages = await getChatMessages(chatId);

  const result = streamText({
    model: modelStrategies.languageModel("uncached"),
    messages: convertToModelMessages([
      ...messages.map((m) => ({
        ...m,
        parts: [{ type: "text" as const, text: m.content }],
      })),
      {
        ...message,
        parts: [{ type: "text" as const, text: message.content }],
      },
    ]),
    system: PROMPTS.SYSTEM,
    stopWhen: stepCountIs(5), // Allow more steps for highlight calls
    abortSignal: signal,
    tools: createTools(documentIds),
    maxSteps: 10, // Support multiple highlight calls
    experimental_transform: smoothStream({
      chunking: "word",
      delayInMs: 15,
    }),
    experimental_repairToolCall: repairToolCall,
  });

  void result.consumeStream();

  return result.toUIMessageStreamResponse({
    sendUsage: false,
    onFinish: async ({ responseMessage, toolCalls }) => {
      // Extract citations from tool calls
      const citations = toolCalls
        ?.filter((tc) => tc.toolName === "highlightText")
        .map((tc) => tc.result as PreciseCitation) ?? [];

      // Store message with citations metadata
      await createMessage({
        id: responseMessage.id || generateId(),
        chatId,
        content: responseMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
        role: Role.ASSISTANT,
        // Store citations in metadata (needs schema update)
        metadata: citations.length > 0 ? { citations } : null,
      });
    },
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
};
```

### 5. Frontend: Parse Tool Calls from Stream

**File:** `apps/web/src/modules/pdf/thread/assistant.tsx`

```typescript
import { useEffect, useState } from "react";
import type { PreciseCitation } from "@turbostarter/ai/pdf/api";

interface AssistantMessageProps {
  message: Message;
  onCitationsUpdate?: (citations: PreciseCitation[]) => void;
}

export function AssistantMessage({ message, onCitationsUpdate }: AssistantMessageProps) {
  const [citations, setCitations] = useState<PreciseCitation[]>([]);

  useEffect(() => {
    // Extract citations from tool invocations in the message
    const toolInvocations = message.toolInvocations ?? [];
    const highlightCitations = toolInvocations
      .filter((ti) => ti.toolName === "highlightText" && ti.state === "result")
      .map((ti) => ti.result as PreciseCitation);

    if (highlightCitations.length > 0) {
      setCitations(highlightCitations);
      onCitationsUpdate?.(highlightCitations);
    }
  }, [message.toolInvocations, onCitationsUpdate]);

  return (
    <div className="assistant-message">
      {/* Message content */}
      <div className="prose">{message.content}</div>

      {/* Citation chips (optional visual indicator) */}
      {citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {citations.map((c, i) => (
            <button
              key={c.citationId}
              onClick={() => scrollToPage(c.page)}
              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
            >
              p.{c.page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6. Frontend: Text Search Highlighting

**File:** `apps/web/src/modules/pdf/context/pdf-viewer-context.tsx`

```typescript
import { createContext, useContext, useState, useCallback } from "react";
import type { PreciseCitation } from "@turbostarter/ai/pdf/api";

interface TextHighlight {
  id: string;
  text: string;
  page: number;
  rects: DOMRect[]; // Computed from text search
}

interface PdfViewerContextValue {
  // Existing...
  currentPage: number;
  setCurrentPage: (page: number) => void;

  // New: Precise text highlights
  textHighlights: TextHighlight[];
  addCitation: (citation: PreciseCitation) => void;
  clearHighlights: () => void;
}

export function PdfViewerProvider({ children }: { children: React.ReactNode }) {
  const [textHighlights, setTextHighlights] = useState<TextHighlight[]>([]);

  const addCitation = useCallback((citation: PreciseCitation) => {
    // Will be resolved to rects when the page renders
    setTextHighlights((prev) => [
      ...prev,
      {
        id: citation.citationId,
        text: citation.text,
        page: citation.page,
        rects: [], // Populated by highlight layer
      },
    ]);
  }, []);

  const clearHighlights = useCallback(() => {
    setTextHighlights([]);
  }, []);

  // ... rest of provider
}
```

### 7. Highlight Layer: Text Search in PDF

**File:** `apps/web/src/modules/pdf/layout/preview/text-highlight-layer.tsx`

```typescript
import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

interface TextHighlightLayerProps {
  page: PDFPageProxy;
  pageNumber: number;
  scale: number;
  highlights: Array<{ id: string; text: string; page: number }>;
}

export function TextHighlightLayer({
  page,
  pageNumber,
  scale,
  highlights,
}: TextHighlightLayerProps) {
  const [foundRects, setFoundRects] = useState<Map<string, DOMRect[]>>(new Map());

  useEffect(() => {
    const findTextInPage = async () => {
      // Get text content from PDF.js
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });

      const pageHighlights = highlights.filter((h) => h.page === pageNumber);
      const newRects = new Map<string, DOMRect[]>();

      for (const highlight of pageHighlights) {
        const rects = findTextRects(textContent, highlight.text, viewport);
        if (rects.length > 0) {
          newRects.set(highlight.id, rects);
        }
      }

      setFoundRects(newRects);
    };

    findTextInPage();
  }, [page, pageNumber, scale, highlights]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from(foundRects.entries()).map(([id, rects]) =>
        rects.map((rect, i) => (
          <div
            key={`${id}-${i}`}
            className="absolute bg-yellow-300/40 rounded-sm"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))
      )}
    </div>
  );
}

/**
 * Find text in PDF text content and return bounding rects
 */
function findTextRects(
  textContent: { items: Array<{ str: string; transform: number[] }> },
  searchText: string,
  viewport: { width: number; height: number; scale: number }
): DOMRect[] {
  const normalizedSearch = searchText.toLowerCase().trim();
  const rects: DOMRect[] = [];

  // Build full page text for searching
  let fullText = "";
  const itemPositions: Array<{ start: number; end: number; item: any }> = [];

  for (const item of textContent.items) {
    if ("str" in item) {
      const start = fullText.length;
      fullText += item.str;
      itemPositions.push({ start, end: fullText.length, item });
    }
  }

  // Find all occurrences
  const normalizedFull = fullText.toLowerCase();
  let searchStart = 0;

  while (true) {
    const foundIndex = normalizedFull.indexOf(normalizedSearch, searchStart);
    if (foundIndex === -1) break;

    // Find which text items contain this match
    const matchEnd = foundIndex + normalizedSearch.length;

    for (const pos of itemPositions) {
      if (pos.end > foundIndex && pos.start < matchEnd) {
        // This item overlaps with our match
        const [a, b, c, d, x, y] = pos.item.transform;
        const width = pos.item.width ?? pos.item.str.length * 6;
        const height = Math.abs(d) || 12;

        rects.push(
          new DOMRect(
            x * viewport.scale,
            viewport.height - (y + height) * viewport.scale,
            width * viewport.scale,
            height * viewport.scale
          )
        );
      }
    }

    searchStart = foundIndex + 1;
  }

  return rects;
}
```

### 8. Database Schema Update (Optional)

If we want to persist citations with messages:

**File:** `packages/db/src/schema/pdf.ts`

```typescript
export const pdfMessage = pdfSchema.table("message", {
  id: text().primaryKey().notNull().$defaultFn(generateId),
  chatId: text()
    .references(() => pdfChat.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  content: text().notNull(),
  role: pdfMessageRoleEnum().notNull(),
  // NEW: Store precise citations as JSON
  citations: jsonb().$type<PreciseCitation[]>(),
  createdAt: timestamp().defaultNow(),
});
```

## Migration Path

1. **Phase 1**: Add `highlightText` tool alongside existing `[[cite:...]]` system
2. **Phase 2**: Update system prompt to prefer `highlightText`
3. **Phase 3**: Remove old citation parsing once stable
4. **Phase 4**: Add citation persistence to database

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Highlight precision | ~500 chars (chunk) | ~20-50 chars (phrase) |
| User clarity | "Somewhere here" | "This exact text" |
| Streaming support | Post-process | Real-time |
| LLM flexibility | Rigid format | Natural tool calls |

## Files to Modify

1. `packages/ai/src/modules/pdf/api.ts` - Add highlightText tool
2. `packages/ai/src/modules/pdf/constants.ts` - Update system prompt
3. `apps/web/src/modules/pdf/thread/assistant.tsx` - Parse tool calls
4. `apps/web/src/modules/pdf/context/pdf-viewer-context.tsx` - Manage highlights
5. `apps/web/src/modules/pdf/layout/preview/text-highlight-layer.tsx` - New component
6. `packages/db/src/schema/pdf.ts` - Optional: persist citations

## Open Questions

1. **Fallback**: What if text search doesn't find the exact phrase? (LLM may paraphrase)
   - Option A: Fuzzy matching
   - Option B: Fall back to page-level highlight
   - Option C: Show "citation not found" indicator

2. **Multiple highlights**: How to visually distinguish multiple highlights on same page?
   - Different colors per citation
   - Numbered badges
   - Hover to reveal which answer it supports

3. **Performance**: Text search on large PDFs
   - Cache text content per page
   - Only search visible pages + buffer
