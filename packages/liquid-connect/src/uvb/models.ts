/**
 * Universal Vocabulary Builder - Data Models
 *
 * Types for schema extraction, hard rules detection, and user confirmation flow.
 */

// =============================================================================
// Schema Types (extracted from database)
// =============================================================================

export interface Column {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  charMaxLength?: number;
  numericPrecision?: number;
  numericScale?: number;
  references?: ForeignKeyReference;
}

export interface ForeignKeyReference {
  table: string;
  column: string;
}

export interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeyColumns: string[];
  foreignKeys: ForeignKeyConstraint[];
}

export interface ForeignKeyConstraint {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface ExtractedSchema {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: Table[];
  extractedAt: string;
}

export type DatabaseType = "postgres" | "mysql" | "sqlite" | "duckdb";

// =============================================================================
// Detection Types (output of hard rules)
// =============================================================================

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
  aggregation: AggregationType;
  certainty: number;
  suggestedDisplayName?: string;
  expression?: string;
}

export type AggregationType = "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";

// Note: This type is also exported from the main index to avoid conflicts
// with the resolver's AggregationType. Use UVB-specific imports when needed.

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
  expression?: string;
}

export interface DetectedRelationship {
  id: string;
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: RelationshipType;
  via?: string;
  certainty: number;
}

export type RelationshipType = "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";

export interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
}

// =============================================================================
// Confirmation Types (questions for user)
// =============================================================================

export interface SelectOneConfirmation {
  id: string;
  type: "select_one";
  question: string;
  context?: string;
  options: SelectOption[];
  defaultValue?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  recommended?: boolean;
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
  options: ClassifyOption[];
}

export interface ClassifyOption {
  value: "metric" | "dimension" | "skip";
  label: string;
}

export type Confirmation = SelectOneConfirmation | RenameConfirmation | ClassifyConfirmation;

export interface ConfirmationAnswers {
  [confirmationId: string]: string | string[];
}

// =============================================================================
// Vocabulary Draft (complete output)
// =============================================================================

export interface SchemaInfo {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: number;
  extractedAt: string;
}

export interface VocabularyDraft {
  schema: SchemaInfo;
  detected: DetectedVocabulary;
  confirmations: Confirmation[];
}

// =============================================================================
// Extraction Options
// =============================================================================

export interface ExtractionOptions {
  schema?: string;
  excludeTables?: string[];
  includeTables?: string[];
  excludePatterns?: RegExp[];
}

// =============================================================================
// Hard Rules Configuration
// =============================================================================

export interface HardRulesConfig {
  // Metric detection patterns
  metricNamePatterns: RegExp[];
  metricTypes: string[];
  countMetricTypes: string[];

  // Dimension detection
  dimensionMaxLength: number;
  dimensionNamePatterns: RegExp[];
  dimensionExcludePatterns: RegExp[];

  // Time field detection
  timeTypes: string[];
  timeAuditPatterns: RegExp[];
  primaryTimePatterns: RegExp[];

  // Filter detection
  filterTypes: string[];
  filterNamePatterns: RegExp[];
}

export const DEFAULT_HARD_RULES_CONFIG: HardRulesConfig = {
  // Metric name patterns (English + Spanish)
  metricNamePatterns: [
    /amount/i,
    /price/i,
    /total/i,
    /cost/i,
    /rate/i,
    /fee/i,
    /quantity/i,
    /qty/i,
    /count/i,
    /sum/i,
    /revenue/i,
    /sales/i,
    /balance/i,
    /discount/i,
    /hours/i,
    /horas/i,
    /importe/i,
    /valor/i,
    /saldo/i,
    /coste/i,
    /precio/i,
    /tarifa/i,
    /freight/i,
    /units/i,
  ],

  // Types that indicate metrics
  metricTypes: ["decimal", "numeric", "real", "double", "float", "money"],
  countMetricTypes: ["integer", "int", "smallint", "bigint", "int4", "int8"],

  // Dimension configuration
  dimensionMaxLength: 100,
  dimensionNamePatterns: [
    /name/i,
    /nombre/i,
    /tipo/i,
    /type/i,
    /status/i,
    /estado/i,
    /category/i,
    /categoria/i,
    /code/i,
    /codigo/i,
    /title/i,
    /titulo/i,
    /region/i,
    /country/i,
    /city/i,
    /segment/i,
    /tier/i,
    /level/i,
    /class/i,
    /group/i,
    /kind/i,
    /mode/i,
  ],
  dimensionExcludePatterns: [
    /desc/i,
    /note/i,
    /comment/i,
    /observ/i,
    /content/i,
    /body/i,
    /html/i,
    /json/i,
    /path/i,
    /url/i,
    /email/i,
    /phone/i,
    /address/i,
    /direccion/i,
  ],

  // Time field configuration
  timeTypes: ["date", "timestamp", "timestamptz", "datetime", "time"],
  timeAuditPatterns: [
    /created/i,
    /updated/i,
    /modified/i,
    /last_update/i,
    /fecha_creacion/i,
    /fecha_modificacion/i,
    /date_joined/i,
    /_at$/i,
  ],
  primaryTimePatterns: [
    /^date$/i,
    /^fecha$/i,
    /order_date/i,
    /fecha_operacion/i,
    /transaction_date/i,
    /invoice_date/i,
    /ship_date/i,
    /fecha_factura/i,
  ],

  // Filter configuration
  filterTypes: ["boolean", "bool"],
  filterNamePatterns: [/^is_/i, /^has_/i, /^can_/i, /activo/i, /active/i, /enabled/i, /visible/i, /deleted/i, /archived/i],
};
