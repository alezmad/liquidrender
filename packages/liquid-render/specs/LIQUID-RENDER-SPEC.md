# Liquid Render v1.0 Specification

**Unified DSL for UI components and survey flows.**

*The hybrid of LiquidCode (UI) + LiquidSurvey (flows) = LiquidRender.*

---

## Overview

Liquid Render combines two DSLs into one unified language:

```
┌─────────────────────────────────────────────────────────────┐
│                      Liquid Render                          │
├─────────────────────────┬───────────────────────────────────┤
│      LiquidCode         │          LiquidSurvey             │
│   (UI Components)       │        (Survey Flows)             │
├─────────────────────────┼───────────────────────────────────┤
│ Dashboards, Charts      │ Questions, Branching              │
│ Forms, Tables, Cards    │ Conditional Navigation            │
│ Layouts, Modals         │ Multi-step Wizards                │
└─────────────────────────┴───────────────────────────────────┘
```

### Pipeline

```
Liquid DSL  →  parse()  →  LiquidSchema JSON  →  validate()  →  render()  →  React UI
```

| Layer | Purpose | Output |
|-------|---------|--------|
| DSL | Human-readable definition | `.liquid` files |
| Schema | Machine-readable structure | `LiquidSchema` JSON |
| Validator | Ensures integrity | `ValidationResult` |
| Engine | Runtime state machine | `Session` |
| Renderer | React component tree | JSX (shadcn/ui) |

---

# Part I: LiquidCode (UI Components)

## §1 Grammar

```
Program     := Signal* Statement+
Statement   := Block | Layer | Survey

Block       := Type Binding* Modifier* Children?
Type        := Index | Code
Binding     := Index | Field | Expr | Literal
Modifier    := Layout | Signal | Style | State | Action
Children    := '[' (Block ',')* Block? ']'

Index       := [0-9]+
Code        := [A-Z][a-z]?[a-z]?
Field       := ':' Name | ':.' Name?
Expr        := '=' Expression
Literal     := '"' [^"]* '"'
Name        := [a-z_][a-zA-Z0-9_]*

Layout      := '!' Priority | '^' Flex | '*' Span
Signal      := '@' Declare | '>' Emit | '<' Recv | '<>' Both
Style       := '#' Color | '%' Size
State       := ':' StateName '?' Condition
Action      := '!' ActionName

Layer       := '/' Index Block
Survey      := 'Survey' '{' SurveyBody '}'    # Embedded survey
```

---

## §2 Type System

### §2.1 Core Types (Indexed 0-9)

Single digit for the 10 most common types:

| Index | Code | Type | Description |
|-------|------|------|-------------|
| `0` | `Cn` | container | Generic container/div |
| `1` | `Kp` | kpi | Key performance indicator |
| `2` | `Br` | bar | Bar chart |
| `3` | `Ln` | line | Line chart |
| `4` | `Pi` | pie | Pie chart |
| `5` | `Tb` | table | Data table |
| `6` | `Fm` | form | Form container |
| `7` | `Ls` | list | Repeating list |
| `8` | `Cd` | card | Card component |
| `9` | `Md` | modal | Modal/dialog |

### §2.2 Extended Types (2-char codes)

**Layout & Structure:**
| Code | Type | Description |
|------|------|-------------|
| `Gd` | grid | Grid layout |
| `Sk` | stack | Vertical/horizontal stack |
| `Sp` | split | Split pane |
| `Dw` | drawer | Side drawer |
| `Sh` | sheet | Bottom sheet |
| `Pp` | popover | Popover/dropdown |
| `Tl` | tooltip | Tooltip |
| `Ac` | accordion | Collapsible sections |

**Data Display:**
| Code | Type | Description |
|------|------|-------------|
| `Tx` | text | Text/paragraph |
| `Hd` | heading | Heading (h1-h6) |
| `Ic` | icon | Icon |
| `Im` | image | Image |
| `Av` | avatar | User avatar |
| `Tg` | tag | Tag/badge/chip |
| `Pg` | progress | Progress bar |
| `Gn` | gauge | Gauge/meter |
| `Rt` | rating | Star rating |
| `Sl` | sparkline | Inline mini chart |

**Form Controls:**
| Code | Type | Description |
|------|------|-------------|
| `Bt` | button | Button |
| `In` | input | Text input |
| `Se` | select | Dropdown select |
| `Sw` | switch | Toggle switch |
| `Ck` | checkbox | Checkbox |
| `Rd` | radio | Radio button |
| `Rg` | range | Slider/range |
| `Cl` | color | Color picker |
| `Dt` | date | Date picker |
| `Tm` | time | Time picker |
| `Up` | upload | File upload |
| `Ot` | otp | OTP input |

**Charts:**
| Code | Type | Description |
|------|------|-------------|
| `Hm` | heatmap | Heatmap |
| `Sn` | sankey | Sankey diagram |
| `Tr` | tree | Tree view |
| `Or` | org | Org chart |
| `Mp` | map | Geographic map |
| `Fl` | flow | Flowchart |

**Media:**
| Code | Type | Description |
|------|------|-------------|
| `Vd` | video | Video player |
| `Au` | audio | Audio player |
| `Cr` | carousel | Carousel/slider |
| `Lb` | lightbox | Lightbox overlay |

**Interactive:**
| Code | Type | Description |
|------|------|-------------|
| `St` | stepper | Step wizard |
| `Kb` | kanban | Kanban board |
| `Ca` | calendar | Calendar view |
| `Ti` | timeline | Timeline |

---

## §3 Binding System

### §3.1 Indexed Binding
```liquid
1 0              # KPI bound to schema field 0
5 0123           # Table with columns 0,1,2,3
```

### §3.2 Named Binding
```liquid
1 :revenue       # KPI bound to "revenue" field
3 :date :amount  # Line chart: x=date, y=amount
```

### §3.3 Computed Binding
```liquid
1 =revenue/orders           # Computed value
1 =sum(items.price)         # Aggregation
```

### §3.4 Literal Binding
```liquid
Tx "Hello World"            # Static text
Bt "Submit"                 # Button label
```

### §3.5 Iterator Binding
```liquid
7 :items [8 :.]             # List items, :. = current item
7 :items [Tx :.name]        # Access item.name
7 :items [Tx :# Tx :.name]  # :# = current index (0-based)
```

---

## §4 Modifier System

### §4.1 Layout Modifiers

**Priority:** `!` controls importance
```liquid
!h    # Hero (highest)
!p    # Primary
!s    # Secondary
!0-9  # Numeric priority
```

**Flex:** `^` controls flexibility
```liquid
^f    # Fixed size
^s    # Shrink
^g    # Grow
^c    # Collapse
```

**Span:** `*` controls width
```liquid
*1-9  # Column span
*f    # Full width
*h    # Half width
*t    # Third
*q    # Quarter
```

### §4.2 Signal Modifiers

**Declaration:** `@` at program start
```liquid
@dr             # Declare dateRange signal
@tab @filter    # Multiple signals
```

**Emit:** `>` sends signal
```liquid
Bt "Click" >action           # Emit on click
Bt "Tab1" >tab=0             # Emit with value
```

**Receive:** `<` listens to signal
```liquid
5 :orders <dr               # Table receives dateRange
0 <filter [...]             # Container receives filter
```

**Bidirectional:** `<>` for two-way binding
```liquid
Se :options <>sel           # Select emits and receives
In :search <>query          # Input with live binding
```

### §4.3 Style Modifiers

**Color:** `#`
```liquid
Tx "Error" #red             # Red text
1 :value #?>=80:green,<80:red   # Conditional color
```

**Size:** `%`
```liquid
Tx "Title" %lg              # Large text
Ic "star" %sm               # Small icon
```

### §4.4 State Modifiers

```liquid
Bt "Action" :hover#blue     # Blue on hover
In :email :focus#blue       # Focus outline
Bt "Tab" :active#primary    # Active state
```

### §4.5 Action Modifiers

```liquid
Bt "Save" !submit           # Form submit
Bt "Reset" !reset           # Form reset
Bt "Close" !close           # Close modal
```

---

## §5 Layers

### §5.1 Layer Declaration
```liquid
/1 9 [...]                  # Layer 1: modal
/2 Dw [...]                 # Layer 2: drawer
```

### §5.2 Layer Triggers
```liquid
Bt "Open" >/1               # Open layer 1
8 :item >/2                 # Card opens layer 2
```

### §5.3 Layer Close
```liquid
Bt "Close" /<               # Close current layer
Bt "Back" >/0               # Return to main layer
```

---

## §6 LiquidCode Examples

### §6.1 Simple Dashboard
```liquid
1 0, 1 1, 1 2, 1 3, 3 4 5
```
4 KPIs + line chart in 5 tokens.

### §6.2 Tabbed Interface
```liquid
@tab
0 [Bt "Overview" >tab=0, Bt "Details" >tab=1, Bt "Settings" >tab=2]
0 ?@tab=0 [1 :revenue, 1 :orders, 3 :trend]
0 ?@tab=1 [5 :orders [:id :customer :amount :status]]
0 ?@tab=2 [6 [In :name, In :email @email, Sw :notifications, Bt "Save" !submit]]
```

### §6.3 Data Table with Modal
```liquid
@sel
5 :users [:name :email :role] >sel
/1 9 "Edit User" [
  6 [
    In :name
    In :email @email
    Se :role [:options]
    0 [Bt "Cancel" /<, Bt "Save" !submit]
  ]
]
```

---

# Part II: LiquidSurvey (Survey Flows)

## §7 Survey Node Types

| Symbol | Type | Description |
|--------|------|-------------|
| `>` | start | Survey entry point |
| `?` | question | Collects user response |
| `!` | message | Display-only content |
| `<` | end | Terminal node |

---

## §8 Question Types (41 types)

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

---

## §9 Survey Syntax

### §9.1 Node Definition
```
TYPE id [attributes] -> transitions
```

**Start Node:**
```liquid
> id "title" "message"
  -> next_id
```

**Question Node:**
```liquid
? id Type* "question" "description"? [options]? {config}?
  -> target_id
  -> target_id ?= value        # equals
  -> target_id ?!= value       # not equals
  -> target_id ?>= value       # greater or equal
  -> target_id ?<= value       # less or equal
  -> target_id ?> value        # greater than
  -> target_id ?< value        # less than
  -> target_id ?in [a,b,c]     # in set
  -> target_id ?!in [a,b,c]    # not in set
  -> target_id ?contains val   # contains
  -> target_id ?!contains val  # not contains
  -> target_id ?empty          # is empty
  -> target_id ?!empty         # is not empty
  -> target_id ?~ "regex"      # matches regex
```

**Message Node:**
```liquid
! id "title" "message"
  -> next_id
```

**End Node:**
```liquid
< id "title" "message"
```

### §9.2 Options Syntax
```liquid
# Full form with id
[id:"label"=value, id2:"label2"=value2]

# Value-label form
[value1="Label One", value2="Label Two"]

# Short form (value = lowercase label with dashes)
["Yes", "No", "Maybe"]

# Identifier form (label = value)
[yes, no, maybe]

# Multiline
[
  pricing="Better pricing",
  features="More features",
  support="Faster support"
]
```

### §9.3 Config Syntax
```liquid
{min: 0, max: 10}              # Numeric range
{rows: 5}                      # Textarea rows
{format: "YYYY-MM-DD"}         # Date format
{required: true}               # Validation
{items: ["a", "b", "c"]}       # Arrays
{nested: {key: "value"}}       # Nested objects
{rankingItems: [{id: "r1", label: "Speed", value: "speed"}]}  # Array of objects
```

---

## §10 Survey Example

```liquid
customer-feedback "Customer Feedback Survey" "Help us improve"
---
> start "Welcome!" "Thank you for your time."
  -> satisfaction

? satisfaction Rt* "How satisfied are you?" "Rate 1-5" {min: 1, max: 5}
  -> recommend

? recommend Np* "Would you recommend us?" "Rate 0-10" {min: 0, max: 10}
  -> promoter ?>= 9
  -> passive ?>= 7
  -> detractor ?< 7

? promoter Tx "What do you love?" "Tell us more!"
  -> end

? passive Ch* "What would improve your rating?" [
    pricing="Better pricing",
    features="More features",
    support="Faster support",
    other="Other"
  ]
  -> end

? detractor Ta* "What went wrong?" "Please share your experience"
  -> end

< end "Thank you!" "Your feedback helps us improve."
```

---

# Part III: Hybrid Integration

## §11 Embedding Surveys in UI

The `Survey { }` block embeds a survey flow within any LiquidCode UI:

### §11.1 Survey in Modal
```liquid
@feedback
1 :revenue, 1 :orders, 3 :trend

Bt "Give Feedback" >/1

/1 9 "Quick Feedback" [
  Survey {
    > start "Rate this dashboard" -> q1
    ? q1 Rt* "How useful is this data?" {min: 1, max: 5} -> q2
    ? q2 Tx "Any suggestions?" -> end
    < end "Thanks for your feedback!"
  }
]
```

### §11.2 Survey in Drawer
```liquid
@nps
5 :customers [:name :email :score]

Bt "Collect NPS" >/1

/1 Dw [
  Survey {
    > start "NPS Survey" -> nps
    ? nps Np* "How likely to recommend?" {min: 0, max: 10}
      -> promoter ?>= 9
      -> passive ?>= 7
      -> detractor ?< 7
    ? promoter Tx "What do you love?" -> end
    ? passive Ch "What could be better?" [support="Support", features="Features", price="Price"] -> end
    ? detractor Ta* "What went wrong?" -> end
    < end "Thank you!"
  }
]
```

### §11.3 Inline Survey (Stepper)
```liquid
St [
  Survey {
    > start "Step 1: Basic Info" -> name
    ? name Tx* "Your name" -> email
    ? email Em* "Your email" -> end
    < end "Registration complete"
  }
]
```

---

## §12 Shared Type Codes

Some type codes are shared between LiquidCode and LiquidSurvey:

| Code | LiquidCode | LiquidSurvey |
|------|------------|--------------|
| `Tx` | text display | text input |
| `Rt` | rating display | rating input |
| `Dt` | date picker | date question |
| `Sl` | slider control | slider question |
| `Cl` | color picker | color question |
| `Au` | audio player | audio upload |
| `Vd` | video player | video upload |

Context determines interpretation:
- Inside `Survey { }` → Question type
- Outside → UI component

---

## §13 Schema Structure

### §13.1 LiquidSchema (Unified)

```typescript
interface LiquidSchema {
  version: "1.0";
  signals: Signal[];
  layers: Layer[];
  surveys?: EmbeddedSurvey[];
}

interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  children?: Block[];
  survey?: GraphSurvey;  // Embedded survey
}
```

### §13.2 GraphSurvey (Survey Schema)

```typescript
interface GraphSurvey {
  id: string;
  title: string;
  description?: string;
  startNodeId: string;
  nodes: Record<string, GraphSurveyNode>;
}

interface GraphSurveyNode {
  id: string;
  type: 'start' | 'question' | 'message' | 'end';
  content: NodeContent;
  next: Transition[];
}

interface Transition {
  nodeId: string;
  condition?: Condition;
}

interface Condition {
  operator: ConditionOperator;
  value: unknown;
}
```

---

## §14 Validation Rules

### §14.1 LiquidCode Validation
| Rule | Description |
|------|-------------|
| Valid types | Type codes are recognized |
| Valid bindings | Field references exist in schema |
| Valid signals | Signal names are declared |
| Layer refs | Layer targets exist |

### §14.2 LiquidSurvey Validation
| Rule | Description |
|------|-------------|
| Single start | Exactly one `>` node |
| Has end | At least one `<` node |
| Reachable | All nodes reachable from start |
| Terminates | All paths lead to end |
| No orphans | No unreferenced nodes |
| Valid refs | All transition targets exist |

### §14.3 Hybrid Validation
| Rule | Description |
|------|-------------|
| Survey scope | Survey nodes only inside `Survey { }` |
| Signal bridge | Surveys can emit to parent signals |
| Layer context | Embedded surveys inherit layer state |

---

## §15 Renderer Mapping

### §15.1 LiquidCode → React (shadcn/ui)

| Type | Component |
|------|-----------|
| `0` container | `<div>` |
| `1` kpi | `<Card>` with value |
| `2-4` charts | recharts `<BarChart>`, `<LineChart>`, `<PieChart>` |
| `5` table | tanstack-table `<DataTable>` |
| `6` form | `<form>` wrapper |
| `7` list | mapped children |
| `8` card | `<Card>` |
| `9` modal | `<Dialog>` |
| `Bt` button | `<Button>` |
| `In` input | `<Input>` |
| `Se` select | `<Select>` |

### §15.2 LiquidSurvey → React (shadcn/ui)

| Node/Type | Component |
|-----------|-----------|
| start | `<StartScreen>` |
| question | `<QuestionRenderer>` |
| message | `<MessageScreen>` |
| end | `<EndScreen>` |
| `Tx` text | `<Input>` |
| `Ta` textarea | `<Textarea>` |
| `Ch` choice | `<RadioGroup>` |
| `Mc` multiChoice | `<Checkbox>` group |
| `Rt` rating | `<RatingStars>` |
| `Np` nps | `<NPSScale>` |
| `Sl` slider | `<Slider>` |
| `Dt` date | `<DatePicker>` |
| `Mx` matrix | tanstack-table |

---

## §16 API Reference

### §16.1 Compiler

```typescript
// Parse DSL to schema
function parse(source: string): LiquidSchema;

// Compile schema to DSL
function compile(schema: LiquidSchema): string;

// Roundtrip test
function roundtrip(schema: LiquidSchema): {
  dsl: string;
  reconstructed: LiquidSchema;
  isEquivalent: boolean;
};
```

### §16.2 Validator

```typescript
function validate(schema: LiquidSchema): ValidationResult;

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### §16.3 Engine

```typescript
class LiquidEngine {
  constructor(schema: LiquidSchema);

  // Signal management
  getSignal(name: string): unknown;
  setSignal(name: string, value: unknown): void;

  // Layer management
  openLayer(id: number): void;
  closeLayer(): void;

  // Survey engine (when survey is active)
  getSurveyEngine(): SurveyEngine | null;
}

class SurveyEngine {
  start(): SurveySession;
  answer(nodeId: string, value: unknown): GraphSurveyNode | null;
  back(): GraphSurveyNode | null;
  getCurrentNode(): GraphSurveyNode;
  getProgress(): number;
  isComplete(): boolean;
  getResponses(): Map<string, unknown>;
}
```

### §16.4 Renderer

```typescript
function render(schema: LiquidSchema, options?: RenderOptions): ReactElement;

interface RenderOptions {
  theme?: 'light' | 'dark';
  components?: ComponentOverrides;
  onSurveyComplete?: (responses: Map<string, unknown>) => void;
  onSignalChange?: (name: string, value: unknown) => void;
}

// Or as component
<LiquidRenderer
  schema={schema}
  data={dataSource}
  theme="light"
  onSurveyComplete={handleComplete}
/>
```

---

## §17 Compression Metrics

| Format | Bytes (avg) | Ratio |
|--------|-------------|-------|
| TypeScript Schema | 1,500 | 1.0x |
| JSON | 1,100 | 1.4x |
| Liquid DSL | 400 | 3.75x |

---

## §18 Implementation Status

| Component | Status | Package |
|-----------|--------|---------|
| LiquidSurvey Compiler | ✅ Done | `@repo/liquid-render` |
| Survey Schema Types | ✅ Done | `@repo/liquid-render` |
| Survey Validator | ✅ Done | `@repo/liquid-render` |
| Survey Engine | ✅ Done | `@repo/liquid-render` |
| LiquidCode Compiler | 📋 Planned | TCS Phase 1 |
| Hybrid Parser | 📋 Planned | TCS Phase 1 |
| React Renderer | 📋 Planned | TCS Phase 2 |
| Analytics Charts | 📋 Planned | TCS Phase 3 |

---

## §19 Design Principles

1. **Common case fast, rare case possible** - Indexes for common types
2. **Position encodes meaning** - Order matters, symbols escape position
3. **Triangulated consistency** - DSL ↔ Schema ↔ React equivalence
4. **Semantic density** - Maximum meaning in minimum characters
5. **Lossless roundtrip** - No data loss in DSL ↔ Schema conversion

---

*Liquid Render v1.0: UI + Surveys in one unified DSL.*
