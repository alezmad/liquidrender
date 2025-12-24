// LiquidCode Diagnostics Module
// Provides helpful error messages with source context and fix suggestions

import { LiquidCodeError } from './ui-scanner';
import { UI_TYPE_CODES } from './constants';

// ============================================================================
// Types
// ============================================================================

export interface DiagnosticMessage {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  context?: string; // Source context with pointer
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Format a LiquidCodeError into a structured diagnostic message
 */
export function formatDiagnostic(
  error: LiquidCodeError,
  source: string
): DiagnosticMessage {
  const baseMessage = extractBaseMessage(error.message);
  const context = formatSourceContext(source, error.line, error.column);
  const suggestion = suggestFix(error);

  return {
    message: baseMessage,
    line: error.line,
    column: error.column,
    severity: 'error',
    suggestion,
    context,
  };
}

/**
 * Suggest fixes for common errors
 */
export function suggestFix(error: LiquidCodeError): string | undefined {
  const message = error.message.toLowerCase();

  // Unterminated string
  if (message.includes('unterminated string')) {
    return 'Add a closing double quote (") to complete the string';
  }

  // Unknown type code
  if (message.includes('unknown') && message.includes('type')) {
    return suggestTypeCode(error);
  }

  // Unbalanced brackets
  if (message.includes('unbalanced') || message.includes('bracket')) {
    return suggestBracketFix(error);
  }

  // Missing closing bracket
  if (message.includes('expected') && message.includes(']')) {
    return 'Add a closing bracket (]) to complete the component structure';
  }

  // Invalid UTF-8
  if (message.includes('utf-8') || message.includes('surrogate')) {
    return 'Remove or replace invalid Unicode characters';
  }

  return undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract base error message without location info
 */
function extractBaseMessage(message: string): string {
  // Remove " at line X, column Y" suffix - handle both with and without space before "at"
  const match = message.match(/^(.+?)(?:\s+at line \d+, column \d+)?$/);
  return match?.[1] ?? message;
}

/**
 * Format source context with line pointer
 */
function formatSourceContext(
  source: string,
  line: number,
  column: number
): string {
  const lines = source.split('\n');
  const errorLine = lines[line - 1];

  if (!errorLine) {
    return '';
  }

  // Sanitize the line (show visible representation of whitespace/control chars)
  const sanitized = sanitizeLine(errorLine);

  // Create pointer
  const pointer = ' '.repeat(column - 1) + '^';

  // Format with line number
  const lineNumWidth = String(line).length;
  const padding = ' '.repeat(lineNumWidth + 1);

  return [
    `${line} | ${sanitized}`,
    `${padding}| ${pointer}`,
  ].join('\n');
}

/**
 * Sanitize control characters and show visible whitespace
 */
function sanitizeLine(line: string): string {
  return line
    .replace(/\t/g, '→   ') // Tab as arrow + spaces
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, (char) => {
      // Show control characters as hex codes
      const code = char.charCodeAt(0);
      return `<0x${code.toString(16).padStart(2, '0')}>`;
    });
}

/**
 * Suggest valid type codes for unknown types
 */
function suggestTypeCode(error: LiquidCodeError): string | undefined {
  const message = error.message;

  // Try to extract the invalid type code from error message
  const match = message.match(/['"`]([A-Za-z]{1,3})['"`]/);
  if (!match) {
    return 'Use a valid type code like Cn, Kp, Br, Ln, Pi, Tb, Fm, Ls, Cd, or Md';
  }

  const invalidCode = match[1] ?? '';
  const suggestions = findSimilarTypeCodes(invalidCode);

  if (suggestions.length > 0) {
    return `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`;
  }

  return 'Use a valid type code like Cn, Kp, Br, Ln, Pi, Tb, Fm, Ls, Cd, or Md';
}

/**
 * Find similar type codes using edit distance
 */
function findSimilarTypeCodes(code: string): string[] {
  const validCodes = Object.keys(UI_TYPE_CODES);
  const normalized = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();

  // Calculate edit distance for all codes
  const distances = validCodes.map((validCode) => ({
    code: validCode,
    distance: levenshteinDistance(normalized, validCode),
  }));

  // Sort by distance and return closest matches (distance <= 2)
  const similar = distances
    .filter((d) => d.distance <= 2)
    .sort((a, b) => a.distance - b.distance)
    .map((d) => d.code);

  // If no close matches found, return empty array
  // (caller will provide fallback suggestion)
  return similar;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create matrix with explicit initialization
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );

  // Initialize first column and row
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const prevDiag = matrix[i - 1]![j - 1]!;
      const prevRow = matrix[i - 1]![j]!;
      const prevCol = matrix[i]![j - 1]!;

      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = prevDiag;
      } else {
        matrix[i]![j] = Math.min(
          prevDiag + 1,  // substitution
          prevCol + 1,   // insertion
          prevRow + 1    // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Suggest bracket fix based on bracket tracking
 */
function suggestBracketFix(error: LiquidCodeError): string | undefined {
  if (!error.source) {
    return 'Check that all brackets are properly balanced';
  }

  // Track bracket positions
  const brackets = trackBrackets(error.source);

  if (brackets.unclosed.length > 0) {
    const last = brackets.unclosed[brackets.unclosed.length - 1];
    if (last) {
      return `Add closing bracket (]) for opening bracket at line ${last.line}, column ${last.column}`;
    }
  }

  if (brackets.extraClosing.length > 0) {
    return 'Remove extra closing bracket (])';
  }

  return 'Check that all brackets are properly balanced';
}

/**
 * Track bracket positions in source
 */
function trackBrackets(source: string): {
  unclosed: Array<{ line: number; column: number }>;
  extraClosing: Array<{ line: number; column: number }>;
} {
  const stack: Array<{ line: number; column: number }> = [];
  const extraClosing: Array<{ line: number; column: number }> = [];

  let line = 1;
  let column = 1;
  let inString = false;
  let inComment = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    // Track position
    if (char === '\n') {
      line++;
      column = 1;
      inComment = false;
      continue;
    }

    // Skip comments
    if (char === '/' && next === '/') {
      inComment = true;
    }
    if (inComment) {
      column++;
      continue;
    }

    // Track string state
    if (char === '"' && (i === 0 || source[i - 1] !== '\\')) {
      inString = !inString;
    }

    // Skip bracket tracking inside strings
    if (inString) {
      column++;
      continue;
    }

    // Track brackets
    if (char === '[') {
      stack.push({ line, column });
    } else if (char === ']') {
      if (stack.length === 0) {
        extraClosing.push({ line, column });
      } else {
        stack.pop();
      }
    }

    column++;
  }

  return {
    unclosed: stack,
    extraClosing,
  };
}
