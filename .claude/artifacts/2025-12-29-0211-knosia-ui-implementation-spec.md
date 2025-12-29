# Knosia UI Implementation Spec

> From vision to code. Actionable implementation roadmap.
> Created: 2025-12-29
> Status: Ready for implementation

---

## Prerequisites

**Already Built:**
- ✅ UVB Backend (`packages/liquid-connect/src/uvb/`)
- ✅ LiquidConnect v7 Compiler (162 tests passing)
- ✅ Marketing Pages (`apps/web/src/modules/marketing/knosia/`)
- ✅ TurboStarter Auth System (Better Auth)
- ✅ TurboStarter Dashboard Layouts

**Reference Documents:**
- Vision: `2025-12-29-0155-knosia-liquid-interface-vision.md`
- Dashboard: `2025-12-29-0151-knosia-generative-dashboard-vision.md`
- User Journey: `2025-12-29-0159-knosia-user-journey-ui.md`
- Auth/UI Patterns: `2025-12-29-0146-knosia-auth-dashboard-ui.md`

---

## 1. MVP Scope

### In Scope (v1)

| Feature | Description |
|---------|-------------|
| **Onboarding** | Connect database → Detect → Confirm → Generate dashboard |
| **Briefing Page** | Morning briefing with KPIs, alerts, insights |
| **2-3 Dashboard Pages** | Revenue, Customers (generated from vocabulary) |
| **Conversation Input** | Text-based "Ask anything" at bottom of each page |
| **Basic Customization** | Edit/remove pages, reorder sidebar |

### Out of Scope (v2+)

| Feature | Reason |
|---------|--------|
| Voice input | Requires speech recognition integration |
| Gesture language | Requires touch device optimization |
| Multi-modal (screenshot, sketch) | Requires vision model integration |
| Slack/Watch integration | Requires external integrations |
| Institutional memory | Requires long-term pattern learning |
| Real-time collaboration | Requires WebSocket infrastructure |

---

## 2. Route Architecture

```
apps/web/src/app/[locale]/
├── (marketing)/
│   └── page.tsx                    ← Landing page (exists)
│
├── auth/                           ← Auth pages (exists via TurboStarter)
│   ├── login/
│   ├── register/
│   └── ...
│
├── onboarding/                     ← NEW: Onboarding flow
│   ├── layout.tsx                  ← Minimal layout, progress indicator
│   ├── page.tsx                    ← Redirect to /connect
│   ├── connect/
│   │   └── page.tsx                ← Database connection form
│   ├── review/
│   │   └── page.tsx                ← Schema detection results
│   ├── role/
│   │   └── page.tsx                ← Role selection
│   ├── confirm/
│   │   └── page.tsx                ← Vocabulary confirmation (5-10 questions)
│   └── ready/
│       └── page.tsx                ← First briefing preview
│
├── dashboard/                      ← NEW: Main dashboard
│   ├── layout.tsx                  ← Sidebar layout (extend TurboStarter)
│   ├── page.tsx                    ← Redirect to /briefing or org picker
│   │
│   ├── (user)/                     ← Personal dashboard
│   │   ├── briefing/
│   │   │   └── page.tsx            ← Morning briefing
│   │   ├── p/[pageSlug]/
│   │   │   └── page.tsx            ← Dynamic generated pages
│   │   ├── ask/
│   │   │   └── page.tsx            ← Full conversation mode
│   │   ├── connections/
│   │   │   └── page.tsx            ← Manage database connections
│   │   ├── vocabulary/
│   │   │   └── page.tsx            ← Edit vocabulary
│   │   └── settings/
│   │       └── page.tsx            ← Account settings (exists)
│   │
│   └── [organization]/             ← Org dashboard (future)
│       └── ...
```

---

## 3. Component Inventory

### Phase 1: Onboarding Components

```
apps/web/src/modules/onboarding/
├── components/
│   ├── onboarding-layout.tsx       ← Wrapper with progress steps
│   ├── progress-indicator.tsx      ← Step 1 of 5 visual
│   │
│   ├── connect/
│   │   ├── database-selector.tsx   ← Grid of database icons
│   │   ├── connection-form.tsx     ← Host, port, user, password fields
│   │   └── connection-test.tsx     ← Test connection button + status
│   │
│   ├── review/
│   │   ├── analysis-loading.tsx    ← Animated loading with checkmarks
│   │   ├── business-type-card.tsx  ← "I see you're running a SaaS..."
│   │   ├── schema-summary.tsx      ← Tables, metrics, dimensions counts
│   │   └── business-type-picker.tsx← Dropdown for "No, something else"
│   │
│   ├── role/
│   │   └── role-selector.tsx       ← 6 role cards (Executive, Finance, etc.)
│   │
│   ├── confirm/
│   │   ├── confirmation-wizard.tsx ← Question carousel
│   │   ├── confirmation-question.tsx← Single question with radio options
│   │   └── progress-bar.tsx        ← Question 2 of 6
│   │
│   └── ready/
│       ├── first-briefing.tsx      ← Preview briefing card
│       └── dashboard-preview.tsx   ← Preview of generated pages
│
├── hooks/
│   ├── use-connection.ts           ← Connection state management
│   ├── use-extraction.ts           ← Call UVB extraction API
│   └── use-onboarding-state.ts     ← Persist onboarding progress
│
├── api.ts                          ← API client for onboarding endpoints
└── types.ts                        ← Onboarding-specific types
```

### Phase 2: Dashboard Components

```
apps/web/src/modules/dashboard/
├── components/
│   ├── layout/
│   │   ├── dashboard-sidebar.tsx   ← Extend TurboStarter sidebar
│   │   ├── page-header.tsx         ← Page title + description
│   │   └── dynamic-menu.tsx        ← Generated pages in sidebar
│   │
│   ├── briefing/
│   │   ├── briefing-page.tsx       ← Main briefing container
│   │   ├── greeting.tsx            ← "Good morning, Sarah."
│   │   ├── kpi-row.tsx             ← 4 KPI cards in a row
│   │   ├── alert-card.tsx          ← Priority alert (red/yellow)
│   │   ├── insight-card.tsx        ← Discovery/insight (lightbulb)
│   │   └── briefing-skeleton.tsx   ← Loading state
│   │
│   ├── kpi/
│   │   ├── kpi-card.tsx            ← Single KPI with value, label, trend
│   │   ├── kpi-trend.tsx           ← Up/down arrow with percentage
│   │   └── kpi-sparkline.tsx       ← Mini trend line (optional)
│   │
│   ├── charts/
│   │   ├── liquid-chart.tsx        ← Wrapper that picks chart type
│   │   ├── trend-chart.tsx         ← Line chart for time series
│   │   ├── bar-chart.tsx           ← Bar chart for comparisons
│   │   ├── breakdown-chart.tsx     ← Horizontal bars with labels
│   │   └── chart-loading.tsx       ← Skeleton loading
│   │
│   ├── conversation/
│   │   ├── conversation-input.tsx  ← "Ask anything..." input
│   │   ├── suggestion-chips.tsx    ← "Try: Break down by region"
│   │   ├── conversation-thread.tsx ← Messages back and forth
│   │   └── message-bubble.tsx      ← Single message (user or knosia)
│   │
│   ├── pages/
│   │   ├── dynamic-page.tsx        ← Renders any generated page
│   │   ├── page-section.tsx        ← KPI, chart, table, or insight
│   │   └── page-customizer.tsx     ← Edit page modal
│   │
│   └── common/
│       ├── empty-state.tsx         ← "No data yet"
│       ├── error-state.tsx         ← "Something went wrong"
│       └── loading-state.tsx       ← Full page loading
│
├── hooks/
│   ├── use-briefing.ts             ← Fetch briefing data
│   ├── use-liquid-query.ts         ← Execute Liquid DSL queries
│   ├── use-dashboard-pages.ts      ← Get user's generated pages
│   └── use-conversation.ts         ← Conversation state + history
│
├── api.ts                          ← Dashboard API client
└── types.ts                        ← Dashboard types
```

### Shared UI Components (extend TurboStarter)

```
packages/ui/src/components/
├── knosia/                         ← Knosia-specific UI
│   ├── metric-display.tsx          ← Formatted number with label
│   ├── trend-indicator.tsx         ← ↑8% or ↓3% with color
│   ├── status-badge.tsx            ← Normal, High, Critical badges
│   └── time-range-picker.tsx       ← Last 7d, 30d, 90d, 1y
```

---

## 4. API Routes

```
packages/api/src/modules/
├── vocabulary/                     ← NEW: Vocabulary endpoints
│   ├── router.ts
│   ├── service.ts
│   └── schema.ts
│
│   Endpoints:
│   POST /vocabulary/extract        ← Extract from connection
│   POST /vocabulary/validate       ← Validate vocabulary
│   POST /vocabulary/save           ← Save to database
│   GET  /vocabulary/:id            ← Get vocabulary
│   PUT  /vocabulary/:id            ← Update vocabulary
│
├── connections/                    ← NEW: Database connections
│   ├── router.ts
│   ├── service.ts
│   └── schema.ts
│
│   Endpoints:
│   POST /connections/test          ← Test connection
│   POST /connections               ← Save connection
│   GET  /connections               ← List connections
│   DELETE /connections/:id         ← Remove connection
│
├── dashboard/                      ← NEW: Dashboard data
│   ├── router.ts
│   ├── service.ts
│   └── schema.ts
│
│   Endpoints:
│   GET  /dashboard/briefing        ← Get today's briefing
│   GET  /dashboard/pages           ← Get user's pages
│   POST /dashboard/pages           ← Create page
│   PUT  /dashboard/pages/:id       ← Update page
│   DELETE /dashboard/pages/:id     ← Delete page
│
├── query/                          ← NEW: Liquid query execution
│   ├── router.ts
│   ├── service.ts
│   └── schema.ts
│
│   Endpoints:
│   POST /query/execute             ← Execute Liquid DSL query
│   POST /query/explain             ← Explain query in natural language
│   POST /query/suggest             ← Get query suggestions
│
└── conversation/                   ← NEW: AI conversation
    ├── router.ts
    ├── service.ts
    └── schema.ts

    Endpoints:
    POST /conversation/message      ← Send message, get response
    GET  /conversation/history      ← Get conversation history
```

---

## 5. Database Schema (Drizzle)

```typescript
// packages/database/src/schemas/knosia.ts

export const connections = pgTable("connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  organizationId: text("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // postgres, mysql, snowflake, etc.
  config: jsonb("config").notNull(), // encrypted connection details
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vocabularies = pgTable("vocabularies", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull().references(() => connections.id),
  businessType: text("business_type"), // saas, ecommerce, healthcare, etc.
  vocabulary: jsonb("vocabulary").notNull(), // entities, metrics, dimensions, etc.
  confirmations: jsonb("confirmations"), // user confirmations
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dashboardPages = pgTable("dashboard_pages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  vocabularyId: text("vocabulary_id").notNull().references(() => vocabularies.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  icon: text("icon"),
  defaultQuery: text("default_query"), // Liquid DSL
  sections: jsonb("sections").notNull(), // Array of section configs
  position: integer("position").notNull().default(0),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role"), // executive, finance, sales, etc.
  briefingTime: text("briefing_time").default("07:00"),
  timezone: text("timezone").default("UTC"),
  terminology: jsonb("terminology"), // { "revenue": "MRR", "customers": "accounts" }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  pageId: text("page_id").references(() => dashboardPages.id),
  messages: jsonb("messages").notNull(), // Array of { role, content, timestamp }
  context: jsonb("context"), // Current filters, selections, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

## 6. Build Order

### Wave 1: Onboarding (Week 1)

**Goal:** User can connect database and generate vocabulary

| Task | Dependencies | Estimate |
|------|--------------|----------|
| Database schema (connections, vocabularies) | None | 2h |
| API: POST /connections/test | UVB adapters | 2h |
| API: POST /vocabulary/extract | UVB extractor, rules | 3h |
| API: POST /vocabulary/save | Database schema | 2h |
| UI: Onboarding layout + progress | TurboStarter layout | 2h |
| UI: Database selector + connection form | shadcn form | 3h |
| UI: Analysis loading + business type card | - | 2h |
| UI: Role selector | - | 1h |
| UI: Confirmation wizard | - | 3h |
| UI: Ready/preview page | - | 2h |
| **Total** | | **~22h** |

**Deliverable:** Complete onboarding flow from database to generated vocabulary

### Wave 2: Briefing Page (Week 2)

**Goal:** User sees their first briefing

| Task | Dependencies | Estimate |
|------|--------------|----------|
| Database schema (dashboardPages, userPreferences) | Wave 1 | 1h |
| API: GET /dashboard/briefing | Vocabulary, LiquidConnect | 4h |
| API: POST /query/execute | LiquidConnect compiler | 3h |
| UI: Dashboard sidebar (extend TurboStarter) | - | 2h |
| UI: Briefing page layout | - | 2h |
| UI: KPI cards | - | 2h |
| UI: Alert card + Insight card | - | 2h |
| UI: Greeting component | - | 1h |
| Generate default briefing from vocabulary | Wave 1 | 3h |
| **Total** | | **~20h** |

**Deliverable:** Working briefing page with KPIs and insights

### Wave 3: Dynamic Pages + Conversation (Week 3)

**Goal:** User can explore data and ask questions

| Task | Dependencies | Estimate |
|------|--------------|----------|
| API: GET /dashboard/pages | Database | 1h |
| API: POST /conversation/message | LLM integration | 4h |
| UI: Dynamic page renderer | - | 3h |
| UI: Chart components (trend, bar, breakdown) | Recharts | 4h |
| UI: Conversation input + suggestions | - | 3h |
| UI: Message thread | - | 2h |
| Natural language → Liquid DSL | LLM + compiler | 4h |
| **Total** | | **~21h** |

**Deliverable:** Users can view generated pages and ask questions

### Wave 4: Customization (Week 4)

**Goal:** User can customize their dashboard

| Task | Dependencies | Estimate |
|------|--------------|----------|
| API: PUT/DELETE /dashboard/pages | Database | 2h |
| UI: Page customizer modal | - | 3h |
| UI: Sidebar reorder (drag and drop) | dnd-kit | 3h |
| UI: Add/remove sections | - | 2h |
| UI: Vocabulary editor page | - | 3h |
| UI: Connections manager page | - | 2h |
| **Total** | | **~15h** |

**Deliverable:** Users can fully customize their experience

---

## 7. Technical Decisions

### State Management

```typescript
// Zustand for client state
const useDashboardStore = create<DashboardState>((set) => ({
  currentPage: null,
  conversation: [],
  filters: {},
  setPage: (page) => set({ currentPage: page }),
  addMessage: (msg) => set((s) => ({ conversation: [...s.conversation, msg] })),
}));

// React Query for server state
const useBriefing = () => useQuery({
  queryKey: ['briefing', date],
  queryFn: () => api.dashboard.getBriefing(),
});

const useLiquidQuery = (query: string) => useQuery({
  queryKey: ['query', query],
  queryFn: () => api.query.execute(query),
  enabled: !!query,
});
```

### Chart Library

```typescript
// Recharts for all visualizations
import { LineChart, BarChart, ResponsiveContainer } from 'recharts';

// Wrapper component
function LiquidChart({ type, data, config }: LiquidChartProps) {
  switch (type) {
    case 'trend': return <TrendChart data={data} {...config} />;
    case 'bar': return <BarChart data={data} {...config} />;
    case 'breakdown': return <BreakdownChart data={data} {...config} />;
    default: return <TrendChart data={data} {...config} />;
  }
}
```

### LLM Integration

```typescript
// For natural language → Liquid DSL
const conversationService = {
  async processMessage(message: string, context: ConversationContext) {
    // 1. Parse intent (query, modify, explain, etc.)
    const intent = await parseIntent(message, context);

    // 2. Generate Liquid DSL if query
    if (intent.type === 'query') {
      const liquidQuery = await generateLiquidQuery(message, context.vocabulary);
      const result = await executeQuery(liquidQuery, context.connectionId);
      return { type: 'data', query: liquidQuery, result };
    }

    // 3. Handle other intents (explain, modify, etc.)
    return handleIntent(intent, context);
  }
};
```

### Styling

```typescript
// Use existing TurboStarter + Tailwind patterns
// Knosia-specific tokens in tailwind.config.ts

const knosi = {
  colors: {
    'knosia-primary': 'hsl(var(--knosia-primary))',
    'knosia-insight': 'hsl(var(--knosia-insight))',
    'knosia-alert': 'hsl(var(--knosia-alert))',
    'knosia-success': 'hsl(var(--knosia-success))',
  },
};
```

---

## 8. File Structure Summary

```
apps/web/src/
├── app/[locale]/
│   ├── onboarding/              ← NEW: 5 pages
│   └── dashboard/               ← NEW: Extend existing
│
├── modules/
│   ├── onboarding/              ← NEW: ~15 components
│   ├── dashboard/               ← NEW: ~25 components
│   └── marketing/knosia/        ← EXISTS
│
└── config/
    └── paths.ts                 ← UPDATE: Add onboarding + dashboard routes

packages/api/src/modules/
├── vocabulary/                  ← NEW
├── connections/                 ← NEW
├── dashboard/                   ← NEW
├── query/                       ← NEW
└── conversation/                ← NEW

packages/database/src/schemas/
└── knosia.ts                    ← NEW: 5 tables

packages/liquid-connect/src/
└── uvb/                         ← EXISTS: Use for extraction
```

---

## 9. Success Criteria

### Wave 1 Complete When:
- [ ] User can enter database credentials
- [ ] System extracts and displays schema analysis
- [ ] User confirms business type
- [ ] User selects role
- [ ] User answers 5-10 confirmation questions
- [ ] Vocabulary is saved to database

### Wave 2 Complete When:
- [ ] Dashboard displays with sidebar
- [ ] Briefing page shows KPIs from real data
- [ ] At least one alert or insight is generated
- [ ] Page is responsive and styled

### Wave 3 Complete When:
- [ ] User can navigate to generated pages
- [ ] Charts render real data
- [ ] User can type a question
- [ ] System responds with relevant data/charts

### Wave 4 Complete When:
- [ ] User can add/remove pages
- [ ] User can reorder sidebar
- [ ] User can edit vocabulary
- [ ] User can manage connections

---

## 10. Getting Started

```bash
# 1. Create database migrations
pnpm db:generate

# 2. Start with onboarding layout
# apps/web/src/app/[locale]/onboarding/layout.tsx

# 3. Build connection form
# apps/web/src/modules/onboarding/components/connect/

# 4. Wire up to UVB backend
# packages/api/src/modules/vocabulary/

# 5. Test end-to-end with a real database
```

**First file to create:**
```
apps/web/src/app/[locale]/onboarding/layout.tsx
```

---

*This spec will evolve as implementation progresses.*
