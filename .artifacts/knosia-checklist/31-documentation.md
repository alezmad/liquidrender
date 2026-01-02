# Documentation

**Section:** 31 of 32
**Items:** ~15
**Status:** [~] Partially verified

---

## User Documentation

- [ ] Getting started guide <!-- KNOSIA:TODO priority=high category=documentation notes="No user-facing getting started guide" -->
- [ ] Feature documentation <!-- KNOSIA:TODO priority=high category=documentation notes="No feature documentation for end users" -->
- [ ] FAQ <!-- KNOSIA:PARTIAL notes="Marketing FAQ exists in apps/web/src/modules/marketing/home/faq.tsx but not comprehensive" -->
- [ ] Video tutorials (optional) <!-- KNOSIA:TODO priority=low category=documentation notes="Not created" -->

## Developer Documentation

- [x] Local development setup <!-- KNOSIA:DONE notes="docker-compose.yml header + CLAUDE.md commands" -->
- [x] Architecture overview <!-- KNOSIA:DONE notes="CLAUDE.md contains architecture diagram and package structure" -->
- [ ] API reference <!-- KNOSIA:TODO priority=medium category=documentation notes="No generated API reference" -->
- [x] Contributing guide <!-- KNOSIA:PARTIAL notes="Basic patterns in CLAUDE.md but no formal CONTRIBUTING.md" -->

## Operations Documentation

- [ ] Deployment guide <!-- KNOSIA:TODO priority=high category=documentation notes="No production deployment guide beyond CI/CD" -->
- [ ] Runbook for incidents <!-- KNOSIA:TODO priority=high category=documentation notes="No incident runbook" -->
- [ ] Monitoring guide <!-- KNOSIA:TODO priority=medium category=documentation notes="No monitoring/alerting guide" -->
- [ ] Troubleshooting guide <!-- KNOSIA:PARTIAL notes="TurboStarter docs have troubleshooting sections, no Knosia-specific" -->

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 2 |
| PARTIAL | 3 |
| TODO | 8 |

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:**
- Developer documentation is primarily in CLAUDE.md (internal)
- No user-facing documentation exists
- No operations runbooks or deployment guides
- TurboStarter framework docs cover general patterns
- Marketing FAQ exists but not a proper help center
- Consider using a documentation platform (Docusaurus, GitBook) for user docs
- Operations runbook is critical before production launch
