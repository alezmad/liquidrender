import { NodeEnv } from "@turbostarter/shared/constants";

const nodeEnv = process.env.NODE_ENV ?? "development";

/**
 * Centralized credits configuration.
 * Environment-aware defaults for development vs production.
 */
export const CreditsConfig = {
  /** Credits for new free-tier users */
  FREE_TIER: nodeEnv === NodeEnv.DEVELOPMENT ? 10000 : 100,

  /** Credits for seed/dev users */
  DEV_SEED: 10000,

  /** Cost by operation complexity */
  COST: {
    FREE: 0,
    LOW: 1,
    MEDIUM: 5,
    HIGH: 10,
    PREMIUM: 25,
  },

  /** Feature-specific costs (for audit logging) */
  FEATURE_COST: {
    chat: 5,
    "text-to-speech": 10,
    "speech-to-text": 5,
    "image-generation": 25,
    "pdf-chat": 10,
  },
} as const;

export type CostLevel = keyof typeof CreditsConfig.COST;
export type FeatureName = keyof typeof CreditsConfig.FEATURE_COST;

/**
 * Get cost for a specific feature
 */
export const getFeatureCost = (feature: FeatureName): number => {
  return CreditsConfig.FEATURE_COST[feature];
};
