# API & RBAC

**Section:** 25 of 32
**Items:** ~20
**Status:** [~] Partially verified

---

## API & Integration

### API Documentation

- [ ] OpenAPI/Swagger spec generated <!-- KNOSIA:TODO priority=low category=documentation notes="No OpenAPI generation found" -->
- [ ] API docs accessible <!-- KNOSIA:TODO priority=low category=documentation notes="No public API docs endpoint" -->
- [x] Authentication documented <!-- KNOSIA:DONE notes="Auth config in .env.example and TurboStarter docs" -->
- [x] Rate limits documented <!-- KNOSIA:DONE notes="Rate limiter in middleware.ts - 30 req/min" -->

### Webhooks (Future)

- [ ] Webhook configuration UI <!-- KNOSIA:TODO priority=low category=future notes="V3+ roadmap feature" -->
- [ ] Event types documented <!-- KNOSIA:TODO priority=low category=future notes="V3+ roadmap feature" -->
- [ ] Webhook delivery logging <!-- KNOSIA:TODO priority=low category=future notes="V3+ roadmap feature" -->
- [ ] Retry logic for failed deliveries <!-- KNOSIA:TODO priority=low category=future notes="V3+ roadmap feature" -->

### SSO/Enterprise Auth (Future)

- [x] Google OAuth <!-- KNOSIA:DONE notes="Configured in packages/auth/src/server.ts socialProviders" -->
- [x] GitHub OAuth <!-- KNOSIA:DONE notes="Configured in packages/auth/src/server.ts socialProviders" -->
- [ ] SAML support (enterprise) <!-- KNOSIA:TODO priority=low category=future notes="Enterprise feature - not in V1" -->

---

## Role-Based Access Control

### Workspace Roles

- [x] Owner (full access) <!-- KNOSIA:DONE notes="MemberRole.OWNER in packages/auth/src/types.ts" -->
- [x] Admin (manage members, settings) <!-- KNOSIA:DONE notes="MemberRole.ADMIN in packages/auth/src/types.ts" -->
- [x] Member (create, edit own items) <!-- KNOSIA:DONE notes="MemberRole.MEMBER in packages/auth/src/types.ts" -->
- [ ] Viewer (read only) <!-- KNOSIA:TODO priority=medium category=rbac notes="No viewer role defined in auth schema" -->

### Permission Checks

- [x] Frontend hides unauthorized actions <!-- KNOSIA:PARTIAL notes="Role checks in various UI components but not comprehensive" -->
- [x] Backend enforces permissions <!-- KNOSIA:DONE notes="enforceAuth, enforceMembership, enforceAdmin middleware in packages/api/src/middleware.ts" -->
- [ ] Shared item permissions (view/collaborate) <!-- KNOSIA:TODO priority=medium category=rbac notes="Canvas/thread sharing not fully implemented" -->
- [x] Connection access per role <!-- KNOSIA:DONE notes="enforceMembership used in connection routes" -->

---

## Versioning & History

### Vocabulary Versioning

- [x] Version number increments on change <!-- KNOSIA:DONE notes="versionNumber field in knosia_vocabulary_version table" -->
- [ ] View version history <!-- KNOSIA:TODO priority=medium category=versioning notes="No UI for version history" -->
- [ ] Compare versions <!-- KNOSIA:TODO priority=low category=versioning notes="V2+ feature" -->
- [ ] Revert to previous version <!-- KNOSIA:TODO priority=low category=versioning notes="V2+ feature" -->

### Canvas Versioning (Future)

- [ ] Auto-snapshot on major changes <!-- KNOSIA:TODO priority=low category=future notes="Future feature" -->
- [ ] Named versions/checkpoints <!-- KNOSIA:TODO priority=low category=future notes="Future feature" -->
- [ ] Restore previous version <!-- KNOSIA:TODO priority=low category=future notes="Future feature" -->

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 9 |
| PARTIAL | 1 |
| TODO | 14 |

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:**
- Core auth and RBAC middleware is solid (enforceAuth, enforceMembership, enforceAdmin)
- OAuth providers (Google, GitHub) configured
- Rate limiting implemented (30 req/min)
- API documentation and webhooks are gaps for future
- Vocabulary versioning schema exists but UI not built
