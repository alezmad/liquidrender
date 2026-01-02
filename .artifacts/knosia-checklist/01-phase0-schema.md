# Phase 0: Schema Foundation

**Section:** 01 of 32
**Items:** ~95
**Status:** [x] Verified

---

## 0.1 Conversations → Threads Rename

- [x] `knosia_conversation` table renamed to `knosia_thread` <!-- KNOSIA:DONE -->
- [x] `knosia_conversation_message` renamed to `knosia_thread_message` <!-- KNOSIA:DONE -->
- [x] `knosia_conversation_status` enum renamed to `knosia_thread_status` <!-- KNOSIA:DONE -->
- [x] `conversation_id` column renamed to `thread_id` in message table <!-- KNOSIA:DONE -->
- [x] New Thread columns added: <!-- KNOSIA:DONE -->
  - [x] `is_ai_initiated` (boolean) <!-- KNOSIA:DONE -->
  - [x] `starred` (boolean) <!-- KNOSIA:DONE -->
  - [x] `parent_thread_id` (self-reference for forking) <!-- KNOSIA:DONE -->
  - [x] `forked_from_message_id` (text) <!-- KNOSIA:DONE -->
- [ ] Index created: `idx_thread_parent` on `parent_thread_id` <!-- KNOSIA:TODO priority=medium category=schema -->

## 0.2 New Tables Created

### Thread Extensions
- [x] `knosia_thread_snapshot` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `thread_id`, `name`, `description` <!-- KNOSIA:DONE -->
  - [x] `message_count`, `snapshot_data` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `created_by`, `created_at` <!-- KNOSIA:DONE -->

### Canvas Tables
- [x] `knosia_canvas_status` enum (`draft`, `active`, `archived`) <!-- KNOSIA:DONE -->
- [x] `knosia_canvas_block_type` enum (all 11 types) <!-- KNOSIA:DONE -->
- [x] `knosia_canvas` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `workspace_id`, `created_by`, `name`, `description`, `icon` <!-- KNOSIA:DONE -->
  - [x] `status`, `is_ai_generated`, `layout` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `visibility`, `shared_with` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `last_viewed_at`, `view_count` <!-- KNOSIA:DONE -->
  - [x] `created_at`, `updated_at` <!-- KNOSIA:DONE -->
- [x] `knosia_canvas_block` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `canvas_id`, `type`, `title` <!-- KNOSIA:DONE -->
  - [x] `position` (JSONB: x, y, width, height) <!-- KNOSIA:DONE -->
  - [x] `config` (JSONB), `data_source` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `cached_data`, `cached_at`, `sort_order` <!-- KNOSIA:DONE -->
  - [x] `created_at`, `updated_at` <!-- KNOSIA:DONE -->
- [x] `knosia_canvas_alert` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `canvas_id`, `block_id`, `name` <!-- KNOSIA:DONE -->
  - [x] `condition` (JSONB), `channels` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `enabled`, `last_triggered_at`, `created_at` <!-- KNOSIA:DONE -->

### Collaboration Tables
- [x] `knosia_comment_target` enum (`thread_message`, `canvas_block`, `thread`) <!-- KNOSIA:DONE -->
- [x] `knosia_comment` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `target_type`, `target_id`, `user_id` <!-- KNOSIA:DONE -->
  - [x] `content`, `mentions` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `created_at`, `updated_at` <!-- KNOSIA:DONE -->

### Notification Tables
- [x] `knosia_notification_type` enum (6 types) <!-- KNOSIA:DONE -->
- [x] `knosia_notification` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `user_id`, `workspace_id`, `type` <!-- KNOSIA:DONE -->
  - [x] `title`, `body`, `source_type`, `source_id` <!-- KNOSIA:DONE -->
  - [x] `read`, `dismissed`, `actions` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `created_at` <!-- KNOSIA:DONE -->
- [x] `knosia_digest` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `user_id`, `workspace_id`, `name` <!-- KNOSIA:DONE -->
  - [x] `schedule` (cron), `channels` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `include` (JSONB), `enabled` <!-- KNOSIA:DONE -->
  - [x] `last_sent_at`, `next_send_at`, `created_at` <!-- KNOSIA:DONE -->

### AI Insight Tables
- [x] `knosia_ai_insight_status` enum (5 statuses) <!-- KNOSIA:DONE -->
- [x] `knosia_ai_insight` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `workspace_id`, `target_user_id` <!-- KNOSIA:DONE -->
  - [x] `headline`, `explanation`, `evidence` (JSONB) <!-- KNOSIA:DONE -->
  - [x] `severity`, `category`, `status` <!-- KNOSIA:DONE -->
  - [x] `thread_id` (if converted) <!-- KNOSIA:DONE -->
  - [x] `surfaced_at`, `viewed_at`, `engaged_at`, `dismissed_at` <!-- KNOSIA:DONE -->

### Activity Feed
- [x] `knosia_activity_type` enum (7 types) <!-- KNOSIA:DONE -->
- [x] `knosia_activity` table exists <!-- KNOSIA:DONE -->
  - [x] `id`, `workspace_id`, `user_id`, `type` <!-- KNOSIA:DONE -->
  - [x] `target_type`, `target_id`, `target_name` <!-- KNOSIA:DONE -->
  - [x] `metadata` (JSONB), `created_at` <!-- KNOSIA:DONE -->

## 0.3 Enhanced Thread Message

- [x] `provenance` JSONB column added to `knosia_thread_message` <!-- KNOSIA:DONE -->
  - [x] Supports `freshness` (string) <!-- KNOSIA:DONE -->
  - [x] Supports `sources` (array of {name, query}) <!-- KNOSIA:DONE -->
  - [x] Supports `assumptions` (string array) <!-- KNOSIA:DONE -->
  - [x] Supports `confidence_level` (exact/calculated/estimated/predicted) <!-- KNOSIA:DONE -->
  - [x] Supports `confidence_score` (0-100) <!-- KNOSIA:DONE -->
- [x] `comment_count` integer column added <!-- KNOSIA:DONE -->

## 0.4 Migration Applied

- [ ] Migration file generated <!-- KNOSIA:TODO priority=high category=schema -->
- [ ] Migration reviewed for correctness <!-- KNOSIA:TODO priority=high category=schema -->
- [ ] Migration applied to development database <!-- KNOSIA:TODO priority=high category=schema -->
- [x] TypeScript references updated (conversation → thread) <!-- KNOSIA:DONE -->
- [~] No orphaned references to old table names <!-- KNOSIA:PARTIAL notes="Schema uses Thread, but API may have old conversation files - needs verification" -->

---

**Verified by:** Claude Code Agent
**Date:** 2026-01-01
**Notes:**
- All schema tables and enums verified present in `packages/db/src/schema/knosia.ts`
- Schema exports verified in `packages/db/src/schema/index.ts`
- No migration files found in `packages/db/drizzle/` - migrations need to be generated and applied
- Thread table has `parentThreadId` column but no explicit index defined in schema
- All 11 canvas block types present: kpi, line_chart, bar_chart, area_chart, pie_chart, table, hero_metric, watch_list, comparison, insight, text
- All 6 notification types present: alert, mention, share, ai_insight, thread_activity, digest
- All 5 AI insight statuses present: pending, viewed, engaged, dismissed, converted
- All 7 activity types present: thread_created, thread_shared, canvas_created, canvas_shared, canvas_updated, comment_added, insight_converted
