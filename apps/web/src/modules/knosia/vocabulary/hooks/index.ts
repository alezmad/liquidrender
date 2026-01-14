// Vocabulary hooks barrel export
export { useVocabulary } from "./use-vocabulary";

export {
  useVocabularyPrefs,
  useVocabularySuggestions,
  type VocabularyPrefs,
  type PrivateVocab,
  type RecentlyUsedItem,
  type UseVocabularyPrefsOptions,
  type UseVocabularyPrefsReturn,
  type UseVocabularySuggestionsOptions,
  type UseVocabularySuggestionsReturn,
} from "./use-vocabulary-prefs";

export {
  useVocabularyPreview,
  type PreviewResponse,
  type PreviewResult,
  type MetricPreviewResult,
  type DimensionPreviewResult,
  type EntityPreviewResult,
  type UseVocabularyPreviewOptions,
  type UseVocabularyPreviewReturn,
} from "./use-vocabulary-preview";

// KPI and Measure hooks (new unified vocabulary)
export {
  useKPIs,
  useMeasures,
  type UseKPIsOptions,
  type UseKPIsReturn,
  type UseMeasuresOptions,
  type UseMeasuresReturn,
} from "./use-kpis";

// Legacy Metrics hooks (deprecated - use useKPIs instead)
export {
  useMetrics,
  useExecuteMetric,
  useUpdateMetric,
  useDeleteMetric,
  useCreateMetric,
  type CalculatedMetric,
  type ExecutionResult,
  type UseMetricsOptions,
  type UseMetricsReturn,
  type UpdateMetricInput,
  type CreateMetricInput,
} from "./use-metrics";
