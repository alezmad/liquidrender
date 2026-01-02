# Onboarding Flow

**Section:** 12 of 32
**Items:** ~25
**Status:** [x] Verified

---

## Connection Flow

- [x] `/onboarding/connect` page works <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/onboarding/connect/page.tsx" -->
- [x] Database type selection <!-- KNOSIA:DONE notes="DatabaseSelector component with postgres/snowflake/bigquery/mysql/redshift/duckdb" -->
- [x] Credential input form <!-- KNOSIA:DONE notes="ConnectionForm component with host/port/database/username/password/schema" -->
- [x] Test connection before proceeding <!-- KNOSIA:DONE notes="useConnectionTest hook, ConnectionTest component shows result" -->
- [x] Error handling for failed connections <!-- KNOSIA:DONE notes="ConnectionTestResult with error display, retry button, technical details" -->

## Analysis Flow

- [x] `/onboarding/analyze` page works <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/onboarding/review/page.tsx (named review not analyze)" -->
- [x] SSE streaming of analysis progress <!-- KNOSIA:DONE notes="useAnalysis hook with progress tracking, AnalysisProgress component" -->
- [x] Schema extraction displays tables/columns <!-- KNOSIA:DONE notes="DetectionReview shows tables/metrics/dimensions counts" -->
- [x] Vocabulary detection displays metrics/dimensions <!-- KNOSIA:DONE notes="DetectionReview shows metrics and dimensions count with entities" -->

## Summary Flow

- [x] `/onboarding/summary` page works <!-- KNOSIA:DONE notes="ConnectionSummary component shown on /connect?summary=true" -->
- [x] Lists all connected databases <!-- KNOSIA:DONE notes="ConnectionSummary maps over connectionIds and shows ConnectionSummaryCard" -->
- [~] Shows connection health status <!-- KNOSIA:PARTIAL notes="Shows basic connection info, not health status indicator" -->
- [x] "Add Another" button works <!-- KNOSIA:DONE notes="handleAddAnother navigates back to /connect" -->
- [x] "Continue" navigates to role selection <!-- KNOSIA:DONE notes="handleContinue navigates to /review, then /role after analysis" -->

## Role Selection

- [x] `/onboarding/role` page works <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/onboarding/role/page.tsx" -->
- [x] 6 role cards displayed (Executive, Finance, Sales, Marketing, Product, Support) <!-- KNOSIA:DONE notes="RoleSelector with ROLES array containing all 6 roles" -->
- [x] Role selection persists <!-- KNOSIA:DONE notes="setSelectedRole saves to useOnboardingState (localStorage)" -->
- [x] Can change role before continuing <!-- KNOSIA:DONE notes="Continue button disabled until role selected, can click different cards" -->

## Confirmation Questions

- [x] `/onboarding/confirm` page works <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/onboarding/confirm/page.tsx" -->
- [x] Question carousel <!-- KNOSIA:DONE notes="ConfirmationCarousel with currentIndex navigation, prev/next" -->
- [x] Skip functionality <!-- KNOSIA:DONE notes="handleSkip applies default answers and navigates to ready" -->
- [x] Answers persist to state <!-- KNOSIA:DONE notes="setAnswer saves to useOnboardingState, answers array" -->

## Ready Screen

- [x] `/onboarding/ready` page works <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/onboarding/ready/page.tsx" -->
- [x] Briefing preview displayed <!-- KNOSIA:DONE notes="ReadyScreen with BriefingPreviewCard showing mock KPIs and alerts" -->
- [x] "Go to Dashboard" navigates correctly <!-- KNOSIA:DONE notes="handleGoToDashboard navigates to pathsConfig.knosia.briefing" -->
- [ ] Guest expiration banner (if guest) <!-- KNOSIA:TODO priority=medium category=ui notes="ExpirationBanner component exists but not wired to ready page" -->

---

**Verified by:** Claude AI
**Date:** 2026-01-01
**Notes:**
- Onboarding flow is substantially complete
- Flow: connect -> summary -> review (analysis) -> role -> confirm -> ready -> dashboard
- Guest expiration banner component exists but not integrated into ready page
- Connection health status is basic (shows info, not health indicators)
