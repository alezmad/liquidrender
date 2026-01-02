/**
 * Business Type Template Registry
 *
 * Central registry for all business type templates.
 * Maps BusinessType enum to template definitions.
 */

import type { BusinessType, BusinessTypeTemplate } from "../types";

// =============================================================================
// Template Imports
// =============================================================================

import { saasTemplate } from './saas';
import { ecommerceTemplate } from './ecommerce';
import { genericTemplate } from './generic';

// =============================================================================
// Template Registry
// =============================================================================

/**
 * Template registry mapping BusinessType to template definitions
 *
 * V1: saas, ecommerce, custom (generic fallback)
 * V2+: marketplace, fintech, healthcare, edtech, media, logistics
 */
export const TEMPLATES: Record<BusinessType, BusinessTypeTemplate> = {
  saas: saasTemplate,
  ecommerce: ecommerceTemplate,
  custom: genericTemplate,

  // V2+ templates (not yet implemented - use generic fallback)
  marketplace: genericTemplate,
  fintech: genericTemplate,
  healthcare: genericTemplate,
  edtech: genericTemplate,
  media: genericTemplate,
  logistics: genericTemplate,
};

/**
 * Get template for business type with fallback to generic
 *
 * @param type - Business type identifier
 * @returns Template definition (never null - falls back to generic)
 */
export function getTemplate(type: BusinessType): BusinessTypeTemplate {
  return TEMPLATES[type] || genericTemplate;
}

// =============================================================================
// Exports
// =============================================================================

export * from './saas';
export * from './ecommerce';
export * from './generic';
