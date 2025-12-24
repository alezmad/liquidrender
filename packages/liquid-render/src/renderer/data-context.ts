// Data Context - Resolves bindings to actual values
import type { Binding } from '../compiler/ui-emitter';

export type DataContext = Record<string, unknown>;

/**
 * Resolve a binding to its actual value from data context
 */
export function resolveBinding(
  binding: Binding | undefined,
  data: DataContext,
  index?: number
): unknown {
  if (!binding) return undefined;

  switch (binding.kind) {
    case 'field':
      // :fieldName -> data.fieldName
      return getNestedValue(data, binding.value);

    case 'index':
      // Indexed binding (0, 1, 2...) - used for positional data
      if (binding.indices && binding.indices.length > 0) {
        // Multi-index like 012 means data[0], data[1], data[2]
        return binding.indices.map(i => {
          const arr = Array.isArray(data) ? data : Object.values(data);
          return arr[i];
        });
      }
      return undefined;

    case 'expr':
      // =expression - evaluate simple expressions
      return evaluateExpression(binding.value, data);

    case 'literal':
      // "string" - return as-is
      return binding.value;

    case 'indexRef':
      // # - current iteration index
      return index ?? 0;

    case 'iterator':
      // :.field - iterate over array field
      return getNestedValue(data, binding.value);

    default:
      return undefined;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: DataContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluate simple expressions (basic support)
 */
function evaluateExpression(expr: string, data: DataContext): unknown {
  // Simple field reference
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expr)) {
    return getNestedValue(data, expr);
  }

  // Format expressions like: revenue|currency
  if (expr.includes('|')) {
    const [field, formatter] = expr.split('|');
    const value = getNestedValue(data, field.trim());
    return applyFormatter(value, formatter.trim());
  }

  // Math expressions (very basic)
  if (expr.includes('+') || expr.includes('-') || expr.includes('*') || expr.includes('/')) {
    try {
      // Replace field references with values
      const resolved = expr.replace(/[a-zA-Z_][a-zA-Z0-9_.]*/g, (match) => {
        const val = getNestedValue(data, match);
        return typeof val === 'number' ? String(val) : '0';
      });
      // Safe eval for simple math
      return Function(`"use strict"; return (${resolved})`)();
    } catch {
      return undefined;
    }
  }

  return expr;
}

/**
 * Apply formatting to values
 */
function applyFormatter(value: unknown, formatter: string): string {
  if (value === null || value === undefined) return '';

  switch (formatter) {
    case 'currency':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        : String(value);

    case 'percent':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value)
        : String(value);

    case 'number':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US').format(value)
        : String(value);

    case 'compact':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
        : String(value);

    default:
      return String(value);
  }
}

/**
 * Format a value for display based on its type and magnitude
 */
export function formatValue(value: unknown, hint?: 'currency' | 'percent' | 'number'): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Use hint if provided
    if (hint === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }
    if (hint === 'percent') {
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value);
    }

    // Auto-detect: percentages (values between 0 and 1, exclusive)
    if (value > 0 && value < 1) {
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value);
    }

    // Auto-detect: likely currency (large values >= 10000)
    if (value >= 10000) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }

    // Default: regular number formatting
    return new Intl.NumberFormat('en-US').format(value);
  }
  return String(value);
}
