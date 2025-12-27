/**
 * Tests for token counting module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink, mkdir, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  countTokens,
  countFileTokens,
  validateBudget,
  truncateToTokenLimit,
  createTokenReport,
  getBudgetForFile,
  formatTokenCount,
  resetEncoder,
} from './tokens.js';
import type { TokenBudget, TokenReport } from './types.js';

// ============================================
// Test Setup
// ============================================

describe('tokens', () => {
  let testDir: string;

  beforeEach(async () => {
    resetEncoder();
    testDir = join(tmpdir(), `cognitive-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      // Clean up test files
      const files = ['test.txt', 'empty.txt', 'summary.md'];
      for (const file of files) {
        try {
          await unlink(join(testDir, file));
        } catch {
          // Ignore if file doesn't exist
        }
      }
      await rmdir(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // countTokens Tests
  // ============================================

  describe('countTokens', () => {
    it('should count tokens in a simple string', () => {
      const text = 'Hello, world!';
      const count = countTokens(text);

      // cl100k_base tokenizes "Hello, world!" into about 4 tokens
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined-like input', () => {
      // @ts-expect-error Testing edge case
      expect(countTokens(null)).toBe(0);
      // @ts-expect-error Testing edge case
      expect(countTokens(undefined)).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'This is a test sentence. '.repeat(100);
      const count = countTokens(longText);

      // Should be roughly proportional to length
      expect(count).toBeGreaterThan(100);
      expect(count).toBeLessThan(1000);
    });

    it('should handle special characters and unicode', () => {
      const text = 'Hello! 你好! مرحبا! 🌍';
      const count = countTokens(text);

      // Should handle unicode without throwing
      expect(count).toBeGreaterThan(0);
    });

    it('should handle code snippets', () => {
      const code = `
function hello() {
  console.log("Hello, world!");
  return 42;
}
      `;
      const count = countTokens(code);

      expect(count).toBeGreaterThan(10);
    });
  });

  // ============================================
  // countFileTokens Tests
  // ============================================

  describe('countFileTokens', () => {
    it('should count tokens in a file', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'This is test content for token counting.';
      await writeFile(filePath, content, 'utf-8');

      const report = await countFileTokens(filePath, 100);

      expect(report.file).toBe(filePath);
      expect(report.tokens).toBeGreaterThan(0);
      expect(report.budget).toBe(100);
      expect(report.overBudget).toBe(false);
      expect(report.percentage).toBeLessThan(100);
    });

    it('should detect when file is over budget', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'This is a longer test content. '.repeat(50);
      await writeFile(filePath, content, 'utf-8');

      const report = await countFileTokens(filePath, 10);

      expect(report.overBudget).toBe(true);
      expect(report.percentage).toBeGreaterThan(100);
    });

    it('should handle non-existent file gracefully', async () => {
      const report = await countFileTokens('/non/existent/file.txt', 100);

      expect(report.tokens).toBe(0);
      expect(report.overBudget).toBe(false);
    });

    it('should handle empty file', async () => {
      const filePath = join(testDir, 'empty.txt');
      await writeFile(filePath, '', 'utf-8');

      const report = await countFileTokens(filePath, 100);

      expect(report.tokens).toBe(0);
      expect(report.overBudget).toBe(false);
      expect(report.percentage).toBe(0);
    });

    it('should use Infinity as default budget', async () => {
      const filePath = join(testDir, 'test.txt');
      await writeFile(filePath, 'Some content', 'utf-8');

      const report = await countFileTokens(filePath);

      expect(report.budget).toBe(Infinity);
      expect(report.overBudget).toBe(false);
      expect(report.percentage).toBe(0);
    });
  });

  // ============================================
  // validateBudget Tests
  // ============================================

  describe('validateBudget', () => {
    const defaultBudget: TokenBudget = {
      summary: 300,
      capabilities: 2000,
      wisdomPerFile: 1500,
      total: 5000,
    };

    it('should return valid when all reports are within budget', () => {
      const reports: TokenReport[] = [
        { file: 'SUMMARY.md', tokens: 200, budget: 300, overBudget: false, percentage: 67 },
        { file: 'capabilities.yaml', tokens: 1000, budget: 2000, overBudget: false, percentage: 50 },
      ];

      const result = validateBudget(reports, defaultBudget);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect individual file budget violations', () => {
      const reports: TokenReport[] = [
        { file: 'SUMMARY.md', tokens: 400, budget: 300, overBudget: true, percentage: 133 },
        { file: 'capabilities.yaml', tokens: 1000, budget: 2000, overBudget: false, percentage: 50 },
      ];

      const result = validateBudget(reports, defaultBudget);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe('SUMMARY.md');
    });

    it('should detect total budget violations', () => {
      const reports: TokenReport[] = [
        { file: 'file1.md', tokens: 3000, budget: 5000, overBudget: false, percentage: 60 },
        { file: 'file2.md', tokens: 3000, budget: 5000, overBudget: false, percentage: 60 },
      ];

      const result = validateBudget(reports, defaultBudget);

      expect(result.valid).toBe(false);
      // Should have total violation
      const totalViolation = result.violations.find((v) => v.file === '[TOTAL]');
      expect(totalViolation).toBeDefined();
      expect(totalViolation?.tokens).toBe(6000);
    });

    it('should handle empty reports array', () => {
      const result = validateBudget([], defaultBudget);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect multiple violations', () => {
      const reports: TokenReport[] = [
        { file: 'SUMMARY.md', tokens: 500, budget: 300, overBudget: true, percentage: 167 },
        { file: 'wisdom/guide.md', tokens: 2000, budget: 1500, overBudget: true, percentage: 133 },
      ];

      const result = validateBudget(reports, defaultBudget);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // truncateToTokenLimit Tests
  // ============================================

  describe('truncateToTokenLimit', () => {
    it('should return text unchanged if within limit', () => {
      const text = 'Hello, world!';
      const result = truncateToTokenLimit(text, 100);

      expect(result).toBe(text);
    });

    it('should truncate text to fit within limit', () => {
      const text = 'This is a test sentence. '.repeat(100);
      const result = truncateToTokenLimit(text, 50);

      const resultTokens = countTokens(result);
      expect(resultTokens).toBeLessThanOrEqual(50);
      expect(result.length).toBeLessThan(text.length);
    });

    it('should return empty string for empty input', () => {
      expect(truncateToTokenLimit('', 100)).toBe('');
    });

    it('should return empty string for zero max tokens', () => {
      expect(truncateToTokenLimit('Hello', 0)).toBe('');
    });

    it('should return empty string for negative max tokens', () => {
      expect(truncateToTokenLimit('Hello', -10)).toBe('');
    });

    it('should try to break at sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = truncateToTokenLimit(text, 8);

      // Should end with a period if it found a sentence boundary
      if (result.length > 10) {
        expect(result.endsWith('.') || result.endsWith('sentence')).toBe(true);
      }
    });

    it('should handle single word exceeding limit', () => {
      const text = 'supercalifragilisticexpialidocious';
      const result = truncateToTokenLimit(text, 1);

      // Should still return something (partial word)
      expect(countTokens(result)).toBeLessThanOrEqual(1);
    });
  });

  // ============================================
  // createTokenReport Tests
  // ============================================

  describe('createTokenReport', () => {
    it('should create a report with correct values', () => {
      const report = createTokenReport('test.md', 'Hello world', 100);

      expect(report.file).toBe('test.md');
      expect(report.tokens).toBeGreaterThan(0);
      expect(report.budget).toBe(100);
      expect(report.overBudget).toBe(false);
      expect(report.percentage).toBeLessThan(100);
    });

    it('should detect over budget content', () => {
      const content = 'This is content. '.repeat(100);
      const report = createTokenReport('test.md', content, 10);

      expect(report.overBudget).toBe(true);
      expect(report.percentage).toBeGreaterThan(100);
    });

    it('should handle zero budget', () => {
      const report = createTokenReport('test.md', 'content', 0);

      expect(report.percentage).toBe(0);
    });
  });

  // ============================================
  // getBudgetForFile Tests
  // ============================================

  describe('getBudgetForFile', () => {
    const budget: TokenBudget = {
      summary: 300,
      capabilities: 2000,
      wisdomPerFile: 1500,
      total: 20000,
    };

    it('should return summary budget for summary files', () => {
      expect(getBudgetForFile('SUMMARY.md', budget)).toBe(300);
      expect(getBudgetForFile('.context/SUMMARY.md', budget)).toBe(300);
      expect(getBudgetForFile('docs/summary.txt', budget)).toBe(300);
    });

    it('should return capabilities budget for capabilities files', () => {
      expect(getBudgetForFile('capabilities.yaml', budget)).toBe(2000);
      expect(getBudgetForFile('.context/capabilities.yml', budget)).toBe(2000);
    });

    it('should return wisdom budget for wisdom files', () => {
      expect(getBudgetForFile('wisdom/guide.md', budget)).toBe(1500);
      expect(getBudgetForFile('.context/wisdom/patterns.md', budget)).toBe(1500);
    });

    it('should return total budget for unknown files', () => {
      expect(getBudgetForFile('random.md', budget)).toBe(20000);
      expect(getBudgetForFile('docs/other.txt', budget)).toBe(20000);
    });
  });

  // ============================================
  // formatTokenCount Tests
  // ============================================

  describe('formatTokenCount', () => {
    it('should format small numbers as-is', () => {
      expect(formatTokenCount(100)).toBe('100');
      expect(formatTokenCount(999)).toBe('999');
    });

    it('should format thousands with k suffix', () => {
      expect(formatTokenCount(1000)).toBe('1.0k');
      expect(formatTokenCount(1500)).toBe('1.5k');
      expect(formatTokenCount(10000)).toBe('10.0k');
    });

    it('should handle zero', () => {
      expect(formatTokenCount(0)).toBe('0');
    });
  });
});
