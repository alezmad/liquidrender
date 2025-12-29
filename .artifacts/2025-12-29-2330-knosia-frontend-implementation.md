# Knosia Frontend Implementation

> **FINAL** unified context document for frontend implementation.
> Single source of truth for Knosia UI development.
> Created: 2025-12-29 23:30
> Updated: 2025-12-29 - Aligned with TurboStarter framework patterns

---

## Quick Start

```bash
# Start implementation
claude "Read .claude/artifacts/2025-12-29-2330-knosia-frontend-implementation.md and implement Wave 1"
```

**Prerequisites:** WF-0018 (Backend Integration) is complete
- All API modules wired to LiquidConnect
- 355 tests passing
- Database schema ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Backend API Reference](#backend-api-reference)
3. [Route Architecture](#route-architecture)
4. [Component Inventory](#component-inventory)
5. [Implementation Waves](#implementation-waves)
6. [UX Specifications](#ux-specifications)
7. [State Management](#state-management)
8. [API Client](#api-client)
9. [Testing Strategy](#testing-strategy)
10. [Files Summary](#files-summary)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                   │
│  apps/web/src/                                                                │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   /onboarding    │  │    /dashboard    │  │  /dashboard/ask  │           │
│  │   Connect → Flow │  │   Briefing + UI  │  │   Conversation   │           │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘           │
│           │                     │                     │                      │
└───────────┼─────────────────────┼─────────────────────┼──────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KNOSIA API (WF-0018 ✅)                            │
│  packages/api/src/modules/knosia/                                            │
│                                                                               │
│  POST /connections/test     GET /analysis/:id        POST /conversation      │
│  POST /vocabulary/confirm   GET /briefing            GET /vocabulary         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Backend API Reference

### Connections Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/connections/test` | POST | `{ type, host, port, database, username, password, sslEnabled }` | `{ success, message, latencyMs }` |
| `/knosia/connections` | POST | `{ name, type, host, port, database, schema, credentials }` | `{ id, name, ... }` |
| `/knosia/connections` | GET | - | `Connection[]` |
| `/knosia/connections/:id` | GET | - | `Connection` |
| `/knosia/connections/:id` | DELETE | - | `{ success }` |

### Analysis Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/analysis/start` | POST | `{ connectionId, workspaceId }` | SSE stream with progress |
| `/knosia/analysis/:id` | GET | - | `{ status, summary, detectedVocab, businessType }` |

**SSE Events:**
```typescript
{ type: 'progress', step: 1, total: 5, message: 'Connected to database' }
{ type: 'progress', step: 2, total: 5, message: 'Found 127 tables' }
{ type: 'progress', step: 3, total: 5, message: 'Identified 89 metrics' }
{ type: 'progress', step: 4, total: 5, message: 'Detecting business patterns' }
{ type: 'complete', analysisId, summary, businessType, confirmations }
```

### Vocabulary Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/vocabulary/:analysisId` | GET | - | `{ items, confirmations }` |
| `/knosia/vocabulary/confirm` | POST | `{ answers: [{questionId, selectedOptionId}], skipped? }` | `{ success, workspaceId }` |
| `/knosia/vocabulary/mismatch` | POST | `{ itemId, issue, description }` | `{ success }` |

### Conversation Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/conversation` | POST | `{ workspaceId, query, context? }` | `ConversationResponse` |

**ConversationResponse Types:**
```typescript
// Success with visualization
{
  type: 'visualization',
  queryId: string,
  visualization: {
    type: 'bar' | 'line' | 'table' | 'kpi' | 'pie',
    title: string,
    data: unknown,
    sql?: string,
    grounding: { path: GroundingItem[], interactive: boolean }
  }
}

// Clarification needed
{
  type: 'clarification',
  queryId: string,
  clarification: {
    message: string,
    options: { id: string, label: string, description: string, currentValue?: string }[]
  }
}

// Error
{
  type: 'error',
  queryId: string,
  error: { code?: string, message: string, alternatives?: string[], recoverable?: boolean }
}
```

### Briefing Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/briefing` | GET | `?workspaceId` | `{ greeting, kpis, alerts, insights, suggestions }` |

### Preferences Module

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/knosia/preferences` | GET | `?workspaceId` | `UserPreference` |
| `/knosia/preferences` | PUT | `{ role?, comparisonPeriod?, aliases?, ... }` | `UserPreference` |

---

## Route Architecture

> **TurboStarter Pattern:** Uses route groups `(user)` for sidebar layouts and `[organization]` for multi-tenant.

### Path Configuration

```typescript
// apps/web/src/config/paths.ts - ADD these paths

// Knosia onboarding (user-scoped, no org)
onboarding: {
  index: "/onboarding",
  connect: "/onboarding/connect",
  review: "/onboarding/review",
  role: "/onboarding/role",
  confirm: "/onboarding/confirm",
  ready: "/onboarding/ready",
},

// Knosia dashboard (user-scoped via (knosia) route group)
knosia: {
  index: `${DASHBOARD_PREFIX}/knosia`,
  briefing: `${DASHBOARD_PREFIX}/knosia/briefing`,
  ask: `${DASHBOARD_PREFIX}/knosia/ask`,
  page: (slug: string) => `${DASHBOARD_PREFIX}/knosia/p/${slug}`,
  connections: `${DASHBOARD_PREFIX}/knosia/connections`,
  vocabulary: `${DASHBOARD_PREFIX}/knosia/vocabulary`,
  settings: `${DASHBOARD_PREFIX}/knosia/settings`,
},
```

### Route Structure

```
apps/web/src/app/[locale]/
├── (marketing)/
│   └── page.tsx                         ← Landing (exists)
│
├── auth/                                ← Auth (TurboStarter)
│
├── onboarding/                          ← NEW: Onboarding Flow (no sidebar)
│   ├── layout.tsx                       ← Progress indicator + minimal chrome
│   ├── page.tsx                         ← Redirect to /connect
│   ├── connect/
│   │   └── page.tsx                     ← Database selection + credentials
│   ├── review/
│   │   └── page.tsx                     ← Analysis loading + business type
│   ├── role/
│   │   └── page.tsx                     ← Role selection (6 cards)
│   ├── confirm/
│   │   └── page.tsx                     ← Vocabulary confirmation wizard
│   └── ready/
│       └── page.tsx                     ← First briefing preview
│
└── dashboard/
    ├── layout.tsx                       ← Base dashboard (exists)
    │
    ├── (user)/                          ← User dashboard group (exists)
    │   └── ...                          ← Existing user routes
    │
    └── (knosia)/                        ← NEW: Knosia route group
        ├── layout.tsx                   ← Knosia sidebar + workspace context
        ├── page.tsx                     ← Redirect to /briefing
        ├── briefing/
        │   └── page.tsx                 ← Morning briefing (RSC)
        ├── ask/
        │   └── page.tsx                 ← Conversation mode (client)
        ├── p/[slug]/
        │   └── page.tsx                 ← Dynamic generated pages
        ├── connections/
        │   └── page.tsx                 ← Manage connections
        ├── vocabulary/
        │   └── page.tsx                 ← Edit vocabulary
        └── settings/
            ├── layout.tsx               ← Settings sub-nav
            └── page.tsx                 ← General settings
```

### Layout Authentication Pattern

```typescript
// apps/web/src/app/[locale]/dashboard/(knosia)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@turbostarter/auth/server";
import { pathsConfig } from "~/config/paths";

export default async function KnosiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check
  const { user } = await getSession();
  if (!user) return redirect(pathsConfig.auth.login);

  // Get user's active Knosia workspace
  const workspace = await getActiveKnosiaWorkspace(user.id);
  if (!workspace) return redirect(pathsConfig.onboarding.connect);

  return (
    <KnosiaSidebarProvider workspace={workspace}>
      <KnosiaSidebar />
      <main className="flex-1">{children}</main>
    </KnosiaSidebarProvider>
  );
}
```

### Sidebar Menu Definition

```typescript
// In layout.tsx
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";

const knosiaMenu = [
  {
    label: "platform",  // i18n group key
    items: [
      {
        title: "briefing",  // i18n key from common.json
        href: pathsConfig.knosia.briefing,
        icon: Icons.LayoutDashboard,
      },
      {
        title: "ask",
        href: pathsConfig.knosia.ask,
        icon: Icons.MessageCircle,
      },
    ],
  },
  {
    label: "manage",
    items: [
      {
        title: "connections",
        href: pathsConfig.knosia.connections,
        icon: Icons.Database,
      },
      {
        title: "vocabulary",
        href: pathsConfig.knosia.vocabulary,
        icon: Icons.BookOpen,
      },
      {
        title: "settings",
        href: pathsConfig.knosia.settings,
        icon: Icons.Settings,
      },
    ],
  },
];
```

---

## Component Inventory

> **Reuse-First Principle:** Always use existing TurboStarter components before creating new ones.

### Existing Components to REUSE

```typescript
// From ~/modules/common/layout/dashboard/
import {
  DashboardHeader,
  DashboardHeaderTitle,
  DashboardHeaderDescription,
} from "~/modules/common/layout/dashboard/header";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { DashboardSidebar, SidebarLink } from "~/modules/common/layout/dashboard/sidebar";

// From @turbostarter/ui-web (shadcn/ui)
import { Button } from "@turbostarter/ui-web/button";
import { Card, CardContent, CardHeader, CardTitle } from "@turbostarter/ui-web/card";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@turbostarter/ui-web/select";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@turbostarter/ui-web/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@turbostarter/ui-web/sheet";
import { Badge } from "@turbostarter/ui-web/badge";
import { Progress } from "@turbostarter/ui-web/progress";
import { RadioGroup, RadioGroupItem } from "@turbostarter/ui-web/radio-group";
import { Icons } from "@turbostarter/ui-web/icons";

// From @turbostarter/ui-web/data-table (for admin/list pages)
import { DataTable } from "@turbostarter/ui-web/data-table";
import { DataTableSkeleton } from "@turbostarter/ui-web/data-table/data-table-skeleton";

// Existing utilities
import { getMetadata } from "~/lib/metadata";
import { getTranslation } from "@turbostarter/i18n/server";
import { useTranslation } from "@turbostarter/i18n/client";
```

### Page Template (Standard Pattern)

```tsx
// Standard RSC page with dashboard layout
import { Suspense } from "react";
import { getTranslation } from "@turbostarter/i18n/server";
import { getMetadata } from "~/lib/metadata";
import {
  DashboardHeader,
  DashboardHeaderTitle,
  DashboardHeaderDescription,
} from "~/modules/common/layout/dashboard/header";

export const generateMetadata = getMetadata({
  title: "knosia:briefing.title",
  description: "knosia:briefing.description",
});

export default async function BriefingPage() {
  const { t } = await getTranslation({ ns: "knosia" });

  return (
    <>
      <DashboardHeader>
        <div>
          <DashboardHeaderTitle>{t("briefing.title")}</DashboardHeaderTitle>
          <DashboardHeaderDescription>
            {t("briefing.description")}
          </DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <Suspense fallback={<BriefingSkeleton />}>
        <BriefingContent />
      </Suspense>
    </>
  );
}
```

### Phase 1: Onboarding Components (~15 components)

```
apps/web/src/modules/onboarding/
├── components/
│   ├── layout/
│   │   ├── onboarding-layout.tsx       ← Wrapper with progress steps
│   │   └── progress-indicator.tsx      ← 3 macro steps visual
│   │
│   ├── connect/
│   │   ├── database-selector.tsx       ← Grid of 6 database icons
│   │   ├── connection-form.tsx         ← Host, port, credentials fields
│   │   └── connection-test.tsx         ← Test button + status indicator
│   │
│   ├── review/
│   │   ├── analysis-progress.tsx       ← Animated loading with checkmarks
│   │   ├── business-type-card.tsx      ← "Your schema matches SaaS..."
│   │   ├── schema-summary.tsx          ← Tables, metrics, dimensions counts
│   │   └── detection-review.tsx        ← Full review container
│   │
│   ├── role/
│   │   └── role-selector.tsx           ← 6 role cards with auto-advance
│   │
│   ├── confirm/
│   │   ├── confirmation-wizard.tsx     ← Question carousel container
│   │   ├── confirmation-question.tsx   ← Single question with radio options
│   │   └── wizard-progress.tsx         ← Question 2 of 6 indicator
│   │
│   └── ready/
│       ├── first-briefing.tsx          ← Preview briefing card
│       └── welcome-screen.tsx          ← "You're all set" container
│
├── hooks/
│   ├── use-connection-test.ts          ← Test connection mutation
│   ├── use-analysis.ts                 ← SSE stream subscription
│   └── use-onboarding-state.ts         ← Persist progress in localStorage
│
├── lib/
│   └── api.ts                          ← Onboarding API client
│
└── types.ts                            ← Onboarding types
```

### Phase 2: Dashboard Components (~25 components)

```
apps/web/src/modules/dashboard/
├── components/
│   ├── layout/
│   │   ├── dashboard-shell.tsx         ← Full layout wrapper
│   │   ├── sidebar.tsx                 ← Navigation sidebar
│   │   ├── sidebar-item.tsx            ← Single nav item
│   │   ├── account-switcher.tsx        ← Org selector dropdown
│   │   └── page-header.tsx             ← Page title + last updated
│   │
│   ├── briefing/
│   │   ├── briefing-page.tsx           ← Main briefing container
│   │   ├── greeting.tsx                ← "Good morning, Sarah"
│   │   ├── kpi-row.tsx                 ← 4 KPIs in a row
│   │   ├── alert-card.tsx              ← Red/orange alert with actions
│   │   ├── insight-card.tsx            ← Blue/purple insight
│   │   └── briefing-skeleton.tsx       ← Loading state
│   │
│   ├── kpi/
│   │   ├── kpi-card.tsx                ← Single KPI with trend
│   │   ├── kpi-trend.tsx               ← ↑8% or ↓3% with color
│   │   └── kpi-sparkline.tsx           ← Mini trend line (optional)
│   │
│   ├── charts/
│   │   ├── liquid-chart.tsx            ← Chart type router
│   │   ├── trend-chart.tsx             ← Line chart (Recharts)
│   │   ├── bar-chart.tsx               ← Bar chart
│   │   ├── breakdown-chart.tsx         ← Horizontal bars
│   │   └── chart-skeleton.tsx          ← Loading state
│   │
│   ├── conversation/
│   │   ├── conversation-input.tsx      ← "Ask anything..." input
│   │   ├── suggestion-chips.tsx        ← "Try: Break down by region"
│   │   ├── conversation-thread.tsx     ← Messages back and forth
│   │   ├── message-bubble.tsx          ← Single message
│   │   ├── grounding-link.tsx          ← Clickable data lineage
│   │   ├── vocabulary-drawer.tsx       ← Right drawer (320px)
│   │   └── clarification-card.tsx      ← Disambiguation options
│   │
│   ├── pages/
│   │   ├── dynamic-page.tsx            ← Renders any generated page
│   │   ├── page-section.tsx            ← KPI, chart, table, insight
│   │   └── time-range-picker.tsx       ← Last 7d, 30d, 90d, 1y
│   │
│   └── common/
│       ├── empty-state.tsx             ← "Building your trend view..."
│       ├── error-state.tsx             ← Connection error with retry
│       ├── loading-state.tsx           ← Full page loading
│       └── context-pills.tsx           ← Filter chips below title
│
├── hooks/
│   ├── use-briefing.ts                 ← Fetch briefing data
│   ├── use-conversation.ts             ← Conversation state + history
│   ├── use-liquid-query.ts             ← Execute conversation query
│   └── use-dashboard-pages.ts          ← Get user's generated pages
│
├── lib/
│   └── api.ts                          ← Dashboard API client
│
└── types.ts                            ← Dashboard types
```

### Shared UI Components

```
packages/ui/src/components/knosia/
├── metric-display.tsx                  ← Formatted number with label
├── trend-indicator.tsx                 ← ↑8% or ↓3% with color
├── status-badge.tsx                    ← Normal, High, Critical
├── confidence-badge.tsx                ← High/Medium/Low confidence
└── data-freshness.tsx                  ← "Last updated: 2m"
```

---

## Implementation Waves

### Wave 1: Onboarding Foundation (Day 1-2)

**Goal:** User can connect database and see analysis results

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Onboarding layout + progress | `onboarding/components/layout/` | S | 2h |
| Database selector grid | `onboarding/components/connect/database-selector.tsx` | S | 1h |
| Connection form with validation | `onboarding/components/connect/connection-form.tsx` | M | 2h |
| Connection test mutation | `onboarding/hooks/use-connection-test.ts` | S | 1h |
| SSE analysis hook | `onboarding/hooks/use-analysis.ts` | M | 2h |
| Analysis progress animation | `onboarding/components/review/analysis-progress.tsx` | M | 2h |
| Detection review screen | `onboarding/components/review/detection-review.tsx` | M | 2h |
| **Wave 1 Total** | | | **12h** |

**Deliverable:** `/onboarding/connect` → `/onboarding/review` flow working

### Wave 2: Onboarding Completion (Day 2-3)

**Goal:** Complete onboarding flow to first briefing

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Role selector cards | `onboarding/components/role/role-selector.tsx` | S | 1.5h |
| Confirmation wizard container | `onboarding/components/confirm/confirmation-wizard.tsx` | M | 2h |
| Question component | `onboarding/components/confirm/confirmation-question.tsx` | S | 1h |
| Wizard progress bar | `onboarding/components/confirm/wizard-progress.tsx` | S | 0.5h |
| First briefing preview | `onboarding/components/ready/first-briefing.tsx` | M | 2h |
| Welcome/ready screen | `onboarding/components/ready/welcome-screen.tsx` | S | 1h |
| Route pages (5 pages) | `app/[locale]/onboarding/*/page.tsx` | M | 2h |
| **Wave 2 Total** | | | **10h** |

**Deliverable:** Complete onboarding flow `/connect → /review → /role → /confirm → /ready`

### Wave 3: Dashboard Shell (Day 3-4)

**Goal:** Dashboard layout with briefing page

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Dashboard shell layout | `dashboard/components/layout/dashboard-shell.tsx` | M | 2h |
| Sidebar navigation | `dashboard/components/layout/sidebar.tsx` | M | 2h |
| Briefing page container | `dashboard/components/briefing/briefing-page.tsx` | M | 2h |
| Greeting component | `dashboard/components/briefing/greeting.tsx` | S | 0.5h |
| KPI row + card | `dashboard/components/kpi/` | M | 2h |
| Alert card | `dashboard/components/briefing/alert-card.tsx` | M | 1.5h |
| Insight card | `dashboard/components/briefing/insight-card.tsx` | M | 1.5h |
| Briefing hook | `dashboard/hooks/use-briefing.ts` | S | 1h |
| **Wave 3 Total** | | | **12.5h** |

**Deliverable:** `/dashboard/briefing` showing real KPIs and insights

### Wave 4: Conversation (Day 4-5)

**Goal:** Users can ask questions and get visualizations

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Conversation input | `dashboard/components/conversation/conversation-input.tsx` | M | 2h |
| Suggestion chips | `dashboard/components/conversation/suggestion-chips.tsx` | S | 1h |
| Message thread | `dashboard/components/conversation/conversation-thread.tsx` | M | 2h |
| Message bubble | `dashboard/components/conversation/message-bubble.tsx` | S | 1h |
| Grounding links | `dashboard/components/conversation/grounding-link.tsx` | M | 1.5h |
| Vocabulary drawer | `dashboard/components/conversation/vocabulary-drawer.tsx` | M | 2h |
| Clarification card | `dashboard/components/conversation/clarification-card.tsx` | M | 1.5h |
| Conversation hook | `dashboard/hooks/use-conversation.ts` | M | 2h |
| **Wave 4 Total** | | | **13h** |

**Deliverable:** Users can ask questions and see chart responses

### Wave 5: Charts & Pages (Day 5-6)

**Goal:** Dynamic pages with real visualizations

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Chart router | `dashboard/components/charts/liquid-chart.tsx` | S | 1h |
| Trend chart (Recharts) | `dashboard/components/charts/trend-chart.tsx` | M | 2h |
| Bar chart | `dashboard/components/charts/bar-chart.tsx` | M | 2h |
| Breakdown chart | `dashboard/components/charts/breakdown-chart.tsx` | M | 2h |
| Dynamic page renderer | `dashboard/components/pages/dynamic-page.tsx` | M | 2h |
| Time range picker | `dashboard/components/pages/time-range-picker.tsx` | S | 1h |
| Context pills | `dashboard/components/common/context-pills.tsx` | S | 1h |
| Route pages | `app/[locale]/dashboard/*/page.tsx` | M | 2h |
| **Wave 5 Total** | | | **13h** |

**Deliverable:** Full dashboard with generated pages and charts

### Wave 6: Polish & Edge Cases (Day 6-7)

**Goal:** Production-ready with error handling

| Task | File | Complexity | Est |
|------|------|------------|-----|
| Empty states | `dashboard/components/common/empty-state.tsx` | S | 1h |
| Error states | `dashboard/components/common/error-state.tsx` | S | 1h |
| Connection manager page | `app/[locale]/dashboard/connections/page.tsx` | M | 2h |
| Vocabulary editor page | `app/[locale]/dashboard/vocabulary/page.tsx` | M | 2h |
| Loading skeletons | Various `*-skeleton.tsx` | S | 1.5h |
| Responsive adjustments | Various | M | 2h |
| E2E test setup | `tests/e2e/onboarding.spec.ts` | M | 2h |
| **Wave 6 Total** | | | **11.5h** |

**Deliverable:** Production-ready frontend

---

## UX Specifications

### Number Formatting

```typescript
// packages/ui/src/lib/format.ts

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function formatPercentage(value: number): string {
  if (value < 0.1 && value > 0) return `${value.toFixed(2)}%`;
  return `${value % 1 === 0 ? value : value.toFixed(1)}%`;
}

export function formatChange(value: number): { text: string; direction: 'up' | 'down' | 'neutral' } {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '';
  return { text: `${arrow} ${formatPercentage(Math.abs(value))}`, direction };
}
```

### Timestamp Display

```typescript
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

### Visual Tokens

```typescript
// Knosia-specific design tokens
const knosiaTokens = {
  colors: {
    alert: {
      bg: 'hsl(0 84% 60% / 0.1)',      // Red background
      border: 'hsl(0 84% 60%)',         // Red border
      text: 'hsl(0 84% 40%)',           // Red text
    },
    insight: {
      bg: 'hsl(217 91% 60% / 0.1)',    // Blue background
      border: 'hsl(217 91% 60%)',       // Blue border
      text: 'hsl(217 91% 40%)',         // Blue text
    },
    success: {
      bg: 'hsl(142 76% 36% / 0.1)',
      border: 'hsl(142 76% 36%)',
      text: 'hsl(142 76% 26%)',
    },
    confidence: {
      high: 'hsl(142 76% 36%)',         // Green
      medium: 'hsl(45 93% 47%)',        // Yellow
      low: 'hsl(0 0% 60%)',             // Gray
    },
  },
  spacing: {
    cardGap: '1rem',
    sectionGap: '1.5rem',
    sidebarWidth: '240px',
    drawerWidth: '320px',
  },
};
```

### Animation Timings

```css
/* Onboarding transitions */
--transition-page: 300ms ease-out;
--transition-card-hover: 150ms ease;
--transition-auto-advance: 350ms;

/* Analysis progress */
--stagger-checkmark: 500ms;
--spinner-duration: 1000ms;

/* Conversation */
--message-appear: 200ms ease-out;
--chart-render: 400ms ease-out;
```

---

## State Management

> **CRITICAL:** TurboStarter **FORBIDS** new state management libraries (Redux, Zustand, MobX).
> Use React Query for server state, `nuqs` for URL state, and localStorage for persistence.

### State Management Strategy

| State Type | Solution | Example |
|------------|----------|---------|
| **Server data** | React Query (via TurboStarter API client) | Briefing, vocabulary, connections |
| **URL state** | `nuqs` (createSearchParamsCache) | Filters, pagination, time range |
| **Form state** | React Hook Form (existing in TurboStarter) | Connection form, confirmation answers |
| **Ephemeral UI** | `useState` (minimal) | Modal open/close, input values |
| **Onboarding progress** | URL path + localStorage | Step tracking between sessions |

### Onboarding State (URL + localStorage)

```typescript
// modules/onboarding/hooks/use-onboarding-state.ts
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'knosia-onboarding';

interface OnboardingProgress {
  connectionId: string | null;
  analysisId: string | null;
  workspaceId: string | null;
  selectedRole: string | null;
  answers: { questionId: string; selectedOptionId: string }[];
}

export function useOnboardingState() {
  // Current step derived from URL path (source of truth)
  const pathname = usePathname();
  const step = pathname.split('/').pop() as 'connect' | 'review' | 'role' | 'confirm' | 'ready';

  // Progress persisted in localStorage for session continuity
  const getProgress = (): OnboardingProgress => {
    if (typeof window === 'undefined') return defaultProgress;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultProgress;
  };

  const setProgress = (update: Partial<OnboardingProgress>) => {
    const current = getProgress();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...update }));
  };

  const clearProgress = () => localStorage.removeItem(STORAGE_KEY);

  return { step, getProgress, setProgress, clearProgress };
}
```

### Dashboard State (URL via nuqs)

```typescript
// modules/dashboard/hooks/use-dashboard-filters.ts
import { createSearchParamsCache, parseAsString, parseAsStringEnum } from 'nuqs/server';

export const dashboardParamsCache = createSearchParamsCache({
  workspaceId: parseAsString,
  timeRange: parseAsStringEnum(['7d', '30d', '90d', '1y']).withDefault('30d'),
  comparison: parseAsStringEnum(['WoW', 'MoM', 'QoQ', 'YoY']).withDefault('MoM'),
});

// Usage in page.tsx (Server Component)
export default async function BriefingPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const { workspaceId, timeRange, comparison } = dashboardParamsCache.parse(searchParams);
  // ...
}
```

### Conversation State (React Query + URL)

```typescript
// modules/dashboard/hooks/use-conversation.ts
import { useQueryClient } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';

export function useConversation(workspaceId: string) {
  const queryClient = useQueryClient();

  // Active conversation tracked in URL for shareability
  const [conversationId, setConversationId] = useQueryState('conv', parseAsString);

  // Messages cached in React Query
  const messagesKey = ['conversation', workspaceId, conversationId];

  const addMessage = (message: Message) => {
    queryClient.setQueryData(messagesKey, (old: Message[] = []) => [...old, message]);
  };

  return { conversationId, setConversationId, addMessage, messagesKey };
}
```

### React Query Keys

```typescript
// lib/query-keys.ts
export const queryKeys = {
  connections: {
    all: ['connections'] as const,
    detail: (id: string) => ['connections', id] as const,
  },
  analysis: {
    detail: (id: string) => ['analysis', id] as const,
  },
  vocabulary: {
    byAnalysis: (analysisId: string) => ['vocabulary', analysisId] as const,
    byWorkspace: (workspaceId: string) => ['vocabulary', 'workspace', workspaceId] as const,
  },
  briefing: {
    byWorkspace: (workspaceId: string) => ['briefing', workspaceId] as const,
  },
  preferences: {
    byWorkspace: (workspaceId: string) => ['preferences', workspaceId] as const,
  },
};
```

---

## API Client

> **TurboStarter Pattern:** Use existing API client utilities, not raw `hc()`.

### Server Components (RSC)

```typescript
// In Server Components or Server Actions
import { api } from "~/lib/api/server";
import { handle } from "@turbostarter/api/utils";

// Server Component - fetch data directly
export default async function BriefingPage({ params }: Props) {
  const briefing = await handle(api.knosia.briefing.$get)({
    query: { workspaceId: params.workspaceId },
  });

  return <BriefingContent briefing={briefing} />;
}

// Server Action - mutations
"use server";
export async function testConnection(input: TestConnectionInput) {
  return handle(api.knosia.connections.test.$post)({ json: input });
}

export async function confirmVocabulary(input: ConfirmInput) {
  return handle(api.knosia.vocabulary.confirm.$post)({ json: input });
}
```

### Client Components (React Query)

```typescript
// In Client Components with "use client"
"use client";

import { api } from "~/lib/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

// Query hook - reading data
export function useBriefing(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.briefing.byWorkspace(workspaceId),
    queryFn: async () => {
      const res = await api.knosia.briefing.$get({ query: { workspaceId } });
      if (!res.ok) throw new Error("Failed to fetch briefing");
      return res.json();
    },
  });
}

// Mutation hook - writing data
export function useTestConnection() {
  return useMutation({
    mutationFn: async (input: TestConnectionInput) => {
      const res = await api.knosia.connections.test.$post({ json: input });
      if (!res.ok) throw new Error("Connection test failed");
      return res.json();
    },
  });
}

// Conversation mutation with optimistic updates
export function useSendMessage(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConversationInput) => {
      const res = await api.knosia.conversation.$post({ json: input });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onMutate: async (newMessage) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['conversation', workspaceId] });
      // Add placeholder message...
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', workspaceId] });
    },
  });
}
```

### SSE Streaming (Special Case)

```typescript
// SSE requires direct EventSource - not through Hono client
// modules/onboarding/hooks/use-analysis.ts
"use client";

import { useEffect, useState } from "react";

interface AnalysisProgress {
  step: number;
  total: number;
  message: string;
}

export function useAnalysisStream(connectionId: string, workspaceId: string) {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionId || !workspaceId) return;

    const eventSource = new EventSource(
      `/api/knosia/analysis/start?connectionId=${connectionId}&workspaceId=${workspaceId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress(data);
      } else if (data.type === 'complete') {
        setAnalysisId(data.analysisId);
        eventSource.close();
      } else if (data.type === 'error') {
        setError(data.message);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [connectionId, workspaceId]);

  return { progress, analysisId, error };
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Test formatters
describe('formatCurrency', () => {
  it('formats millions with M suffix', () => {
    expect(formatCurrency(2_300_000)).toBe('$2.3M');
  });
  it('formats thousands with K suffix', () => {
    expect(formatCurrency(180_000)).toBe('$180K');
  });
});

// Test components
describe('KpiCard', () => {
  it('renders value and label', () => {
    render(<KpiCard value={2300000} label="MRR" />);
    expect(screen.getByText('$2.3M')).toBeInTheDocument();
    expect(screen.getByText('MRR')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/onboarding.spec.ts
test.describe('Onboarding Flow', () => {
  test('complete onboarding flow', async ({ page }) => {
    // Select database
    await page.goto('/onboarding/connect');
    await page.click('[data-testid="db-postgres"]');

    // Enter credentials
    await page.fill('[name="host"]', 'localhost');
    await page.fill('[name="database"]', 'testdb');
    await page.fill('[name="username"]', 'user');
    await page.fill('[name="password"]', 'pass');
    await page.click('[data-testid="test-connect"]');

    // Wait for analysis
    await page.waitForURL('/onboarding/review');
    await page.waitForSelector('[data-testid="analysis-complete"]');

    // Confirm business type
    await page.click('[data-testid="looks-good"]');

    // Select role
    await page.click('[data-testid="role-executive"]');

    // Answer questions (or skip)
    await page.click('[data-testid="skip-defaults"]');

    // Verify ready page
    await page.waitForURL('/onboarding/ready');
    await expect(page.getByText("You're all set")).toBeVisible();
  });
});
```

---

## Files Summary

### Create (New Files)

| Path | Purpose |
|------|---------|
| **Onboarding Routes** | |
| `apps/web/src/app/[locale]/onboarding/layout.tsx` | Progress indicator + minimal chrome |
| `apps/web/src/app/[locale]/onboarding/page.tsx` | Redirect to /connect |
| `apps/web/src/app/[locale]/onboarding/connect/page.tsx` | Database connection |
| `apps/web/src/app/[locale]/onboarding/review/page.tsx` | Analysis review |
| `apps/web/src/app/[locale]/onboarding/role/page.tsx` | Role selection |
| `apps/web/src/app/[locale]/onboarding/confirm/page.tsx` | Vocabulary confirmation |
| `apps/web/src/app/[locale]/onboarding/ready/page.tsx` | First briefing preview |
| **Knosia Dashboard (Route Group)** | |
| `apps/web/src/app/[locale]/dashboard/(knosia)/layout.tsx` | Knosia sidebar + workspace context |
| `apps/web/src/app/[locale]/dashboard/(knosia)/page.tsx` | Redirect to /briefing |
| `apps/web/src/app/[locale]/dashboard/(knosia)/briefing/page.tsx` | Morning briefing (RSC) |
| `apps/web/src/app/[locale]/dashboard/(knosia)/ask/page.tsx` | Conversation mode (client) |
| `apps/web/src/app/[locale]/dashboard/(knosia)/p/[slug]/page.tsx` | Dynamic generated pages |
| `apps/web/src/app/[locale]/dashboard/(knosia)/connections/page.tsx` | Connection manager |
| `apps/web/src/app/[locale]/dashboard/(knosia)/vocabulary/page.tsx` | Vocabulary editor |
| `apps/web/src/app/[locale]/dashboard/(knosia)/settings/layout.tsx` | Settings sub-nav |
| `apps/web/src/app/[locale]/dashboard/(knosia)/settings/page.tsx` | General settings |
| **Modules** | |
| `apps/web/src/modules/onboarding/**/*.tsx` | ~15 onboarding components |
| `apps/web/src/modules/knosia/**/*.tsx` | ~25 dashboard components |
| **i18n** | |
| `packages/i18n/translations/en/knosia.json` | Knosia-specific strings |

### Modify (Existing Files)

| Path | Changes |
|------|---------|
| `apps/web/src/config/paths.ts` | Add `onboarding` and `knosia` path objects |
| `packages/i18n/translations/en/common.json` | Add sidebar labels: briefing, ask, connections, vocabulary |
| `packages/i18n/src/config.ts` | Add `knosia` namespace to i18n config |

---

## Quick Commands

```bash
# Install chart library (only new dependency needed)
# Note: React Query, nuqs already included in TurboStarter
pnpm add recharts

# Start dev server
pnpm dev

# Type check entire monorepo
pnpm typecheck

# Type check specific app
pnpm --filter web typecheck

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:projects:watch

# Database operations (always use with-env)
pnpm with-env -F @turbostarter/db db:generate    # After schema changes
pnpm with-env -F @turbostarter/db db:migrate     # Apply migrations
pnpm with-env -F @turbostarter/db db:studio      # Open database GUI

# Build
pnpm build
pnpm --filter web build
```

### i18n Translations to Add

```bash
# Add translations to these files:
packages/i18n/translations/en/common.json     # Sidebar labels
packages/i18n/translations/en/knosia.json     # NEW: Knosia-specific strings
```

```json
// packages/i18n/translations/en/common.json - ADD
{
  "briefing": "Briefing",
  "ask": "Ask",
  "connections": "Connections",
  "vocabulary": "Vocabulary"
}

// packages/i18n/translations/en/knosia.json - NEW FILE
{
  "briefing": {
    "title": "Good morning",
    "description": "Here's what's happening with your business"
  },
  "onboarding": {
    "connect": {
      "title": "Connect your database",
      "description": "We'll analyze your schema to understand your business"
    }
  }
}
```

---

## Success Criteria

### Wave 1-2 (Onboarding) Complete When:
- [ ] User can select database type
- [ ] User can enter and test credentials
- [ ] Analysis runs with progressive checkmarks
- [ ] Business type detection displays
- [ ] Role selection works with auto-advance
- [ ] Confirmation questions display and save
- [ ] First briefing preview shows real data

### Wave 3-4 (Dashboard) Complete When:
- [ ] Dashboard displays with sidebar
- [ ] Briefing page shows KPIs, alerts, insights
- [ ] User can type questions
- [ ] Responses display with visualizations
- [ ] Grounding links are clickable

### Wave 5-6 (Polish) Complete When:
- [ ] Charts render correctly
- [ ] Dynamic pages work
- [ ] Error states display gracefully
- [ ] Empty states guide users
- [ ] E2E tests pass

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `2025-12-29-1715-FINAL-knosia-liquidconnect-integration.md` | Backend API spec (WF-0018) |
| `2025-12-29-0219-knosia-ux-flow-clickthrough.md` | Detailed UX screens |
| `2025-12-29-0211-knosia-ui-implementation-spec.md` | Component inventory |
| `2025-12-29-1355-knosia-architecture-vision.md` | Full product vision |

---

*Ready for implementation. Start with Wave 1: Onboarding Foundation.*
