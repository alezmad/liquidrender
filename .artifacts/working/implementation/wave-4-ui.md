# Wave 4: UI [PARALLEL]

**Duration:** 3 days
**LOC:** ~400
**Files:** 4
**Mode:** PARALLEL (2 groups can execute simultaneously)

---

## Entry Criteria

- ✅ Wave 3 complete (pipeline + HOME page working)
- ✅ Thread API exists (`packages/api/src/modules/knosia/thread/`)
- ✅ Semantic layer generation working
- ✅ Query engine functional

---

## Overview

Wave 4 builds the Thread interface (conversational query UI) and connects it to the existing thread backend.

**Why Parallel:** Two independent UI components:
- Group A: Thread interface (pages + components)
- Group B: Query execution hooks (API integration)

---

## Parallel Execution Groups

### Group A: Thread Interface Components

**Agent Assignment:** Agent-A
**Files:** 3
**LOC:** ~300
**Dependencies:** Thread API (already exists)

#### Task A1: Thread Page

**File:** `apps/web/src/app/[locale]/dashboard/[organization]/knosia/thread/page.tsx`

**Implementation:**
```typescript
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { ThreadView } from "~/modules/knosia/thread";

export default async function KnosiaThreadPage({
  params,
}: {
  params: { organization: string };
}) {
  const { user } = await getSession();
  if (!user) return redirect(pathsConfig.auth.login);

  return <ThreadView organizationId={params.organization} user={user} />;
}
```

**LOC:** ~20
**Issues:** UI-004

#### Task A2: Thread View Component

**File:** `apps/web/src/modules/knosia/thread/components/thread-view.tsx`

**Implementation:**
```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";
import { MessageList } from "./message-list";
import { QueryInput } from "./query-input";
import { ResultDisplay } from "./result-display";
import { Button } from "@turbostarter/ui-web/button";

export function ThreadView({ organizationId, user }) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // Fetch threads
  const { data: threads } = useQuery({
    queryKey: ["knosia", "threads", organizationId],
    queryFn: handle(api.knosia.thread.$get, {
      query: { organizationId },
    }),
  });

  // Fetch current thread messages
  const { data: messages, refetch } = useQuery({
    queryKey: ["knosia", "thread", currentThreadId, "messages"],
    queryFn: handle(api.knosia.thread[":id"].messages.$get, {
      param: { id: currentThreadId! },
    }),
    enabled: !!currentThreadId,
  });

  // Send query mutation
  const sendQuery = useMutation({
    mutationFn: async (query: string) => {
      if (!currentThreadId) {
        // Create new thread
        const thread = await handle(api.knosia.thread.$post, {
          json: { organizationId, title: query.slice(0, 50) },
        })();
        setCurrentThreadId(thread.id);
        return thread.id;
      }
      return currentThreadId;
    },
    onSuccess: async (threadId) => {
      await refetch();
    },
  });

  return (
    <div className="flex h-full">
      {/* Sidebar: Thread list */}
      <div className="w-64 border-r p-4">
        <Button onClick={() => setCurrentThreadId(null)} className="w-full mb-4">
          New Thread
        </Button>
        {threads?.map((thread) => (
          <div
            key={thread.id}
            onClick={() => setCurrentThreadId(thread.id)}
            className="cursor-pointer p-2 hover:bg-accent rounded"
          >
            {thread.title}
          </div>
        ))}
      </div>

      {/* Main: Messages + Input */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {currentThreadId && messages ? (
            <MessageList messages={messages} />
          ) : (
            <div className="text-center text-muted-foreground">
              Start a new conversation
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <QueryInput onSubmit={(query) => sendQuery.mutate(query)} />
        </div>
      </div>
    </div>
  );
}
```

**LOC:** ~120
**Issues:** UI-005, THREAD-001

#### Task A3: Supporting Components

**Files:**
- `apps/web/src/modules/knosia/thread/components/message-list.tsx`
- `apps/web/src/modules/knosia/thread/components/query-input.tsx`
- `apps/web/src/modules/knosia/thread/components/result-display.tsx`

**message-list.tsx:**
```typescript
import { Avatar } from "@turbostarter/ui-web/avatar";
import { ResultDisplay } from "./result-display";

export function MessageList({ messages }) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div key={message.id} className="flex gap-4">
          <Avatar>
            {message.role === "user" ? "U" : "K"}
          </Avatar>
          <div className="flex-1">
            <div className="font-medium mb-1">
              {message.role === "user" ? "You" : "Knosia"}
            </div>
            {message.role === "assistant" && message.result ? (
              <ResultDisplay result={message.result} />
            ) : (
              <div>{message.content}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**query-input.tsx:**
```typescript
import { useState } from "react";
import { Textarea } from "@turbostarter/ui-web/textarea";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

export function QueryInput({ onSubmit }) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query);
      setQuery("");
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question about your data..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button onClick={handleSubmit} disabled={!query.trim()}>
        <Icons.Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**result-display.tsx:**
```typescript
import { LiquidUI } from "@repo/liquid-render";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";

export function ResultDisplay({ result }) {
  if (!result.data) {
    return <div className="text-muted-foreground">No data</div>;
  }

  return (
    <div className="space-y-4">
      {/* LiquidUI rendering */}
      {result.liquidSchema && (
        <LiquidUI schema={result.liquidSchema} data={result.data} />
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">
          {result.confidence}% confidence
        </Badge>
        <span>Sources: {result.sources?.join(", ")}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          📌 Pin to Canvas
        </Button>
        <Button variant="outline" size="sm">
          🔄 Refresh
        </Button>
        <Button variant="outline" size="sm">
          📤 Export
        </Button>
      </div>

      {/* Suggested follow-ups */}
      {result.suggestedQuestions && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Suggested follow-ups:</div>
          <div className="flex flex-wrap gap-2">
            {result.suggestedQuestions.map((q, i) => (
              <Button key={i} variant="outline" size="sm">
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**LOC:** ~160 (combined)
**Issues:** UI-006, UI-007, UI-008

---

### Group B: Query Execution Hook

**Agent Assignment:** Agent-B
**File:** 1
**LOC:** ~100
**Dependencies:** Thread API + Query engine

#### Task B1: Thread Query Hook

**File:** `apps/web/src/modules/knosia/thread/hooks/use-thread-query.ts`

**Purpose:** Execute queries and return results with LiquidSchema.

**Implementation:**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

export function useThreadQuery(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (query: string) => {
      // Send query to thread API
      const response = await handle(api.knosia.thread[":id"].query.$post, {
        param: { id: threadId },
        json: { query },
      })();

      return response;
    },
    onSuccess: () => {
      // Invalidate thread messages to refetch
      queryClient.invalidateQueries({
        queryKey: ["knosia", "thread", threadId, "messages"],
      });
    },
  });
}
```

**LOC:** ~40
**Issues:** HOOK-001, THREAD-002

#### Task B2: Thread API Enhancement (Backend)

**File:** `packages/api/src/modules/knosia/thread/mutations.ts` (modify)

**Purpose:** Execute query using semantic layer and return LiquidSchema + data.

**Modifications:**
```typescript
import { generateSemanticLayer } from "@repo/liquid-connect/semantic";
import { resolveVocabulary } from "../vocabulary/resolution";
import { nlQuery } from "@repo/liquid-connect/query";
import { parseToAST } from "@repo/liquid-connect/compiler";
import { resolve } from "@repo/liquid-connect/resolver";
import { emit } from "@repo/liquid-connect/emitters";
import { executeQuery } from "@repo/liquid-connect/executor";

export async function executeThreadQuery(
  threadId: string,
  query: string,
  userId: string,
  workspaceId: string
) {
  // 1. Get user's resolved vocabulary
  const resolved = await resolveVocabulary(userId, workspaceId);

  // 2. Get schema (from latest analysis)
  const schema = await getLatestSchema(workspaceId);

  // 3. Generate semantic layer
  const semanticLayer = generateSemanticLayer(resolved, schema);

  // 4. NL → LC DSL
  const lcQuery = nlQuery(query, semanticLayer);

  // 5. Parse → AST
  const ast = parseToAST(lcQuery.query);

  // 6. Resolve → LiquidFlow
  const flow = resolve(ast, semanticLayer);

  // 7. Emit → SQL
  const sql = emit(flow, "postgres");

  // 8. Execute
  const result = await executeQuery(sql, adapter);

  // 9. Generate LiquidSchema for visualization
  const liquidSchema = generateChartSchema(
    "line",  // Or detect from query intent
    "rows",
    result.metadata.xField,
    result.metadata.yField
  );

  // 10. Save message to thread
  await db.insert(knosiaThreadMessage).values({
    id: generateId(),
    threadId,
    role: "assistant",
    content: query,
    result: {
      data: result.rows,
      liquidSchema,
      confidence: result.provenance.confidence,
      sources: result.provenance.sources,
      suggestedQuestions: generateFollowUps(query, result),
    },
  });

  return {
    data: result.rows,
    liquidSchema,
    confidence: result.provenance.confidence,
    sources: result.provenance.sources,
    suggestedQuestions: generateFollowUps(query, result),
  };
}
```

**LOC:** ~60
**Issues:** THREAD-003, QUERY-001

---

## Module Integration

Update module exports:

**File:** `apps/web/src/modules/knosia/thread/index.ts`
```typescript
export * from './components/thread-view';
export * from './hooks/use-thread-query';
```

---

## Testing

### Manual Testing Checklist

1. ✅ Create new thread
2. ✅ Send query: "What's our MRR?"
3. ✅ View result with chart
4. ✅ Click suggested follow-up
5. ✅ Pin result to Canvas
6. ✅ View thread history

---

## Exit Criteria

- ✅ All 4 files created
- ✅ Thread interface loads without errors:
  ```bash
  # Navigate to /dashboard/[org]/knosia/thread
  ```
- ✅ Query execution works:
  ```typescript
  // Send query "Show me revenue"
  // Should return chart + data
  ```
- ✅ Follow-up suggestions appear
- ✅ Pin to Canvas works
- ✅ Git commit:
  ```bash
  git add apps/web/src/modules/knosia/thread/
  git add apps/web/src/app/[locale]/dashboard/[organization]/knosia/thread/
  git add packages/api/src/modules/knosia/thread/mutations.ts
  git commit -m "feat(knosia): wave-4 - thread interface

  Wave 4: UI (2 parallel groups)
  Group A: Thread interface components
  - Thread page with sidebar
  - Message list with result display
  - Query input with keyboard shortcuts
  - Suggested follow-ups

  Group B: Query execution
  - Thread query hook
  - Backend query execution with semantic layer
  - LiquidSchema generation for results

  Closes: #UI-004 #UI-005 #UI-006 #UI-007 #UI-008
  Closes: #HOOK-001 #THREAD-001 #THREAD-002 #THREAD-003
  Closes: #QUERY-001"
  ```

---

## Next Wave

After Wave 4 completes, proceed to **Wave 5: Polish** which adds:
- Error handling
- Loading states
- Responsive CSS
- E2E tests

---

*Wave 4 complete. Thread interface live.*
