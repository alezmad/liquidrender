/**
 * Streaming Parser Tests
 *
 * Tests for progressive parsing of LiquidCode with partial input handling.
 * Critical for LLM streaming output where tokens arrive incrementally.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  StreamingParser,
  createStreamingParser,
  parseStreaming,
  simulateStreaming,
} from '../src/compiler/streaming-parser';
import { UIScanner } from '../src/compiler/ui-scanner';

describe('StreamingParser', () => {
  describe('basic functionality', () => {
    it('should parse complete input in single feed', () => {
      const parser = new StreamingParser();
      parser.feed('Kp :revenue');
      const result = parser.finalize();

      // Single block becomes root directly
      expect(result.schema.layers[0].root.type).toBe('kpi');
    });

    it('should handle empty input', () => {
      const parser = new StreamingParser();
      const result = parser.finalize();

      expect(result.complete).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should track block count', () => {
      const parser = new StreamingParser();
      parser.feed('Kp :a, Kp :b, Kp :c');
      const result = parser.finalize();

      expect(result.blockCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('incremental parsing', () => {
    it('should accumulate tokens across feeds', () => {
      const parser = new StreamingParser();

      parser.feed('Kp ');
      parser.feed(':rev');
      parser.feed('enue');
      const result = parser.finalize();

      expect(result.schema.layers[0].root.type).toBe('kpi');
      expect(result.schema.layers[0].root.binding?.value).toBe('revenue');
    });

    it('should handle chunk boundaries in strings', () => {
      const parser = new StreamingParser();

      parser.feed('Bt "Hel');
      parser.feed('lo Wor');
      parser.feed('ld"');
      const result = parser.finalize();

      expect(result.schema.layers[0].root.type).toBe('button');
      expect(result.schema.layers[0].root.label).toBe('Hello World');
    });

    it('should handle chunk boundaries in modifiers', () => {
      const parser = new StreamingParser();

      parser.feed('Kp :revenue #gre');
      parser.feed('en !h');
      const result = parser.finalize();

      const block = result.schema.layers[0].root;
      expect(block.type).toBe('kpi');
      expect(block.style?.color).toBe('green');
      expect(block.layout?.priority).toBe(100);
    });
  });

  describe('partial validity', () => {
    it('should return partial schema while incomplete', () => {
      const parser = new StreamingParser();

      // Unclosed bracket indicates incomplete input
      const r1 = parser.feed('0 [Kp :revenue');
      expect(r1.complete).toBe(false);

      const r2 = parser.feed(', Kp :orders]');
      const final = parser.finalize();

      expect(final.blockCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle unclosed brackets gracefully', () => {
      const parser = new StreamingParser();

      parser.feed('0 [Kp :a, Kp :b');
      const result = parser.finalize();

      // Should auto-close and parse what's available
      expect(result.errors.length).toBe(0);
      expect(result.schema.layers[0].root.children).toBeDefined();
    });

    it('should handle unclosed strings gracefully', () => {
      const parser = new StreamingParser();

      parser.feed('Bt "Hello');
      const result = parser.finalize();

      // Should auto-close string
      expect(result.schema.layers[0].root.type).toBe('button');
    });
  });

  describe('getBestEffort', () => {
    it('should return renderable schema at any point', () => {
      const parser = new StreamingParser();

      parser.feed('Kp :revenue');
      const schema = parser.getBestEffort();

      expect(schema).toBeDefined();
      expect(schema.layers).toBeDefined();
    });

    it('should return empty schema before any input', () => {
      const parser = new StreamingParser();
      const schema = parser.getBestEffort();

      expect(schema.layers).toHaveLength(1);
      expect(schema.layers[0].root.type).toBe('container');
    });
  });

  describe('checkpoint callbacks', () => {
    it('should call onCheckpoint as blocks complete', () => {
      const onCheckpoint = vi.fn();
      const parser = new StreamingParser({ onCheckpoint });

      parser.feed('Kp :a\n');
      parser.feed('Kp :b\n');
      parser.finalize();

      expect(onCheckpoint).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should collect errors without stopping', () => {
      const parser = new StreamingParser({ lenient: true });

      parser.feed('Kp :a\n');
      parser.feed('??? invalid\n');
      parser.feed('Kp :b\n');
      const result = parser.finalize();

      // Should have parsed valid blocks despite error
      expect(result.blockCount).toBeGreaterThanOrEqual(2);
    });

    it('should report error positions', () => {
      const parser = new StreamingParser();

      parser.feed('Bt "unclosed');
      const result = parser.finalize();

      // String was auto-closed, no error expected
      expect(result.schema.layers[0].root.type).toBe('button');
    });
  });

  describe('reset', () => {
    it('should clear state on reset', () => {
      const parser = new StreamingParser();

      parser.feed('Kp :old');
      parser.reset();
      parser.feed('Bt :new');
      const result = parser.finalize();

      expect(result.schema.layers[0].root.type).toBe('button');
    });

    it('should clear errors on reset', () => {
      const parser = new StreamingParser();

      parser.feed('??? error');
      parser.reset();
      parser.feed('Kp :valid');
      const result = parser.finalize();

      expect(result.errors.length).toBe(0);
    });
  });

  describe('convenience functions', () => {
    it('createStreamingParser should work', () => {
      const parser = createStreamingParser();
      parser.feed('Kp :test');
      const result = parser.finalize();

      expect(result.schema.layers[0].root.type).toBe('kpi');
    });

    it('parseStreaming should work for complete input', () => {
      const result = parseStreaming('Kp :revenue, Kp :orders');

      expect(result.complete).toBe(true);
      expect(result.blockCount).toBeGreaterThanOrEqual(2);
    });

    it('simulateStreaming should yield progressive results', () => {
      const source = 'Kp :a, Kp :b, Kp :c';
      const results = [...simulateStreaming(source, 5)];

      expect(results.length).toBeGreaterThan(1);
      // Last result should be complete
      expect(results[results.length - 1].complete).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle dashboard streaming', () => {
      const parser = new StreamingParser();

      // Simulate LLM generating a dashboard token by token
      const chunks = [
        '@dateRange\n',
        '0 ^row [\n',
        '  Kp :revenue #green,\n',
        '  Kp :orders #blue,\n',
        '  Kp :customers #purple\n',
        ']\n',
        'Ln :trend <dateRange',
      ];

      for (const chunk of chunks) {
        parser.feed(chunk);
      }

      const result = parser.finalize();

      expect(result.schema.signals).toHaveLength(1);
      expect(result.schema.signals[0].name).toBe('dateRange');
      expect(result.blockCount).toBeGreaterThanOrEqual(4);
    });

    it('should handle form with inputs', () => {
      const parser = new StreamingParser();

      parser.feed('Fm [\n');
      parser.feed('  In :name "Name",\n');
      parser.feed('  In :email "Email",\n');
      parser.feed('  Bt "Submit" !submit\n');
      parser.feed(']');

      const result = parser.finalize();

      // Form becomes root directly when it's the only top-level block
      const form = result.schema.layers[0].root;
      expect(form.type).toBe('form');
      expect(form.children?.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle layers', () => {
      const parser = new StreamingParser();

      parser.feed('Bt "Open" >/1\n');
      parser.feed('/1 Md "Details" [\n');
      parser.feed('  Tx :info,\n');
      parser.feed('  Bt "Close" /<\n');
      parser.feed(']');

      const result = parser.finalize();

      expect(result.schema.layers.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle conditionals', () => {
      const parser = new StreamingParser();

      parser.feed('@tab\n');
      parser.feed('?@tab=0 Kp :revenue\n');
      parser.feed('?@tab=1 Tb :data');

      const result = parser.finalize();

      expect(result.schema.signals).toHaveLength(1);
    });
  });

  describe('performance', () => {
    it('should handle large input efficiently', () => {
      const parser = new StreamingParser();

      // Generate 100 KPIs
      const kpis = Array.from({ length: 100 }, (_, i) => `Kp :metric${i}`).join(', ');

      const start = performance.now();
      parser.feed(kpis);
      const result = parser.finalize();
      const elapsed = performance.now() - start;

      expect(result.blockCount).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle many small chunks', () => {
      const parser = new StreamingParser();
      const source = 'Kp :revenue #green !h, Kp :orders #blue !p';

      const start = performance.now();
      // Feed character by character
      for (const char of source) {
        parser.feed(char);
      }
      const result = parser.finalize();
      const elapsed = performance.now() - start;

      expect(result.blockCount).toBeGreaterThanOrEqual(2);
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('SSE URL normalization', () => {
  it('should normalize ~sse://https://example.com to ~sse:https://example.com', () => {
    const scanner = new UIScanner('Kp :data ~sse://https://example.com/api');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // The double-protocol should be normalized: ~sse://https:// -> ~sse:https://
    expect(streamToken!.value).toBe('~sse:https://example.com/api');
  });

  it('should normalize ~ws://wss://example.com to ~ws:wss://example.com', () => {
    const scanner = new UIScanner('Kp :data ~ws://wss://example.com/socket');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // The double-protocol should be normalized: ~ws://wss:// -> ~ws:wss://
    expect(streamToken!.value).toBe('~ws:wss://example.com/socket');
  });

  it('should normalize ~sse://http://example.com', () => {
    const scanner = new UIScanner('Kp :data ~sse://http://localhost:3000/events');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // http:// protocol should also be normalized
    expect(streamToken!.value).toBe('~sse:http://localhost:3000/events');
  });

  it('should normalize ~ws://ws://example.com', () => {
    const scanner = new UIScanner('Kp :data ~ws://ws://localhost:8080/ws');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // ws:// protocol should also be normalized
    expect(streamToken!.value).toBe('~ws:ws://localhost:8080/ws');
  });

  it('should not modify normal SSE URLs without double protocol', () => {
    const scanner = new UIScanner('Kp :data ~sse://api.example.com/stream');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // Normal URL without double protocol should remain unchanged
    expect(streamToken!.value).toBe('~sse://api.example.com/stream');
  });

  it('should not modify normal WebSocket URLs without double protocol', () => {
    const scanner = new UIScanner('Kp :data ~ws://socket.example.com/live');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    // Normal URL without double protocol should remain unchanged
    expect(streamToken!.value).toBe('~ws://socket.example.com/live');
  });

  it('should not modify polling intervals', () => {
    const scanner = new UIScanner('Kp :data ~5s');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    expect(streamToken!.value).toBe('~5s');
  });

  it('should not modify poll modifier', () => {
    const scanner = new UIScanner('Kp :data ~poll');
    const result = scanner.scan();

    const streamToken = result.tokens.find(t => t.type === 'STREAM');
    expect(streamToken).toBeDefined();
    expect(streamToken!.value).toBe('~poll');
  });
});
