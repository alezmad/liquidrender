# PDF Chat UX Improvements

**Date:** 2026-01-01
**Status:** Implemented
**Module:** `apps/web/src/modules/pdf/`

---

## Overview

Four UX enhancements were implemented for the PDF chat feature to improve user engagement and discoverability:

1. **Copy with Citations** - Smart copy that formats citation markers
2. **Suggested Starter Questions** - Empty state with clickable prompts
3. **Follow-up Suggestions** - Contextual questions after AI responses
4. **Text Selection → Ask** - Select PDF text and ask about it

---

## 1. Copy with Citations

### Purpose
When users copy AI responses, citation markers like `[[cite:abc123:5]]` are converted to human-readable format `[p.5]`.

### Implementation

**File:** `apps/web/src/modules/pdf/thread/copy-with-citations.tsx`

```typescript
const CITATION_REGEX = /\[\[cite:([a-zA-Z0-9]+):(\d+)\]\]/g;

function formatContentWithCitations(content: string): string {
  return content.replace(
    CITATION_REGEX,
    (_match, _embeddingId: string, pageNumStr: string) => {
      return `[p.${pageNumStr}]`;
    }
  );
}
```

### Integration
- Added to `assistant.tsx` replacing the generic copy button
- Uses `getMessageTextContent()` to extract text from message parts

---

## 2. Suggested Starter Questions

### Purpose
When the chat is empty, show 4 clickable question buttons to help users get started.

### Implementation

**File:** `apps/web/src/modules/pdf/thread/suggested-questions.tsx`

```typescript
const questions = [
  { icon: Icons.FileText, text: t("pdf.suggestions.summarize") },
  { icon: Icons.BookOpen, text: t("pdf.suggestions.keyPoints") },
  { icon: Icons.Lightbulb, text: t("pdf.suggestions.explain") },
  { icon: Icons.Search, text: t("pdf.suggestions.find") },
];
```

### Translations

| Key | English | Spanish |
|-----|---------|---------|
| `pdf.suggestions.title` | Try asking... | Prueba preguntar... |
| `pdf.suggestions.summarize` | Summarize this document | Resume este documento |
| `pdf.suggestions.keyPoints` | What are the key points? | ¿Cuáles son los puntos clave? |
| `pdf.suggestions.explain` | Explain the main concepts | Explica los conceptos principales |
| `pdf.suggestions.find` | Find specific information | Buscar información específica |

### Integration
- Rendered in `thread/index.tsx` when `messages.length === 0`
- Disabled state during streaming/submitted status

---

## 3. Follow-up Suggestions

### Purpose
After the AI responds, show contextual follow-up buttons to encourage continued conversation.

### Implementation

**File:** `apps/web/src/modules/pdf/thread/follow-up-suggestions.tsx`

```typescript
const suggestions = [
  { icon: Icons.Search, text: t("pdf.followUp.moreDetail") },
  { icon: Icons.MessageCircle, text: t("pdf.followUp.clarify") },
  { icon: Icons.ArrowRight, text: t("pdf.followUp.continue") },
];
```

### Thread Component Extension

Added `footer` prop to the common Thread component:

**File:** `apps/web/src/modules/common/ai/thread/index.tsx`

```typescript
interface ThreadProps<MESSAGE extends UIMessage> {
  // ... existing props
  readonly footer?: React.ReactNode;
}
```

Footer renders after `lastResponseMessages` and before the error section.

### Translations

| Key | English | Spanish |
|-----|---------|---------|
| `pdf.followUp.moreDetail` | Tell me more about this | Cuéntame más sobre esto |
| `pdf.followUp.clarify` | Can you clarify that? | ¿Puedes aclarar eso? |
| `pdf.followUp.continue` | What else should I know? | ¿Qué más debería saber? |

### Visibility Logic

```typescript
const showFollowUp = useMemo(() => {
  if (status !== "ready") return false;
  if (messages.length === 0) return false;
  return messages.at(-1)?.role === Role.ASSISTANT;
}, [status, messages]);
```

---

## 4. Text Selection → Ask

### Purpose
When users select text in the PDF viewer, show a floating "Ask about this" button that sends the selected text to the chat.

### Implementation

**File:** `apps/web/src/modules/pdf/components/text-selection-action.tsx`

```typescript
export function TextSelectionAction({ onAskAbout, disabled }) {
  const { selectedText, setSelectedText } = usePdfViewer();
  const [position, setPosition] = useState<SelectionPosition | null>(null);

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
          setSelectedText(text);
        }
      } else {
        setPosition(null);
        setSelectedText(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [setSelectedText]);

  // Render floating button at selection position
  return position && selectedText ? (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-full animate-in fade-in-0"
      style={{ left: position.x, top: position.y }}
    >
      <Button onClick={() => onAskAbout(selectedText)}>
        <Icons.MessagesSquare /> Ask about this
      </Button>
    </div>
  ) : null;
}
```

### Context Extension

**File:** `apps/web/src/modules/pdf/context/pdf-viewer-context.tsx`

Added to context interface:
```typescript
interface PdfViewerContextValue {
  // ... existing props
  selectedText: string | null;
  setSelectedText: (text: string | null) => void;
}
```

### Message Formatting

When the button is clicked, the selected text is formatted into a question:

```typescript
const handleAskAboutSelection = useCallback(
  (selectedText: string) => {
    const question = `Regarding this text from the document: "${selectedText}"\n\nCan you explain what this means?`;
    void sendMessage({ text: question });
  },
  [sendMessage]
);
```

### Translations

| Key | English | Spanish |
|-----|---------|---------|
| `pdf.selection.askAbout` | Ask about this | Preguntar sobre esto |

---

## File Summary

### Created Files

| File | Purpose |
|------|---------|
| `thread/copy-with-citations.tsx` | Smart copy button with citation formatting |
| `thread/suggested-questions.tsx` | Starter questions for empty state |
| `thread/follow-up-suggestions.tsx` | Follow-up buttons after responses |
| `components/text-selection-action.tsx` | Floating action for text selection |

### Modified Files

| File | Changes |
|------|---------|
| `thread/index.tsx` | Integrated all 4 features, added callbacks |
| `thread/assistant.tsx` | Replaced copy button with CopyWithCitations |
| `context/pdf-viewer-context.tsx` | Added selectedText state |
| `common/ai/thread/index.tsx` | Added footer prop |
| `translations/en/ai.json` | Added all new translation keys |
| `translations/es/ai.json` | Added Spanish translations |

---

## Architecture Notes

### Shared Chat State

The `useComposer` hook uses a singleton Map pattern to share chat state:

```typescript
const chats = new Map<string, Chat<PdfMessage>>();

const getChatInstance = ({ id, ...options }) => {
  if (!id || !chats.has(id)) {
    const chat = new Chat<PdfMessage>({ id, ...options });
    chats.set(id ?? chat.id, chat);
  }
  return chats.get(id ?? "");
};
```

This allows multiple components (Chat, ChatComposer, TextSelectionAction) to share the same `sendMessage` function when using the same `id`.

### Context Hierarchy

```
PdfViewerProvider (layout.tsx)
├── PdfPreview
│   ├── TextLayer (text is selectable here)
│   └── TextHighlightLayer
└── Chat (thread/index.tsx)
    ├── TextSelectionAction (listens to global selection)
    ├── SuggestedQuestions (empty state)
    ├── Thread
    │   └── FollowUpSuggestions (footer)
    └── ChatComposer (separate component, shared state)
```

---

## Testing Checklist

- [ ] Copy AI response with citations → Verify `[p.X]` format
- [ ] Open empty PDF chat → Verify 4 suggested questions appear
- [ ] Click suggested question → Verify it sends as message
- [ ] Wait for AI response → Verify 3 follow-up buttons appear
- [ ] Click follow-up → Verify it sends as message
- [ ] Select text in PDF → Verify floating button appears
- [ ] Click "Ask about this" → Verify message sent with selected text
- [ ] Switch to Spanish locale → Verify all translations work
