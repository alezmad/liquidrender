// Statistical Helper Functions for Insight Generation
// Provides core statistical calculations for anomaly detection, trend analysis, and correlation

// ============================================================================
// Types
// ============================================================================

/**
 * Result of basic statistical calculations
 */
export interface StatsResult {
  /** Arithmetic mean of the values */
  mean: number;
  /** Standard deviation of the values */
  stdDev: number;
}

/**
 * Result of linear trend analysis
 */
export interface TrendResult {
  /** Direction of the trend */
  direction: "up" | "down" | "flat";
  /** Percent change from first to last value */
  percentChange: number;
  /** Slope of the linear regression line */
  slope: number;
}

/**
 * Result of anomaly detection using z-score
 */
export interface AnomalyResult {
  /** Whether the value is considered an anomaly */
  isAnomaly: boolean;
  /** Number of standard deviations from the mean */
  zScore: number;
}

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Calculate mean and standard deviation for a set of values.
 *
 * Uses population standard deviation (N divisor).
 * Returns { mean: 0, stdDev: 0 } for empty arrays.
 *
 * @param values - Array of numeric values
 * @returns Object containing mean and standard deviation
 *
 * @example
 * ```typescript
 * const stats = calculateStats([10, 20, 30, 40, 50]);
 * // { mean: 30, stdDev: 14.142... }
 * ```
 */
export function calculateStats(values: number[]): StatsResult {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / n;

  if (n === 1) {
    return { mean, stdDev: 0 };
  }

  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Calculate Pearson correlation coefficient between two arrays.
 *
 * Measures linear correlation between -1 (perfect negative) and +1 (perfect positive).
 * Returns 0 if arrays are empty or have insufficient variance.
 *
 * @param x - First array of numeric values
 * @param y - Second array of numeric values
 * @returns Correlation coefficient between -1 and 1
 *
 * @example
 * ```typescript
 * const corr = calculatePearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
 * // 1.0 (perfect positive correlation)
 * ```
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  // Handle edge cases
  if (x.length === 0 || y.length === 0) {
    return 0;
  }

  // Slice to minimum length if mismatched
  const n = Math.min(x.length, y.length);
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  if (n < 2) {
    return 0;
  }

  // Calculate means
  const xMean = xSlice.reduce((sum, val) => sum + val, 0) / n;
  const yMean = ySlice.reduce((sum, val) => sum + val, 0) / n;

  // Calculate covariance and standard deviations
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let i = 0; i < n; i++) {
    const xVal = xSlice[i]!;
    const yVal = ySlice[i]!;
    const xDiff = xVal - xMean;
    const yDiff = yVal - yMean;
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }

  // Check for zero variance (constant arrays)
  if (xVariance === 0 || yVariance === 0) {
    return 0;
  }

  // Pearson correlation coefficient
  const correlation = covariance / Math.sqrt(xVariance * yVariance);

  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, correlation));
}

/**
 * Calculate linear trend using linear regression.
 *
 * Uses least squares regression to fit a line and determine trend direction.
 * Considers a trend "flat" if the slope magnitude is less than 0.01.
 *
 * @param values - Array of numeric values in chronological order
 * @returns Object containing direction, percent change, and slope
 *
 * @example
 * ```typescript
 * const trend = calculateLinearTrend([100, 110, 120, 130, 140]);
 * // { direction: 'up', percentChange: 40, slope: 10 }
 * ```
 */
export function calculateLinearTrend(values: number[]): TrendResult {
  // Handle edge cases
  if (values.length === 0) {
    return { direction: "flat", percentChange: 0, slope: 0 };
  }

  if (values.length === 1) {
    return { direction: "flat", percentChange: 0, slope: 0 };
  }

  const n = values.length;

  // Calculate means for x (index) and y (values)
  // x values are 0, 1, 2, ..., n-1
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;

  // Calculate slope using least squares formula
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = values[i]! - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Calculate percent change from first to last value
  // Safe to use non-null assertion since we checked values.length >= 2 above
  const firstValue = values[0]!;
  const lastValue = values[n - 1]!;
  const percentChange =
    firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;

  // Determine direction based on slope threshold
  let direction: "up" | "down" | "flat";
  if (slope > 0.01) {
    direction = "up";
  } else if (slope < -0.01) {
    direction = "down";
  } else {
    direction = "flat";
  }

  return { direction, percentChange, slope };
}

/**
 * Detect anomalies using z-score method.
 *
 * A value is considered an anomaly if its z-score exceeds 2 standard deviations
 * from the mean (i.e., |z-score| > 2).
 *
 * @param value - The value to check for anomaly
 * @param mean - Mean of the reference distribution
 * @param stdDev - Standard deviation of the reference distribution
 * @returns Object containing anomaly flag and z-score
 *
 * @example
 * ```typescript
 * const result = zScoreAnomalyDetection(100, 50, 10);
 * // { isAnomaly: true, zScore: 5 }
 * ```
 */
export function zScoreAnomalyDetection(
  value: number,
  mean: number,
  stdDev: number
): AnomalyResult {
  // Handle zero standard deviation (constant data)
  if (stdDev === 0) {
    // If stdDev is 0, value equals mean is normal, otherwise it's anomalous
    const isAnomaly = value !== mean;
    return { isAnomaly, zScore: isAnomaly ? Infinity : 0 };
  }

  const zScore = (value - mean) / stdDev;
  const isAnomaly = Math.abs(zScore) > 2;

  return { isAnomaly, zScore };
}
