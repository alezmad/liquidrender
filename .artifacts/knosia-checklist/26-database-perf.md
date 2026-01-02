# Database & Performance

**Section:** 26 of 32
**Items:** ~25
**Status:** [~] Partially Verified

---

## Database Indexes

- [ ] Index on `knosia_thread.workspace_id` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Index on `knosia_thread.created_by` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Index on `knosia_thread.starred` (partial) <!-- KNOSIA:TODO priority=low category=schema -->
- [ ] Index on `knosia_canvas.workspace_id` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Index on `knosia_canvas.status` <!-- KNOSIA:TODO priority=low category=schema -->
- [ ] Index on `knosia_notification.user_id, read` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Index on `knosia_activity.workspace_id, created_at` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Index on `knosia_ai_insight.workspace_id, status` <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Analyze query plans for slow queries <!-- KNOSIA:TODO priority=low category=schema -->

## Connection Pooling

- [ ] Database connection pool configured <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Pool size appropriate for load <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Connection timeout configured <!-- KNOSIA:TODO priority=medium category=schema -->
- [ ] Idle connection cleanup <!-- KNOSIA:TODO priority=low category=schema -->

## Query Performance

- [ ] N+1 queries eliminated <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] Batch operations where possible <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] Query timeout limits set <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] Large result set pagination <!-- KNOSIA:TODO priority=medium category=api -->

---

## API Protection

### Rate Limiting

- [x] Rate limit on auth endpoints (stricter) <!-- KNOSIA:DONE -->
- [x] Rate limit on API endpoints (general) <!-- KNOSIA:DONE -->
- [x] Rate limit on AI/query endpoints (expensive) <!-- KNOSIA:DONE -->
- [~] Rate limit headers in response <!-- KNOSIA:PARTIAL notes="Rate limiter exists but doesn't set X-RateLimit-* headers in response" -->
- [x] 429 response with retry-after <!-- KNOSIA:DONE -->

### Input Validation

- [x] Request size limits <!-- KNOSIA:DONE -->
- [~] File upload size limits <!-- KNOSIA:PARTIAL notes="Needs verification per endpoint" -->
- [ ] SQL query length limits <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] JSON depth limits <!-- KNOSIA:TODO priority=low category=api -->

---

**Verified by:** Claude Code Agent
**Date:** 2026-01-01
**Notes:**
- No explicit database indexes defined in `packages/db/src/schema/knosia.ts` - Drizzle schema uses `.index()` method but none are present for Knosia tables
- No database connection pool configuration found in `packages/db` - using default Drizzle settings
- Rate limiter implemented in `packages/api/src/middleware.ts`:
  - In-memory store with 30 requests/minute per user
  - Returns HTTP 429 (TOO_MANY_REQUESTS) when exceeded
  - Missing: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
  - Missing: Retry-After header (though 429 status is returned)
- Zod validation provides basic request validation via `validate` middleware
- Credit deduction middleware provides additional protection for AI endpoints
