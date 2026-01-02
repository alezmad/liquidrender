# Database & Performance

**Section:** 26 of 32
**Items:** ~25
**Status:** [ ] Not verified

---

## Database Indexes

- [ ] Index on `knosia_thread.workspace_id`
- [ ] Index on `knosia_thread.created_by`
- [ ] Index on `knosia_thread.starred` (partial)
- [ ] Index on `knosia_canvas.workspace_id`
- [ ] Index on `knosia_canvas.status`
- [ ] Index on `knosia_notification.user_id, read`
- [ ] Index on `knosia_activity.workspace_id, created_at`
- [ ] Index on `knosia_ai_insight.workspace_id, status`
- [ ] Analyze query plans for slow queries

## Connection Pooling

- [ ] Database connection pool configured
- [ ] Pool size appropriate for load
- [ ] Connection timeout configured
- [ ] Idle connection cleanup

## Query Performance

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

**Verified by:** _______________
**Date:** _______________
**Notes:**

