import { eq } from "@turbostarter/db";
import {
  knosiaWorkspaceConnection,
  knosiaConnection,
  knosiaConnectionHealth,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { ConnectionWithHealth } from "./schemas";

// ============================================================================
// Types
// ============================================================================

/**
 * Input for metric queries
 */
export interface MetricQueryInput {
  connectionId: string;
  metric: string;
  /** Period in days (e.g., 30 for last 30 days) */
  period?: number;
  /** Compare period for calculating change (e.g., "previous" for previous period) */
  comparePeriod?: "previous" | "year_ago";
}

/**
 * Result of a metric query
 */
export interface MetricQueryResult {
  currentValue: number;
  previousValue: number;
  changePercent: number;
  period: number;
}

/**
 * Input for time series queries
 */
export interface TimeSeriesQueryInput {
  connectionId: string;
  metric: string;
  /** Period in days */
  period?: number;
  /** Granularity of data points */
  granularity?: "day" | "week" | "month";
}

/**
 * Data point in a time series
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Result of a time series query
 */
export interface TimeSeriesQueryResult {
  metric: string;
  period: number;
  granularity: string;
  dataPoints: TimeSeriesDataPoint[];
}

// ============================================================================
// WORKSPACE CONNECTION QUERIES
// ============================================================================

/**
 * Get all connections linked to a workspace.
 *
 * Joins through knosiaWorkspaceConnection to get full connection details
 * including health status.
 *
 * @param workspaceId - The workspace ID to get connections for
 * @returns Array of connections with health information
 */
export async function getWorkspaceConnections(
  workspaceId: string,
): Promise<ConnectionWithHealth[]> {
  const results = await db
    .select({
      id: knosiaConnection.id,
      orgId: knosiaConnection.orgId,
      name: knosiaConnection.name,
      type: knosiaConnection.type,
      host: knosiaConnection.host,
      port: knosiaConnection.port,
      database: knosiaConnection.database,
      schema: knosiaConnection.schema,
      sslEnabled: knosiaConnection.sslEnabled,
      createdAt: knosiaConnection.createdAt,
      updatedAt: knosiaConnection.updatedAt,
      healthStatus: knosiaConnectionHealth.status,
      healthLastCheck: knosiaConnectionHealth.lastCheck,
      healthErrorMessage: knosiaConnectionHealth.errorMessage,
      healthLatencyMs: knosiaConnectionHealth.latencyMs,
    })
    .from(knosiaWorkspaceConnection)
    .innerJoin(
      knosiaConnection,
      eq(knosiaWorkspaceConnection.connectionId, knosiaConnection.id),
    )
    .leftJoin(
      knosiaConnectionHealth,
      eq(knosiaConnection.id, knosiaConnectionHealth.connectionId),
    )
    .where(eq(knosiaWorkspaceConnection.workspaceId, workspaceId))
    .orderBy(knosiaConnection.createdAt);

  return results.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database,
    schema: row.schema,
    sslEnabled: row.sslEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    health: row.healthStatus
      ? {
          status: row.healthStatus,
          lastCheck: row.healthLastCheck,
          errorMessage: row.healthErrorMessage,
          latencyMs: row.healthLatencyMs,
        }
      : null,
  }));
}

// ============================================================================
// METRIC QUERIES
// ============================================================================

/**
 * Execute a metric query against a connection's data source.
 *
 * In V1, this returns simulated data. Future versions will:
 * 1. Look up connection credentials
 * 2. Look up metric definition from vocabulary
 * 3. Execute the metric's SQL against the data source
 * 4. Return the aggregated result
 *
 * @param input - Query parameters including connectionId and metric
 * @returns Metric value with comparison data
 */
export async function executeMetricQuery(
  input: MetricQueryInput,
): Promise<MetricQueryResult> {
  const period = input.period ?? 30;

  // TODO: Replace with actual data source query execution
  // In production, this would:
  // 1. Get connection credentials from knosiaConnection
  // 2. Get metric definition (SQL) from vocabulary
  // 3. Execute query against the connected database
  // 4. Return the actual result

  // Simulated data for V1
  const baseValue = 100 + Math.random() * 50;
  const variance = 0.2; // 20% variance for simulation
  const currentValue = baseValue * (1 + (Math.random() - 0.5) * variance);
  const previousValue = baseValue * (1 + (Math.random() - 0.5) * variance);

  const changePercent =
    previousValue !== 0
      ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
      : 0;

  return {
    currentValue,
    previousValue,
    changePercent,
    period,
  };
}

/**
 * Execute a time series query to get historical data points.
 *
 * In V1, this returns simulated data. Future versions will:
 * 1. Look up connection credentials
 * 2. Look up metric definition from vocabulary
 * 3. Execute a grouped/windowed query against the data source
 * 4. Return the time series data
 *
 * @param input - Query parameters including connectionId, metric, and granularity
 * @returns Array of data points over the requested period
 */
export async function executeTimeSeriesQuery(
  input: TimeSeriesQueryInput,
): Promise<TimeSeriesQueryResult> {
  const period = input.period ?? 30;
  const granularity = input.granularity ?? "day";

  // TODO: Replace with actual data source query execution
  // In production, this would:
  // 1. Get connection credentials from knosiaConnection
  // 2. Get metric definition (SQL) from vocabulary
  // 3. Execute a time-bucketed query (GROUP BY date interval)
  // 4. Return the actual time series

  // Calculate number of data points based on granularity
  let pointCount: number;
  switch (granularity) {
    case "week":
      pointCount = Math.ceil(period / 7);
      break;
    case "month":
      pointCount = Math.ceil(period / 30);
      break;
    case "day":
    default:
      pointCount = period;
  }

  // Generate simulated time series with realistic patterns
  const dataPoints: TimeSeriesDataPoint[] = [];
  const now = new Date();
  const baseValue = 100 + Math.random() * 50;

  // Add some trend and seasonality for realism
  const trendSlope = (Math.random() - 0.5) * 0.02; // Small daily trend
  const seasonalAmplitude = baseValue * 0.1; // 10% seasonal swing

  for (let i = pointCount - 1; i >= 0; i--) {
    const timestamp = new Date(now);

    switch (granularity) {
      case "week":
        timestamp.setDate(timestamp.getDate() - i * 7);
        break;
      case "month":
        timestamp.setMonth(timestamp.getMonth() - i);
        break;
      case "day":
      default:
        timestamp.setDate(timestamp.getDate() - i);
    }

    // Calculate value with trend + seasonality + noise
    const dayOfYear = Math.floor(
      (timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const seasonal = Math.sin((dayOfYear / 365) * 2 * Math.PI) * seasonalAmplitude;
    const trend = trendSlope * (pointCount - i);
    const noise = (Math.random() - 0.5) * baseValue * 0.1; // 5% noise

    const value = baseValue + seasonal + trend * baseValue + noise;

    dataPoints.push({
      timestamp,
      value: Math.max(0, value), // Ensure non-negative
    });
  }

  return {
    metric: input.metric,
    period,
    granularity,
    dataPoints,
  };
}
