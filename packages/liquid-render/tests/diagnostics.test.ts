/**
 * Diagnostics Unit Tests
 *
 * Tests for error formatting, fix suggestions, and control character handling
 */

import { describe, it, expect } from 'vitest';
import { formatDiagnostic, suggestFix } from '../src/compiler/diagnostics';
import { LiquidCodeError } from '../src/compiler/ui-scanner';

// ============================================================================
// Error Context Formatting
// ============================================================================

describe('formatDiagnostic', () => {
  describe('error context formatting', () => {
    it('should format simple error with context', () => {
      const source = 'Kp :revenue "Sales"\nBr :sales';
      const error = new LiquidCodeError('Unterminated string', 1, 12, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.message).toBe('Unterminated string');
      expect(diagnostic.line).toBe(1);
      expect(diagnostic.column).toBe(12);
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.context).toContain('1 | Kp :revenue "Sales"');
      expect(diagnostic.context).toContain('^');
    });

    it('should format error on multi-line code', () => {
      const source = 'Kp :revenue "Sales"\nBr :sales\nLn :trend';
      const error = new LiquidCodeError('Unknown type', 3, 1, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.line).toBe(3);
      expect(diagnostic.context).toContain('3 | Ln :trend');
      expect(diagnostic.context).toContain('^');
    });

    it('should handle error at different columns', () => {
      const source = 'Kp :revenue "Sales"';
      const error = new LiquidCodeError('Error here', 1, 15, source);

      const diagnostic = formatDiagnostic(error, source);

      const lines = diagnostic.context!.split('\n');
      expect(lines[1]).toContain('              ^'); // Pointer at column 15
    });

    it('should extract base message without location suffix', () => {
      const source = 'Kp :revenue';
      // LiquidCodeError constructor automatically adds location to message
      const error = new LiquidCodeError('Unterminated string', 1, 5, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.message).toBe('Unterminated string');
    });
  });

  describe('control character sanitization', () => {
    it('should show tabs as visible arrows', () => {
      const source = 'Kp\t:revenue';
      const error = new LiquidCodeError('Test error', 1, 3, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toContain('→   '); // Tab shown as arrow + spaces
    });

    it('should sanitize control characters', () => {
      const source = 'Kp\x00:revenue'; // NULL character
      const error = new LiquidCodeError('Test error', 1, 3, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toContain('<0x00>'); // NULL shown as hex
    });

    it('should handle multiple control characters', () => {
      const source = 'Kp\x01\x02:revenue';
      const error = new LiquidCodeError('Test error', 1, 3, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toContain('<0x01>');
      expect(diagnostic.context).toContain('<0x02>');
    });

    it('should preserve normal characters', () => {
      const source = 'Kp :revenue "Sales"';
      const error = new LiquidCodeError('Test error', 1, 5, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toContain('Kp :revenue "Sales"');
    });
  });

  describe('edge cases', () => {
    it('should handle empty source', () => {
      const source = '';
      const error = new LiquidCodeError('Error', 1, 1, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toBe('');
    });

    it('should handle error beyond source length', () => {
      const source = 'Kp :revenue';
      const error = new LiquidCodeError('Error', 5, 1, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toBe('');
    });

    it('should handle single character source', () => {
      const source = 'K';
      const error = new LiquidCodeError('Error', 1, 1, source);

      const diagnostic = formatDiagnostic(error, source);

      expect(diagnostic.context).toContain('1 | K');
      expect(diagnostic.context).toContain('^');
    });
  });
});

// ============================================================================
// Fix Suggestions
// ============================================================================

describe('suggestFix', () => {
  describe('unterminated string', () => {
    it('should suggest closing quote', () => {
      const error = new LiquidCodeError('Unterminated string', 1, 12, 'Kp "Sales');

      const suggestion = suggestFix(error);

      expect(suggestion).toBe('Add a closing double quote (") to complete the string');
    });

    it('should be case insensitive', () => {
      const error = new LiquidCodeError('UNTERMINATED STRING', 1, 12, 'Kp "Sales');

      const suggestion = suggestFix(error);

      expect(suggestion).toBeTruthy();
    });
  });

  describe('unknown type code', () => {
    it('should suggest similar valid codes', () => {
      const error = new LiquidCodeError('Unknown type "Kr"', 1, 1, 'Kr :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('Kp'); // Similar to Kr
    });

    it('should suggest multiple similar codes', () => {
      const error = new LiquidCodeError('Unknown type "Bp"', 1, 1, 'Bp :revenue');

      const suggestion = suggestFix(error);

      // Should suggest Br (bar) as similar
      expect(suggestion).toBeTruthy();
      expect(suggestion).toContain('Did you mean:');
    });

    it('should suggest common codes if no close match', () => {
      const error = new LiquidCodeError('Unknown type "Qq"', 1, 1, 'Qq :revenue');

      const suggestion = suggestFix(error);

      // Even with no close match, should still find some suggestions
      // or provide the fallback message
      expect(suggestion).toBeTruthy();
      expect(suggestion).toMatch(/Did you mean:|valid type code/);
    });

    it('should handle single quotes in error message', () => {
      const error = new LiquidCodeError("Unknown type 'Kr'", 1, 1, 'Kr :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('Kp');
    });

    it('should handle backticks in error message', () => {
      const error = new LiquidCodeError('Unknown type `Kr`', 1, 1, 'Kr :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('Kp');
    });
  });

  describe('unbalanced brackets', () => {
    it('should suggest closing bracket for unclosed opening', () => {
      const error = new LiquidCodeError('Unbalanced brackets', 1, 1, '[Kp :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('closing bracket');
    });

    it('should suggest removing extra closing bracket', () => {
      const error = new LiquidCodeError('Unbalanced brackets', 1, 1, 'Kp :revenue]');

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('extra closing bracket');
    });

    it('should show where bracket was opened', () => {
      const source = '[\n  Kp :revenue\n  Br :sales';
      const error = new LiquidCodeError('Unbalanced brackets', 3, 3, source);

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('line 1');
      expect(suggestion).toContain('column 1');
    });

    it('should handle nested brackets', () => {
      const source = '[Cn [Kp :revenue]]';
      const error = new LiquidCodeError('Unbalanced brackets', 1, 19, source);

      const suggestion = suggestFix(error);

      expect(suggestion).toBeTruthy();
    });

    it('should ignore brackets in strings', () => {
      const source = '[Kp "[test]"]';
      const error = new LiquidCodeError('Unbalanced brackets', 1, 14, source);

      const suggestion = suggestFix(error);

      // Should not consider brackets inside string
      expect(suggestion).toBeTruthy();
    });

    it('should ignore brackets in comments', () => {
      const source = '[Kp :revenue // [comment]';
      const error = new LiquidCodeError('Unbalanced brackets', 1, 26, source);

      const suggestion = suggestFix(error);

      expect(suggestion).toContain('line 1');
    });
  });

  describe('missing closing bracket', () => {
    it('should suggest adding closing bracket', () => {
      const error = new LiquidCodeError('Expected ]', 1, 13, '[Kp :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toBe('Add a closing bracket (]) to complete the component structure');
    });
  });

  describe('invalid UTF-8', () => {
    it('should suggest removing invalid characters for UTF-8 error', () => {
      const error = new LiquidCodeError('Invalid UTF-8: orphaned high surrogate', 1, 5, 'Kp :x');

      const suggestion = suggestFix(error);

      expect(suggestion).toBe('Remove or replace invalid Unicode characters');
    });

    it('should suggest removing invalid characters for surrogate error', () => {
      const error = new LiquidCodeError('Invalid UTF-8: orphaned low surrogate', 1, 5, 'Kp :x');

      const suggestion = suggestFix(error);

      expect(suggestion).toBe('Remove or replace invalid Unicode characters');
    });
  });

  describe('unknown errors', () => {
    it('should return undefined for unknown error types', () => {
      const error = new LiquidCodeError('Some random error', 1, 1, 'Kp :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toBeUndefined();
    });

    it('should return undefined for generic syntax errors', () => {
      const error = new LiquidCodeError('Syntax error', 1, 1, 'Kp :revenue');

      const suggestion = suggestFix(error);

      expect(suggestion).toBeUndefined();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('diagnostics integration', () => {
  it('should provide complete diagnostic for unterminated string', () => {
    const source = 'Kp :revenue "Sales\nBr :sales';
    const error = new LiquidCodeError('Unterminated string', 1, 13, source);

    const diagnostic = formatDiagnostic(error, source);

    expect(diagnostic.message).toBe('Unterminated string');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.context).toBeTruthy();
    expect(diagnostic.suggestion).toBe('Add a closing double quote (") to complete the string');
  });

  it('should provide complete diagnostic for unknown type', () => {
    const source = 'Kr :revenue "Sales"';
    const error = new LiquidCodeError('Unknown type "Kr"', 1, 1, source);

    const diagnostic = formatDiagnostic(error, source);

    expect(diagnostic.message).toBe('Unknown type "Kr"');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.context).toContain('1 | Kr :revenue "Sales"');
    expect(diagnostic.suggestion).toContain('Kp');
  });

  it('should provide complete diagnostic for unbalanced brackets', () => {
    const source = '[Kp :revenue\nBr :sales';
    const error = new LiquidCodeError('Unbalanced brackets', 2, 9, source);

    const diagnostic = formatDiagnostic(error, source);

    expect(diagnostic.message).toBe('Unbalanced brackets');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.context).toContain('2 | Br :sales');
    expect(diagnostic.suggestion).toContain('line 1');
  });

  it('should handle multiple errors in sequence', () => {
    const source1 = 'Kp "Sales';
    const source2 = 'Kr :revenue';
    const source3 = '[Kp :revenue';

    const error1 = new LiquidCodeError('Unterminated string', 1, 4, source1);
    const error2 = new LiquidCodeError('Unknown type "Kr"', 1, 1, source2);
    const error3 = new LiquidCodeError('Unbalanced brackets', 1, 1, source3);

    const diag1 = formatDiagnostic(error1, source1);
    const diag2 = formatDiagnostic(error2, source2);
    const diag3 = formatDiagnostic(error3, source3);

    expect(diag1.suggestion).toContain('closing double quote');
    expect(diag2.suggestion).toContain('Kp');
    expect(diag3.suggestion).toContain('closing bracket');
  });
});
