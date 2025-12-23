# Liquid Render v1.0 Specification

**Complete DSL for surveys: definition, compilation, validation, and rendering.**

---

## Overview

Liquid Render is a unified system for building interactive surveys:

```
LiquidSurvey DSL  →  compile()  →  GraphSurvey JSON  →  validate()  →  render()  →  React UI
```

| Layer | Purpose | Output |
|-------|---------|--------|
| DSL | Human-readable survey definition | `.liquid` files |
| Schema | Machine-readable graph structure | `GraphSurvey` JSON |
| Validator | Ensures graph integrity | `ValidationResult` |
| Engine | Runtime state machine | `SurveySession` |
| Renderer | React component tree | JSX |

---

## §1 DSL Syntax

### §1.1 Node Types

| Symbol | Type | Description |
|--------|------|-------------|
| `>` | start | Survey entry point |
| `?` | question | Collects user response |
| `!` | message | Display-only content |
| `<` | end | Terminal node |

### §1.2 Question Types (41 types)

**Basic Input:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Tx` | text | `Ta` | textarea |
| `Nu` | number | `Em` | email |
| `Ph` | phone | `Ur` | url |
| `Pw` | password | `Hd` | hidden |

**Selection:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Ch` | choice | `Mc` | multiChoice |
| `Ms` | multiSelect | `Yn` | yesNo |
| `Cb` | combobox | `Ic` | imageChoice |
| `Rk` | ranking | | |

**Scale/Rating:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Rt` | rating | `Np` | nps |
| `Lk` | likert | `Sl` | slider |
| `Rg` | range | `Pc` | percentage |

**Date/Time:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Dt` | date | `Dr` | dateRange |
| `Tm` | time | | |

**Matrix/Complex:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Mx` | matrix | `Dm` | dimensions |

**Location:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Lo` | location | `Gl` | geolocation |
| `Il` | imageLocation | `Ad` | address |

**Media:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Fd` | fileDropzone | `Sg` | signature |
| `Au` | audio | `Vd` | video |
| `Cp` | captcha | | |

**Specialized:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Cl` | color | `Cu` | currency |

### §1.3 Node Definition Syntax

```
TYPE id [attributes] -> transitions
```

**Start Node:**
```
> id "title" "message"
  -> next_id
```

**Question Node:**
```
? id Type* "question" "description"? [options]? {config}?
  -> target_id
  -> target_id ?= value        # equals
  -> target_id ?>= value       # greater or equal
  -> target_id ?<= value       # less or equal
  -> target_id ?> value        # greater than
  -> target_id ?< value        # less than
  -> target_id ?in [a,b,c]     # in set
  -> target_id ?contains val   # contains
```

**Message Node:**
```
! id "title" "message"
  -> next_id
```

**End Node:**
```
< id "title" "message"
```

### §1.4 Options Syntax

```
# Full form
[label1:value1, label2:value2]

# Short form (value = lowercase label)
[Yes, No, Maybe]

# Multiline
[
  "Option A":optA,
  "Option B":optB,
  "Option C":optC
]
```

### §1.5 Config Syntax

```
{min:0, max:10}           # Numeric range
{rows:5}                  # Textarea rows
{format:"YYYY-MM-DD"}     # Date format
{required:true}           # Validation
```

---

## §2 Schema Structure

### §2.1 GraphSurvey

```typescript
interface GraphSurvey {
  id: string;
  title: string;
  description?: string;
  nodes: Record<string, GraphSurveyNode>;
  settings?: SurveySettings;
}
```

### §2.2 GraphSurveyNode

```typescript
interface GraphSurveyNode {
  id: string;
  type: 'start' | 'question' | 'message' | 'end';
  content: NodeContent;
  next: Transition[];
}

interface NodeContent {
  title?: string;
  question?: string;
  message?: string;
  description?: string;
  questionType?: QuestionType;
  options?: Option[];
  required?: boolean;
  validation?: ValidationRule[];
  // Type-specific fields
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  placeholder?: string;
  format?: string;
  matrixRows?: string[];
  matrixColumns?: string[];
  likertLabels?: { start: string; end: string };
}
```

### §2.3 Transitions

```typescript
interface Transition {
  nodeId: string;
  condition?: Condition;
}

interface Condition {
  operator: ConditionOperator;
  value: unknown;
}

type ConditionOperator =
  | 'equals' | 'notEquals'
  | 'greater' | 'less'
  | 'greaterOrEqual' | 'lessOrEqual'
  | 'in' | 'notIn'
  | 'contains' | 'notContains';
```

---

## §3 Validation Rules

### §3.1 Structural Validation

| Rule | Description |
|------|-------------|
| Single start | Exactly one `>` node |
| Has end | At least one `<` node |
| Reachable | All nodes reachable from start |
| Terminates | All paths lead to end |
| No orphans | No unreferenced nodes |
| Valid refs | All transition targets exist |

### §3.2 Content Validation

| Rule | Description |
|------|-------------|
| Valid types | Question type codes are recognized |
| Required fields | Required nodes have content |
| Option consistency | Choice questions have options |
| Range validity | min <= max for ranges |

### §3.3 Logic Validation

| Rule | Description |
|------|-------------|
| Condition order | Numeric conditions ordered correctly |
| Exhaustive | All paths have default or cover all cases |
| No infinite loops | Cycles must be escapable |

---

## §4 Engine Runtime

### §4.1 Session State

```typescript
interface SurveySession {
  surveyId: string;
  currentNodeId: string;
  responses: Map<string, Response>;
  path: string[];
  startedAt: Date;
  completedAt?: Date;
}
```

### §4.2 Navigation

```typescript
class SurveyEngine {
  // Start survey
  start(): SurveySession;

  // Submit answer and advance
  answer(nodeId: string, value: unknown): NextNode;

  // Go back
  back(): PreviousNode;

  // Get current node
  getCurrentNode(): GraphSurveyNode;

  // Check if complete
  isComplete(): boolean;
}
```

### §4.3 Condition Evaluation

```typescript
function evaluateCondition(
  condition: Condition,
  response: unknown
): boolean {
  switch (condition.operator) {
    case 'equals': return response === condition.value;
    case 'greater': return response > condition.value;
    case 'in': return condition.value.includes(response);
    // ... etc
  }
}
```

---

## §5 Renderer Specification

### §5.1 Component Mapping

Each node type maps to React components:

| Node Type | Component |
|-----------|-----------|
| start | `<StartScreen />` |
| question | `<QuestionRenderer />` → type-specific |
| message | `<MessageScreen />` |
| end | `<EndScreen />` |

### §5.2 Question Components (shadcn/ui)

| Type | Component | UI Library |
|------|-----------|------------|
| text | `<Input />` | shadcn/ui |
| textarea | `<Textarea />` | shadcn/ui |
| choice | `<RadioGroup />` | shadcn/ui |
| multiChoice | `<Checkbox />` group | shadcn/ui |
| rating | `<RatingStars />` | custom |
| nps | `<NPSScale />` | custom |
| slider | `<Slider />` | shadcn/ui |
| date | `<DatePicker />` | shadcn/ui |
| matrix | `<Table />` | tanstack-table |
| select | `<Select />` | shadcn/ui |
| fileDropzone | `<Dropzone />` | custom |

### §5.3 Render Function

```typescript
function render(
  survey: GraphSurvey,
  options?: RenderOptions
): React.ReactElement {
  return (
    <SurveyProvider survey={survey}>
      <SurveyRenderer />
    </SurveyProvider>
  );
}

interface RenderOptions {
  theme?: 'light' | 'dark';
  components?: ComponentOverrides;
  onComplete?: (responses: Map<string, unknown>) => void;
  onProgress?: (progress: number) => void;
}
```

### §5.4 Component Structure

```tsx
<SurveyProvider>
  <Card>
    <CardHeader>
      <Progress value={progress} />
      <CardTitle>{node.content.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <QuestionRenderer node={currentNode} />
    </CardContent>
    <CardFooter>
      <Navigation onBack={back} onNext={next} />
    </CardFooter>
  </Card>
</SurveyProvider>
```

---

## §6 Analytics

### §6.1 Response Aggregation

```typescript
interface SurveyAnalytics {
  responseCount: number;
  completionRate: number;
  averageDuration: number;
  questionStats: Map<string, QuestionStats>;
}

interface QuestionStats {
  responses: number;
  distribution: Record<string, number>;
  average?: number;
  median?: number;
}
```

### §6.2 Visualization (recharts)

| Metric | Chart Type |
|--------|------------|
| Distribution | `<BarChart />` |
| Over time | `<LineChart />` |
| Proportions | `<PieChart />` |
| Matrix | `<HeatMap />` |
| NPS | `<NPSGauge />` |

---

## §7 Complete Example

### §7.1 DSL Source

```liquid
customer-feedback "Customer Feedback Survey" "Help us improve"
---
> start "Welcome!" "Thank you for your time."
  -> satisfaction

? satisfaction Rt* "How satisfied are you?" "Rate 1-5" {1-5}
  -> recommend

? recommend Np* "Would you recommend us?" "Rate 0-10" {0-10}
  -> promoter ?>= 9
  -> passive ?>= 7
  -> detractor ?<= 6

? promoter Tx "What do you love?" "Tell us more!"
  -> end

? passive Ch* "What would improve your rating?" [
    "Better pricing":pricing,
    "More features":features,
    "Faster support":support,
    "Other":other
  ]
  -> end

? detractor Ta* "What went wrong?" "Please share your experience"
  -> end

< end "Thank you!" "Your feedback helps us improve."
```

### §7.2 Compiled Schema

```json
{
  "id": "customer-feedback",
  "title": "Customer Feedback Survey",
  "description": "Help us improve",
  "nodes": {
    "start": {
      "id": "start",
      "type": "start",
      "content": { "title": "Welcome!", "message": "Thank you for your time." },
      "next": [{ "nodeId": "satisfaction" }]
    },
    "satisfaction": {
      "id": "satisfaction",
      "type": "question",
      "content": {
        "question": "How satisfied are you?",
        "description": "Rate 1-5",
        "questionType": "rating",
        "required": true,
        "min": 1,
        "max": 5
      },
      "next": [{ "nodeId": "recommend" }]
    }
    // ... remaining nodes
  }
}
```

### §7.3 Rendered Output

```tsx
<Card>
  <CardHeader>
    <Progress value={40} />
    <CardTitle>How satisfied are you?</CardTitle>
    <CardDescription>Rate 1-5</CardDescription>
  </CardHeader>
  <CardContent>
    <RatingStars min={1} max={5} value={rating} onChange={setRating} />
  </CardContent>
  <CardFooter>
    <Button variant="outline" onClick={back}>Back</Button>
    <Button onClick={next} disabled={!rating}>Next</Button>
  </CardFooter>
</Card>
```

---

## §8 API Reference

### §8.1 Compiler

```typescript
// DSL → Schema
function parse(source: string): GraphSurvey;

// Schema → DSL
function compile(survey: GraphSurvey): string;

// Roundtrip test
function roundtrip(survey: GraphSurvey): {
  dsl: string;
  reconstructed: GraphSurvey;
  isEquivalent: boolean;
};
```

### §8.2 Validator

```typescript
function validateSurvey(survey: GraphSurvey): ValidationResult;

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### §8.3 Engine

```typescript
class SurveyEngine {
  constructor(survey: GraphSurvey, config?: EngineConfig);
  start(): SurveySession;
  answer(nodeId: string, value: unknown): GraphSurveyNode | null;
  back(): GraphSurveyNode | null;
  getCurrentNode(): GraphSurveyNode;
  getProgress(): number;
  isComplete(): boolean;
  getResponses(): Map<string, unknown>;
}
```

### §8.4 Renderer (Future)

```typescript
function render(survey: GraphSurvey, options?: RenderOptions): ReactElement;

// Or as component
<SurveyRenderer
  survey={survey}
  onComplete={handleComplete}
  theme="light"
/>
```

---

## §9 Compression Metrics

| Format | Bytes (avg) | Ratio |
|--------|-------------|-------|
| TypeScript Schema | 1,247 | 1.0x |
| JSON | 892 | 1.4x |
| LiquidSurvey DSL | 445 | 2.8x |

---

## §10 Implementation Status

| Component | Status | Package |
|-----------|--------|---------|
| DSL Compiler | ✅ Done | `@repo/liquid-render` |
| Schema Types | ✅ Done | `@repo/liquid-render` |
| Validator | ✅ Done | `@repo/liquid-render` |
| Engine | ✅ Done | `@repo/liquid-render` |
| Renderer | 🔄 Next | TCS Phase 1 |
| Analytics Charts | 📋 Planned | TCS Phase 2 |
| Builder UI | 📋 Planned | TCS Phase 3 |

---

*Liquid Render v1.0: Define, Compile, Validate, Render.*
