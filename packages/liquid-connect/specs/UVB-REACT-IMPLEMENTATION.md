# UVB React UI - Implementation Context

**Purpose:** Complete context for implementing the VocabularyWizard React UI.
**Status:** Ready for implementation
**Date:** 2025-12-28

---

## Quick Start

```bash
# Files to create
apps/web/src/modules/vocabulary/
├── components/
│   ├── vocabulary-wizard.tsx          # Main 4-step wizard
│   ├── steps/
│   │   ├── connect-step.tsx           # DB connection form
│   │   ├── review-step.tsx            # Review detected items
│   │   ├── confirm-step.tsx           # Answer 5-10 questions
│   │   └── save-step.tsx              # Save & download
│   ├── entity-table.tsx               # DataTable for entities
│   ├── metric-table.tsx               # DataTable for metrics
│   └── confirmation-card.tsx          # Single question card
├── hooks/
│   └── use-extract-vocabulary.ts      # useMutation for extraction
├── api.ts                             # API client functions
└── types.ts                           # Frontend types (re-export from backend)

packages/api/src/modules/vocabulary/
├── router.ts                          # Hono routes
├── service.ts                         # Business logic
└── schema.ts                          # Zod schemas

apps/web/src/app/[locale]/dashboard/(user)/vocabulary/
└── new/page.tsx                       # Wizard page
```

---

## 1. Backend Already Done

All UVB logic exists in `@repo/liquid-connect`:

```typescript
// packages/liquid-connect/src/uvb/
import {
  // Types
  VocabularyDraft,
  DetectedVocabulary,
  Confirmation,
  ConfirmationAnswers,
  ExtractedSchema,

  // Functions
  createPostgresAdapter,
  extractSchema,
  applyHardRules,
  generateConfirmations,
} from '@repo/liquid-connect/uvb'
```

**7 Hard Rules (automatic):**
1. Entity detection → tables with PKs
2. Junction detection → composite PK of FKs only
3. Relationship detection → FK constraints
4. Metric detection → numeric columns + patterns
5. Dimension detection → short varchar + patterns
6. Time field detection → date/timestamp types
7. Filter detection → boolean + flag patterns

---

## 2. API Routes to Create

### Location
`packages/api/src/modules/vocabulary/router.ts`

### Routes

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createPostgresAdapter,
  extractSchema,
  applyHardRules,
} from "@repo/liquid-connect/uvb";

const extractInputSchema = z.object({
  connectionString: z.string().min(10),
  dbType: z.enum(["postgres", "mysql", "sqlite", "duckdb"]),
  options: z.object({
    schema: z.string().optional(),
    excludeTables: z.array(z.string()).optional(),
  }).optional(),
});

const saveInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  draft: z.any(), // VocabularyDraft
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export const vocabularyRouter = new Hono()
  .post("/extract", zValidator("json", extractInputSchema), async (c) => {
    const { connectionString, dbType, options } = c.req.valid("json");

    if (dbType !== "postgres") {
      return c.json({ error: "Only PostgreSQL supported currently" }, 400);
    }

    try {
      const adapter = createPostgresAdapter(connectionString);
      const schema = await extractSchema(adapter, options);
      const result = applyHardRules(schema);

      return c.json({
        schema: {
          database: schema.database,
          type: dbType,
          tables: schema.tables.length,
          extractedAt: schema.extractedAt,
        },
        detected: result.detected,
        confirmations: result.confirmations,
        stats: result.stats,
      });
    } catch (error) {
      return c.json({
        error: error instanceof Error ? error.message : "Extraction failed"
      }, 500);
    }
  })

  .post("/save", zValidator("json", saveInputSchema), async (c) => {
    const { name, description, draft, answers } = c.req.valid("json");

    // TODO: Build SemanticLayer from draft + answers
    // TODO: Save to database (vocabulary table)

    const id = `vocab_${Date.now()}`;

    return c.json({
      id,
      name,
      downloadUrl: `/api/vocabulary/${id}/download`,
    });
  })

  .get("/:id/download", async (c) => {
    const id = c.req.param("id");
    // TODO: Load from DB, convert to YAML
    return c.json({ error: "Not implemented" }, 501);
  });
```

### Register in Main Router

```typescript
// packages/api/src/index.ts
import { vocabularyRouter } from "./modules/vocabulary/router";

const appRouter = new Hono()
  // ... existing routes
  .route("/vocabulary", vocabularyRouter);
```

---

## 3. UI Components

### Pattern: Follow TurboStarter Conventions

```typescript
// Imports pattern
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// UI imports
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@turbostarter/ui-web/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@turbostarter/ui-web/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@turbostarter/ui-web/tabs";
import { Icons } from "@turbostarter/ui-web/icons";

// Local imports
import { SettingsCard, SettingsCardHeader, SettingsCardTitle, SettingsCardDescription, SettingsCardContent, SettingsCardFooter } from "~/modules/common/layout/dashboard/settings-card";
```

### VocabularyWizard (Main Container)

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@turbostarter/ui-web/tabs";
import { Card } from "@turbostarter/ui-web/card";
import { ConnectStep } from "./steps/connect-step";
import { ReviewStep } from "./steps/review-step";
import { ConfirmStep } from "./steps/confirm-step";
import { SaveStep } from "./steps/save-step";
import type { VocabularyDraft, ConfirmationAnswers } from "@repo/liquid-connect/uvb";

type Step = "connect" | "review" | "confirm" | "save";

export function VocabularyWizard() {
  const [step, setStep] = useState<Step>("connect");
  const [draft, setDraft] = useState<VocabularyDraft | null>(null);
  const [answers, setAnswers] = useState<ConfirmationAnswers>({});

  const canProceed = {
    connect: !!draft,
    review: !!draft,
    confirm: draft?.confirmations.every(c => answers[c.id]) ?? false,
    save: true,
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connect">1. Connect</TabsTrigger>
          <TabsTrigger value="review" disabled={!canProceed.connect}>
            2. Review
          </TabsTrigger>
          <TabsTrigger value="confirm" disabled={!canProceed.review}>
            3. Confirm
          </TabsTrigger>
          <TabsTrigger value="save" disabled={!canProceed.confirm}>
            4. Save
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connect">
          <ConnectStep
            onComplete={(d) => {
              setDraft(d);
              setStep("review");
            }}
          />
        </TabsContent>

        <TabsContent value="review">
          {draft && (
            <ReviewStep
              draft={draft}
              onEdit={setDraft}
              onNext={() => setStep("confirm")}
            />
          )}
        </TabsContent>

        <TabsContent value="confirm">
          {draft && (
            <ConfirmStep
              confirmations={draft.confirmations}
              answers={answers}
              onAnswer={(id, value) =>
                setAnswers((prev) => ({ ...prev, [id]: value }))
              }
              onNext={() => setStep("save")}
            />
          )}
        </TabsContent>

        <TabsContent value="save">
          {draft && <SaveStep draft={draft} answers={answers} />}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
```

### ConnectStep

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@turbostarter/ui-web/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Icons } from "@turbostarter/ui-web/icons";
import { extractVocabulary } from "../api";
import type { VocabularyDraft } from "@repo/liquid-connect/uvb";

const schema = z.object({
  connectionString: z.string().min(10, "Enter a valid connection string"),
  dbType: z.enum(["postgres", "mysql", "sqlite", "duckdb"]),
});

type FormData = z.infer<typeof schema>;

interface ConnectStepProps {
  onComplete: (draft: VocabularyDraft) => void;
}

export function ConnectStep({ onComplete }: ConnectStepProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      connectionString: "",
      dbType: "postgres",
    },
  });

  const extract = useMutation({
    mutationFn: extractVocabulary,
    onSuccess: (data) => {
      toast.success(`Extracted ${data.stats.entities} entities, ${data.stats.metrics} metrics`);
      onComplete(data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => extract.mutate(data))}
        className="space-y-6 p-6"
      >
        <FormField
          control={form.control}
          name="dbType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql" disabled>MySQL (coming soon)</SelectItem>
                  <SelectItem value="sqlite" disabled>SQLite (coming soon)</SelectItem>
                  <SelectItem value="duckdb" disabled>DuckDB (coming soon)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="connectionString"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection String</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="postgresql://user:password@host:5432/database"
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={extract.isPending} className="w-full">
          {extract.isPending ? (
            <>
              <Icons.Loader2 className="mr-2 size-4 animate-spin" />
              Extracting schema...
            </>
          ) : (
            "Connect & Extract"
          )}
        </Button>
      </form>
    </Form>
  );
}
```

### ConfirmStep (Using SettingsCard Pattern)

```tsx
"use client";

import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { RadioGroup, RadioGroupItem } from "@turbostarter/ui-web/radio-group";
import { Label } from "@turbostarter/ui-web/label";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardContent,
} from "~/modules/common/layout/dashboard/settings-card";
import type { Confirmation, ConfirmationAnswers } from "@repo/liquid-connect/uvb";

interface ConfirmStepProps {
  confirmations: Confirmation[];
  answers: ConfirmationAnswers;
  onAnswer: (id: string, value: string) => void;
  onNext: () => void;
}

export function ConfirmStep({
  confirmations,
  answers,
  onAnswer,
  onNext,
}: ConfirmStepProps) {
  const allAnswered = confirmations.every((c) => answers[c.id]);

  return (
    <div className="space-y-4 p-6">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold">Quick Questions</h3>
        <p className="text-muted-foreground text-sm">
          Answer {confirmations.length} questions to finalize your vocabulary
        </p>
      </div>

      {confirmations.map((confirmation, index) => (
        <SettingsCard key={confirmation.id}>
          <SettingsCardHeader>
            <SettingsCardTitle>
              {index + 1}. {confirmation.question}
            </SettingsCardTitle>
            {confirmation.context && (
              <SettingsCardDescription>
                {confirmation.context}
              </SettingsCardDescription>
            )}
          </SettingsCardHeader>
          <SettingsCardContent>
            {confirmation.type === "select_one" && (
              <RadioGroup
                value={(answers[confirmation.id] as string) ?? ""}
                onValueChange={(value) => onAnswer(confirmation.id, value)}
              >
                {confirmation.options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`${confirmation.id}-${option.value}`}
                    />
                    <Label htmlFor={`${confirmation.id}-${option.value}`}>
                      {option.label}
                      {option.recommended && (
                        <span className="text-primary ml-2 text-xs">
                          (Recommended)
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {confirmation.type === "rename" && (
              <Input
                value={
                  (answers[confirmation.id] as string) ??
                  confirmation.suggestion ??
                  ""
                }
                onChange={(e) => onAnswer(confirmation.id, e.target.value)}
                placeholder={confirmation.suggestion}
              />
            )}

            {confirmation.type === "classify" && (
              <RadioGroup
                value={(answers[confirmation.id] as string) ?? ""}
                onValueChange={(value) => onAnswer(confirmation.id, value)}
              >
                {confirmation.options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`${confirmation.id}-${option.value}`}
                    />
                    <Label htmlFor={`${confirmation.id}-${option.value}`}>
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </SettingsCardContent>
        </SettingsCard>
      ))}

      <Button onClick={onNext} disabled={!allAnswered} className="w-full">
        Continue to Save
      </Button>
    </div>
  );
}
```

---

## 4. API Client

```typescript
// apps/web/src/modules/vocabulary/api.ts
import { api } from "~/lib/api/client";
import type { VocabularyDraft } from "@repo/liquid-connect/uvb";

export interface ExtractInput {
  connectionString: string;
  dbType: "postgres" | "mysql" | "sqlite" | "duckdb";
  options?: {
    schema?: string;
    excludeTables?: string[];
  };
}

export interface ExtractResult extends VocabularyDraft {
  stats: {
    tables: number;
    entities: number;
    junctionTables: number;
    metrics: number;
    dimensions: number;
    timeFields: number;
    filters: number;
    relationships: number;
  };
}

export async function extractVocabulary(input: ExtractInput): Promise<ExtractResult> {
  const response = await api.vocabulary.extract.$post({ json: input });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Extraction failed");
  }
  return response.json();
}

export async function saveVocabulary(input: {
  name: string;
  description?: string;
  draft: VocabularyDraft;
  answers: Record<string, string | string[]>;
}) {
  const response = await api.vocabulary.save.$post({ json: input });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Save failed");
  }
  return response.json();
}
```

---

## 5. Page Route

```tsx
// apps/web/src/app/[locale]/dashboard/(user)/vocabulary/new/page.tsx
import { getMetadata } from "~/lib/metadata";
import {
  DashboardHeader,
  DashboardHeaderTitle,
  DashboardHeaderDescription,
} from "~/modules/common/layout/dashboard/header";
import { VocabularyWizard } from "~/modules/vocabulary/components/vocabulary-wizard";

export const generateMetadata = getMetadata({
  title: "New Vocabulary",
  description: "Generate vocabulary from your database",
});

export default function NewVocabularyPage() {
  return (
    <>
      <DashboardHeader>
        <div>
          <DashboardHeaderTitle>New Vocabulary</DashboardHeaderTitle>
          <DashboardHeaderDescription>
            Connect your database and generate a semantic vocabulary in 60 seconds
          </DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <VocabularyWizard />
    </>
  );
}
```

---

## 6. Implementation Order

### Phase 1: API Routes (Backend)
1. [ ] Create `packages/api/src/modules/vocabulary/router.ts`
2. [ ] Create `packages/api/src/modules/vocabulary/schema.ts` (Zod schemas)
3. [ ] Register in `packages/api/src/index.ts`
4. [ ] Test with curl/Postman

### Phase 2: React Components (Frontend)
1. [ ] Create `apps/web/src/modules/vocabulary/types.ts`
2. [ ] Create `apps/web/src/modules/vocabulary/api.ts`
3. [ ] Create `ConnectStep` component
4. [ ] Create `VocabularyWizard` container
5. [ ] Create page route
6. [ ] Test connection flow

### Phase 3: Review & Confirm Steps
1. [ ] Create `ReviewStep` with DataTables
2. [ ] Create `ConfirmStep` with SettingsCards
3. [ ] Create `SaveStep` with download

### Phase 4: Polish
1. [ ] Add sidebar link
2. [ ] Add translations
3. [ ] Error handling improvements
4. [ ] Loading states

---

## 7. Key Patterns to Follow

### Forms
```tsx
// Always use react-hook-form + zod
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});

// Wrap in Form provider
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="field" render={...} />
  </form>
</Form>
```

### Mutations
```tsx
// Always use @tanstack/react-query
const mutation = useMutation({
  mutationFn: apiFunction,
  onSuccess: () => toast.success("..."),
  onError: (error) => toast.error(error.message),
});
```

### Loading States
```tsx
<Button disabled={mutation.isPending}>
  {mutation.isPending ? (
    <>
      <Icons.Loader2 className="mr-2 size-4 animate-spin" />
      Loading...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

### SettingsCard for Questions
```tsx
<SettingsCard>
  <SettingsCardHeader>
    <SettingsCardTitle>Question</SettingsCardTitle>
    <SettingsCardDescription>Context</SettingsCardDescription>
  </SettingsCardHeader>
  <SettingsCardContent>
    {/* Input or RadioGroup */}
  </SettingsCardContent>
</SettingsCard>
```

---

## 8. Success Criteria

```
Open browser to /dashboard/vocabulary/new

1. Enter: postgresql://postgres:dbpass@127.0.0.1:5432/mydb
2. Click "Connect & Extract" (~5 seconds)
3. See: "50 entities, 120 metrics, 80 dimensions detected"
4. Review tables, toggle items on/off
5. Answer 5 questions (30 seconds)
6. Click "Save"
7. Download vocabulary.yaml

Total time: ~60 seconds
```

---

## References

| Document | Purpose |
|----------|---------|
| `specs/UNIVERSAL-VOCABULARY-BUILDER.md` | Algorithm & rules knowledge |
| `specs/UVB-INTEGRATION-DESIGN.md` | Original integration design |
| `src/uvb/` | Backend implementation |
| `.context/turbostarter-framework-context/framework.md` | TurboStarter patterns |
