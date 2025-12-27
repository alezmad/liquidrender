/**
 * Token counting and budget management module
 *
 * Uses js-tiktoken with cl100k_base encoding (GPT-4 compatible)
 * for accurate token counting.
 */

import { readFile } from 'node:fs/promises';
import { getEncoding, Tiktoken } from 'js-tiktoken';
import type { TokenBudget, TokenReport } from './types.js';

// ============================================
// Encoder Instance (cached for performance)
// ============================================

let encoderInstance: Tiktoken | null = null;

/**
 * Get or create the tiktoken encoder instance
 * Uses cl100k_base encoding (GPT-4/ChatGPT compatible)
 */
function getEncoder(): Tiktoken {
  if (!encoderInstance) {
    encoderInstance = getEncoding('cl100k_base');
  }
  return encoderInstance;
}

// ============================================
// Core Token Counting
// ============================================

/**
 * Count the number of tokens in a text string
 *
 * @param text - The text to count tokens for
 * @returns The number of tokens
 *
 * @example
 * const count = countTokens('Hello, world!');
 * console.log(count); // 4
 */
export function countTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  try {
    const encoder = getEncoder();
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    // Handle encoding errors gracefully - estimate based on characters
    // Rough estimate: ~4 characters per token for English text
    console.warn('Token encoding failed, using character-based estimate:', error);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens in a file
 *
 * @param filePath - Path to the file to count tokens for
 * @param budget - Optional budget to compare against (defaults to Infinity)
 * @returns TokenReport with file statistics
 *
 * @example
 * const report = await countFileTokens('./README.md', 1000);
 * console.log(report.overBudget); // false if under 1000 tokens
 */
export async function countFileTokens(
  filePath: string,
  budget: number = Infinity
): Promise<TokenReport> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const tokens = countTokens(content);

    return {
      file: filePath,
      tokens,
      budget,
      overBudget: tokens > budget,
      percentage: budget === Infinity ? 0 : Math.round((tokens / budget) * 100),
    };
  } catch (error) {
    // If file can't be read, return a report indicating the error
    // with 0 tokens (can't count what we can't read)
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to read file ${filePath}: ${message}`);

    return {
      file: filePath,
      tokens: 0,
      budget,
      overBudget: false,
      percentage: 0,
    };
  }
}

// ============================================
// Budget Validation
// ============================================

/**
 * Validate token reports against a budget configuration
 *
 * @param reports - Array of TokenReport objects to validate
 * @param budget - TokenBudget configuration with limits
 * @returns Validation result with valid flag and any violations
 *
 * @example
 * const reports = [
 *   { file: 'SUMMARY.md', tokens: 250, budget: 300, overBudget: false, percentage: 83 },
 *   { file: 'wisdom/guide.md', tokens: 2000, budget: 1500, overBudget: true, percentage: 133 },
 * ];
 * const result = validateBudget(reports, budget);
 * console.log(result.valid); // false
 * console.log(result.violations); // [{ file: 'wisdom/guide.md', ... }]
 */
export function validateBudget(
  reports: TokenReport[],
  budget: TokenBudget
): { valid: boolean; violations: TokenReport[] } {
  const violations: TokenReport[] = [];

  // Check individual file budgets
  for (const report of reports) {
    if (report.overBudget) {
      violations.push(report);
    }
  }

  // Check total budget
  const totalTokens = reports.reduce((sum, r) => sum + r.tokens, 0);
  if (totalTokens > budget.total) {
    // Add a synthetic report for total budget violation
    violations.push({
      file: '[TOTAL]',
      tokens: totalTokens,
      budget: budget.total,
      overBudget: true,
      percentage: Math.round((totalTokens / budget.total) * 100),
    });
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================
// Text Truncation
// ============================================

/**
 * Truncate text to fit within a token limit
 *
 * Preserves complete words/sentences when possible by truncating
 * at sentence or word boundaries.
 *
 * @param text - The text to truncate
 * @param maxTokens - Maximum number of tokens allowed
 * @returns Truncated text that fits within the limit
 *
 * @example
 * const longText = 'This is a very long text...';
 * const truncated = truncateToTokenLimit(longText, 10);
 * console.log(countTokens(truncated) <= 10); // true
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (!text || maxTokens <= 0) {
    return '';
  }

  const currentTokens = countTokens(text);
  if (currentTokens <= maxTokens) {
    return text;
  }

  // Binary search for the right length
  // Start with an estimate based on the ratio
  const ratio = maxTokens / currentTokens;
  let low = 0;
  let high = text.length;
  let result = '';

  // Initial estimate
  let mid = Math.floor(text.length * ratio * 0.9); // Start slightly under

  // Refine with binary search
  while (low < high) {
    mid = Math.floor((low + high + 1) / 2);
    const substring = text.slice(0, mid);
    const tokens = countTokens(substring);

    if (tokens <= maxTokens) {
      result = substring;
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  // Try to find a clean break point (sentence or word boundary)
  const cleanBreak = findCleanBreakPoint(result);

  return cleanBreak || result;
}

/**
 * Find a clean break point in text (sentence or word boundary)
 */
function findCleanBreakPoint(text: string): string {
  if (!text) return '';

  // Try to find the last sentence boundary
  const sentenceMatch = text.match(/^(.+[.!?])\s*[^.!?]*$/);
  if (sentenceMatch && sentenceMatch[1].length > text.length * 0.7) {
    return sentenceMatch[1];
  }

  // Fall back to last word boundary
  const wordMatch = text.match(/^(.+)\s+\S*$/);
  if (wordMatch && wordMatch[1].length > text.length * 0.8) {
    return wordMatch[1];
  }

  // If no good break point, return as-is
  return text;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create a TokenReport for a given file path and content
 *
 * @param file - File path
 * @param content - File content
 * @param budget - Token budget for this file
 * @returns TokenReport
 */
export function createTokenReport(
  file: string,
  content: string,
  budget: number
): TokenReport {
  const tokens = countTokens(content);
  return {
    file,
    tokens,
    budget,
    overBudget: tokens > budget,
    percentage: budget > 0 ? Math.round((tokens / budget) * 100) : 0,
  };
}

/**
 * Get budget for a specific file type based on TokenBudget config
 *
 * @param filePath - The file path
 * @param budget - TokenBudget configuration
 * @returns The applicable budget for this file
 */
export function getBudgetForFile(filePath: string, budget: TokenBudget): number {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.includes('summary')) {
    return budget.summary;
  }

  if (lowerPath.includes('capabilities')) {
    return budget.capabilities;
  }

  if (lowerPath.includes('wisdom')) {
    return budget.wisdomPerFile;
  }

  // Default to total budget if no specific category matches
  return budget.total;
}

/**
 * Format a token count for display
 *
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1.2k" for 1200)
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Reset the encoder instance (useful for testing)
 */
export function resetEncoder(): void {
  encoderInstance = null;
}
