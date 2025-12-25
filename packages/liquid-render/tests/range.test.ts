import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI, compileUI } from '../src/compiler/compiler';

describe('Range Component', () => {
  describe('Basic Range Parsing', () => {
    it('should parse range with min/max', () => {
      const input = 'Rg :volume "Volume" 0 100';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      console.log('Parsed block:', JSON.stringify(block, null, 2));
      expect(block).toBeDefined();
      expect(block.type).toBe('range');
      expect(block.label).toBe('Volume');
      expect(block.binding?.value).toBe('volume');
      expect(block.min).toBe(0);
      expect(block.max).toBe(100);
    });

    it('should parse range with step', () => {
      const input = 'Rg :price "Price" 0 1000 50';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.step).toBe(50);
    });

    it('should parse range with nested binding', () => {
      const input = 'Rg :settings.audio.volume "Volume" 0 100';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.binding?.value).toBe('settings.audio.volume');
    });
  });

  describe('Range with Signals', () => {
    it('should parse range with emit signal', () => {
      const input = `sig volumeChanged
Rg :volume "Volume" >volumeChanged 0 100`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.signals?.emit?.name).toBe('volumeChanged');
    });
  });

  describe('Range Emit Test', () => {
    it('should emit range with min/max/step correctly', () => {
      // Manually create a schema with range and min/max/step
      const schema = {
        version: '1.0' as const,
        signals: [],
        layers: [{
          id: 0,
          visible: true,
          root: {
            uid: 'r1',
            type: 'range',
            binding: { kind: 'field', value: 'volume' },
            label: 'Audio Level', // Differs from auto-label "Volume"
            min: 0,
            max: 100,
            step: 5
          }
        }]
      };

      const dsl = compileUI(schema);
      console.log('Emitted DSL:', dsl);

      // Check that DSL contains all expected parts
      expect(dsl).toContain('Rg');
      expect(dsl).toContain(':volume');
      expect(dsl).toContain('"Audio Level"');
      expect(dsl).toContain('0');
      expect(dsl).toContain('100');
      expect(dsl).toContain('5');

      // Verify format: Rg :volume "Audio Level" 0 100 5
      expect(dsl).toMatch(/Rg\s+:volume\s+"Audio Level"\s+0\s+100\s+5/);
    });
  });
});
