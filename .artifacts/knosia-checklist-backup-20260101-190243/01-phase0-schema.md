# Phase 0: Schema Foundation

**Section:** 01 of 32
**Items:** ~95
**Status:** [ ] Not verified

---

## 0.1 Conversations → Threads Rename

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

## 0.2 New Tables Created

### Thread Extensions
- [ ] `knosia_thread_snapshot` table exists
  - [ ] `id`, `thread_id`, `name`, `description`
  - [ ] `message_count`, `snapshot_data` (JSONB)
  - [ ] `created_by`, `created_at`

### Canvas Tables
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

### Collaboration Tables
- [ ] `knosia_comment_target` enum (`thread_message`, `canvas_block`, `thread`)
- [ ] `knosia_comment` table exists
  - [ ] `id`, `target_type`, `target_id`, `user_id`
  - [ ] `content`, `mentions` (JSONB)
  - [ ] `created_at`, `updated_at`

### Notification Tables
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

### AI Insight Tables
- [ ] `knosia_ai_insight_status` enum (5 statuses)
- [ ] `knosia_ai_insight` table exists
  - [ ] `id`, `workspace_id`, `target_user_id`
  - [ ] `headline`, `explanation`, `evidence` (JSONB)
  - [ ] `severity`, `category`, `status`
  - [ ] `thread_id` (if converted)
  - [ ] `surfaced_at`, `viewed_at`, `engaged_at`, `dismissed_at`

### Activity Feed
- [ ] `knosia_activity_type` enum (7 types)
- [ ] `knosia_activity` table exists
  - [ ] `id`, `workspace_id`, `user_id`, `type`
  - [ ] `target_type`, `target_id`, `target_name`
  - [ ] `metadata` (JSONB), `created_at`

## 0.3 Enhanced Thread Message

- [ ] `provenance` JSONB column added to `knosia_thread_message`
  - [ ] Supports `freshness` (string)
  - [ ] Supports `sources` (array of {name, query})
  - [ ] Supports `assumptions` (string array)
  - [ ] Supports `confidence_level` (exact/calculated/estimated/predicted)
  - [ ] Supports `confidence_score` (0-100)
- [ ] `comment_count` integer column added

## 0.4 Migration Applied

- [ ] Migration file generated
- [ ] Migration reviewed for correctness
- [ ] Migration applied to development database
- [ ] TypeScript references updated (conversation → thread)
- [ ] No orphaned references to old table names

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

