// Briefing module types

export interface ProfilingSummary {
  analysisId: string;
  tableCount: number;
  totalRows: number;
  totalSizeBytes: number;
  averageRowsPerTable: number;
  tablesWithFreshness: number;
  staleTables: number;
  updateFrequencies: Record<string, number>;
}

export interface FreshnessIndicatorProps {
  tableName: string;
  latestDataAt: string | null;
  className?: string;
}

export interface DataHealthCardProps {
  summary: ProfilingSummary;
  className?: string;
}

export interface QualityMetricsProps {
  tableName: string;
  analysisId: string;
  className?: string;
}

// Freshness levels based on days since last update
export type FreshnessLevel = "recent" | "stale" | "very-stale" | "unknown";

export interface FreshnessConfig {
  level: FreshnessLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  daysSince: number | null;
}
