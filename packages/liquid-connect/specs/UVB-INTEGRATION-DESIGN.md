# Universal Vocabulary Builder - Integration Design

**Date:** 2025-12-28
**Status:** Design Complete
**Location:** `@repo/liquid-connect` + `apps/web`

---

## TL;DR

Build a wizard UI that generates `SemanticLayer` from any database connection in 60 seconds.

```
User enters connection string → Schema extracted → Hard rules applied → User confirms 5 questions → vocabulary.yaml ready
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPS/WEB (Next.js)                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  VocabularyWizard Component                                          │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │ Step 1   │→ │ Step 2   │→ │ Step 3   │→ │ Step 4   │             │   │
│  │  │ Connect  │  │ Review   │  │ Confirm  │  │ Save     │             │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │   │
│  │                                                                      │   │
│  │  Uses: Tabs, Modal, Form, SettingsCard, DataTable                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Routes (Hono)                                                   │   │
│  │                                                                      │   │
│  │  POST /api/vocabulary/extract   → Extract schema + apply rules      │   │
│  │  POST /api/vocabulary/validate  → Validate final layer              │   │
│  │  POST /api/vocabulary/save      → Persist to database               │   │
│  │  GET  /api/vocabulary/:id       → Load existing vocabulary          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PACKAGES/LIQUID-CONNECT                                │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ uvb/            │  │ semantic/       │  │ compiler/       │             │
│  │                 │  │                 │  │                 │             │
│  │ extractor.ts    │  │ types.ts    ✓   │  │ (existing)      │             │
│  │ rules.ts        │  │ loader.ts   ✓   │  │                 │             │
│  │ connector.ts    │  │ registry.ts ✓   │  │                 │             │
│  │ models.ts       │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│         NEW                EXISTING              EXISTING                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Backend (liquid-connect package)

```
packages/liquid-connect/src/
├── uvb/                          # NEW - Universal Vocabulary Builder
│   ├── index.ts                  # Public exports
│   ├── models.ts                 # VocabularyDraft, Confirmation types
│   ├── connector.ts              # Database connection factory
│   ├── extractor.ts              # Schema extraction (info_schema)
│   ├── rules.ts                  # Hard rules engine (7 rules)
│   └── adapters/                 # Database-specific adapters
│       ├── postgres.ts
│       ├── mysql.ts
│       ├── sqlite.ts
│       └── duckdb.ts
├── semantic/                     # EXISTING
│   ├── types.ts                  # SemanticLayer interface
│   ├── loader.ts                 # loadFromObject, validate
│   └── registry.ts               # createRegistry, autocomplete
└── index.ts                      # Add uvb exports
```

### API Routes

```
packages/api/src/modules/
├── vocabulary/                   # NEW
│   ├── router.ts                 # Hono routes
│   ├── service.ts                # Business logic
│   └── schema.ts                 # Zod schemas
└── index.ts                      # Register vocabulary router
```

### Frontend (apps/web)

```
apps/web/src/modules/
├── vocabulary/                   # NEW
│   ├── components/
│   │   ├── vocabulary-wizard.tsx         # Main wizard container
│   │   ├── steps/
│   │   │   ├── connect-step.tsx          # Database connection form
│   │   │   ├── review-step.tsx           # Review detected items
│   │   │   ├── confirm-step.tsx          # Answer 5 questions
│   │   │   └── save-step.tsx             # Save and download
│   │   ├── entity-table.tsx              # DataTable for entities
│   │   ├── metric-table.tsx              # DataTable for metrics
│   │   ├── dimension-table.tsx           # DataTable for dimensions
│   │   └── confirmation-card.tsx         # Single confirmation question
│   ├── hooks/
│   │   ├── use-extract-vocabulary.ts     # useMutation for extraction
│   │   └── use-vocabulary.ts             # useQuery for loading
│   ├── api.ts                            # API client
│   └── types.ts                          # Frontend types
└── pages/
    └── vocabulary/
        └── new/                          # New vocabulary wizard page
            └── page.tsx
```

---

## Data Flow

### Step 1: Connect

```typescript
// User input
{
  connectionString: "postgresql://user:pass@host:5432/mydb"
}

// API call
POST /api/vocabulary/extract
{
  connectionString: "postgresql://user:pass@host:5432/mydb",
  options: {
    schema: "public",
    excludeTables: ["_migrations", "_prisma_migrations"]
  }
}

// Response: VocabularyDraft
{
  schema: {
    tables: 50,
    extractedAt: "2025-12-28T20:00:00Z"
  },
  detected: {
    entities: [...],           // 45 entities
    metrics: [...],            // 120 metrics
    dimensions: [...],         // 80 dimensions
    timeFields: [...],         // 30 time fields
    filters: [...],            // 25 filters
    relationships: [...]       // 200 relationships
  },
  confirmations: [             // 5-10 questions
    {
      id: "primary_time_orders",
      type: "select_one",
      question: "Primary time field for 'orders'?",
      context: "Used for default date filtering",
      options: [
        { value: "order_date", label: "order_date", recommended: true },
        { value: "created_at", label: "created_at" },
        { value: "shipped_date", label: "shipped_date" }
      ],
      defaultValue: "order_date"
    },
    {
      id: "metric_name_importe_total",
      type: "rename",
      question: "Display name for '@importe_total'?",
      context: "Column: orders.importe_total (DECIMAL)",
      currentValue: "importe_total",
      suggestion: "Total Revenue"
    },
    // ... 3-8 more questions
  ]
}
```

### Step 2: Review

User sees tables with all detected items:
- Entities (checkboxes to include/exclude)
- Metrics (edit name, aggregation)
- Dimensions (edit name)
- Relationships (auto-detected, view-only)

### Step 3: Confirm

User answers 5-10 questions:
- Primary time fields (select from options)
- Metric display names (text input with suggestion)
- Ambiguous columns (is this a metric or dimension?)

### Step 4: Save

```typescript
// User submits final vocabulary
POST /api/vocabulary/save
{
  name: "ecommerce",
  description: "E-commerce database vocabulary",
  layer: { /* SemanticLayer object */ },
  organizationId: "org_123"
}

// Response
{
  id: "vocab_abc123",
  downloadUrl: "/api/vocabulary/vocab_abc123/download",
  previewUrl: "/api/vocabulary/vocab_abc123/preview"
}
```

---

## TypeScript Types

### VocabularyDraft (new)

```typescript
// packages/liquid-connect/src/uvb/models.ts

export interface VocabularyDraft {
  schema: SchemaInfo;
  detected: DetectedVocabulary;
  confirmations: Confirmation[];
}

export interface SchemaInfo {
  database: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'duckdb';
  tables: number;
  extractedAt: string;
}

export interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
}

export interface DetectedEntity {
  name: string;
  table: string;
  primaryKey: string | string[];
  columnCount: number;
  certainty: number;           // 0.0 - 1.0
  isJunction: boolean;
}

export interface DetectedMetric {
  name: string;
  table: string;
  column: string;
  dataType: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  certainty: number;
  suggestedDisplayName?: string;
}

export interface DetectedDimension {
  name: string;
  table: string;
  column: string;
  dataType: string;
  cardinality?: number;        // estimated distinct values
  certainty: number;
}

export interface DetectedTimeField {
  name: string;
  table: string;
  column: string;
  dataType: string;
  isPrimaryCandidate: boolean;
  certainty: number;
}

export interface DetectedFilter {
  name: string;
  table: string;
  column: string;
  dataType: string;
  certainty: number;
}

export interface DetectedRelationship {
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  via?: string;                // junction table if many-to-many
  certainty: number;
}

// Confirmation types
export type Confirmation =
  | SelectOneConfirmation
  | RenameConfirmation
  | ClassifyConfirmation;

export interface SelectOneConfirmation {
  id: string;
  type: 'select_one';
  question: string;
  context?: string;
  options: { value: string; label: string; recommended?: boolean }[];
  defaultValue?: string;
}

export interface RenameConfirmation {
  id: string;
  type: 'rename';
  question: string;
  context?: string;
  currentValue: string;
  suggestion?: string;
}

export interface ClassifyConfirmation {
  id: string;
  type: 'classify';
  question: string;
  context?: string;
  options: { value: 'metric' | 'dimension' | 'skip'; label: string }[];
}
```

### ConfirmationAnswers

```typescript
export interface ConfirmationAnswers {
  [confirmationId: string]: string | string[];
}
```

---

## UI Components

### VocabularyWizard (main container)

```tsx
// apps/web/src/modules/vocabulary/components/vocabulary-wizard.tsx

"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/web/tabs"
import { Card } from "@ui/web/card"
import { ConnectStep } from "./steps/connect-step"
import { ReviewStep } from "./steps/review-step"
import { ConfirmStep } from "./steps/confirm-step"
import { SaveStep } from "./steps/save-step"
import type { VocabularyDraft, ConfirmationAnswers } from "../types"

type Step = "connect" | "review" | "confirm" | "save"

export function VocabularyWizard() {
  const [step, setStep] = useState<Step>("connect")
  const [draft, setDraft] = useState<VocabularyDraft | null>(null)
  const [answers, setAnswers] = useState<ConfirmationAnswers>({})

  return (
    <Card className="max-w-4xl mx-auto">
      <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connect">1. Connect</TabsTrigger>
          <TabsTrigger value="review" disabled={!draft}>2. Review</TabsTrigger>
          <TabsTrigger value="confirm" disabled={!draft}>3. Confirm</TabsTrigger>
          <TabsTrigger value="save" disabled={!draft}>4. Save</TabsTrigger>
        </TabsList>

        <TabsContent value="connect">
          <ConnectStep
            onComplete={(draft) => {
              setDraft(draft)
              setStep("review")
            }}
          />
        </TabsContent>

        <TabsContent value="review">
          {draft && (
            <ReviewStep
              draft={draft}
              onEdit={(updated) => setDraft(updated)}
              onNext={() => setStep("confirm")}
            />
          )}
        </TabsContent>

        <TabsContent value="confirm">
          {draft && (
            <ConfirmStep
              confirmations={draft.confirmations}
              answers={answers}
              onAnswer={(id, value) => setAnswers(prev => ({ ...prev, [id]: value }))}
              onNext={() => setStep("save")}
            />
          )}
        </TabsContent>

        <TabsContent value="save">
          {draft && (
            <SaveStep
              draft={draft}
              answers={answers}
            />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}
```

### ConnectStep

```tsx
// apps/web/src/modules/vocabulary/components/steps/connect-step.tsx

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@ui/web/form"
import { Input } from "@ui/web/input"
import { Button } from "@ui/web/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@ui/web/select"
import { Loader2 } from "lucide-react"
import { extractVocabulary } from "../../api"

const schema = z.object({
  connectionString: z.string().min(10, "Enter a valid connection string"),
  dbType: z.enum(["postgres", "mysql", "sqlite", "duckdb"]),
})

export function ConnectStep({ onComplete }: { onComplete: (draft: VocabularyDraft) => void }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      connectionString: "",
      dbType: "postgres" as const,
    },
  })

  const extract = useMutation({
    mutationFn: extractVocabulary,
    onSuccess: (data) => onComplete(data),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => extract.mutate(data))} className="space-y-6 p-6">
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
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="duckdb">DuckDB</SelectItem>
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting schema...
            </>
          ) : (
            "Connect & Extract"
          )}
        </Button>

        {extract.error && (
          <p className="text-sm text-destructive">{extract.error.message}</p>
        )}
      </form>
    </Form>
  )
}
```

### ConfirmStep

```tsx
// apps/web/src/modules/vocabulary/components/steps/confirm-step.tsx

"use client"

import { SettingsCard, SettingsCardHeader, SettingsCardTitle, SettingsCardDescription, SettingsCardContent } from "@/modules/common/layout/dashboard/settings-card"
import { Input } from "@ui/web/input"
import { Button } from "@ui/web/button"
import { RadioGroup, RadioGroupItem } from "@ui/web/radio-group"
import { Label } from "@ui/web/label"
import type { Confirmation, ConfirmationAnswers } from "../../types"

interface Props {
  confirmations: Confirmation[]
  answers: ConfirmationAnswers
  onAnswer: (id: string, value: string) => void
  onNext: () => void
}

export function ConfirmStep({ confirmations, answers, onAnswer, onNext }: Props) {
  const allAnswered = confirmations.every(c => answers[c.id])

  return (
    <div className="space-y-4 p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Quick Questions</h3>
        <p className="text-sm text-muted-foreground">
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
              <SettingsCardDescription>{confirmation.context}</SettingsCardDescription>
            )}
          </SettingsCardHeader>
          <SettingsCardContent>
            {confirmation.type === "select_one" && (
              <RadioGroup
                value={answers[confirmation.id] as string}
                onValueChange={(value) => onAnswer(confirmation.id, value)}
              >
                {confirmation.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${confirmation.id}-${option.value}`} />
                    <Label htmlFor={`${confirmation.id}-${option.value}`}>
                      {option.label}
                      {option.recommended && (
                        <span className="ml-2 text-xs text-primary">(Recommended)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {confirmation.type === "rename" && (
              <Input
                value={answers[confirmation.id] as string ?? confirmation.suggestion ?? ""}
                onChange={(e) => onAnswer(confirmation.id, e.target.value)}
                placeholder={confirmation.suggestion}
              />
            )}

            {confirmation.type === "classify" && (
              <RadioGroup
                value={answers[confirmation.id] as string}
                onValueChange={(value) => onAnswer(confirmation.id, value)}
              >
                {confirmation.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${confirmation.id}-${option.value}`} />
                    <Label htmlFor={`${confirmation.id}-${option.value}`}>{option.label}</Label>
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
  )
}
```

---

## API Routes

```typescript
// packages/api/src/modules/vocabulary/router.ts

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { extractSchema, applyHardRules, generateConfirmations, buildSemanticLayer } from "@repo/liquid-connect/uvb"
import { validateSemanticLayer } from "@repo/liquid-connect"

const extractSchema = z.object({
  connectionString: z.string(),
  dbType: z.enum(["postgres", "mysql", "sqlite", "duckdb"]),
  options: z.object({
    schema: z.string().optional(),
    excludeTables: z.array(z.string()).optional(),
  }).optional(),
})

const saveSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  layer: z.any(), // SemanticLayer
  organizationId: z.string(),
})

export const vocabularyRouter = new Hono()
  .post("/extract", zValidator("json", extractSchema), async (c) => {
    const { connectionString, dbType, options } = c.req.valid("json")

    try {
      // 1. Connect and extract schema
      const schema = await extractSchema(connectionString, dbType, options)

      // 2. Apply hard rules
      const detected = applyHardRules(schema)

      // 3. Generate confirmation questions
      const confirmations = generateConfirmations(detected)

      return c.json({
        schema: {
          database: schema.database,
          type: dbType,
          tables: schema.tables.length,
          extractedAt: new Date().toISOString(),
        },
        detected,
        confirmations,
      })
    } catch (error) {
      return c.json({ error: error.message }, 500)
    }
  })

  .post("/validate", async (c) => {
    const layer = await c.req.json()
    const result = validateSemanticLayer(layer)
    return c.json(result)
  })

  .post("/save", zValidator("json", saveSchema), async (c) => {
    const { name, description, layer, organizationId } = c.req.valid("json")

    // Validate before saving
    const validation = validateSemanticLayer(layer)
    if (!validation.valid) {
      return c.json({ error: "Invalid vocabulary", details: validation.errors }, 400)
    }

    // Save to database (implement with Drizzle)
    // const saved = await db.insert(vocabularies).values({...})

    return c.json({
      id: "vocab_" + Date.now(),
      name,
      downloadUrl: `/api/vocabulary/${id}/download`,
    })
  })

  .get("/:id/download", async (c) => {
    const id = c.req.param("id")
    // Load from database and return as YAML
    // const vocabulary = await db.query.vocabularies.findFirst({ where: eq(vocabularies.id, id) })
    // return c.text(yaml.stringify(vocabulary.layer), 200, { "Content-Type": "text/yaml" })
  })
```

---

## Implementation Order

1. **Backend (liquid-connect)**
   - [ ] `uvb/models.ts` - TypeScript types
   - [ ] `uvb/connector.ts` - Database connections
   - [ ] `uvb/extractor.ts` - Schema extraction
   - [ ] `uvb/rules.ts` - Hard rules engine (port from Python)
   - [ ] `uvb/index.ts` - Public exports

2. **API (packages/api)**
   - [ ] `vocabulary/router.ts` - Hono routes
   - [ ] `vocabulary/service.ts` - Business logic
   - [ ] Register in main router

3. **Frontend (apps/web)**
   - [ ] `vocabulary/types.ts` - Frontend types
   - [ ] `vocabulary/api.ts` - API client
   - [ ] `vocabulary/components/vocabulary-wizard.tsx`
   - [ ] `vocabulary/components/steps/*.tsx`
   - [ ] Page route

---

## Success Criteria

```
$ Open browser to /vocabulary/new

1. Enter: postgresql://postgres:dbpass@127.0.0.1:5432/ecija
2. Click "Connect & Extract" (~5 seconds)
3. See: 508 entities, 326 metrics, 543 dimensions detected
4. Review tables, toggle items on/off
5. Answer 5 questions (30 seconds)
6. Click "Save"
7. Download vocabulary.yaml

Total time: ~60 seconds
```
