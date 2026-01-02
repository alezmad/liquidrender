# Knosia Implementation Plan

**Date:** 2026-01-02
**Version:** 1.0
**Goal:** Connect → Intelligent Onboarding → Home (Briefing) + Canvas (Dashboards)

---

## Executive Summary

This plan transforms Knosia's onboarding from a configuration process into a **value-delivery system** that produces two core products:

1. **Home (Briefing)** — AI-generated daily intelligence summary
2. **Canvas** — Interactive, customizable liquid dashboards

The onboarding is designed for **multi-source from day one**, with **business type detection** accelerating time-to-value.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE KNOSIA JOURNEY                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ONBOARDING (60 seconds)                                           │
│   ─────────────────────────                                         │
│   Add Sources → Analyze → Preview Dashboard → Confirm               │
│        │            │              │              │                 │
│        ▼            ▼              ▼              ▼                 │
│   [PostgreSQL]  [SaaS: 94%]   [Real data!]   [Ready!]              │
│   [CSV] 🔜      [MRR, Churn]                                        │
│                                                                     │
│                               ↓                                     │
│                                                                     │
│   PRODUCTS                                                          │
│   ────────                                                          │
│   ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│   │     HOME            │  │          CANVAS                      │  │
│   │     (Briefing)      │  │          (Dashboards)                │  │
│   │                     │  │                                      │  │
│   │  "Good morning.     │  │  ┌────────┐ ┌────────┐ ┌────────┐   │  │
│   │   MRR is up 3.2%    │  │  │ MRR    │ │ Churn  │ │ Growth │   │  │
│   │   Churn spiked..."  │  │  │ $847K  │ │ 2.3%   │ │ +12%   │   │  │
│   │                     │  │  └────────┘ └────────┘ └────────┘   │  │
│   │  [Ask Knosia...]    │  │  [+ Add Block]  [Edit]  [Share]     │  │
│   └─────────────────────┘  └─────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### ✅ Implemented

| Component | Status | Location |
|-----------|--------|----------|
| **Schema Extraction** | Complete | `packages/liquid-connect/src/uvb/extractor.ts` |
| **Hard Rules Engine** | Complete | `packages/liquid-connect/src/uvb/rules.ts` |
| **Vocabulary API** | Complete | `packages/api/src/modules/knosia/vocabulary/` |
| **Vocabulary Browser** | Complete | `apps/web/src/modules/knosia/vocabulary/` |
| **Canvas Schema** | Complete | `knosiaCanvas`, `knosiaCanvasBlock`, `knosiaCanvasAlert` |
| **Canvas Components** | Partial | Grid, blocks, editor, alerts, sharing |
| **Brief Components** | Partial | View, sections, insight cards |
| **Threads (Conversations)** | Partial | View, messages, actions |
| **Connection CRUD** | Complete | `packages/api/src/modules/knosia/connections/` |
| **Analysis API** | Complete | SSE streaming analysis |
| **Onboarding UI** | Partial | Connect + Test + Analysis (single connection) |

### 🚧 Gaps

| Component | Gap | Priority |
|-----------|-----|----------|
| **Business Type Detection** | Not implemented | P0 |
| **KPI Template Catalog** | Not implemented | P0 |
| **Template Mapper** | Not implemented | P0 |
| **Multi-Source State** | Single `connectionId` | P0 |
| **Dashboard Generator** | Not implemented | P1 |
| **Adaptive Decisions UI** | Basic confirmations only | P1 |
| **Home Route** | No page | P1 |
| **Canvas Route** | No page | P1 |
| **Briefing Generator** | Not implemented | P2 |

---

## Implementation Phases

### Phase 0: Foundation (Current Sprint)

**Goal:** Establish multi-source architecture and business type detection without breaking existing flows.

```
Week 1-2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LIQUID-CONNECT ENHANCEMENTS
───────────────────────────

□ 0.1 Create business-types module structure
      Location: packages/liquid-connect/src/business-types/
      Files: index.ts, types.ts

□ 0.2 Implement Business Type Detector
      File: business-types/detector.ts
      Input: ExtractedSchema
      Output: BusinessTypeMatch[] with confidence scores

□ 0.3 Create signature patterns
      File: business-types/signatures.ts
      Patterns for: SaaS, E-commerce, Marketplace, FinTech

□ 0.4 Create first template: SaaS
      File: business-types/catalog/saas.yaml
      Include: MRR, ARR, Churn, NRR, CAC, LTV, Customer Count

□ 0.5 Implement Template Mapper
      File: business-types/mapper.ts
      Maps DetectedVocabulary → Template slots

□ 0.6 Create pipeline function
      Function: analyzeDatabase()
      Combines: extractSchema + detectBusinessType + applyHardRules + mapToTemplate

□ 0.7 Unit tests for detection
      Test with Knosia's own schema (should detect as SaaS-ish or custom)


ONBOARDING STATE REFACTOR
─────────────────────────

□ 0.8 Refactor use-onboarding-state.ts
      Change: connectionId → sources: OnboardingSource[]
      Preserve: backward compatibility during migration

□ 0.9 Define OnboardingSource type
      Fields: id, type, status, connectionId?, fileId?, analysisId?, schema?

□ 0.10 Update API to return business type
       Endpoint: POST /analysis
       Add to response: businessType, confidence, templateMapping
```

**Deliverables:**
- Business type detector that identifies SaaS/E-commerce/etc
- SaaS template with standard KPIs
- Onboarding state ready for multiple sources
- Analysis endpoint returns business type

---

### Phase 1: Multi-Source Onboarding UI

**Goal:** Full onboarding shell with multi-source support, placeholders for coming soon features.

```
Week 3-4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ONBOARDING COMPONENTS
─────────────────────

□ 1.1 Create SourceTypeCard component
      Props: config, status (available | coming_soon), onClick
      States: Available (clickable), Coming Soon (badge + notify)

□ 1.2 Create SourceTypeGrid component
      Shows: All source types (PostgreSQL, MySQL, CSV, etc.)
      Groups: Databases, Files

□ 1.3 Create SourceCard component
      Shows: Added source with status, stats, remove action
      States: connecting, testing, analyzing, ready, error

□ 1.4 Create SourceList component
      Shows: All added sources
      Actions: Add another, Continue

□ 1.5 Refactor connection-form.tsx → PostgresSourceForm
      Standardize for source type abstraction

□ 1.6 Create AddSourceDialog
      Modal with SourceTypeGrid
      Opens PostgresSourceForm when PostgreSQL selected


ADAPTIVE DECISIONS
──────────────────

□ 1.7 Create Decision type system
      Types: confirmation, selection, specification, disambiguation, priority

□ 1.8 Create DecisionCard component
      Renders appropriate UI per decision type
      Includes: escape hatches (skip, none of these, custom)

□ 1.9 Create DecisionScreen component
      Shows: Title, decisions (max 5), progress, continue

□ 1.10 Create generateDecisions() function
       Input: detected vocabulary, business type, mapping
       Output: prioritized Decision[]


BUSINESS TYPE SELECTION
───────────────────────

□ 1.11 Create BusinessTypeCard component
        Shows: detected type with confidence, alternative options

□ 1.12 Create BusinessTypeSelector component
        Shows: detected type, allows override, shows template preview

□ 1.13 Wire business type into onboarding flow
        After analysis → show detected type → allow change
```

**Deliverables:**
- Complete multi-source onboarding UI
- All source types visible (PostgreSQL works, others "Coming Soon")
- Business type detection integrated
- Adaptive decisions replace simple confirmations

---

### Phase 2: Dashboard Preview & Generation

**Goal:** Generate and preview real dashboard during onboarding.

```
Week 5-6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DASHBOARD GENERATOR (LIQUID-CONNECT)
────────────────────────────────────

□ 2.1 Create dashboard module
      Location: packages/liquid-connect/src/dashboard/

□ 2.2 Implement generateDashboard()
      Input: MappingResult, SemanticLayer
      Output: DashboardSpec with sections, KPIs, charts

□ 2.3 Create DashboardSpec → Canvas converter
      Converts generated spec to knosiaCanvas + knosiaCanvasBlock records

□ 2.4 Implement KPI query generation
      Generate LiquidConnect queries for each mapped KPI


PREVIEW COMPONENTS
──────────────────

□ 2.5 Create DashboardPreview component
      Shows: Generated dashboard with REAL data
      States: loading, preview, error

□ 2.6 Create KPIPreviewCard component
      Shows: metric name, value, trend, confidence

□ 2.7 Create ChartPreview component
      Shows: time series chart with real data

□ 2.8 Wire preview into onboarding
      After business type → show dashboard preview → customize or accept


CUSTOMIZATION FLOW
──────────────────

□ 2.9 Create MappingEditor component
      Shows: template KPI → schema column mappings
      Actions: change mapping, show alternatives, specify custom

□ 2.10 Create KPIToggle component
        Allow user to show/hide KPIs from dashboard

□ 2.11 Create AddCustomKPI component
        User can add metrics not in template
```

**Deliverables:**
- Dashboard generated from template + schema mapping
- Real data preview during onboarding
- User can customize before accepting
- Canvas records created on completion

---

### Phase 3: Home (Briefing) & Canvas Routes

**Goal:** Wire onboarding to final products: Home and Canvas.

```
Week 7-8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOME (BRIEFING) PRODUCT
───────────────────────

□ 3.1 Create Home page route
      Path: /dashboard/[org]/home
      Layout: Full-width briefing view

□ 3.2 Implement BriefingGenerator (API)
      Input: workspace, role, vocabulary
      Output: AI-generated briefing content

□ 3.3 Enhance BriefView component
      Sections: Attention (alerts), On Track, Tasks
      Add: Ask Knosia input bar

□ 3.4 Implement Morning Briefing logic
      Generate: daily summary from KPIs
      Detect: anomalies, trends, alerts

□ 3.5 Wire Home to onboarding completion
      After onboarding → redirect to Home
      Home shows generated briefing with real data


CANVAS PRODUCT
──────────────

□ 3.6 Create Canvas list page
      Path: /dashboard/[org]/canvas
      Shows: all canvases, create new

□ 3.7 Create Canvas detail page
      Path: /dashboard/[org]/canvas/[id]
      Shows: canvas editor with blocks

□ 3.8 Enhance CanvasView component
      Add: toolbar, edit mode, share

□ 3.9 Wire generated dashboard to Canvas
      Onboarding creates "My Dashboard" canvas
      Canvas pre-populated with mapped KPIs

□ 3.10 Implement canvas block execution
       Each block executes LiquidConnect query
       Results rendered via LiquidRender


NAVIGATION & SIDEBAR
────────────────────

□ 3.11 Add Home to sidebar menu
        Icon: Home, Label: "Home"
        Default landing after login

□ 3.12 Add Canvas to sidebar menu
        Icon: Layout, Label: "Canvas"
        Shows canvas list

□ 3.13 Add Threads to sidebar menu
        Icon: MessageSquare, Label: "Ask"
        Conversation interface

□ 3.14 Add Vocabulary to sidebar menu
        Icon: BookOpen, Label: "Vocabulary"
        Browse/manage vocabulary
```

**Deliverables:**
- Home page with AI-generated briefing
- Canvas page with generated dashboard
- Navigation structure complete
- Full journey: Onboarding → Home → Canvas

---

### Phase 4: Conversations & Refinement

**Goal:** Enable natural language queries and continuous refinement.

```
Week 9-10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THREAD (CONVERSATION) PRODUCT
─────────────────────────────

□ 4.1 Create Thread list page
      Path: /dashboard/[org]/threads
      Shows: conversation history

□ 4.2 Create Thread detail page
      Path: /dashboard/[org]/threads/[id]
      Shows: full conversation with results

□ 4.3 Implement ThreadInput component
      Natural language input bar
      Available: Home, Canvas, dedicated page

□ 4.4 Wire Thread to Query Engine
      Input: natural language
      Process: vocabulary → LiquidConnect → SQL → results

□ 4.5 Implement result rendering
      Use: LiquidRender components
      Show: data tables, charts, KPIs


REFINEMENT LOOPS
────────────────

□ 4.6 Implement usage tracking
      Track: which vocabulary items used
      Track: which questions asked

□ 4.7 Create refinement suggestions
      Trigger: unused vocabulary
      Trigger: frequently asked questions
      Trigger: mismatch reports

□ 4.8 Implement mismatch report flow
      User reports: "This doesn't match"
      System: suggests corrections

□ 4.9 Create vocabulary refinement modal
      Quick edit: formulas, names, visibility
```

**Deliverables:**
- Full conversation interface
- Natural language → SQL → results pipeline
- Refinement loop for continuous improvement

---

### Phase 5: Additional Sources & Polish

**Goal:** Enable CSV/Excel sources, polish experience.

```
Week 11-12
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE SOURCES
────────────

□ 5.1 Implement CSV adapter (DuckDB-based)
      Uses: DuckDBAdapter to read CSV
      Extracts: schema from CSV headers

□ 5.2 Create file upload component
      Upload: CSV/Excel to MinIO
      Trigger: analysis on upload

□ 5.3 Enable CSV in SourceTypeGrid
      Change: status "coming_soon" → "available"

□ 5.4 Create E-commerce template
      File: catalog/ecommerce.yaml
      KPIs: GMV, AOV, Conversion, Cart Abandonment

□ 5.5 Create Marketplace template
      File: catalog/marketplace.yaml
      KPIs: GMV, Take Rate, Liquidity


CROSS-SOURCE
────────────

□ 5.6 Implement multi-source vocabulary merge
      Combine: vocabulary from all sources
      Detect: conflicts (same name, different definitions)

□ 5.7 Create conflict resolution UI
      Show: conflicting items
      Actions: merge, rename, keep both

□ 5.8 Implement cross-source queries
      Query: across multiple databases/files
      Uses: DuckDB federation capabilities


POLISH
──────

□ 5.9 Onboarding animations & transitions
      Add: smooth progress indicators
      Add: success celebrations

□ 5.10 Error handling & recovery
       Handle: connection failures
       Handle: analysis timeouts
       Add: retry flows

□ 5.11 Mobile responsive adjustments
       Test: all flows on mobile
       Fix: any layout issues

□ 5.12 Performance optimization
       Add: query caching
       Add: dashboard data prefetch
```

**Deliverables:**
- CSV/Excel file sources working
- Multiple templates (SaaS, E-commerce, Marketplace)
- Cross-source vocabulary merging
- Polished, production-ready experience

---

## Component Architecture

### New Components Tree

```
apps/web/src/modules/
├── onboarding/
│   ├── components/
│   │   ├── sources/                    🆕
│   │   │   ├── source-type-card.tsx
│   │   │   ├── source-type-grid.tsx
│   │   │   ├── source-card.tsx
│   │   │   ├── source-list.tsx
│   │   │   ├── add-source-dialog.tsx
│   │   │   └── postgres-source-form.tsx
│   │   ├── decisions/                  🆕
│   │   │   ├── decision-card.tsx
│   │   │   ├── decision-screen.tsx
│   │   │   ├── confirmation-decision.tsx
│   │   │   ├── selection-decision.tsx
│   │   │   └── specification-decision.tsx
│   │   ├── business-type/              🆕
│   │   │   ├── business-type-card.tsx
│   │   │   └── business-type-selector.tsx
│   │   ├── preview/                    🆕
│   │   │   ├── dashboard-preview.tsx
│   │   │   ├── kpi-preview-card.tsx
│   │   │   ├── chart-preview.tsx
│   │   │   └── mapping-editor.tsx
│   │   └── ... (existing components)
│   └── hooks/
│       ├── use-onboarding-state.ts     (refactored)
│       ├── use-sources.ts              🆕
│       ├── use-business-type.ts        🆕
│       └── use-dashboard-preview.ts    🆕
│
├── knosia/
│   ├── home/                           🆕
│   │   ├── components/
│   │   │   ├── home-view.tsx
│   │   │   └── ask-bar.tsx
│   │   ├── hooks/
│   │   │   └── use-home.ts
│   │   └── index.ts
│   ├── brief/                          (existing, enhanced)
│   ├── canvas/                         (existing, enhanced)
│   ├── threads/                        (existing, enhanced)
│   └── vocabulary/                     (existing)
```

### New API Modules

```
packages/api/src/modules/knosia/
├── analysis/
│   └── mutations.ts                    (enhanced with business type)
├── dashboard/                          🆕
│   ├── router.ts
│   ├── generator.ts
│   ├── queries.ts
│   └── mutations.ts
├── briefing/
│   └── generator.ts                    🆕
└── ... (existing)
```

### New LiquidConnect Modules

```
packages/liquid-connect/src/
├── business-types/                     🆕
│   ├── index.ts
│   ├── types.ts
│   ├── detector.ts
│   ├── signatures.ts
│   ├── mapper.ts
│   └── catalog/
│       ├── index.ts
│       ├── types.ts
│       ├── saas.yaml
│       ├── ecommerce.yaml
│       └── marketplace.yaml
├── dashboard/                          🆕
│   ├── index.ts
│   ├── generator.ts
│   └── types.ts
└── ... (existing)
```

---

## Database Changes

### New Tables (if needed)

```sql
-- Dashboard preview (transient, during onboarding)
CREATE TABLE knosia_dashboard_preview (
  id TEXT PRIMARY KEY,
  analysis_id TEXT REFERENCES knosia_analysis(id),
  spec JSONB NOT NULL,  -- DashboardSpec
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business type override (user can change detected type)
-- Could be a column on knosia_workspace instead
```

### Schema Modifications

```sql
-- Add to knosia_analysis
ALTER TABLE knosia_analysis ADD COLUMN business_type TEXT;
ALTER TABLE knosia_analysis ADD COLUMN business_type_confidence INTEGER;
ALTER TABLE knosia_analysis ADD COLUMN template_mapping JSONB;

-- Add to knosia_workspace
ALTER TABLE knosia_workspace ADD COLUMN business_type TEXT;
ALTER TABLE knosia_workspace ADD COLUMN onboarding_completed_at TIMESTAMP;
```

---

## API Endpoints

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analysis/:id/business-type` | Get detected business type |
| `POST` | `/analysis/:id/business-type` | Override business type |
| `GET` | `/analysis/:id/mapping` | Get template mapping |
| `PATCH` | `/analysis/:id/mapping` | Update slot mappings |
| `GET` | `/analysis/:id/preview` | Get dashboard preview |
| `POST` | `/dashboard/generate` | Generate dashboard from mapping |
| `POST` | `/briefing/generate` | Generate daily briefing |

---

## Success Metrics

### Phase 0-1 (Foundation)
- [ ] Business type correctly detected for 80%+ of test schemas
- [ ] Onboarding state supports multiple sources
- [ ] All source types visible in UI

### Phase 2 (Preview)
- [ ] Dashboard preview shows real data
- [ ] 70%+ template coverage for SaaS databases
- [ ] User can customize mappings

### Phase 3 (Products)
- [ ] Home page renders briefing
- [ ] Canvas page renders dashboard
- [ ] End-to-end flow: Connect → Home in < 2 minutes

### Phase 4-5 (Full Experience)
- [ ] Natural language queries return results
- [ ] CSV files can be added as sources
- [ ] Cross-source queries work

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Business type detection inaccurate | Allow manual override, default to "Custom" |
| Template mapping incomplete | Surface unmapped KPIs, allow manual specification |
| Query performance slow | Cache results, show loading states |
| Multi-source complexity | Start with single source, add incrementally |

---

## Dependencies

### External
- DuckDB (for file sources and federation)
- MinIO (for file storage)
- OpenAI/Claude API (for briefing generation)

### Internal
- LiquidRender (for result visualization)
- Vocabulary system (for semantic layer)
- Canvas system (for dashboard storage)

---

## Next Steps

1. **Immediate:** Start Phase 0.1 - Create business-types module structure
2. **This week:** Complete Phase 0 (detector, template, mapper)
3. **Next week:** Begin Phase 1 (multi-source UI)

---

*This plan delivers a working "Connect → Home + Canvas" experience in ~12 weeks, with the most valuable features (business type detection, dashboard preview) delivered in the first 6 weeks.*
