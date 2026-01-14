/**
 * Knosia Shared Module
 *
 * Common utilities for Knosia API modules
 */

export { transformToDetectedVocabulary } from "./transforms";
export { buildSemanticLayer } from "./semantic";

// Cascade impact utilities
export { CASCADE_REGISTRY } from "./cascade-registry";
export type { ResourceType, CascadeRelation } from "./cascade-registry";
export { getCascadeImpact } from "./cascade-impact";
export type {
  CascadeImpact,
  CascadeImpactResult,
  UserFacingImpact,
  ImpactItem,
} from "./cascade-impact";
