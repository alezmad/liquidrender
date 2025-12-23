# Product Requirements Document — LiquidRender

**Version:** 1.0  
**Author:** Agutierrez  
**Date:** 2025-12-21  
**Status:** Ready for Implementation

---

## Executive Summary

LiquidRender transforms **any data source** into instant, beautiful dashboards. Drop a file, ask a question, create a survey, or connect your APIs — see a professional dashboard in seconds. No signup required for first use.

**Core Promise:** Seconds, not hours. The "holy shit" moment when María sees her ugly Excel become a beautiful dashboard with HER data.

**The Paradigm:**
```
USER INTENT (prompt, action, or implicit)
              │
              ▼
┌─────────────────────────────────────┐
│         DATA CONTEXT                │
│  Files │ Surveys │ APIs │ DBs      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      LIQUID UI ENGINE               │
│  AI → Schema → Validate → Render    │
└─────────────────────────────────────┘
              │
              ▼
         DASHBOARD
```

**The prompt is the INTENT. The sources are the CONTEXT. Liquid UI resolves both.**

---

## Phase 1 Scope: IN/OUT (LOCKED)

### ✅ IN SCOPE — Phase 1 (Week 1-4)

| Feature | Week | Description |
|---------|------|-------------|
| File upload (drag-drop) | 1 | Excel, CSV, JSON — no signup required |
| File parsing | 1 | Extract tabular data with type detection |
| LiquidSchema engine | 1 | Zod-validated schema system |
| Component catalog (7 blocks) | 1 | KPI, bar, line, pie, table, grid, text |
| AI dashboard generation | 2 | Mastra + Claude Sonnet |
| Semantic cache | 2 | Upstash Redis by file hash |
| Fallback templates | 2 | When AI fails, show something useful |
| Landing page + drop zone | 3 | Zero-friction entry |
| Dashboard viewer | 3 | Render LiquidSchema to React |
| Computation transparency | 3 | “How calculated” details for KPIs & charts |
| Share link generation | 3 | Public URL, no auth to view |
| Google OAuth | 4 | One-click signup |
| Save dashboards | 4 | Persist to user account |
| Anonymous → User migration | 4 | Transfer dashboards on signup |
| Free tier limits (5/month) | 4 | Conversion trigger |

### ❌ OUT OF SCOPE — Phase 1

| Feature | Phase | Reason |
|---------|-------|--------|
| Mermaid diagrams | 2 | Doesn't contribute to "holy shit" moment |
| AI Survey Builder | 2 | Separate input source |
| API connections (Stripe) | 3 | Complexity, OAuth flows |
| Database connections | 3 | Security, credentials |
| MCP integration | 3 | Platform feature |
| Conversational interface | 4 | Requires Phase 3 sources |
| Mobile app | 5 | Need content first |
| Voice input/output | Future | Nice-to-have |
| Dashboard editing | Future | Phase 1 is read-only |
| Custom themes | Future | Default must look great |
| Team collaboration | Future | Single user first |
| White-label | Future | Pro feature |
| PDF export | Future | Pro feature |

**Phase 1 Principle:** If María can't use it to convert her Excel at 11 PM, it's not Phase 1.

---

## Metrics Glossary (Single Source of Truth)

### Metric Definitions

| Metric | Definition | Target |
|--------|------------|--------|
| **Parse Success** | File uploaded → ParsedData extracted without error | >95% |
| **Generation Success** | AI produced valid LiquidSchema on first attempt | >70% |
| **Retry Success** | Corrector agent fixed invalid schema | >80% of failures |
| **Render Success** | User sees usable dashboard (AI schema OR fallback) | >95% |
| **End-to-End Success** | File drop → rendered dashboard displayed | >85% |
| **End-to-End Time** | Seconds from file drop to dashboard visible | <10s p95 |
| **Cache Hit Rate** | Requests served from schema cache | >30% (Week 4), >50% (Week 8) |

### How Metrics Are Counted

```
File Upload
    │
    ▼
Parse ──────► Parse Success = extracted data
    │              Parse Failure = file rejected
    ▼
AI Generate ──► Generation Success = valid schema first try
    │              Generation Failure = invalid/error
    ▼
[If failed] Retry ──► Retry Success = Corrector fixed it
    │                    Retry Failure = still invalid
    ▼
[If still failed] Fallback Template
    │
    ▼
Render ──────► Render Success = dashboard displayed
                  (counts both AI schema AND fallback)
```

**Key Clarification:** A fallback template counts as "Render Success" but NOT as "Generation Success." This lets us track AI quality separately from user experience.

### Business Metrics (Week 8 Targets)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboards Created | 1,000 | Total successful renders |
| Registered Users | 300+ | Signups via OAuth |
| Registration Rate | >30% | Signups / unique visitors who created dashboard |
| Dashboards Shared | 150+ | Share links generated |
| Share Rate | >15% | Shared / created |
| Second File Rate | >40% | Users who try 2nd file in session |
| Day 7 Retention | >20% | Users active 7 days after signup |
| Paid Users | 50 | Upgraded to Pro |
| MRR | €500+ | Monthly recurring revenue |

**North Star Metric:** Dashboards Shared (proves activation + satisfaction + virality)

---

## Anonymous User Handling

### Rules for "No Signup Required"

```
┌─────────────────────────────────────────────────────────────┐
│ ANONYMOUS USER FLOW                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ First Visit:                                                │
│   • Generate anonymous_id (UUID in cookie)                  │
│   • Cookie: HttpOnly, SameSite=Lax, 30-day expiry          │
│   • No limits on first dashboard                            │
│                                                             │
│ Dashboards 1-5:                                             │
│   • Track by anonymous_id                                   │
│   • Dashboards saved with anonymous_id as owner             │
│   • Show soft prompt: "Sign up to save permanently"         │
│                                                             │
│ Dashboard 6+:                                               │
│   • Hard gate: "Sign up to continue"                        │
│   • Cannot create more without OAuth                        │
│   • Can still VIEW existing dashboards                      │
│                                                             │
│ On Signup:                                                  │
│   • Migrate anonymous_id dashboards to user account         │
│   • Delete anonymous_id cookie                              │
│   • Full history preserved                                  │
│                                                             │
│ Share Links:                                                │
│   • Work without auth (anyone can view)                     │
│   • Viewer sees "Made with LiquidRender" + CTA              │
│   • Viewer can create their own (starts their count)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Abuse Prevention

| Attack Vector | Mitigation |
|---------------|------------|
| Cookie clearing to reset limit | IP-based secondary tracking (soft limit) |
| Bot uploads | Rate limit: 10 uploads/hour per IP |
| Large file DoS | Max 10MB file size |
| Duplicate file spam | File hash dedup (same hash = same dashboard) |
| Share link scraping | Unguessable tokens (UUID v4) |

### Data Retention (Anonymous)

| Data Type | Retention | After Expiry |
|-----------|-----------|--------------|
| Anonymous dashboard | 7 days from last view | Soft delete |
| Uploaded file | Parse then delete immediately | Never stored |
| Parsed data | Stored in dashboard record | Deleted with dashboard |
| Schema cache | 24 hours | Auto-evict |

---

## File Parsing Specification

### Supported File Types

| Type | Extensions | Parser | Notes |
|------|------------|--------|-------|
| Excel | .xlsx, .xls | SheetJS | Most common, highest priority |
| CSV | .csv | PapaParse | Simple, reliable |
| JSON | .json | Native | Must be array of objects |

### Excel Parsing Rules

```
┌─────────────────────────────────────────────────────────────┐
│ EXCEL PARSING SPEC                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ SUPPORTED:                                               │
│   • .xlsx, .xls files (via SheetJS)                        │
│   • First sheet only (if multiple)                          │
│   • Headers in row 1 (required)                             │
│   • Up to 10,000 rows                                       │
│   • Up to 50 columns                                        │
│   • Data types: text, number, date, currency, percentage    │
│   • Formulas → evaluated values (not formulas)              │
│                                                             │
│ ❌ NOT SUPPORTED (Phase 1):                                 │
│   • Macros (VBA) → stripped, warning shown                  │
│   • Pivot tables → skipped, warning shown                   │
│   • Charts/images → ignored                                 │
│   • Password protected → rejected with message              │
│   • Multiple sheets → first sheet used, user notified       │
│                                                             │
│ 🔄 EDGE CASE HANDLING:                                      │
│   • Merged cells → unmerge, fill with first value           │
│   • No headers detected → use "Column A", "Column B"...     │
│   • Mixed types in column → coerce to string                │
│   • Empty rows → skip entirely                              │
│   • >50 columns → truncate, warn user                       │
│   • >10,000 rows → truncate, warn user                      │
│   • Date formats → normalize to ISO 8601                    │
│   • Currency symbols → detect, store in metadata            │
│   • Locale differences → handle comma vs dot decimals       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CSV Parsing Rules

| Rule | Handling |
|------|----------|
| Delimiter detection | Auto-detect: comma, semicolon, tab |
| Encoding | UTF-8, Latin-1, auto-detect |
| Headers | First row = headers (required) |
| Quotes | Standard CSV quoting supported |
| Newlines in fields | Supported if quoted |
| Max size | 10MB / 10,000 rows / 50 columns |

### JSON Parsing Rules

| Rule | Handling |
|------|----------|
| Structure | Must be array of objects: `[{...}, {...}]` |
| Nested objects | Flatten to dot notation: `user.name` |
| Arrays in values | Convert to comma-separated string |
| Null values | Preserve as null |
| Max depth | 3 levels (then stringify) |
| Max size | 10MB |

### ParsedData Output Schema

```typescript
interface ParsedData {
  // Metadata
  fileName: string;
  fileType: 'excel' | 'csv' | 'json';
  fileHash: string;           // SHA-256 for caching
  parsedAt: string;           // ISO timestamp
  
  // Structure
  rowCount: number;
  columnCount: number;
  
  // Schema
  columns: ColumnSchema[];
  
  // Data
  rows: Record<string, unknown>[];
  
  // Warnings (non-fatal issues)
  warnings: ParseWarning[];
}

interface ColumnSchema {
  name: string;               // Header name
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  nullable: boolean;
  uniqueValues?: number;      // For categorical detection
  min?: number;               // For numeric
  max?: number;               // For numeric
  currencySymbol?: string;    // For currency
  dateFormat?: string;        // Detected format
}

interface ParseWarning {
  code: 'TRUNCATED_ROWS' | 'TRUNCATED_COLS' | 'MULTIPLE_SHEETS' | 
        'MACROS_STRIPPED' | 'MERGED_CELLS' | 'NO_HEADERS' | 'MIXED_TYPES';
  message: string;
  details?: Record<string, unknown>;
}
```

---

## LiquidSchema Specification (Phase 1)

### Core Schema Structure

```typescript
interface LiquidSchema {
  version: '1.0';
  id: string;                  // UUID
  title: string;               // Dashboard title
  description?: string;
  generatedAt: string;         // ISO timestamp
  dataSource: DataSourceMeta;
  layout: LayoutBlock;
  blocks: Block[];
}

interface DataSourceMeta {
  type: 'file' | 'survey' | 'api' | 'database';
  fileName?: string;
  fileHash?: string;
  columns: ColumnSchema[];     // From ParsedData
}

interface LayoutBlock {
  type: 'grid';
  columns: number;             // 1-4 for responsive
  gap: 'sm' | 'md' | 'lg';
  areas: LayoutArea[];         // Grid template areas
}

interface LayoutArea {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  blockId: string;             // References Block.id
}
```

### Phase 1 Block Types (Exactly 7)

| Block Type | Purpose | Required Props |
|------------|---------|----------------|
| `kpi-card` | Single metric with trend | value, label, trend?, icon? |
| `bar-chart` | Categorical comparison | data, xField, yField, title? |
| `line-chart` | Time series / trends | data, xField, yField, title? |
| `pie-chart` | Part-to-whole | data, valueField, labelField, title? |
| `data-table` | Raw data display | data, columns, title?, pageSize? |
| `grid-layout` | Container for blocks | children, columns |
| `text-block` | Titles, descriptions | content, variant |

### Block Schema Definitions

```typescript
// Base block interface
interface Block {
  id: string;
  type: BlockType;
  binding: DataBinding;

  // Optional transparency metadata (used to build "How calculated" UI)
  explain?: Explainability;
  warnings?: string[];          // Non-fatal issues (inferred types, truncation, etc.)
}

interface Explainability {
  calculation: string;          // Human-readable summary (e.g., "SUM(revenue) grouped by region")
  columnsUsed: string[];        // Column names referenced by bindings
  groupBy?: string[];           // Dimensions used for grouping
  filters?: string[];           // Any filters applied (if any)
  assumptions?: string[];       // Inferences made (e.g., "date inferred from 'Order Date'")
  coverage?: {
    rowsUsed: number;           // Rows used for this block
    totalRows: number;          // Total rows in selected table
    dateRange?: { start: string; end: string }; // ISO dates if applicable
  };
  confidence?: number;          // 0..1 (optional), used only for UI hints
}


// KPI Card
interface KPICardBlock extends Block {
  type: 'kpi-card';
  binding: {
    value: ValueBinding;       // Column or aggregation
    label: string;
    trend?: TrendBinding;      // Compare to previous period
    format?: 'number' | 'currency' | 'percentage';
    icon?: string;             // Lucide icon name
  };
}

// Bar Chart
interface BarChartBlock extends Block {
  type: 'bar-chart';
  binding: {
    data: DataBinding;
    xField: string;            // Column name (categorical)
    yField: string;            // Column name (numeric)
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    title?: string;
    orientation?: 'vertical' | 'horizontal';
    color?: string;
  };
}

// Line Chart
interface LineChartBlock extends Block {
  type: 'line-chart';
  binding: {
    data: DataBinding;
    xField: string;            // Column name (date/ordered)
    yField: string;            // Column name (numeric)
    aggregation?: 'sum' | 'avg' | 'count';
    title?: string;
    showPoints?: boolean;
    color?: string;
  };
}

// Pie Chart
interface PieChartBlock extends Block {
  type: 'pie-chart';
  binding: {
    data: DataBinding;
    valueField: string;        // Column name (numeric)
    labelField: string;        // Column name (categorical)
    title?: string;
    showLegend?: boolean;
  };
}

// Data Table
interface DataTableBlock extends Block {
  type: 'data-table';
  binding: {
    data: DataBinding;
    columns: TableColumn[];
    title?: string;
    pageSize?: number;         // Default: 10
    sortable?: boolean;
  };
}

interface TableColumn {
  field: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
}

// Text Block
interface TextBlock extends Block {
  type: 'text-block';
  binding: {
    content: string;
    variant: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  };
}

// Data Binding
interface DataBinding {
  source: 'full' | 'filtered' | 'aggregated';
  filter?: FilterExpression;
  columns?: string[];          // Subset of columns
}

interface ValueBinding {
  column: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';
}

interface TrendBinding {
  compare: 'previous' | 'first';
  format: 'percentage' | 'absolute';
}
```

### Validation Rules (Zod)

```typescript
// Every schema MUST pass Zod validation before render
const LiquidSchemaValidator = z.object({
  version: z.literal('1.0'),
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  generatedAt: z.string().datetime(),
  dataSource: DataSourceMetaSchema,
  layout: LayoutBlockSchema,
  blocks: z.array(BlockSchema).min(1).max(20),
});

// Validation guarantees:
// 1. All required fields present
// 2. Block IDs are unique
// 3. Layout references valid block IDs
// 4. Column references exist in dataSource.columns
// 5. Aggregations only on numeric columns
// 6. No circular references
// 7. If explainability is present, referenced columns must exist
```

### Layout Rules

```
┌─────────────────────────────────────────────────────────────┐
│ RESPONSIVE LAYOUT                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Desktop (>1024px):   4 columns                              │
│ Tablet (768-1024px): 2 columns                              │
│ Mobile (<768px):     1 column                               │
│                                                             │
│ Standard Dashboard Layout:                                  │
│ ┌─────────┬─────────┬─────────┬─────────┐                  │
│ │   KPI   │   KPI   │   KPI   │   KPI   │  Row 1           │
│ ├─────────┴─────────┼─────────┴─────────┤                  │
│ │    Bar Chart      │    Line Chart     │  Row 2           │
│ ├───────────────────┴───────────────────┤                  │
│ │              Data Table               │  Row 3           │
│ └───────────────────────────────────────┘                  │
│                                                             │
│ AI should generate layouts that:                            │
│   • Put KPIs at top                                         │
│   • Put charts in middle                                    │
│   • Put tables at bottom                                    │
│   • Use colSpan for emphasis                                │
│   • Limit to 3-4 rows for initial view                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Schema Versioning

| Version | Description | Migration |
|---------|-------------|-----------|
| 1.0 | Initial Phase 1 schema | N/A |
| 1.1+ | Future additions | Renderer must handle gracefully |

**Migration Strategy:**
- Renderer checks `version` field
- Unknown block types → render as placeholder
- Unknown props → ignore (forward compatible)
- Missing required props → render with defaults

---

## Data Handling & Privacy

### What Gets Stored

| Data Type | Stored? | Where | Duration | Encryption |
|-----------|---------|-------|----------|------------|
| Uploaded file | ❌ NO | N/A | Parsed then discarded | N/A |
| ParsedData | ✅ YES | PostgreSQL (JSONB) | With dashboard | At rest |
| LiquidSchema | ✅ YES | PostgreSQL (JSONB) | With dashboard | At rest |
| File hash | ✅ YES | PostgreSQL + Redis | With dashboard + cache | No (not sensitive) |
| User account | ✅ YES | PostgreSQL | Until deletion | At rest |
| Anonymous ID | ✅ YES | Cookie + PostgreSQL | 30 days | HttpOnly |

### Retention Policy

| User Type | Dashboard Retention | Account Retention |
|-----------|--------------------|--------------------|
| Anonymous | 7 days from last view | 30 days (cookie) |
| Free tier | Indefinite (until 5 limit) | Until account deletion |
| Pro tier | Indefinite | Until account deletion |

### Data Deletion

| Action | Effect |
|--------|--------|
| User deletes dashboard | Soft delete, hard delete after 30 days |
| User deletes account | All dashboards deleted, anonymized analytics kept |
| Anonymous TTL expires | Dashboard + parsed data deleted |
| GDPR data request | Export all user data as JSON |
| GDPR deletion request | Full hard delete within 30 days |

### Share Link Security

| Feature | Implementation |
|---------|----------------|
| Token format | UUID v4 (unguessable) |
| Token length | 36 characters |
| Expiration | Never (for now), future: optional |
| Revocation | User can delete dashboard |
| View logging | Anonymous view count stored |
| Data download | NOT allowed (view only) |
| Embed mode | NOT in Phase 1 |

### Privacy Posture

```
┌─────────────────────────────────────────────────────────────┐
│ PRIVACY PRINCIPLES                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Files are NEVER stored                                   │
│    → Parsed in memory, then discarded                       │
│    → Only structured data kept                              │
│                                                             │
│ 2. Data belongs to user                                     │
│    → Full export available                                  │
│    → Full deletion available                                │
│                                                             │
│ 3. Minimal data collection                                  │
│    → No tracking pixels                                     │
│    → No third-party analytics (Plausible only)              │
│    → No selling data                                        │
│                                                             │
│ 4. Shared dashboards show data                              │
│    → User is responsible for what they share                │
│    → Warning shown before generating share link             │
│    → "Anyone with this link can see this dashboard"         │
│                                                             │
│ 5. GDPR compliance                                          │
│    → Cookie consent for anonymous tracking                  │
│    → Data export on request                                 │
│    → Data deletion on request                               │
│    → Privacy policy at /privacy                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Observability & QA Requirements

### Structured Logging

Every dashboard render must log:

```typescript
interface RenderLog {
  // Request context
  requestId: string;          // UUID for tracing
  timestamp: string;          // ISO 8601
  userId?: string;            // If authenticated
  anonymousId?: string;       // If anonymous
  
  // File info
  fileName: string;
  fileType: 'excel' | 'csv' | 'json';
  fileSize: number;
  fileHash: string;
  
  // Parse phase
  parseStartMs: number;
  parseEndMs: number;
  parseSuccess: boolean;
  parseError?: string;
  rowCount?: number;
  columnCount?: number;
  parseWarnings?: string[];
  
  // AI phase
  cacheHit: boolean;
  aiStartMs?: number;
  aiEndMs?: number;
  aiModel: string;
  aiTokensIn?: number;
  aiTokensOut?: number;
  aiCostUsd?: number;
  aiSuccess?: boolean;
  aiError?: string;
  
  // Retry phase (if applicable)
  retryAttempted: boolean;
  retrySuccess?: boolean;
  retryError?: string;
  
  // Fallback phase (if applicable)
  fallbackUsed: boolean;
  fallbackTemplate?: string;
  
  // Render phase
  renderStartMs: number;
  renderEndMs: number;
  renderSuccess: boolean;
  renderError?: string;
  
  // Final outcome
  outcome: 'success' | 'partial' | 'failure';
  totalTimeMs: number;
  blocksRendered: number;
}
```

### Failure Taxonomy

| Category | Code | Description | Action |
|----------|------|-------------|--------|
| Parse Error | PE001 | Unsupported file type | User message, suggest formats |
| Parse Error | PE002 | File too large | User message, suggest limit |
| Parse Error | PE003 | Corrupted file | User message, try different file |
| Parse Error | PE004 | No tabular data | User message, explain requirements |
| Parse Error | PE005 | Password protected | User message, remove password |
| AI Error | AI001 | Model timeout | Auto-retry once |
| AI Error | AI002 | Model refusal | Use fallback template |
| AI Error | AI003 | Rate limited | Queue with ETA |
| AI Error | AI004 | Invalid response | Corrector agent |
| Validation Error | VE001 | Schema validation failed | Corrector agent |
| Validation Error | VE002 | Column reference invalid | Corrector agent |
| Validation Error | VE003 | Corrector also failed | Use fallback template |
| Render Error | RE001 | Component error | Partial render + error block |
| Render Error | RE002 | Data binding failed | Show empty state |
| System Error | SE001 | Database unavailable | 503 + retry |
| System Error | SE002 | Cache unavailable | Proceed without cache |

### Admin Dashboard Requirements

| Metric | Visualization | Alert Threshold |
|--------|---------------|-----------------|
| Render success rate | Line chart (hourly) | <80% triggers alert |
| Parse failure by type | Pie chart | N/A |
| AI cost per day | Bar chart | >$10/day |
| Avg render time | Line chart | >15s p95 |
| Cache hit rate | Gauge | <20% |
| Active users | Counter | N/A |
| Queue depth | Gauge | >10 |

### Test Strategy

| Test Type | Coverage | Tool |
|-----------|----------|------|
| Unit tests | Parsers, validators, bindings | Vitest |
| Integration tests | AI pipeline, render flow | Vitest |
| E2E tests | User journeys (María, Diego) | Playwright |
| Visual regression | Dashboard snapshots | Percy or Chromatic |
| Performance tests | Render time p95 | k6 |
| Schema fuzz testing | Random valid schemas | Custom |

**Critical Test Scenarios:**
1. 10 different real-world Excel files → all render successfully
2. Same file uploaded twice → cache hit on second
3. AI fails → Corrector fixes → valid schema
4. AI fails → Corrector fails → fallback template used
5. Anonymous user creates 5 → blocks at 6 → signs up → continues
6. Share link works without auth
7. Mobile responsive layout

---

## UX Clarifications

### Dashboard Editing (Phase 1)

**Phase 1 dashboards are READ-ONLY.** Users cannot:
- Rename KPIs
- Change chart types
- Reorder blocks
- Edit data

**Rationale:** Focus on "magic moment." Editing is Phase 2+.

**What users CAN do:**
- Rename dashboard title
- Generate new dashboard from same file
- Delete dashboard
- Share dashboard

### Conversion Moments

| Trigger | Action | CTA |
|---------|--------|-----|
| After first dashboard | Soft prompt | "Sign up to save this" (dismissible) |
| After share link used | Soft prompt | "Sign up to track views" (dismissible) |
| At 3rd dashboard | Soft prompt | "You've made 3 dashboards. Sign up to keep them." |
| At 6th dashboard | Hard gate | "Sign up to continue" (required) |
| Dashboard TTL warning | Email/banner | "Your dashboard expires in 2 days. Sign up to keep it." |

### Share Experience

| Element | Behavior |
|---------|----------|
| Share button location | Top right of dashboard viewer |
| Click share | Modal: "Anyone with this link can view this dashboard" |
| Copy link | One-click copy to clipboard |
| Attribution | Bottom of shared view: "Made with LiquidRender" + logo |
| Attribution CTA | "Create your own dashboard in seconds →" |
| Data download | NOT available (view only) |
| Print/screenshot | Allowed (can't prevent) |
| Embed | NOT available in Phase 1 |


### Trust & Transparency Layer (Phase 1)

**Goal:** Make it obvious *what the system did* so users can quickly verify the dashboard.

**UI behavior:**
- Every KPI card and chart shows a subtle **ⓘ “How calculated”** affordance.
- Clicking opens an expandable sheet/drawer with:
  - **Calculation** (human-readable, e.g., “SUM(Revenue) by Region”)
  - **Columns used** and **grouping**
  - **Filters** (if any)
  - **Assumptions / inferences** (e.g., inferred date column)
  - **Coverage** (rows used vs total, date range when relevant)
- When data is truncated/sampled/inferred, show a compact badge on the block (e.g., **Sampled**, **Inferred**), and repeat details in the drawer.

**Generation requirement:**
- The AI should populate `block.explain` whenever possible.
- If `block.explain` is missing, the renderer must generate a minimal explanation from bindings (calculation + columns).

**Non-goals (Phase 1):**
- No freeform block editing.
- No “SQL view” export (can be added later).


### Prompt + File Upload (FR16)

**Phase 1 includes basic prompt guidance:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Drop your file here                                        │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Optional: Tell us what you're looking for                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "Show me sales by region"                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  This helps us create a more relevant dashboard.            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How prompt affects generation:**
- Prompt is passed to AI as additional context
- AI prioritizes columns/metrics mentioned in prompt
- If prompt mentions specific chart type, AI tries to include it
- If prompt is empty, AI uses default heuristics

---

## Technical Architecture

### Package Structure

```
packages/
├── liquid-ui/
│   ├── core/           # Schemas, types, validation
│   ├── parsers/        # File parsing (Excel, CSV, JSON)
│   ├── catalog/        # React components (charts, KPIs, tables)
│   ├── react/          # LiquidRenderer for web
│   └── agents/         # Mastra AI agents
│
├── db/
│   └── schema/
│       └── dashboard.ts  # Dashboard, DashboardFile tables
│
└── api/
    └── modules/
        └── dashboards/   # Hono router for dashboard API

apps/
└── web/                  # Next.js application
```

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/dashboards/upload | Optional | Get presigned upload URL |
| POST | /api/dashboards/render | Optional | Generate dashboard from file |
| GET | /api/dashboards | Required | List user's dashboards |
| GET | /api/dashboards/:id | Optional* | Get dashboard by ID |
| POST | /api/dashboards/:id/share | Required | Generate share link |
| DELETE | /api/dashboards/:id | Required | Delete dashboard |
| GET | /api/share/:token | None | View shared dashboard |

*Optional auth: owners see full dashboard, others only if shared.

### AI Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. ROUTER (Haiku, ~100ms)                                 │
│     Input: ParsedData + optional prompt                     │
│     Output: Intent classification, suggested blocks         │
│                                                             │
│  2. CACHE CHECK (Redis, ~10ms)                             │
│     Key: file_hash + prompt_hash                            │
│     Hit: Return cached schema                               │
│     Miss: Continue to generator                             │
│                                                             │
│  3. GENERATOR (Sonnet, ~1500ms)                            │
│     Input: ParsedData + Intent + block suggestions          │
│     Output: LiquidSchema (JSON)                             │
│                                                             │
│  4. VALIDATOR (Zod, ~5ms)                                  │
│     Input: Raw AI output                                    │
│     Output: Valid schema OR validation errors               │
│                                                             │
│  5. CORRECTOR (Haiku, ~100ms) - if validation failed       │
│     Input: Invalid schema + errors                          │
│     Output: Corrected schema                                │
│     Max retries: 1                                          │
│                                                             │
│  6. FALLBACK - if still invalid                            │
│     Select template based on data shape                     │
│     Generic: 4 KPIs + bar chart + table                    │
│                                                             │
│  7. CACHE WRITE (Redis)                                    │
│     Store valid schema with 24h TTL                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Time Budget

| Phase | Target | Max |
|-------|--------|-----|
| Upload + Transfer | 500ms | 2s |
| Parse | 500ms | 2s |
| Router | 100ms | 500ms |
| Cache lookup | 10ms | 100ms |
| Generator | 1500ms | 4s |
| Validator | 5ms | 50ms |
| Corrector (if needed) | 100ms | 500ms |
| Render | 200ms | 1s |
| **Total** | **~3s** | **<10s** |

---

## User Personas & Journeys

### Primary Persona: María García

**Profile:**
- 32 years old, Marketing Coordinator
- B2B SaaS startup, 40 employees
- Reports to VP of Marketing
- Non-technical, uses Excel daily

**Her Pain:**
> "I have the data. I know there's something interesting here. But turning it into something professional takes HOURS and never looks the way I want."

**Her Journey:**
1. 11:47 PM, fighting Excel, boss wants "visualized numbers" by 9 AM
2. Googles "Excel to dashboard fast"
3. Finds LiquidRender, sees "Drop any file"
4. Drags her Q4 Excel, expects nothing
5. 3 seconds later: beautiful dashboard with HER data
6. Says "No fucking way"
7. Tries second file to confirm it wasn't luck
8. Clicks Share, sends to boss, goes to bed
9. Next morning: "Great job, María"

### Secondary Persona: Diego Fernández

**Profile:**
- 38 years old, independent consultant
- Digital marketing for SMBs
- 4-6 clients monthly
- Wants to look professional

**His Pain:**
> "I spend 2 hours making a report the client looks at for 5 minutes."

**His Journey:**
1. Client asks for monthly performance report
2. Has data in Excel from various sources
3. Uses LiquidRender to generate dashboard
4. Client responds: "Wow, this is very professional"
5. Diego upgrades to Pro for white-label
6. Wins more clients with impressive deliverables

---

## Phase 1 Implementation Plan

### Week-by-Week

| Week | Focus | Deliverables |
|------|-------|-------------|
| **1** | Engine | Parsers, LiquidSchema, Catalog (7 blocks), Renderer |
| **2** | AI | Mastra agents, Cache, Fallback templates |
| **3** | Frontend | Landing page, Drop zone, Dashboard viewer, Share |
| **4** | Auth | Google OAuth, Save dashboards, Limits, Anonymous migration |

### Week 1 Day-by-Day

| Day | Hours | Deliverables |
|-----|-------|--------------|
| 1 | 3h | Monorepo setup, `@liquid-ui/parsers` package |
| 2 | 3h | `@liquid-ui/core` with Zod schemas |
| 3 | 3h | `@liquid-ui/catalog` - BarChart, LineChart, PieChart |
| 4 | 3h | Catalog - KPICard, DataTable, TextBlock, GridLayout |
| 5 | 3h | `@liquid-ui/react` - LiquidRenderer, BlockRenderer |
| 6 | 3h | Integration test: Excel → Parse → Hardcoded schema → Render |
| 7 | 2h | Review, document, tag v0.1.0-engine |

### Phase 1 Success Gate

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboards created | >100 | Week 4 |
| Registered users | >30 | Week 4 |
| Dashboards shared | >10 | Week 4 |
| End-to-end success | >85% | Automated |
| Generation time | <10s p95 | Automated |
| No critical bugs | 0 | Manual QA |

**Pass:** Proceed to Phase 2 (Survey)
**Fail:** Iterate on core experience

---

## Admin Panel Requirements

### Overview

LiquidRender includes a Super Admin dashboard built on TurboStarter's admin infrastructure. This panel is the central place to manage the platform, users, usage, costs, and revenue.

**Access:** `/admin` (requires `admin` role)

### Admin Roles & Permissions

```typescript
const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;
```

| Role | Permissions |
|------|-------------|
| `user` | Create dashboards, manage own account |
| `admin` | All user permissions + full admin panel access |

### Admin Dashboard Sections

#### 1. Overview Dashboard

**Purpose:** Quick health check of the platform

| Widget | Data Source | Description |
|--------|-------------|-------------|
| Total Users | PostgreSQL | Count of registered users |
| Active Users (7d) | PostgreSQL | Users with activity in last 7 days |
| Total Dashboards | PostgreSQL | All dashboards created |
| Dashboards Today | PostgreSQL | Created in last 24h |
| Revenue (MRR) | Stripe | Monthly recurring revenue |
| AI Costs (MTD) | Logs/Upstash | Month-to-date AI API costs |
| Net Margin | Calculated | Revenue - Costs |
| Render Success Rate | Logs | % successful renders (24h) |

**Quick Actions:**
- View recent signups
- View failed renders
- View high-cost users

#### 2. Users Management

**Purpose:** Manage all platform users

**List View Columns:**
| Column | Type | Filterable | Sortable |
|--------|------|------------|----------|
| Email | string | ✅ search | ✅ |
| Name | string | ✅ search | ✅ |
| Role | enum | ✅ filter | ✅ |
| Plan | enum | ✅ filter | ✅ |
| Dashboards Count | number | ✅ range | ✅ |
| AI Credits Used | number | ✅ range | ✅ |
| Created At | date | ✅ range | ✅ |
| Last Active | date | ✅ range | ✅ |
| Status | enum | ✅ filter | ✅ |

**User Detail View:**
- Profile information (name, email, avatar)
- Account status (active, banned, deleted)
- Subscription details (plan, billing cycle, next payment)
- Usage statistics:
  - Dashboards created (total, this month)
  - AI credits used (total, this month)
  - Storage used
  - Share links generated
- Connected accounts (Google OAuth)
- Activity log (recent actions)

**User Actions:**
| Action | Description | Confirmation |
|--------|-------------|--------------|
| Impersonate | Login as user to debug | ✅ Required |
| Ban User | Block access to platform | ✅ Required |
| Unban User | Restore access | ✅ Required |
| Delete User | Permanently remove (GDPR) | ✅ Required + type email |
| Change Role | Promote to admin or demote | ✅ Required |
| Reset Limits | Reset monthly dashboard limit | ✅ Required |
| Add Credits | Grant additional AI credits | ✅ Required |
| Force Logout | Invalidate all sessions | Optional |

#### 3. Dashboards Management

**Purpose:** View and manage all dashboards on the platform

**List View Columns:**
| Column | Type | Filterable | Sortable |
|--------|------|------------|----------|
| Title | string | ✅ search | ✅ |
| Owner | relation | ✅ filter | ✅ |
| Status | enum | ✅ filter | ✅ |
| Source Type | enum | ✅ filter | ✅ |
| Views | number | ✅ range | ✅ |
| Shares | number | ✅ range | ✅ |
| Created At | date | ✅ range | ✅ |
| AI Cost | number | ✅ range | ✅ |

**Dashboard Detail View:**
- Preview of the dashboard
- Metadata (title, description, created, updated)
- Owner information
- Source file info (type, size, hash)
- LiquidSchema (JSON viewer)
- Generation logs (parse time, AI time, tokens used)
- Share links (list with view counts)
- Cost breakdown (AI tokens, cache hit/miss)

**Dashboard Actions:**
| Action | Description | Confirmation |
|--------|-------------|--------------|
| View as User | Open dashboard in viewer | No |
| Delete | Remove dashboard | ✅ Required |
| Disable Sharing | Revoke all share links | ✅ Required |
| Export Schema | Download LiquidSchema JSON | No |
| Regenerate | Force new AI generation | ✅ Required |

#### 4. Usage & Analytics

**Purpose:** Understand platform usage patterns

**Metrics Dashboard:**

| Metric | Visualization | Timeframes |
|--------|---------------|------------|
| Dashboards Created | Line chart | 24h, 7d, 30d, 90d |
| Active Users | Line chart | 24h, 7d, 30d, 90d |
| Render Success Rate | Line chart | 24h, 7d, 30d |
| Avg Render Time | Line chart | 24h, 7d, 30d |
| Cache Hit Rate | Line chart | 24h, 7d, 30d |
| File Types Distribution | Pie chart | All time |
| Top Users by Usage | Table | 30d |
| Conversion Funnel | Funnel | 30d |

**Conversion Funnel:**
```
Visitors → First Dashboard → Second Dashboard → Signup → Paid
   100%        45%               18%             12%      2%
```

**Usage Alerts:**
| Alert | Threshold | Notification |
|-------|-----------|--------------|
| High failure rate | >20% in 1h | Email + Slack |
| AI cost spike | >$50/day | Email |
| Queue backup | >20 pending | Slack |
| User abuse | >50 renders/hour | Email |

#### 5. Costs & Revenue

**Purpose:** Track financial health of the platform

**Revenue Section:**

| Metric | Source | Description |
|--------|--------|-------------|
| MRR | Stripe | Monthly recurring revenue |
| ARR | Calculated | MRR × 12 |
| New MRR | Stripe | New subscriptions this month |
| Churned MRR | Stripe | Cancelled subscriptions |
| Net MRR Growth | Calculated | New - Churned |
| Active Subscriptions | Stripe | Current paying users |
| Trial Users | Stripe | In trial period |
| Conversion Rate | Calculated | Paid / Total signups |

**Revenue Charts:**
- MRR trend (12 months)
- Subscriptions by plan (pie)
- New vs Churned (stacked bar)
- Revenue by cohort (table)

**Costs Section:**

| Cost Category | Source | Description |
|---------------|--------|-------------|
| AI API (Claude) | Anthropic | Token usage × price |
| Infrastructure | Vercel | Hosting costs |
| Database | Neon | PostgreSQL |
| Cache | Upstash | Redis |
| Storage | S3/R2 | File storage |
| Email | Resend | Transactional emails |
| Total Costs | Sum | All operational costs |

**Cost Charts:**
- Daily AI costs (bar chart)
- Cost per dashboard (trend)
- Cost by category (pie)
- Top 10 expensive users (table)

**Profitability:**
| Metric | Calculation |
|--------|-------------|
| Gross Margin | (Revenue - AI Costs) / Revenue |
| Net Margin | (Revenue - Total Costs) / Revenue |
| LTV/CAC | (if tracking acquisition cost) |
| Payback Period | Calculated |

#### 6. System Health

**Purpose:** Monitor platform reliability

**Real-time Metrics:**
| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p95) | Vercel | >500ms |
| Error Rate | Logs | >1% |
| Queue Depth | Upstash | >10 |
| Cache Hit Rate | Redis | <20% |
| DB Connections | Neon | >80% pool |

**Logs Viewer:**
- Filter by level (info, warn, error)
- Filter by service (api, ai, parser)
- Filter by requestId
- Full-text search
- Export to CSV

**Error Dashboard:**
| Column | Description |
|--------|-------------|
| Error Code | From failure taxonomy |
| Count (24h) | Occurrences |
| Trend | Increasing/decreasing |
| Last Seen | Timestamp |
| Sample | Link to log entry |

#### 7. Content Moderation (Future)

**Purpose:** Handle reported content and abuse

**Flagged Dashboards:**
- User reports
- Automated detection (PII, inappropriate content)
- Action: review, delete, ban user

### Admin API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/stats | Overview statistics |
| GET | /api/admin/users | List users with filters |
| GET | /api/admin/users/:id | User detail |
| PATCH | /api/admin/users/:id | Update user (role, status) |
| DELETE | /api/admin/users/:id | Delete user |
| POST | /api/admin/users/:id/impersonate | Impersonate user |
| POST | /api/admin/users/:id/ban | Ban user |
| POST | /api/admin/users/:id/unban | Unban user |
| GET | /api/admin/dashboards | List dashboards |
| GET | /api/admin/dashboards/:id | Dashboard detail |
| DELETE | /api/admin/dashboards/:id | Delete dashboard |
| GET | /api/admin/usage | Usage analytics |
| GET | /api/admin/costs | Cost breakdown |
| GET | /api/admin/revenue | Revenue metrics |
| GET | /api/admin/logs | System logs |
| GET | /api/admin/errors | Error summary |

### Database Schema Extensions

```typescript
// packages/db/src/schema/admin.ts

// Usage tracking
export const usageLog = pgTable('usage_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id),
  anonymousId: text('anonymous_id'),
  action: text('action').notNull(), // 'render', 'share', 'export'
  resourceType: text('resource_type'), // 'dashboard', 'survey'
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'), // { fileType, aiCost, renderTime, etc }
  createdAt: timestamp('created_at').defaultNow(),
});

// Cost tracking
export const costLog = pgTable('cost_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  category: text('category').notNull(), // 'ai', 'infra', 'storage'
  provider: text('provider'), // 'anthropic', 'vercel', 'neon'
  amount: decimal('amount', { precision: 10, scale: 4 }),
  currency: text('currency').default('USD'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admin audit log
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => user.id),
  action: text('action').notNull(), // 'ban_user', 'delete_dashboard', etc
  targetType: text('target_type'), // 'user', 'dashboard'
  targetId: uuid('target_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Admin Functional Requirements

- FR-A1: Admins can view platform overview dashboard with key metrics
- FR-A2: Admins can list, search, and filter all users
- FR-A3: Admins can view detailed user information including usage
- FR-A4: Admins can ban/unban users
- FR-A5: Admins can delete users (GDPR compliance)
- FR-A6: Admins can impersonate users for debugging
- FR-A7: Admins can change user roles
- FR-A8: Admins can list, search, and filter all dashboards
- FR-A9: Admins can delete any dashboard
- FR-A10: Admins can view usage analytics over time
- FR-A11: Admins can view cost breakdown by category
- FR-A12: Admins can view revenue metrics from Stripe
- FR-A13: Admins can view system health and error logs
- FR-A14: Admins can export data for reporting
- FR-A15: All admin actions are logged in audit trail

### Phase 1 Admin Scope

**IN Phase 1:**
- Overview dashboard (basic metrics)
- User management (list, detail, ban, delete)
- Dashboard management (list, delete)
- Basic usage stats
- Error log viewer

**Phase 2+:**
- Full cost/revenue dashboard
- Advanced analytics
- Content moderation
- Automated alerts
- API usage tracking

---

## Future Phases (Roadmap Only)

### Phase 2: AI Survey Builder (Week 5-6)

**New capability:** Natural language → AI Survey → Collect responses → Dashboard

**Key Features:**
- AI Survey Generator agent
- Survey preview + editing
- Survey distribution (shareable link)
- Response → ParsedData adapter
- Survey-optimized templates (NPS gauge, word cloud)

### Phase 3: Live Connections (Week 7-10)

**New capability:** Connect APIs + Databases → Live dashboards

**Key Features:**
- OAuth for Stripe
- PostgreSQL connections
- AI → SQL generation
- MCP client
- Scheduled refresh

### Phase 4: Conversational Interface (Week 11-12)

**New capability:** Ask questions about your data in natural language

**Key Features:**
- Chat-based dashboard creation
- Multi-turn conversation
- Dashboard mutation via prompt

### Phase 5: Mobile App (Week 13-16)

**New capability:** View and share dashboards on the go

**Key Features:**
- iOS + Android (Expo)
- Dashboard viewing
- Offline caching
- Push notifications

---

## Appendix A: Functional Requirements (Phase 1)

### Data Input & Parsing
- FR1: Users can upload files via drag-and-drop without authentication
- FR2: System can parse Excel files (.xlsx, .xls) and extract tabular data
- FR3: System can parse CSV files and extract tabular data
- FR4: System can parse JSON files and extract structured data
- FR5: System can detect column types (numeric, date, text, currency) from parsed data
- FR6: Users can view parsing errors with actionable feedback when files fail

### Dashboard Generation
- FR7: System can generate a dashboard schema from parsed data using AI
- FR8: System can validate all AI-generated schemas before rendering
- FR9: System can render dashboards from validated LiquidSchema
- FR10: Users can view automatically extracted KPIs with trend indicators
- FR11: Users can view generated charts (bar, line, pie) based on data patterns
- FR12: Users can view formatted data tables within dashboards
- FR13: Users can inspect “How calculated” details for KPIs and charts (calculation, columns, assumptions, coverage)
- FR14: System can retry failed AI generations with a Corrector agent
- FR15: System can provide template-based fallback when AI generation fails
- FR16: Users can provide a natural language prompt alongside file upload

### Dashboard Management
- FR17: Users can view their list of created dashboards
- FR18: Users can view a specific dashboard by ID
- FR19: Users can delete their own dashboards
- FR20: Users can rename their dashboard title
- FR21: Authenticated users can save dashboards to their account

### Sharing & Viral Loop
- FR22: Users can generate a shareable link for any dashboard
- FR23: Recipients can view shared dashboards without authentication
- FR24: Shared dashboards display attribution ("Made with LiquidRender")
- FR25: Attribution links direct viewers to the landing page

### User Authentication & Accounts
- FR26: Users can sign up and sign in using Google OAuth
- FR27: Users can view their account information
- FR28: Users can sign out of their account
- FR29: System can associate dashboards with authenticated user accounts
- FR30: System can migrate anonymous dashboards to user account on signup

### Subscription & Limits
- FR31: Anonymous users can create up to 5 dashboards (cookie-tracked)
- FR32: Free tier users can create up to 5 dashboards per month
- FR33: System can enforce dashboard creation limits per tier
- FR34: Users can upgrade from free to paid subscription

### Caching & Cost Control
- FR35: System can cache generated schemas by file content hash
- FR36: System can serve cached schemas for repeated file patterns
- FR37: System can enforce token limits on AI generation requests

---

## Appendix B: Non-Functional Requirements (Phase 1)

### Performance
- NFR-P1: Dashboard generation <10 seconds P95
- NFR-P2: File parsing <2 seconds
- NFR-P3: Dashboard load (cached) <3 seconds
- NFR-P4: Landing page LCP <2.5 seconds
- NFR-P5: API response <500ms P95 (non-AI endpoints)

### Security
- NFR-S1: TLS 1.3 for all connections
- NFR-S2: AES-256 encryption at rest
- NFR-S3: Secure session cookies (HttpOnly, SameSite, Secure)
- NFR-S4: Rate limiting: 60 req/min (anon), 300 req/min (auth)
- NFR-S5: File upload max 10MB
- NFR-S6: Input validation via Zod on all endpoints

### Reliability
- NFR-R1: 99.5% API availability
- NFR-R2: Graceful degradation (template fallback on AI failure)
- NFR-R3: No data loss for authenticated user dashboards

### Accessibility
- NFR-A1: WCAG 2.1 Level AA compliance
- NFR-A2: Keyboard navigation for all interactions
- NFR-A3: Screen reader support with ARIA labels
- NFR-A4: 4.5:1 minimum color contrast

### Cost Control
- NFR-C1: AI cost per dashboard <$0.05
- NFR-C2: Token budget per generation <8K tokens
- NFR-C3: Cache hit rate >30% (target >50% by Week 8)
- NFR-C4: Infrastructure cost <$100/month (MVP)

---

**END OF DOCUMENT**

---

*This PRD is the single source of truth for LiquidRender Phase 1. All implementation decisions should reference this document. Scope changes require explicit approval and document update.*
