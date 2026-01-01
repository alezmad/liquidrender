# Knosia Implementation Checklist

**Purpose:** Comprehensive verification checklist for Knosia MVP completion.
**Created:** 2026-01-01
**Source:** `.artifacts/2025-12-31-1338-knosia-vision-implementation-spec.md`

---

## How to Use

- [ ] = Not started / Not verified
- [x] = Verified complete
- [~] = Partial / Needs attention
- [N/A] = Not applicable for current scope

---

## Phase 0: Schema Foundation

### 0.1 Conversations → Threads Rename

- [ ] `knosia_conversation` table renamed to `knosia_thread`
- [ ] `knosia_conversation_message` renamed to `knosia_thread_message`
- [ ] `knosia_conversation_status` enum renamed to `knosia_thread_status`
- [ ] `conversation_id` column renamed to `thread_id` in message table
- [ ] New Thread columns added:
  - [ ] `is_ai_initiated` (boolean)
  - [ ] `starred` (boolean)
  - [ ] `parent_thread_id` (self-reference for forking)
  - [ ] `forked_from_message_id` (text)
- [ ] Index created: `idx_thread_parent` on `parent_thread_id`

### 0.2 New Tables Created

#### Thread Extensions
- [ ] `knosia_thread_snapshot` table exists
  - [ ] `id`, `thread_id`, `name`, `description`
  - [ ] `message_count`, `snapshot_data` (JSONB)
  - [ ] `created_by`, `created_at`

#### Canvas Tables
- [ ] `knosia_canvas_status` enum (`draft`, `active`, `archived`)
- [ ] `knosia_canvas_block_type` enum (all 11 types)
- [ ] `knosia_canvas` table exists
  - [ ] `id`, `workspace_id`, `created_by`, `name`, `description`, `icon`
  - [ ] `status`, `is_ai_generated`, `layout` (JSONB)
  - [ ] `visibility`, `shared_with` (JSONB)
  - [ ] `last_viewed_at`, `view_count`
  - [ ] `created_at`, `updated_at`
- [ ] `knosia_canvas_block` table exists
  - [ ] `id`, `canvas_id`, `type`, `title`
  - [ ] `position` (JSONB: x, y, width, height)
  - [ ] `config` (JSONB), `data_source` (JSONB)
  - [ ] `cached_data`, `cached_at`, `sort_order`
  - [ ] `created_at`, `updated_at`
- [ ] `knosia_canvas_alert` table exists
  - [ ] `id`, `canvas_id`, `block_id`, `name`
  - [ ] `condition` (JSONB), `channels` (JSONB)
  - [ ] `enabled`, `last_triggered_at`, `created_at`

#### Collaboration Tables
- [ ] `knosia_comment_target` enum (`thread_message`, `canvas_block`, `thread`)
- [ ] `knosia_comment` table exists
  - [ ] `id`, `target_type`, `target_id`, `user_id`
  - [ ] `content`, `mentions` (JSONB)
  - [ ] `created_at`, `updated_at`

#### Notification Tables
- [ ] `knosia_notification_type` enum (6 types)
- [ ] `knosia_notification` table exists
  - [ ] `id`, `user_id`, `workspace_id`, `type`
  - [ ] `title`, `body`, `source_type`, `source_id`
  - [ ] `read`, `dismissed`, `actions` (JSONB)
  - [ ] `created_at`
- [ ] `knosia_digest` table exists
  - [ ] `id`, `user_id`, `workspace_id`, `name`
  - [ ] `schedule` (cron), `channels` (JSONB)
  - [ ] `include` (JSONB), `enabled`
  - [ ] `last_sent_at`, `next_send_at`, `created_at`

#### AI Insight Tables
- [ ] `knosia_ai_insight_status` enum (5 statuses)
- [ ] `knosia_ai_insight` table exists
  - [ ] `id`, `workspace_id`, `target_user_id`
  - [ ] `headline`, `explanation`, `evidence` (JSONB)
  - [ ] `severity`, `category`, `status`
  - [ ] `thread_id` (if converted)
  - [ ] `surfaced_at`, `viewed_at`, `engaged_at`, `dismissed_at`

#### Activity Feed
- [ ] `knosia_activity_type` enum (7 types)
- [ ] `knosia_activity` table exists
  - [ ] `id`, `workspace_id`, `user_id`, `type`
  - [ ] `target_type`, `target_id`, `target_name`
  - [ ] `metadata` (JSONB), `created_at`

### 0.3 Enhanced Thread Message

- [ ] `provenance` JSONB column added to `knosia_thread_message`
  - [ ] Supports `freshness` (string)
  - [ ] Supports `sources` (array of {name, query})
  - [ ] Supports `assumptions` (string array)
  - [ ] Supports `confidence_level` (exact/calculated/estimated/predicted)
  - [ ] Supports `confidence_score` (0-100)
- [ ] `comment_count` integer column added

### 0.4 Migration Applied

- [ ] Migration file generated
- [ ] Migration reviewed for correctness
- [ ] Migration applied to development database
- [ ] TypeScript references updated (conversation → thread)
- [ ] No orphaned references to old table names

---

## Phase 1: Threads Evolution

### 1.1 API Module Structure

- [ ] `packages/api/src/modules/knosia/thread/` directory exists
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
  - [ ] `index.ts`
- [ ] `packages/api/src/modules/knosia/thread-snapshot/` directory exists

### 1.2 Thread Router Endpoints

#### Core CRUD
- [ ] `GET /knosia/threads` - List threads
- [ ] `GET /knosia/threads/:id` - Get single thread
- [ ] `POST /knosia/threads` - Create thread
- [ ] `POST /knosia/threads/:id/message` - Add message

#### Forking
- [ ] `POST /knosia/threads/:id/fork` - Fork thread from message
  - [ ] Accepts `fromMessageId`, `name`
  - [ ] Returns new forked thread

#### Snapshots
- [ ] `POST /knosia/threads/:id/snapshot` - Create snapshot
  - [ ] Accepts `name`, `description`
- [ ] `GET /knosia/threads/:id/snapshots` - List snapshots

#### Starring
- [ ] `POST /knosia/threads/:id/star` - Star thread
- [ ] `DELETE /knosia/threads/:id/star` - Unstar thread

#### Sharing
- [ ] `POST /knosia/threads/:id/share` - Share thread
  - [ ] Accepts `userIds`, `mode` (view/collaborate)

### 1.3 Frontend Thread Module

- [ ] `apps/web/src/modules/knosia/threads/` directory structure:
  - [ ] `components/thread-view.tsx`
  - [ ] `components/thread-sidebar.tsx`
  - [ ] `components/thread-message.tsx`
  - [ ] `components/block-trust-badge.tsx`
  - [ ] `components/thread-actions.tsx`
  - [ ] `components/snapshot-modal.tsx`
  - [ ] `hooks/use-thread.ts`
  - [ ] `hooks/use-threads-list.ts`
  - [ ] `hooks/use-thread-actions.ts`
  - [ ] `types.ts`
  - [ ] `index.ts`

### 1.4 Thread UI Functionality

- [ ] Thread list displays in sidebar
  - [ ] Starred threads section
  - [ ] AI-created threads section
  - [ ] Recent threads section
- [ ] Thread view shows full conversation
- [ ] Can create new thread
- [ ] Can add messages to thread
- [ ] Can fork thread from any message
- [ ] Can create snapshot of thread
- [ ] Can star/unstar threads
- [ ] Can share thread with other users

---

## Phase 2: Block Trust Metadata

### 2.1 Provenance Generation

- [ ] `QueryExecutor` returns provenance metadata
  - [ ] Freshness timestamp
  - [ ] Source table/query identification
  - [ ] Confidence calculation implemented
- [ ] Confidence level heuristics:
  - [ ] Direct SELECT = exact (100)
  - [ ] JOINs/aggregations = calculated (80-90)
  - [ ] SAMPLE/LIMIT extrapolation = estimated (60-70)
  - [ ] ML predictions = predicted (40-60)

### 2.2 Trust Badge Component

- [ ] `BlockTrustBadge` component exists
- [ ] Displays confidence level visually (bars/colors)
- [ ] Shows freshness on hover
- [ ] Shows sources on hover
- [ ] Shows assumptions (if any) on hover
- [ ] Color coding:
  - [ ] exact = green
  - [ ] calculated = blue
  - [ ] estimated = yellow
  - [ ] predicted = orange

### 2.3 Integration

- [ ] All Thread messages with data show trust badge
- [ ] All Canvas blocks with data show trust badge
- [ ] Provenance stored in database with messages

---

## Phase 3: Brief Enhancement

### 3.1 Brief Module Structure

- [ ] `apps/web/src/modules/knosia/brief/` directory:
  - [ ] `components/brief-view.tsx`
  - [ ] `components/attention-section.tsx`
  - [ ] `components/on-track-section.tsx`
  - [ ] `components/thinking-section.tsx`
  - [ ] `components/tasks-section.tsx`
  - [ ] `components/insight-card.tsx`
  - [ ] `hooks/use-brief-data.ts`
  - [ ] `index.ts`

### 3.2 Brief Sections

- [ ] Attention section (red) shows:
  - [ ] Anomalies
  - [ ] Declining metrics
  - [ ] Risks/alerts
- [ ] On Track section (green) shows:
  - [ ] Healthy metrics
  - [ ] Positive trends
- [ ] Thinking section shows:
  - [ ] AI observations/insights
  - [ ] Pattern detections
- [ ] Tasks section shows:
  - [ ] Pending user actions

### 3.3 AI Insight Generation

- [ ] `generateDailyInsights()` function implemented
- [ ] Anomaly detection working
- [ ] Pattern finding working
- [ ] Max 2-3 insights per day (balanced setting)
- [ ] Insights stored in `knosia_ai_insight` table

### 3.4 Briefing API

- [ ] `GET /knosia/briefing` returns:
  - [ ] `greeting` (personalized)
  - [ ] `attention` (array of items)
  - [ ] `onTrack` (array of items)
  - [ ] `thinking` (array of insights)
  - [ ] `tasks` (array of pending actions)

---

## Phase 4: Canvases

### 4.1 Canvas API Module

- [ ] `packages/api/src/modules/knosia/canvas/` structure:
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
  - [ ] `blocks/router.ts`
  - [ ] `blocks/mutations.ts`
  - [ ] `alerts/router.ts`
  - [ ] `alerts/mutations.ts`
  - [ ] `index.ts`

### 4.2 Canvas Router Endpoints

#### Core CRUD
- [ ] `GET /knosia/canvases` - List canvases
- [ ] `GET /knosia/canvases/:id` - Get canvas with blocks
- [ ] `POST /knosia/canvases` - Create canvas
- [ ] `PATCH /knosia/canvases/:id` - Update canvas
- [ ] `DELETE /knosia/canvases/:id` - Delete canvas

#### AI Features
- [ ] `POST /knosia/canvases/generate` - Generate canvas from prompt
  - [ ] Accepts `prompt`, `roleId`
  - [ ] Returns AI-generated canvas structure
- [ ] `POST /knosia/canvases/:id/edit` - Natural language edit
  - [ ] Accepts `instruction`
  - [ ] Modifies canvas based on instruction

#### Block Management
- [ ] `POST /knosia/canvases/:id/blocks` - Add block
- [ ] `PATCH /knosia/canvases/:id/blocks/:blockId` - Update block
- [ ] `DELETE /knosia/canvases/:id/blocks/:blockId` - Remove block
- [ ] `POST /knosia/canvases/:id/blocks/reorder` - Reorder blocks

#### Alert Management
- [ ] `GET /knosia/canvases/:id/alerts` - List alerts
- [ ] `POST /knosia/canvases/:id/alerts` - Create alert
- [ ] `PATCH /knosia/canvases/:id/alerts/:alertId` - Update alert
- [ ] `DELETE /knosia/canvases/:id/alerts/:alertId` - Delete alert

### 4.3 Canvas Frontend Module

- [ ] `apps/web/src/modules/knosia/canvas/` structure:
  - [ ] `components/canvas-view.tsx`
  - [ ] `components/canvas-grid.tsx`
  - [ ] `components/canvas-block.tsx`
  - [ ] `components/blocks/hero-metric.tsx`
  - [ ] `components/blocks/watch-list.tsx`
  - [ ] `components/blocks/comparison-card.tsx`
  - [ ] `components/blocks/insight-card.tsx`
  - [ ] `components/blocks/liquid-render-block.tsx`
  - [ ] `components/canvas-editor.tsx`
  - [ ] `components/canvas-prompt-bar.tsx`
  - [ ] `components/canvas-alerts-panel.tsx`
  - [ ] `components/canvas-share-modal.tsx`
  - [ ] `hooks/use-canvas.ts`
  - [ ] `hooks/use-canvas-blocks.ts`
  - [ ] `hooks/use-canvas-mutations.ts`
  - [ ] `types.ts`
  - [ ] `index.ts`

### 4.4 Block Type Rendering

#### Canvas-Native Blocks
- [ ] `hero_metric` block renders correctly
- [ ] `watch_list` block renders correctly
- [ ] `comparison` block renders correctly
- [ ] `insight` block renders correctly
- [ ] `text` block renders correctly

#### LiquidRender Delegation
- [ ] `kpi` block delegates to LiquidRender
- [ ] `line_chart` block delegates to LiquidRender
- [ ] `bar_chart` block delegates to LiquidRender
- [ ] `area_chart` block delegates to LiquidRender
- [ ] `pie_chart` block delegates to LiquidRender
- [ ] `table` block delegates to LiquidRender

### 4.5 Canvas Features

- [ ] Grid layout system (12 columns default)
- [ ] Freeform layout option (alternative to grid)
- [ ] Drag and drop block positioning
- [ ] Block resize functionality
- [ ] Edit mode toggle
- [ ] Natural language prompt bar
- [ ] Alert configuration panel
- [ ] Share modal with permissions
- [ ] Duplicate canvas
- [ ] Archive/unarchive canvas
- [ ] View count tracking

### 4.6 Canvas List Page

- [ ] Grid/list view toggle
- [ ] Filter by status (all, active, draft, archived)
- [ ] Filter by AI-generated
- [ ] Sort by (recent, name, most viewed)
- [ ] Create new canvas button
- [ ] Quick actions (edit, duplicate, archive, delete)
- [ ] Empty state for no canvases

---

## Phase 5: Collaboration

### 5.1 Comments API

- [ ] `packages/api/src/modules/knosia/comment/` module exists
- [ ] `GET /knosia/comments` - List comments (with targetType/targetId filter)
- [ ] `POST /knosia/comments` - Create comment
  - [ ] Supports mentions
  - [ ] Triggers mention notifications
- [ ] `PATCH /knosia/comments/:id` - Edit comment
- [ ] `DELETE /knosia/comments/:id` - Delete comment

### 5.2 Activity Feed API

- [ ] `packages/api/src/modules/knosia/activity/` module exists
- [ ] `GET /knosia/activity` - Get activity feed
  - [ ] Filter by workspace
  - [ ] Filter by type
  - [ ] Pagination support

### 5.3 Collaboration UI

- [ ] Comment thread on Thread messages
- [ ] Comment thread on Canvas blocks
- [ ] Activity feed page/panel
- [ ] @mention autocomplete in comments
- [ ] Share dialogs for Threads and Canvases

### 5.4 Team Page

- [ ] `/dashboard/knosia/team` page exists
- [ ] Activity feed tab showing recent team activity
- [ ] Shared with me tab showing:
  - [ ] Threads shared with current user
  - [ ] Canvases shared with current user
- [ ] Team members list (if admin)
- [ ] Filter activity by type
- [ ] Filter activity by team member
- [ ] Pagination for activity feed

---

## Phase 6: Notifications

### 6.1 Notification API

- [ ] `packages/api/src/modules/knosia/notification/` module exists
- [ ] `GET /knosia/notifications` - List user notifications
- [ ] `POST /knosia/notifications/:id/read` - Mark as read
- [ ] `POST /knosia/notifications/:id/dismiss` - Dismiss
- [ ] `POST /knosia/notifications/read-all` - Mark all read

### 6.2 Digest API

- [ ] `packages/api/src/modules/knosia/digest/` module exists
- [ ] `GET /knosia/digests` - List user's digests
- [ ] `POST /knosia/digests` - Create digest
- [ ] `PATCH /knosia/digests/:id` - Update digest
- [ ] `DELETE /knosia/digests/:id` - Delete digest
- [ ] `POST /knosia/digests/:id/preview` - Preview digest

### 6.3 Notification UI

- [ ] Bell icon in header with unread count
- [ ] Notification dropdown/panel
- [ ] Notification types displayed correctly:
  - [ ] Alert (threshold crossed)
  - [ ] Mention (@mentioned)
  - [ ] Share (Thread/Canvas shared)
  - [ ] AI Insight (AI found something)
  - [ ] Thread Activity
  - [ ] Digest
- [ ] Mark as read/dismiss actions

### 6.4 Digest Configuration

- [ ] Digest creation form
- [ ] Schedule selection (cron-based)
- [ ] Channel selection (email, slack)
- [ ] Content selection (canvases, metrics, alerts, insights)
- [ ] Digest preview

---

## Navigation & Routing

### Header

- [ ] Header displays: Knosia logo, Brief, Canvases, Threads, Team
- [ ] Notification bell with unread count
- [ ] User avatar with dropdown
- [ ] Settings gear icon

### Routes

- [ ] `/dashboard/knosia/` → Brief (default)
- [ ] `/dashboard/knosia/brief` → Brief
- [ ] `/dashboard/knosia/canvases` → Canvas list
- [ ] `/dashboard/knosia/canvases/new` → Create new canvas
- [ ] `/dashboard/knosia/canvases/:id` → Single canvas view
- [ ] `/dashboard/knosia/canvases/:id/edit` → Canvas edit mode
- [ ] `/dashboard/knosia/threads` → Thread list with sidebar
- [ ] `/dashboard/knosia/threads/new` → Start new thread
- [ ] `/dashboard/knosia/threads/:id` → Single thread
- [ ] `/dashboard/knosia/team` → Team activity + shared
- [ ] `/dashboard/knosia/team/activity` → Activity feed
- [ ] `/dashboard/knosia/team/shared` → Shared with me
- [ ] `/dashboard/knosia/connections` → Connections management
- [ ] `/dashboard/knosia/vocabulary` → Vocabulary management
- [ ] `/dashboard/knosia/settings` → User preferences
- [ ] `/dashboard/knosia/settings/notifications` → Notification settings
- [ ] `/dashboard/knosia/settings/digests` → Digest configuration

### Path Configuration

- [ ] All routes defined in `apps/web/src/config/paths.ts`
- [ ] Sidebar menu configured in layout
- [ ] i18n translations for all navigation items

---

## Non-Functional Requirements

### Performance

- [ ] Brief loads with AI insights < 2 seconds
- [ ] Canvas renders all blocks < 3 seconds
- [ ] Thread list loads < 1 second
- [ ] Search results return < 500ms
- [ ] Real-time updates via SSE/WebSocket where applicable

### Reliability

- [ ] All API endpoints have error handling
- [ ] Failed requests show user-friendly error messages
- [ ] Retry logic for transient failures
- [ ] Graceful degradation when services unavailable

### Security

- [ ] All endpoints require authentication (`enforceAuth`)
- [ ] Workspace isolation (users only see their workspace data)
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in rendered content
- [ ] Sensitive data not exposed in client bundles

### Data Integrity

- [ ] Foreign key constraints enforced
- [ ] Cascade deletes configured correctly
- [ ] No orphaned records possible
- [ ] Timestamps automatically maintained

### Observability

- [ ] Error logging for all failures
- [ ] Request/response logging (non-sensitive)
- [ ] Performance metrics collected
- [ ] Health check endpoint

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

### Mobile Responsiveness

- [ ] Brief readable on mobile
- [ ] Canvas has mobile-friendly view mode
- [ ] Threads work on mobile
- [ ] Navigation collapses appropriately

---

## Integration Points

### Query Execution (DuckDB)

- [ ] QueryExecutor integrated with Thread message generation
- [ ] QueryExecutor integrated with Canvas block data
- [ ] Provenance metadata generated for all queries
- [ ] Query timeout handling
- [ ] Result caching for Canvas blocks

### LiquidRender

- [ ] Chart blocks delegate to LiquidRender correctly
- [ ] Data binding from Canvas to LiquidRender works
- [ ] Styling consistent with Canvas design

### AI/LLM

- [ ] Natural language → SQL working
- [ ] Canvas generation from prompt working
- [ ] Canvas natural language edit working
- [ ] Daily insight generation working
- [ ] Anomaly detection working

### External Notifications

- [ ] Email notifications configured
- [ ] Slack integration configured (if applicable)
- [ ] Digest emails send on schedule

---

## Testing Checklist

### Unit Tests

- [ ] Thread API queries/mutations tested
- [ ] Canvas API queries/mutations tested
- [ ] Provenance calculation tested
- [ ] AI insight generation tested

### Integration Tests

- [ ] Full Thread flow (create → message → fork)
- [ ] Full Canvas flow (create → add blocks → edit)
- [ ] Notification flow (action → notification → view)
- [ ] Digest generation and preview

### E2E Tests

- [ ] Onboarding → Brief flow
- [ ] Brief → Thread creation
- [ ] Canvas creation and editing
- [ ] Sharing and collaboration

### Manual QA

- [ ] All happy paths verified
- [ ] Edge cases tested (empty states, errors)
- [ ] Mobile testing complete
- [ ] Cross-browser testing complete

---

## Onboarding Flow (Verify Existing)

### Connection Flow
- [ ] `/onboarding/connect` page works
- [ ] Database type selection
- [ ] Credential input form
- [ ] Test connection before proceeding
- [ ] Error handling for failed connections

### Analysis Flow
- [ ] `/onboarding/analyze` page works
- [ ] SSE streaming of analysis progress
- [ ] Schema extraction displays tables/columns
- [ ] Vocabulary detection displays metrics/dimensions

### Summary Flow
- [ ] `/onboarding/summary` page works
- [ ] Lists all connected databases
- [ ] Shows connection health status
- [ ] "Add Another" button works
- [ ] "Continue" navigates to role selection

### Role Selection
- [ ] `/onboarding/role` page works
- [ ] 6 role cards displayed (Executive, Finance, Sales, Marketing, Product, Support)
- [ ] Role selection persists
- [ ] Can change role before continuing

### Confirmation Questions
- [ ] `/onboarding/confirm` page works
- [ ] Question carousel
- [ ] Skip functionality
- [ ] Answers persist to state

### Ready Screen
- [ ] `/onboarding/ready` page works
- [ ] Briefing preview displayed
- [ ] "Go to Dashboard" navigates correctly
- [ ] Guest expiration banner (if guest)

---

## NL → SQL Translation (liquid-connect)

### Query Resolution
- [ ] Natural language parsed correctly
- [ ] Intent detection (question type)
- [ ] Entity extraction (metrics, dimensions, filters)
- [ ] Vocabulary lookup
- [ ] SQL generation

### SQL Emitters
- [ ] DuckDB SQL emitter works
- [ ] PostgreSQL dialect emitter works
- [ ] Handles aggregations (SUM, AVG, COUNT, etc.)
- [ ] Handles grouping (GROUP BY)
- [ ] Handles filtering (WHERE)
- [ ] Handles time ranges
- [ ] Handles comparisons (vs previous period)

### Query Validation
- [ ] Generated SQL is valid
- [ ] Prevents SQL injection
- [ ] Respects row limits
- [ ] Respects timeout

---

## Pre-Existing Requirements (from NEXT-STEPS.md)

### DuckDB Integration (Critical Path)

#### Phase 3: UVB Integration
- [ ] Refactor `analysis/queries.ts` to use DuckDBAdapter
- [ ] Remove PostgresAdapter dependency (keep as fallback)
- [ ] Test with PostgreSQL via `postgres_scanner`
- [ ] Verify schema extraction works for all supported DB types

#### Phase 4: Query Execution Integration
- [ ] Integrate QueryExecutor with Thread API mutations
- [ ] Add query execution to Thread message flow
- [ ] Handle query results (tables, aggregates)
- [ ] Return provenance metadata with results

### Auto Semantic Layer Generation
- [ ] Auto-generate semantic YAML from UVB detections
- [ ] Store semantic layer in `knosia_vocabulary_item` table
- [ ] Load semantic layer into registry for resolver
- [ ] Update vocabulary on re-analysis

### Vocabulary → Semantic Bridge
- [ ] Database-stored vocabulary items sync with compiled vocabulary
- [ ] User confirmations/corrections update semantic layer
- [ ] Multi-workspace vocabulary isolation

### Guest → Registered Conversion
- [ ] Hook `convertGuestToRegistered()` in auth signup flow
- [ ] Transfer guest workspace data to registered account
- [ ] Add ExpirationBanner to main dashboard layout
- [ ] Add "Upgrade" CTA in dashboard for guest users

### Connections Management Page
- [ ] `/dashboard/knosia/connections` page exists
- [ ] List existing connections with status badges
- [ ] Add new connection flow (reuse onboarding components)
- [ ] Edit connection (name, credentials)
- [ ] Delete connection (with confirmation)
- [ ] Connection health indicators (last checked, status)
- [ ] Re-test connection button
- [ ] Re-analyze connection button

### Vocabulary Management Page
- [ ] `/dashboard/knosia/vocabulary` page exists
- [ ] List vocabulary items by type (metrics, dimensions, entities)
- [ ] Search/filter vocabulary
- [ ] Edit vocabulary item definitions
- [ ] Add custom vocabulary item
- [ ] Delete vocabulary item
- [ ] Sync status with source connections
- [ ] Version history per item

---

## AI Insight Management (Phase 3 Addition)

### Insight API Module
- [ ] `packages/api/src/modules/knosia/insight/` module exists
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
- [ ] `GET /knosia/insights` - List insights (with filters)
- [ ] `GET /knosia/insights/:id` - Get single insight
- [ ] `POST /knosia/insights/:id/view` - Mark as viewed
- [ ] `POST /knosia/insights/:id/engage` - Mark as engaged
- [ ] `POST /knosia/insights/:id/dismiss` - Dismiss insight
- [ ] `POST /knosia/insights/:id/convert-to-thread` - Convert to Thread
  - [ ] Creates new Thread with insight context
  - [ ] Updates insight status to "converted"
  - [ ] Links insight to new Thread

### Insight Generation Service
- [ ] `generateDailyInsights()` function exists
- [ ] Anomaly detection algorithm implemented
- [ ] Pattern detection algorithm implemented
- [ ] Severity scoring implemented
- [ ] Role-based insight filtering (different insights per role)

---

## Background Jobs / Cron Tasks

### Alert Checking
- [ ] Cron job or event-driven alert evaluation
- [ ] Check Canvas alert conditions against current data
- [ ] Trigger notifications when thresholds crossed
- [ ] Rate limiting to prevent notification spam
- [ ] Update `last_triggered_at` on alert

### Digest Sending
- [ ] Cron job for scheduled digest delivery
- [ ] Query digests where `next_send_at <= now()`
- [ ] Generate digest content based on `include` config
- [ ] Send via configured channels (email, slack)
- [ ] Update `last_sent_at` and `next_send_at`

### Daily Insight Generation
- [ ] Cron job for daily insight generation
- [ ] Run per workspace with active connections
- [ ] Respect user's AI proactivity preference
- [ ] Generate max insights based on setting (balanced = 2-3)

### Guest Organization Cleanup
- [ ] Cron job exists (`/api/cron/cleanup-expired-orgs`) ✅
- [ ] Deletes guest orgs past TTL (7 days)
- [ ] Cascades to all related data

---

## User Preferences & Settings

### Settings Page
- [ ] `/dashboard/knosia/settings` page exists
- [ ] User profile section
- [ ] AI Proactivity level setting:
  - [ ] Off (no AI insights)
  - [ ] Minimal (1 per day max)
  - [ ] Balanced (2-3 per day) - default
  - [ ] Proactive (unlimited)
- [ ] Notification preferences:
  - [ ] In-app notifications toggle
  - [ ] Email notifications toggle
  - [ ] Slack notifications toggle (if connected)
- [ ] Default time range preference
- [ ] Timezone setting

### Workspace Settings (Admin)
- [ ] Workspace name edit
- [ ] Workspace visibility settings
- [ ] Member management
- [ ] Connection permissions

---

## Search Functionality

### Thread Search
- [ ] Search threads by title
- [ ] Search threads by message content
- [ ] Filter by starred
- [ ] Filter by AI-initiated
- [ ] Filter by date range
- [ ] Sort options (recent, starred first, etc.)

### Canvas Search
- [ ] Search canvases by name
- [ ] Search canvases by description
- [ ] Filter by status (draft, active, archived)
- [ ] Filter by AI-generated
- [ ] Sort options (recent, most viewed, etc.)

### Global Search
- [ ] Unified search across Threads, Canvases, Vocabulary
- [ ] Search results grouped by type
- [ ] Quick navigation to result

---

## Real-Time Features

### SSE/WebSocket Support
- [ ] Thread message streaming (SSE exists ✅)
- [ ] Canvas block data refresh
- [ ] Notification push
- [ ] Collaboration presence (who's viewing)

---

## Email Templates

### Notification Emails
- [ ] Alert triggered email template
- [ ] Mention notification email template
- [ ] Share notification email template
- [ ] AI insight email template

### Digest Emails
- [ ] Daily digest email template
- [ ] Weekly digest email template
- [ ] Custom schedule digest template
- [ ] Includes: KPIs, alerts, insights, activity

---

## External Integrations

### Slack Integration
- [ ] Slack app configuration
- [ ] OAuth flow for workspace connection
- [ ] Send notifications to Slack channel
- [ ] Send digests to Slack channel
- [ ] Interactive Slack messages (dismiss, view)

---

## Export Features

### Thread Export
- [ ] Export thread to PDF
- [ ] Export thread to Markdown
- [ ] Include visualizations in export

### Canvas Export
- [ ] Export canvas to PDF
- [ ] Export canvas to PNG/image
- [ ] Export canvas data to CSV

---

## UX Polish & Edge Cases

### Loading States
- [ ] Skeleton loaders for Thread list
- [ ] Skeleton loaders for Canvas list
- [ ] Skeleton loaders for Brief sections
- [ ] Skeleton loaders for data blocks
- [ ] Spinner for actions (save, delete, etc.)
- [ ] Progress indicator for long operations

### Empty States
- [ ] No threads empty state with CTA
- [ ] No canvases empty state with CTA
- [ ] No connections empty state
- [ ] No vocabulary items empty state
- [ ] No notifications empty state
- [ ] No activity empty state
- [ ] No search results state

### Error States
- [ ] Error boundary at app level
- [ ] Error boundary per major section
- [ ] 404 page for not found routes
- [ ] 500 page for server errors
- [ ] Network error handling (offline/timeout)
- [ ] API error messages displayed to user
- [ ] Retry button for failed requests

### Form Validation
- [ ] Client-side validation feedback
- [ ] Server-side validation errors displayed
- [ ] Required field indicators
- [ ] Character limits shown
- [ ] Unsaved changes warning on navigation

---

## Canvas Editor UX

### Undo/Redo
- [ ] Undo last action (Cmd+Z)
- [ ] Redo last action (Cmd+Shift+Z)
- [ ] History stack for canvas edits

### Autosave
- [ ] Autosave canvas changes (debounced)
- [ ] "Saving..." indicator
- [ ] "All changes saved" indicator
- [ ] Conflict detection if edited elsewhere

### Keyboard Shortcuts
- [ ] Delete selected block (Backspace/Delete)
- [ ] Duplicate block (Cmd+D)
- [ ] Select all blocks (Cmd+A)
- [ ] Escape to deselect
- [ ] Arrow keys to nudge position

---

## Collaboration Edge Cases

### Concurrent Editing
- [ ] Last-write-wins or merge strategy defined
- [ ] "Someone else is editing" indicator
- [ ] Refresh prompt when stale
- [ ] Optimistic updates with rollback

### Permission Edge Cases
- [ ] Shared item deleted by owner → notify viewers
- [ ] User removed from workspace → revoke access
- [ ] Connection deleted → affected canvases show error

---

## Data Management

### Pagination
- [ ] Thread list pagination
- [ ] Canvas list pagination
- [ ] Activity feed pagination
- [ ] Notification list pagination
- [ ] Search results pagination
- [ ] Comments pagination

### Caching Strategy
- [ ] Brief data cached (TTL: 5 min)
- [ ] Canvas block data cached (TTL: configurable)
- [ ] Vocabulary cached (TTL: 1 hour)
- [ ] Invalidation on updates

### Audit Logging
- [ ] Log user actions (create, update, delete)
- [ ] Log data access (queries executed)
- [ ] Log authentication events
- [ ] Admin audit log viewer

---

## Data Privacy & Compliance

### User Data Rights (GDPR)
- [ ] Export user data (JSON download)
- [ ] Delete user account and all data
- [ ] Data retention policy documented
- [ ] Privacy policy link in settings

### Data Security
- [ ] Connection credentials encrypted at rest
- [ ] Query results not logged in plain text
- [ ] PII detection/masking option
- [ ] Workspace data isolation verified

---

## Internationalization (i18n)

### Translation Coverage
- [ ] All UI strings in translation files
- [ ] Error messages translated
- [ ] Email templates translated
- [ ] Date/time formatting localized
- [ ] Number formatting localized
- [ ] Pluralization rules

### Supported Locales
- [ ] English (en) - default
- [ ] Spanish (es) - if required
- [ ] Other locales as needed

---

## Theming

### Dark Mode
- [ ] Dark mode toggle in settings
- [ ] System preference detection
- [ ] All components support dark mode
- [ ] Charts support dark mode colors
- [ ] Persist theme preference

---

## Onboarding & Help

### First-Time User Experience
- [ ] Welcome modal for new users
- [ ] Feature tour/walkthrough option
- [ ] Suggested first actions
- [ ] Sample data option for demo

### In-App Help
- [ ] Tooltips on complex features
- [ ] "?" help icons with explanations
- [ ] Link to documentation
- [ ] Keyboard shortcut reference (Cmd+/)

### Feedback
- [ ] Feedback button/form
- [ ] Bug report mechanism
- [ ] Feature request option

---

## Analytics & Monitoring

### Product Analytics
- [ ] Page view tracking
- [ ] Feature usage tracking
- [ ] Funnel tracking (onboarding completion)
- [ ] User engagement metrics

### Error Tracking
- [ ] Frontend error capture (Sentry/similar)
- [ ] Backend error capture
- [ ] Error alerting configured

### Performance Monitoring
- [ ] API response time tracking
- [ ] Page load time tracking
- [ ] Database query performance

---

## API & Integration

### API Documentation
- [ ] OpenAPI/Swagger spec generated
- [ ] API docs accessible
- [ ] Authentication documented
- [ ] Rate limits documented

### Webhooks (Future)
- [ ] Webhook configuration UI
- [ ] Event types documented
- [ ] Webhook delivery logging
- [ ] Retry logic for failed deliveries

### SSO/Enterprise Auth (Future)
- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] SAML support (enterprise)

---

## Role-Based Access Control

### Workspace Roles
- [ ] Owner (full access)
- [ ] Admin (manage members, settings)
- [ ] Member (create, edit own items)
- [ ] Viewer (read only)

### Permission Checks
- [ ] Frontend hides unauthorized actions
- [ ] Backend enforces permissions
- [ ] Shared item permissions (view/collaborate)
- [ ] Connection access per role

---

## Versioning & History

### Vocabulary Versioning
- [ ] Version number increments on change
- [ ] View version history
- [ ] Compare versions
- [ ] Revert to previous version

### Canvas Versioning (Future)
- [ ] Auto-snapshot on major changes
- [ ] Named versions/checkpoints
- [ ] Restore previous version

---

## Database & Performance

### Database Indexes
- [ ] Index on `knosia_thread.workspace_id`
- [ ] Index on `knosia_thread.created_by`
- [ ] Index on `knosia_thread.starred` (partial)
- [ ] Index on `knosia_canvas.workspace_id`
- [ ] Index on `knosia_canvas.status`
- [ ] Index on `knosia_notification.user_id, read`
- [ ] Index on `knosia_activity.workspace_id, created_at`
- [ ] Index on `knosia_ai_insight.workspace_id, status`
- [ ] Analyze query plans for slow queries

### Connection Pooling
- [ ] Database connection pool configured
- [ ] Pool size appropriate for load
- [ ] Connection timeout configured
- [ ] Idle connection cleanup

### Query Performance
- [ ] N+1 queries eliminated
- [ ] Batch operations where possible
- [ ] Query timeout limits set
- [ ] Large result set pagination

---

## API Protection

### Rate Limiting
- [ ] Rate limit on auth endpoints (stricter)
- [ ] Rate limit on API endpoints (general)
- [ ] Rate limit on AI/query endpoints (expensive)
- [ ] Rate limit headers in response
- [ ] 429 response with retry-after

### Input Validation
- [ ] Request size limits
- [ ] File upload size limits
- [ ] SQL query length limits
- [ ] JSON depth limits

---

## Infrastructure & DevOps

### CI/CD Pipeline
- [ ] Automated tests on PR
- [ ] Type checking on PR
- [ ] Lint checking on PR
- [ ] Build verification
- [ ] Preview deployments
- [ ] Production deployment automation
- [ ] Rollback procedure documented

### Environment Configuration
- [ ] Development environment documented
- [ ] Staging environment configured
- [ ] Production environment configured
- [ ] Environment variables documented
- [ ] Secrets in secure vault (not .env)

### Monitoring & Alerting
- [ ] Health check endpoint (`/api/health`)
- [ ] Database health check
- [ ] External service health checks
- [ ] Uptime monitoring (Pingdom/similar)
- [ ] Alert on 5xx spike
- [ ] Alert on response time degradation
- [ ] Alert on error rate increase
- [ ] On-call rotation (if applicable)

### Logging
- [ ] Structured logging (JSON)
- [ ] Request ID tracing
- [ ] Log aggregation (CloudWatch/Datadog)
- [ ] Log retention policy
- [ ] PII scrubbing in logs

### Backup & Recovery
- [ ] Database backups scheduled
- [ ] Backup retention policy
- [ ] Backup restoration tested
- [ ] Point-in-time recovery available
- [ ] Disaster recovery plan documented

---

## Security Hardening

### HTTP Security Headers
- [ ] Content-Security-Policy (CSP)
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security (HSTS)
- [ ] Referrer-Policy

### CORS Configuration
- [ ] Allowed origins configured
- [ ] Credentials handling correct
- [ ] Preflight caching

### Authentication Security
- [ ] Session timeout configured
- [ ] Session invalidation on password change
- [ ] Brute force protection
- [ ] Account lockout after failed attempts
- [ ] Secure cookie flags (HttpOnly, Secure, SameSite)

### Dependency Security
- [ ] `npm audit` clean (or exceptions documented)
- [ ] Dependabot/Renovate configured
- [ ] No known vulnerable dependencies
- [ ] License compliance verified

---

## Graceful Degradation

### AI Service Outage
- [ ] Fallback when LLM unavailable
- [ ] Queue queries for retry
- [ ] User notification of degraded mode
- [ ] Manual query option

### Database Connection Issues
- [ ] Connection retry with backoff
- [ ] Read replica failover (if applicable)
- [ ] Cached data served when fresh unavailable

### External Service Failures
- [ ] Email service failure handling
- [ ] Slack integration failure handling
- [ ] Analytics failure doesn't block app

---

## Feature Flags (Optional)

### Flag System
- [ ] Feature flag service configured
- [ ] Gradual rollout support
- [ ] User segment targeting
- [ ] Kill switch for features

### Flagged Features
- [ ] AI insights (enable/disable)
- [ ] Canvas natural language edit
- [ ] Slack integration
- [ ] New features during beta

---

## Browser & Device Support

### Browser Compatibility
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)

### Responsive Breakpoints
- [ ] Desktop (1280px+)
- [ ] Tablet (768px - 1279px)
- [ ] Mobile (< 768px)
- [ ] Touch interactions work

### Performance Budgets
- [ ] Bundle size < 500KB (gzipped)
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTI < 3.5s

---

## Documentation

### User Documentation
- [ ] Getting started guide
- [ ] Feature documentation
- [ ] FAQ
- [ ] Video tutorials (optional)

### Developer Documentation
- [ ] Local development setup
- [ ] Architecture overview
- [ ] API reference
- [ ] Contributing guide

### Operations Documentation
- [ ] Deployment guide
- [ ] Runbook for incidents
- [ ] Monitoring guide
- [ ] Troubleshooting guide

---

## Pre-Launch Checklist

### Feature Complete
- [ ] All Phase 0-6 checkboxes verified
- [ ] All Pre-Existing Requirements verified
- [ ] All AI Insight Management verified
- [ ] All Background Jobs configured
- [ ] All User Preferences implemented
- [ ] Search functionality working
- [ ] Real-time features working
- [ ] Email templates created

### Quality & Polish
- [ ] UX Polish complete (loading, empty, error states)
- [ ] Pagination on all lists
- [ ] i18n coverage verified
- [ ] Dark mode working (if in scope)
- [ ] RBAC permissions verified
- [ ] Form validation complete
- [ ] Keyboard accessibility

### Performance
- [ ] Database indexes created
- [ ] Query performance optimized
- [ ] Performance budgets met (LCP, bundle size)
- [ ] Rate limiting configured

### Security
- [ ] Security headers configured
- [ ] CORS configured
- [ ] Authentication security verified
- [ ] `npm audit` clean
- [ ] No secrets in codebase

### Infrastructure
- [ ] CI/CD pipeline working
- [ ] Staging environment tested
- [ ] Production environment configured
- [ ] Monitoring & alerting configured
- [ ] Logging configured
- [ ] Backups configured

### Code Quality
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] All tests passing (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Code review complete

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual QA complete
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Load testing (if applicable)

### Documentation
- [ ] User documentation ready
- [ ] API documentation ready
- [ ] Operations runbook ready

### Final Verification
- [ ] Database migrations applied to production
- [ ] Smoke test on production
- [ ] Rollback plan verified
- [ ] On-call/support ready

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

*Last Updated: 2026-01-01*
