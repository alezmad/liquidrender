# User Preferences & Settings

**Section:** 17 of 32
**Items:** ~20
**Status:** [~] Partially Verified

---

## Settings Page

- [x] `/dashboard/knosia/settings` page exists <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/settings/page.tsx" -->
- [x] User profile section <!-- KNOSIA:DONE notes="EditAvatar, EditName, EditEmail components" -->
- [ ] AI Proactivity level setting: <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Off (no AI insights) <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Minimal (1 per day max) <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Balanced (2-3 per day) - default <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Proactive (unlimited) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Notification preferences: <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] In-app notifications toggle <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Email notifications toggle <!-- KNOSIA:TODO priority=medium category=ui -->
  - [ ] Slack notifications toggle (if connected) <!-- KNOSIA:TODO priority=low category=ui -->
- [ ] Default time range preference <!-- KNOSIA:TODO priority=low category=ui -->
- [ ] Timezone setting <!-- KNOSIA:TODO priority=low category=ui -->

## Workspace Settings (Admin)

- [ ] Workspace name edit <!-- KNOSIA:TODO priority=medium category=ui notes="Organization settings exist at /[org]/settings but not Knosia workspace" -->
- [ ] Workspace visibility settings <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Member management <!-- KNOSIA:TODO priority=medium category=ui notes="Organization members at /[org]/members but not Knosia workspace" -->
- [ ] Connection permissions <!-- KNOSIA:TODO priority=medium category=ui -->

---

**Verified by:** Claude AI
**Date:** 2026-01-01
**Notes:**
- Settings page exists with basic user profile editing (avatar, name, email, language)
- Knosia-specific settings (AI proactivity, notification prefs, time range, timezone) not implemented
- Uses TurboStarter's generic user settings, needs Knosia customization
- Workspace settings would need separate Knosia workspace context vs organization settings
