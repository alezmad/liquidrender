/**
 * Business Type Detector
 *
 * Analyzes database schema and detects business type using pattern matching.
 *
 * Algorithm:
 * 1. Scan schema tables against BUSINESS_TYPE_SIGNATURES table patterns
 * 2. Scan all columns against column patterns
 * 3. Aggregate weights into confidence scores per business type
 * 4. Sort matches by confidence descending
 * 5. Select primary if confidence > CONFIDENCE_THRESHOLD (60)
 * 6. Flag ambiguous if top 2 within AMBIGUITY_THRESHOLD (15)
 */

import type { ExtractedSchema } from '../uvb/models';
import type { BusinessType, BusinessTypeSignal, BusinessTypeMatch, DetectionResult } from './types';
import { BUSINESS_TYPE_SIGNATURES, CONFIDENCE_THRESHOLD, AMBIGUITY_THRESHOLD } from './signatures';

/**
 * Detect business type from database schema
 */
export function detectBusinessType(schema: ExtractedSchema): DetectionResult {
  const signalsByType = new Map<BusinessType, BusinessTypeSignal[]>();

  // Initialize signal arrays for all business types
  for (const businessType of Object.keys(BUSINESS_TYPE_SIGNATURES) as BusinessType[]) {
    signalsByType.set(businessType, []);
  }

  // Scan tables
  for (const table of schema.tables) {
    for (const [businessType, signature] of Object.entries(BUSINESS_TYPE_SIGNATURES) as [BusinessType, typeof BUSINESS_TYPE_SIGNATURES[BusinessType]][]) {
      // Check table name patterns
      for (const { pattern, weight } of signature.tables) {
        if (pattern.test(table.name)) {
          signalsByType.get(businessType)!.push({
            type: businessType,
            signal: `Table: ${table.name}`,
            weight,
            source: 'table',
          });
        }
      }

      // Check column name patterns
      for (const column of table.columns) {
        for (const { pattern, weight } of signature.columns) {
          if (pattern.test(column.name)) {
            signalsByType.get(businessType)!.push({
              type: businessType,
              signal: `Column: ${table.name}.${column.name}`,
              weight,
              source: 'column',
            });
          }
        }
      }
    }
  }

  // Aggregate signals into matches
  const matches: BusinessTypeMatch[] = [];

  for (const [businessType, signals] of Array.from(signalsByType.entries())) {
    if (signals.length === 0) {
      continue; // Skip types with no signals
    }

    const confidence = signals.reduce((sum, signal) => sum + signal.weight, 0);

    matches.push({
      type: businessType,
      confidence,
      signals,
      templateId: businessType,
    });
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  // Determine primary match
  const primary = matches.length > 0 && matches[0].confidence >= CONFIDENCE_THRESHOLD
    ? matches[0]
    : null;

  // Check if ambiguous (top 2 within threshold)
  const ambiguous = matches.length >= 2 &&
    Math.abs(matches[0].confidence - matches[1].confidence) <= AMBIGUITY_THRESHOLD;

  return {
    matches,
    primary,
    ambiguous,
  };
}
