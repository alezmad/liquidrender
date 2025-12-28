// LiquidConnect Compiler - Diagnostics
// Error types and error codes

import type { Position } from '../types';

/**
 * Error code categories:
 * E1xx - Syntax errors
 * E2xx - Resolution errors
 * E3xx - Type errors
 * E4xx - Semantic errors
 * E5xx - Ambiguity errors
 * E6xx - Conflict errors
 * E7xx - Policy errors
 */
export enum ErrorCode {
  // Syntax errors (E1xx)
  E101 = 'E101', // Unexpected token
  E102 = 'E102', // Expected 'Q' at start
  E103 = 'E103', // Invalid time expression
  E104 = 'E104', // Use & between filters
  E105 = 'E105', // Unclosed string
  E106 = 'E106', // Invalid parameter name

  // Resolution errors (E2xx)
  E201 = 'E201', // Unknown metric
  E202 = 'E202', // Unknown dimension
  E203 = 'E203', // Unknown field
  E204 = 'E204', // Unknown named filter
  E205 = 'E205', // Unknown scope
  E206 = 'E206', // Unknown entity
  E207 = 'E207', // Parameter not provided

  // Type errors (E3xx)
  E301 = 'E301', // Type mismatch in comparison
  E302 = 'E302', // Operator requires string
  E303 = 'E303', // Time filter requires date
  E304 = 'E304', // Invalid value for field
  E305 = 'E305', // Parameter type mismatch

  // Semantic errors (E4xx)
  E401 = 'E401', // Cannot mix entity and metric
  E402 = 'E402', // Entity cannot sort by metric
  E403 = 'E403', // Duplicate dimension
  E404 = 'E404', // Field not reachable

  // Ambiguity errors (E5xx)
  E501 = 'E501', // Ambiguous metric (use scope)
  E502 = 'E502', // Multiple join paths
  E503 = 'E503', // No join path exists

  // Conflict errors (E6xx)
  E601 = 'E601', // Metrics have different time fields
  E602 = 'E602', // Time override not date type
  E603 = 'E603', // Derived metric time conflict

  // Policy errors (E7xx)
  E701 = 'E701', // Metric not allowed
  E702 = 'E702', // Field not allowed
  E703 = 'E703', // Join depth exceeded
  E704 = 'E704', // Limit exceeded
  E705 = 'E705', // Query timeout
}

/**
 * Error category
 */
export type ErrorCategory =
  | 'syntax'
  | 'resolution'
  | 'type'
  | 'semantic'
  | 'ambiguity'
  | 'conflict'
  | 'policy';

/**
 * Get category from error code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  const prefix = code.charAt(1);
  switch (prefix) {
    case '1': return 'syntax';
    case '2': return 'resolution';
    case '3': return 'type';
    case '4': return 'semantic';
    case '5': return 'ambiguity';
    case '6': return 'conflict';
    case '7': return 'policy';
    default: return 'syntax';
  }
}

/**
 * LiquidConnect error with structured information
 */
export class LiquidError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly position?: Position;
  readonly query?: string;
  readonly suggestions?: string[];

  constructor(
    code: ErrorCode,
    message: string,
    position?: Position,
    options?: {
      query?: string;
      suggestions?: string[];
    }
  ) {
    super(message);
    this.name = 'LiquidError';
    this.code = code;
    this.category = getErrorCategory(code);
    this.position = position;
    this.query = options?.query;
    this.suggestions = options?.suggestions;
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        category: this.category,
        message: this.message,
        position: this.position,
        query: this.query,
        suggestions: this.suggestions,
      },
    };
  }

  /**
   * Format for display
   */
  format(): string {
    let result = `[${this.code}] ${this.message}`;
    if (this.position) {
      result += ` at line ${this.position.line}, column ${this.position.column}`;
    }
    if (this.suggestions && this.suggestions.length > 0) {
      result += `\n  Suggestions: ${this.suggestions.join(', ')}`;
    }
    return result;
  }
}

/**
 * Diagnostic severity
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Diagnostic message
 */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: ErrorCode | string;
  message: string;
  position?: Position;
}

/**
 * Diagnostics collector
 */
export class DiagnosticsCollector {
  private diagnostics: Diagnostic[] = [];

  error(code: ErrorCode, message: string, position?: Position): void {
    this.diagnostics.push({ severity: 'error', code, message, position });
  }

  warning(code: string, message: string, position?: Position): void {
    this.diagnostics.push({ severity: 'warning', code, message, position });
  }

  info(message: string, position?: Position): void {
    this.diagnostics.push({ severity: 'info', code: 'INFO', message, position });
  }

  hasErrors(): boolean {
    return this.diagnostics.some(d => d.severity === 'error');
  }

  getAll(): Diagnostic[] {
    return [...this.diagnostics];
  }

  getErrors(): Diagnostic[] {
    return this.diagnostics.filter(d => d.severity === 'error');
  }

  clear(): void {
    this.diagnostics = [];
  }
}
