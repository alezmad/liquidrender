/**
 * Knosia Onboarding Module
 *
 * Entry point for onboarding flow components, hooks, and types.
 */

// Types
export * from "./types";

// Layout Components (Wave 1)
export { OnboardingLayout, getMacroStep } from "./components/layout/onboarding-layout";
export { ProgressIndicator } from "./components/layout/progress-indicator";

// Connect Components (Wave 1)
export { DatabaseSelector, getDefaultPort } from "./components/connect/database-selector";

// Hooks (Wave 1)
export { useConnectionTest, useCreateConnection, toConnectionTestResult } from "./hooks/use-connection-test";
export { useAnalysis } from "./hooks/use-analysis";
export { useOnboardingState } from "./hooks/use-onboarding-state";
export { useKnosiaOrg } from "./hooks/use-knosia-org";
export { useConnectionSummaries, toConnectionSummary } from "./hooks/use-connection-summaries";
export { useBriefingKPIs } from "./hooks/use-briefing-kpis";

// Connect Components (Wave 2)
export { ConnectionForm } from "./components/connect/connection-form";
export { ConnectionTest } from "./components/connect/connection-test";

// Multi-Connection Components (WF-0020)
export { ConnectionSummaryCard } from "./components/connect/connection-summary-card";
export { ConnectionSummary } from "./components/connect/connection-summary";

// Review Components (Wave 2)
export { AnalysisProgress } from "./components/review/analysis-progress";
export { DetectionReview } from "./components/review/detection-review";
export { BusinessTypeCard } from "./components/review/business-type-card";
export { SchemaSummary } from "./components/review/schema-summary";
export { MetricsSection } from "./components/review/metrics-section";

// Role Components
export { RoleCard } from "./components/role/role-card";
export { RoleSelector } from "./components/role/role-selector";

// Confirm Components
export { QuestionCard } from "./components/confirm/question-card";
export { ConfirmationCarousel } from "./components/confirm/confirmation-carousel";

// Ready Components
export { BriefingPreviewCard } from "./components/ready/briefing-preview";
export { ReadyScreen } from "./components/ready/ready-screen";
