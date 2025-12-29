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

// Connect Components (Wave 2)
export { ConnectionForm } from "./components/connect/connection-form";
export { ConnectionTest } from "./components/connect/connection-test";

// Review Components (Wave 2)
export { AnalysisProgress } from "./components/review/analysis-progress";
export { DetectionReview } from "./components/review/detection-review";
export { BusinessTypeCard } from "./components/review/business-type-card";
export { SchemaSummary } from "./components/review/schema-summary";
