// Vocabulary module - Business vocabulary browser UI
export * from "./types";

// Hooks
export { useVocabulary } from "./hooks/use-vocabulary";
export {
  useVocabularyPrefs,
  useVocabularySuggestions,
} from "./hooks/use-vocabulary-prefs";
export {
  useMetrics,
  useExecuteMetric,
  useUpdateMetric,
  useDeleteMetric,
  useCreateMetric,
  type CalculatedMetric,
  type ExecutionResult,
} from "./hooks/use-metrics";

// Components
export { VocabularyCard } from "./components/vocabulary-card";
export { VocabularyList } from "./components/vocabulary-list";
export { VocabularyBrowser } from "./components/vocabulary-browser";
export { MetricCard } from "./components/metric-card";
export { MetricsTab } from "./components/metrics-tab";
export { VocabularyPageContent } from "./components/vocabulary-page-content";
