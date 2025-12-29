/**
 * Vocabulary Onboarding Types
 */

// Database connection types
export type DatabaseType = "postgres" | "mysql" | "sqlite" | "duckdb";

export interface ConnectionData {
  databaseType: DatabaseType;
  connectionName: string;
  connectionString: string;
  schemaName: string;
}

// Schema info from extraction
export interface SchemaInfo {
  database: string;
  type: string;
  schema: string;
  tables: number;
  extractedAt: string;
}

// Detected vocabulary items
export interface DetectedEntity {
  name: string;
  table: string;
  schema: string;
  primaryKey: string | string[];
  columnCount: number;
  certainty: number;
  isJunction: boolean;
}

export interface DetectedMetric {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  aggregation: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
  certainty: number;
  suggestedDisplayName?: string;
}

export interface DetectedDimension {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  cardinality?: number;
  certainty: number;
}

export interface DetectedTimeField {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  isPrimaryCandidate: boolean;
  certainty: number;
}

export interface DetectedFilter {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  certainty: number;
}

export interface DetectedRelationship {
  id: string;
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  via?: string;
  certainty: number;
}

export interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
}

// Confirmation types
export interface SelectOption {
  value: string;
  label: string;
  recommended?: boolean;
}

export interface SelectOneConfirmation {
  id: string;
  type: "select_one";
  question: string;
  context?: string;
  options: SelectOption[];
  defaultValue?: string;
}

export interface RenameConfirmation {
  id: string;
  type: "rename";
  question: string;
  context?: string;
  currentValue: string;
  suggestion?: string;
}

export interface ClassifyConfirmation {
  id: string;
  type: "classify";
  question: string;
  context?: string;
  options: { value: "metric" | "dimension" | "skip"; label: string }[];
}

export type Confirmation =
  | SelectOneConfirmation
  | RenameConfirmation
  | ClassifyConfirmation;

export type ConfirmationAnswers = Record<string, string | string[]>;

// Extraction result from API
export interface ExtractionResult {
  schemaInfo: SchemaInfo;
  detected: DetectedVocabulary;
  confirmations: Confirmation[];
  stats: {
    entities: number;
    metrics: number;
    dimensions: number;
    timeFields: number;
    filters: number;
    relationships: number;
  };
}

// Reviewed vocabulary (after user edits in review step)
export interface ReviewedVocabulary extends DetectedVocabulary {
  // Items that user has explicitly included/excluded
  includedEntities: string[];
  includedMetrics: string[];
  includedDimensions: string[];
}

// Wizard state
export type WizardStep = "connect" | "review" | "confirm" | "save";

export interface WizardState {
  currentStep: WizardStep;
  connection?: ConnectionData;
  extraction?: ExtractionResult;
  reviewed?: ReviewedVocabulary;
  answers?: ConfirmationAnswers;
}

// Save data
export interface SaveVocabularyData {
  name: string;
  description?: string;
}
