# Privacy & i18n

**Section:** 23 of 32
**Items:** ~20
**Status:** [x] Verified

---

## Data Privacy & Compliance

### User Data Rights (GDPR)

- [ ] Export user data (JSON download) <!-- KNOSIA:TODO priority=2 category=privacy -->
- [ ] Delete user account and all data <!-- KNOSIA:TODO priority=2 category=privacy -->
- [ ] Data retention policy documented <!-- KNOSIA:TODO priority=3 category=privacy -->
- [x] Privacy policy link in settings <!-- KNOSIA:PARTIAL notes="Legal pages exist via /legal/[slug], but not linked in Knosia settings" -->

### Data Security

- [ ] Connection credentials encrypted at rest <!-- KNOSIA:TODO priority=1 category=security -->
- [ ] Query results not logged in plain text <!-- KNOSIA:TODO priority=2 category=security -->
- [ ] PII detection/masking option <!-- KNOSIA:TODO priority=3 category=security -->
- [ ] Workspace data isolation verified <!-- KNOSIA:TODO priority=1 category=security -->

---

## Internationalization (i18n)

### Translation Coverage

- [x] All UI strings in translation files <!-- KNOSIA:PARTIAL notes="i18n used in Knosia components but not all strings extracted" -->
- [ ] Error messages translated <!-- KNOSIA:TODO priority=2 category=i18n -->
- [ ] Email templates translated <!-- KNOSIA:TODO priority=3 category=i18n -->
- [x] Date/time formatting localized <!-- KNOSIA:PARTIAL notes="Basic date formatting exists, not fully localized" -->
- [ ] Number formatting localized <!-- KNOSIA:TODO priority=3 category=i18n -->
- [ ] Pluralization rules <!-- KNOSIA:TODO priority=3 category=i18n -->

### Supported Locales

- [x] English (en) - default <!-- KNOSIA:DONE -->
- [ ] Spanish (es) - if required <!-- KNOSIA:TODO priority=3 category=i18n -->
- [ ] Other locales as needed <!-- KNOSIA:TODO priority=4 category=i18n -->

---

## Theming

### Dark Mode

- [x] Dark mode toggle in settings <!-- KNOSIA:DONE -->
- [x] System preference detection <!-- KNOSIA:DONE -->
- [x] All components support dark mode <!-- KNOSIA:PARTIAL notes="TurboStarter components support dark mode, custom Knosia components need verification" -->
- [ ] Charts support dark mode colors <!-- KNOSIA:TODO priority=2 category=theming -->
- [x] Persist theme preference <!-- KNOSIA:DONE -->

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 4 |
| TODO | 15 |
| PARTIAL | 4 |

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:**
- GDPR features (export/delete) not implemented
- Connection credentials marked as "would be encrypted in production" - not actually encrypted
- i18n infrastructure exists (useTranslation) but Knosia strings not fully extracted
- Dark mode supported at framework level via theme.tsx provider
- Legal pages exist but need linking in Knosia settings
