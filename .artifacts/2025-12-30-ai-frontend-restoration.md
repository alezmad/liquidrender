# AI Frontend Restoration Plan

## Summary

The AI demo frontend from `turbostarter-ai` can be restored. The backend is fully implemented:
- `/api/ai/chat/chats` - Chat streaming endpoint
- `/api/ai/credits` - Credits balance endpoint
- All dependencies installed (`@ai-sdk/react`, `marked`)
- i18n keys already exist in `marketing.json`

## Issue: Original Code Used Wrong API URL

The deleted code had:
```typescript
// WRONG - this path doesn't exist
api.ai.chat.$url()  // Would be /api/ai/chat
```

The actual API structure is:
```
/api/ai/chat/chats  ← POST for chat messages
/api/ai/credits     ← GET for credits
```

---

## Files to Create

### 1. AI Demo Component

**File:** `apps/web/src/modules/marketing/ai/ai-demo.tsx`

```tsx
"use client";

import { useId, useRef } from "react";

import { useChat, DefaultChatTransport } from "@ai-sdk/react";
import { marked } from "marked";

import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import { useTranslations } from "~/lib/i18n/client";

const PROMPTS = ["history", "capitals", "quantum", "realWorld"] as const;

export const AiDemo = () => {
  const id = useId();
  const t = useTranslations("marketing.ai");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    id,
    transport: new DefaultChatTransport({
      // CORRECT API URL
      api: "/api/ai/chat/chats",
    }),
    onFinish: () => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = (prompt: string) => {
    sendMessage({
      parts: [{ type: "text", text: prompt }],
      metadata: {
        options: {
          model: "gpt-4o",
          search: false,
          reason: false,
        },
      },
    });
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt buttons */}
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((key) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => handleSend(t(`prompt.${key}`))}
          >
            {t(`prompt.${key}`)}
          </Button>
        ))}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="bg-muted/50 h-[400px] overflow-y-auto rounded-lg border p-4"
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            {t("placeholder")}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <div
                        key={i}
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(part.text, { async: false }),
                        }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background flex items-center gap-2 rounded-lg border px-4 py-2">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset button */}
      {messages.length > 0 && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <Icons.RotateCcw className="mr-2 h-4 w-4" />
          Clear chat
        </Button>
      )}
    </div>
  );
};
```

### 2. AI Page

**File:** `apps/web/src/app/[locale]/(marketing)/ai/page.tsx`

```tsx
import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { getTranslations } from "~/lib/i18n/server";
import { AiDemo } from "~/modules/marketing/ai/ai-demo";

export async function generateMetadata() {
  const t = await getTranslations("marketing.ai");
  return {
    title: "AI Assistant",
    description: t("description"),
  };
}

export default async function AiPage() {
  const { user } = await getSession();

  // AI requires authentication (credits system)
  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  const t = await getTranslations("marketing.ai");

  return (
    <main className="container mx-auto max-w-4xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>
      <AiDemo />
    </main>
  );
}
```

### 3. Module Index (barrel export)

**File:** `apps/web/src/modules/marketing/ai/index.ts`

```typescript
export { AiDemo } from "./ai-demo";
```

---

## i18n Keys (Already Present)

The `marketing.json` already has the required keys at lines 195-205:

```json
"ai": {
  "description": "Unlock productivity and innovation...",
  "prompt": {
    "history": "Tell the history of the internet",
    "capitals": "Quiz me on the world capitals",
    "quantum": "Explain quantum computing",
    "realWorld": "Describe a real-world AI case"
  },
  "placeholder": "Ask a question...",
  "cta": "Submit"
}
```

---

## API Architecture

```
apps/web                     packages/api
─────────────────────────    ───────────────────────────────────

/app/[locale]/(marketing)/   /api/ai/chat/chats (POST)
     ai/page.tsx             ├── enforceAuth middleware
        │                    ├── rateLimiter middleware
        └──────────────────→ ├── validate(chatMessageSchema)
    AiDemo component         ├── deductCredits
        │                    └── streamChat()
        │                         │
        │                    @turbostarter/ai
        │                    ├── chat/api.ts → streamChat()
        │                    └── chat/schema.ts → validation
        │
    @ai-sdk/react
    useChat + DefaultChatTransport
```

---

## Implementation Steps

1. Create the directory:
   ```bash
   mkdir -p apps/web/src/modules/marketing/ai
   ```

2. Create the three files above

3. Test the page:
   ```bash
   pnpm dev
   # Navigate to http://localhost:3000/ai
   ```

## Notes

- The AI endpoint requires authentication (credits are deducted per request)
- Model defaults to `gpt-4o` but can be changed via the `metadata.options.model` field
- The chat uses streaming responses via `DefaultChatTransport`
- Messages persist in the database via the `chatId` parameter

## Optional Enhancements

1. **Add model selector** - Let users pick from available models in `Model` enum
2. **Show credits balance** - Fetch `/api/ai/credits` and display remaining credits
3. **Add file upload** - The schema supports `type: "file"` parts
4. **Enable web search** - Set `options.search: true` for web-grounded responses
