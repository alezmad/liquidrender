# Liquid Component Intelligence Layer

> **Vision**: Themes don't just provide components—they expose a machine-readable intelligence layer that enables LLMs to reason about, compose, and generate correct UI without human intervention.

---

## The Problem We're Really Solving

Today's LLM-to-UI pipeline has a fundamental gap:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE KNOWLEDGE GAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LLM Training Data              vs.           Runtime Reality              │
│   ─────────────────                            ────────────────             │
│   • Generic React patterns                     • Your specific components   │
│   • shadcn/ui circa 2023                       • Your prop signatures       │
│   • Tailwind conventions                       • Your design tokens         │
│   • Stale documentation                        • Your feature flags         │
│                                                                             │
│   Result: LLM generates code that "looks right" but doesn't compile,       │
│   doesn't match your design system, or misuses component APIs.             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The solution isn't better prompts. It's making the truth machine-readable.**

---

## Component Manifest: The Theme's Contract

Every Liquid theme exposes a `manifest` alongside its components:

```typescript
interface LiquidTheme {
  name: string;
  version: string;
  components: Record<string, ThemeComponent>;
  fallback?: ThemeComponent;

  // NEW: Machine-readable component intelligence
  manifest: ComponentManifest;
}

interface ComponentManifest {
  /** Schema version for manifest format */
  version: "1.0";

  /** Theme metadata */
  meta: ThemeMetadata;

  /** All component specifications */
  components: Record<string, ComponentSpec>;

  /** Composition rules and patterns */
  composition: CompositionRules;

  /** Semantic categories for reasoning */
  semantics: SemanticGraph;

  /** Design tokens available */
  tokens: TokenManifest;
}
```

---

## Component Specification: What LLMs Need to Know

Each component in the manifest includes everything an LLM needs to generate correct code:

```typescript
interface ComponentSpec {
  /** Component identifier (matches theme.components key) */
  type: string;

  /** Human-readable description for LLM reasoning */
  description: string;

  /** Semantic category for smart selection */
  category: ComponentCategory;

  /** When to use vs. alternatives */
  usage: UsageGuidance;

  /** Props with full type information */
  props: PropSpec[];

  /** Binding expectations */
  bindings: BindingSpec;

  /** Composition constraints */
  composition: ComponentComposition;

  /** Feature capabilities */
  features: FeatureFlags;

  /** Accessibility requirements */
  a11y: AccessibilitySpec;

  /** Example DSL snippets */
  examples: Example[];
}
```

### Real Example: KPI Card Specification

```yaml
type: kpi-card
description: |
  Displays a single key performance indicator with optional trend.
  Best for numeric metrics that need visual emphasis.

category: data-display.metrics

usage:
  when:
    - Showing a single important number (revenue, users, conversion rate)
    - Comparing current vs. previous period
    - Dashboard overview sections
  avoid:
    - Multiple metrics in sequence (use grid of kpi-cards instead)
    - Non-numeric data (use card or text)
    - Detailed breakdowns (use data-table)
  alternatives:
    - sparkline: When trend visualization matters more than the number
    - gauge: When showing progress toward a goal
    - text: When the metric needs contextual explanation

props:
  - name: binding
    type: Binding
    required: true
    description: Path to numeric value or object with {value, label?, trend?, change?}
    examples:
      - ":metrics.revenue"
      - ":kpis[0]"

  - name: label
    type: string
    required: false
    description: Override auto-generated label from field name

  - name: format
    type: "currency" | "percent" | "number" | "compact"
    default: "number"
    description: How to format the numeric value

  - name: trend
    type: "up" | "down" | "neutral"
    required: false
    description: Explicit trend direction (auto-detected from change if omitted)

  - name: color
    type: ThemeColor
    required: false
    description: Override trend-based coloring

bindings:
  expects:
    - type: number
      description: Simple numeric value
    - type: object
      shape:
        value: number
        label?: string
        trend?: "up" | "down" | "neutral"
        change?: number
      description: Rich KPI object with metadata

  resolves:
    - "$.revenue" → 125000
    - "$.metrics.activeUsers" → { value: 1234, trend: "up", change: 12.5 }

composition:
  validParents: [grid, stack, container, card]
  validChildren: [] # Leaf component
  siblings:
    recommended: [kpi-card, sparkline]
    discouraged: [data-table, form] # Different semantic context

features:
  loading: true      # Shows skeleton during data fetch
  error: true        # Displays error state gracefully
  empty: true        # Handles null/undefined values
  responsive: true   # Adapts to container width
  darkMode: true     # Respects theme color mode

a11y:
  role: "status"
  liveRegion: "polite"
  requirements:
    - Must have accessible label (from prop or binding field name)
    - Trend indicator needs aria-label for direction

examples:
  - name: Simple revenue
    dsl: |
      K :metrics.revenue "Monthly Revenue"
    renders: KPI card showing "$125,000" with "Monthly Revenue" label

  - name: With trend
    dsl: |
      K :dashboard.activeUsers
    data:
      dashboard:
        activeUsers:
          value: 1234
          trend: up
          change: 12.5
    renders: KPI showing "1,234" with green up arrow and "+12.5%"

  - name: Grid of KPIs
    dsl: |
      G[3]
        K :metrics.revenue "Revenue"
        K :metrics.users "Users"
        K :metrics.conversion "Conversion" %percent
```

---

## Semantic Graph: Enabling LLM Reasoning

The manifest includes a semantic graph that helps LLMs understand component relationships:

```typescript
interface SemanticGraph {
  /** Category hierarchy */
  categories: CategoryTree;

  /** Component relationships */
  relationships: Relationship[];

  /** Common patterns */
  patterns: CompositionPattern[];

  /** Anti-patterns to avoid */
  antiPatterns: AntiPattern[];
}
```

### Category Tree

```yaml
categories:
  layout:
    description: "Structure and spacing"
    components: [container, grid, stack, split, sidebar]

  navigation:
    description: "Wayfinding and flow"
    components: [nav, breadcrumb, tabs, stepper, pagination]

  data-display:
    metrics:
      description: "Single values with emphasis"
      components: [kpi-card, gauge, sparkline]
    collections:
      description: "Multiple items"
      components: [list, tree, data-table, kanban, timeline]
    charts:
      description: "Visual data representation"
      components: [line-chart, bar-chart, pie-chart, scatter, heatmap]

  forms:
    input:
      description: "User text entry"
      components: [input, textarea, otp]
    selection:
      description: "Choosing from options"
      components: [select, checkbox, radio, switch]
    specialized:
      description: "Domain-specific inputs"
      components: [date, daterange, time, color, rating, range]

  feedback:
    status:
      description: "Informing users"
      components: [alert, toast, progress, spinner]
    confirmation:
      description: "User decisions"
      components: [modal, alert-dialog, drawer]
```

### Composition Patterns

```yaml
patterns:
  - name: dashboard-kpi-row
    description: "Row of 3-4 KPI cards at top of dashboard"
    structure: |
      G[3-4]
        K :metric1
        K :metric2
        K :metric3
    when:
      - Building executive dashboards
      - Overview pages
      - Landing sections

  - name: master-detail
    description: "List on left, detail view on right"
    structure: |
      Sp[30:70]
        L :items >select
        Cd
          {detail view based on $selected}
    when:
      - Email/message interfaces
      - Record browsing
      - Configuration panels

  - name: chart-with-controls
    description: "Interactive chart with filter controls"
    structure: |
      St
        G[auto]
          Sl :timeRange "Period"
          Sl :metric "Metric"
        Ln :data.timeseries
    when:
      - Analytics dashboards
      - Reporting views

  - name: form-section
    description: "Grouped form fields with header"
    structure: |
      Cd
        H3 "Section Title"
        St
          In :field1 "Label 1"
          In :field2 "Label 2"
    when:
      - Multi-section forms
      - Settings pages
```

### Anti-Patterns

```yaml
antiPatterns:
  - name: nested-scrolling
    description: "Scrollable container inside scrollable container"
    example: |
      Cd %h:500
        Tb :data  # Table has its own scroll
    fix: "Use full-height layout or limit one scroll axis"

  - name: chart-in-accordion
    description: "Charts inside collapsed sections"
    example: |
      Ac
        Ln :data "Chart"  # Hidden by default, sizing issues
    fix: "Use tabs or always-visible containers for charts"

  - name: form-in-table
    description: "Editable inputs inside data table cells"
    example: |
      Tb :rows
        In :$.name  # Input per row
    fix: "Use inline editing pattern or separate edit modal"
```

---

## Queryable Manifest API

The manifest isn't just static data—it's queryable:

```typescript
interface ManifestQuery {
  /** Find components by category */
  byCategory(category: string): ComponentSpec[];

  /** Find components that accept a data shape */
  byDataShape(shape: DataShape): ComponentSpec[];

  /** Find components with specific features */
  byFeatures(features: Partial<FeatureFlags>): ComponentSpec[];

  /** Get composition suggestions */
  suggestChildren(parentType: string): ComponentSpec[];

  /** Validate a composition */
  validateComposition(parent: string, children: string[]): ValidationResult;

  /** Get alternatives for a component */
  getAlternatives(type: string): AlternativeSpec[];
}
```

### LLM Query Examples

```typescript
// "I need to show a list of users with their avatars"
manifest.byCategory("data-display.collections")
  .filter(c => c.composition.validChildren.includes("avatar"))
// → [list, tree, kanban]

// "What can I put inside a card?"
manifest.suggestChildren("card")
// → [heading, text, kpi-card, button, form, image, ...]

// "Is it okay to put a table inside an accordion?"
manifest.validateComposition("accordion", ["data-table"])
// → { valid: false, reason: "Charts/tables in accordions cause sizing issues",
//     suggestion: "Use tabs or always-visible container" }

// "What's a better choice than pie-chart for comparing 2 values?"
manifest.getAlternatives("pie-chart")
  .filter(a => a.reason.includes("few categories"))
// → [{ type: "bar-chart", reason: "Better for <5 categories" },
//    { type: "kpi-card", reason: "Best for 1-2 values with comparison" }]
```

---

## LLM System Prompt Integration

The manifest generates an optimized system prompt section:

```typescript
function generateLLMContext(manifest: ComponentManifest): string {
  return `
## Available Components (${manifest.meta.name} v${manifest.meta.version})

### By Category
${formatCategoryTree(manifest.semantics.categories)}

### Component Quick Reference
${formatQuickReference(manifest.components)}

### Composition Rules
${formatCompositionRules(manifest.composition)}

### Common Patterns
${formatPatterns(manifest.semantics.patterns)}

### Avoid These Anti-Patterns
${formatAntiPatterns(manifest.semantics.antiPatterns)}

### Data Binding Examples
${formatBindingExamples(manifest.components)}
`;
}
```

**Output (compressed for LLM context efficiency):**

```markdown
## Components (turbostarter v1.0)

### Categories
- Layout: container, grid, stack, split, sidebar
- Metrics: kpi-card, gauge, sparkline
- Charts: line-chart, bar-chart, pie-chart, scatter, heatmap
- Tables: data-table, list, tree, kanban
- Forms: input, select, checkbox, date, upload
- Feedback: alert, modal, toast, progress

### Quick Reference
| Type | Use For | Binds To | Children |
|------|---------|----------|----------|
| K (kpi-card) | Single metric | number, {value,trend} | none |
| Ln (line-chart) | Trends over time | [{x,y}] | none |
| Tb (data-table) | Tabular data | object[] | columns |
| G (grid) | Responsive layout | none | any |
| Cd (card) | Grouped content | none | any |

### Patterns
- Dashboard header: G[3-4] K K K K
- Master-detail: Sp[30:70] L :items Cd {detail}
- Form section: Cd H3 "Title" St In In In

### Never Do
- ❌ Chart inside accordion (sizing breaks)
- ❌ Nested scroll containers
- ❌ Form inputs in table cells
```

---

## Adaptive Manifests: Context-Aware Specs

Different contexts need different specifications:

```typescript
interface ManifestContext {
  /** Target device */
  device: "desktop" | "tablet" | "mobile";

  /** User role/expertise */
  audience: "developer" | "designer" | "business";

  /** Fidelity level */
  fidelity: "sketch" | "wireframe" | "production";

  /** Token budget for LLM context */
  tokenBudget: number;
}

function getManifest(
  theme: LiquidTheme,
  context: ManifestContext
): ComponentManifest {
  // Filter components by device capability
  // Adjust examples by audience
  // Compress based on token budget
  // Include fidelity-appropriate specs
}
```

### Mobile-Optimized Manifest

```yaml
# Only components that work well on mobile
components:
  - stack (not grid - single column preferred)
  - list (touch-friendly)
  - card (tap targets)
  - button (44px min height)
  - input (auto-zoom prevention)

excluded:
  - data-table (use list instead)
  - heatmap (needs hover)
  - split (no room for panels)

adaptations:
  - "Grid with >2 columns → Stack on mobile"
  - "Hover tooltips → Long-press or inline"
```

### Sketch-Fidelity Manifest

```yaml
# Minimal props, focus on structure
components:
  - All types available
  - Props limited to: binding, label, children
  - No styling, no features

purpose: "Rapid prototyping, structure exploration"

examples:
  - name: Quick dashboard
    dsl: |
      St
        G[3] K K K
        Sp[70:30]
          Ln :data
          St Cd Cd Cd
```

---

## Theme Comparison & Migration

Manifests enable intelligent theme switching:

```typescript
interface ThemeComparison {
  /** Components in both themes */
  compatible: string[];

  /** Components only in source */
  missing: Array<{
    source: string;
    alternatives: string[];
  }>;

  /** Props that differ */
  propChanges: Array<{
    component: string;
    prop: string;
    change: "renamed" | "removed" | "type-changed";
    migration: string;
  }>;
}

function compareThemes(
  from: ComponentManifest,
  to: ComponentManifest
): ThemeComparison;
```

**Example: Migrating from default to turbostarter**

```yaml
comparison:
  compatible: [button, card, input, select, ...]  # 70 components

  missing:
    - source: sparkline
      alternatives:
        - line-chart (full-featured, larger)
        - kpi-card with trend (simpler)

  propChanges:
    - component: button
      prop: variant
      change: renamed
      migration: |
        default: variant="primary" | "secondary" | "ghost"
        turbostarter: intent="primary" | "secondary" | "ghost"

    - component: data-table
      prop: pagination
      change: type-changed
      migration: |
        default: pagination={true}
        turbostarter: pagination={{ pageSize: 10, showSizeChanger: true }}
```

---

## The Complete Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LIQUID COMPONENT INTELLIGENCE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │   Theme     │                                │
│                              │  Manifest   │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│         ┌───────────────────────────┼───────────────────────────┐           │
│         │                           │                           │           │
│         ▼                           ▼                           ▼           │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐        │
│  │   LLM       │           │  Runtime    │           │   Dev       │        │
│  │  Context    │           │ Validation  │           │  Tooling    │        │
│  └─────────────┘           └─────────────┘           └─────────────┘        │
│         │                           │                           │           │
│         │                           │                           │           │
│  • Component specs          • Type checking           • Autocomplete        │
│  • Composition rules        • Prop validation         • Documentation       │
│  • Usage patterns           • A11y enforcement        • Migration tools     │
│  • Anti-patterns            • Feature gates           • Theme comparison    │
│         │                           │                           │           │
│         └───────────────────────────┼───────────────────────────┘           │
│                                     │                                       │
│                                     ▼                                       │
│                          ┌─────────────────┐                                │
│                          │  Correct UI     │                                │
│                          │  Every Time     │                                │
│                          └─────────────────┘                                │
│                                                                             │
│  "The theme doesn't just render—it teaches, validates, and evolves."       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Static Manifest (Now → 2 weeks)
- [ ] Define `ComponentManifest` TypeScript interface
- [ ] Create manifest for default theme (77 components)
- [ ] Add to `LiquidTheme` interface
- [ ] Export from theme packages

### Phase 2: LLM Integration (2-4 weeks)
- [ ] Build manifest → system prompt generator
- [ ] Create `useManifest()` hook for runtime queries
- [ ] Integrate with existing code generation pipeline
- [ ] Add composition validation to parser

### Phase 3: Developer Tooling (4-6 weeks)
- [ ] VSCode extension with manifest-aware autocomplete
- [ ] Theme comparison CLI tool
- [ ] Migration script generator
- [ ] Component documentation generator

### Phase 4: Adaptive Manifests (6-8 weeks)
- [ ] Context-aware manifest generation
- [ ] Token budget optimization
- [ ] Fidelity-level filtering
- [ ] Device-specific recommendations

---

## Key Insight

**The theme manifest is not documentation—it's executable knowledge.**

- Documentation tells humans what components do
- Manifests tell machines how to use them correctly
- Together, they create a feedback loop where:
  - LLMs generate better code
  - Validation catches mistakes
  - Patterns emerge from usage
  - Manifests evolve with the theme

This transforms Liquid from "a way to render UI" into "a way to teach machines about UI."
