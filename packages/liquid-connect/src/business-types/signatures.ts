/**
 * Detection Signatures for Business Types
 *
 * Each business type has:
 * - Table patterns (higher weight 15-30)
 * - Column patterns (lower weight 8-15)
 * - Relationship patterns (moderate weight - V2)
 *
 * V1 implements: saas, ecommerce, marketplace
 * V2+: fintech, healthcare, edtech, media, logistics, custom
 */

import type { BusinessType } from './types';

interface SignatureDefinition {
  tables: { pattern: RegExp; weight: number }[];
  columns: { pattern: RegExp; weight: number }[];
  relationships?: { pattern: string; weight: number }[];
}

export const BUSINESS_TYPE_SIGNATURES: Record<BusinessType, SignatureDefinition> = {
  saas: {
    tables: [
      { pattern: /^subscriptions?$/i, weight: 30 },
      { pattern: /^plans?$/i, weight: 25 },
      { pattern: /^licenses?$/i, weight: 20 },
      { pattern: /^tenants?$/i, weight: 20 },
      { pattern: /^workspaces?$/i, weight: 15 },
      { pattern: /^billing$/i, weight: 15 },
    ],
    columns: [
      { pattern: /\bmrr\b/i, weight: 15 },
      { pattern: /\barr\b/i, weight: 15 },
      { pattern: /\bchurn/i, weight: 12 },
      { pattern: /\btrial/i, weight: 10 },
      { pattern: /\bplan_id/i, weight: 8 },
      { pattern: /\bseats?\b/i, weight: 8 },
      { pattern: /\bsubscription_id/i, weight: 8 },
    ],
  },
  ecommerce: {
    tables: [
      { pattern: /^orders?$/i, weight: 30 },
      { pattern: /^products?$/i, weight: 25 },
      { pattern: /^carts?$/i, weight: 20 },
      { pattern: /^inventory$/i, weight: 20 },
      { pattern: /^shipping$/i, weight: 15 },
      { pattern: /^fulfillment$/i, weight: 15 },
    ],
    columns: [
      { pattern: /\bsku\b/i, weight: 15 },
      { pattern: /\bquantity/i, weight: 12 },
      { pattern: /\bcart_id/i, weight: 10 },
      { pattern: /\bshipping/i, weight: 10 },
      { pattern: /\bfulfillment/i, weight: 10 },
      { pattern: /\border_id/i, weight: 8 },
    ],
  },
  marketplace: {
    tables: [
      { pattern: /^buyers?$/i, weight: 25 },
      { pattern: /^sellers?$/i, weight: 25 },
      { pattern: /^vendors?$/i, weight: 25 },
      { pattern: /^listings?$/i, weight: 20 },
      { pattern: /^commissions?$/i, weight: 20 },
    ],
    columns: [
      { pattern: /\bseller_id/i, weight: 15 },
      { pattern: /\bbuyer_id/i, weight: 15 },
      { pattern: /\bcommission/i, weight: 12 },
      { pattern: /\btake_rate/i, weight: 12 },
      { pattern: /\bvendor_id/i, weight: 10 },
    ],
  },
  // V2+ types (not implemented in V1)
  fintech: { tables: [], columns: [] },
  healthcare: { tables: [], columns: [] },
  edtech: { tables: [], columns: [] },
  media: { tables: [], columns: [] },
  logistics: { tables: [], columns: [] },
  custom: { tables: [], columns: [] },
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLD = 50; // Minimum for primary match (2 strong table matches = 55)
export const AMBIGUITY_THRESHOLD = 15; // Max delta between top 2
