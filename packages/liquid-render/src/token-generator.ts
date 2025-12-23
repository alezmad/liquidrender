import { nanoid } from 'nanoid';
import { addDays } from 'date-fns';

// Token configuration types (standalone, no external dependency)
export interface TokenConfig {
  validityDays?: number;
}

export interface TokenRateLimit {
  maxRequests: number;
  windowMs: number;
}

export type TokenMode = 'single' | 'multi';

export interface GenerateTokenOptions {
  mode: TokenMode;
  instanceId: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  validityDays?: number;
  rateLimit?: TokenRateLimit;
}

export interface TokenData {
  token: string;
  instanceId: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  maxUses: number | null;
  rateLimit?: TokenRateLimit;
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * Generates a secure token for survey access
 */
export function generateToken(options: GenerateTokenOptions): TokenData {
  const {
    mode,
    instanceId,
    externalId,
    metadata,
    validityDays = 30,
    rateLimit
  } = options;

  // Generate a shorter token (10-12 chars)
  const tokenId = nanoid(10);
  const prefix = mode === 'single' ? 's' : 'm';
  
  // Simple format: prefix + tokenId (e.g., "s_abc123defg")
  const token = `${prefix}_${tokenId}`;
  
  return {
    token,
    instanceId,
    externalId,
    metadata,
    maxUses: mode === 'single' ? 1 : null,
    rateLimit: mode === 'multi' ? rateLimit : undefined,
    validFrom: new Date(),
    validUntil: addDays(new Date(), validityDays)
  };
}

/**
 * Validates a token and extracts its components
 */
export function validateToken(token: string): {
  isValid: boolean;
  mode?: TokenMode;
  error?: string;
} {
  try {
    // Check basic format
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Invalid token format' };
    }
    
    // Extract prefix
    const prefixMatch = token.match(/^(s|m)_/);
    if (!prefixMatch) {
      return { isValid: false, error: 'Invalid token prefix' };
    }
    
    const prefix = prefixMatch[1];
    const mode: TokenMode = prefix === 's' ? 'single' : 'multi';
    
    // Extract token ID
    const tokenId = token.substring(2); // Skip prefix and underscore
    
    // Basic validation - should be at least 8 chars (allowing some flexibility for different versions)
    if (tokenId.length < 8 || tokenId.length > 20) {
      return { isValid: false, error: 'Invalid token length' };
    }
    
    // Check if it matches nanoid pattern (alphanumeric)
    if (!/^[a-zA-Z0-9_-]+$/.test(tokenId)) {
      return { isValid: false, error: 'Invalid token characters' };
    }
    
    return {
      isValid: true,
      mode
    };
  } catch (_error) {
    return { isValid: false, error: 'Token validation failed' };
  }
}

/**
 * Generates multiple tokens for bulk operations
 */
export function generateBulkTokens(
  instanceId: string,
  count: number,
  externalData?: Array<{ id: string; metadata?: Record<string, unknown> }>,
  tokenConfig?: TokenConfig
): TokenData[] {
  const tokens: TokenData[] = [];
  
  for (let i = 0; i < count; i++) {
    const externalInfo = externalData?.[i];
    const token = generateToken({
      mode: 'single',
      instanceId,
      externalId: externalInfo?.id,
      metadata: externalInfo?.metadata,
      validityDays: tokenConfig?.validityDays || 30
    });
    
    tokens.push(token);
  }
  
  return tokens;
}

/**
 * Formats a token URL for distribution
 */
export function formatTokenUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_DASHBOARD_URL || '';
  return `${base}/survey/${token}`;
}

/**
 * Checks if a token has expired based on its validity period
 */
export function isTokenExpired(validUntil: Date | null | undefined): boolean {
  if (!validUntil) return false;
  return new Date() > validUntil;
}