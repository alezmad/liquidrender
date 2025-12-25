// Tag Component Rendering Tests
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { Tag, StaticTag } from '../src/renderer/components/tag';
import type { Block } from '../src/compiler/ui-emitter';

describe('Tag Component Rendering', () => {
  describe('Dynamic Tag', () => {
    it('should render tag with label', () => {
      const block: Block = {
        type: 'tag',
        label: 'Active',
      };

      const { container } = render(<Tag block={block} data={{}} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag).toBeTruthy();
      expect(tag?.textContent).toBe('Active');
    });

    it('should render tag with binding', () => {
      const block: Block = {
        type: 'tag',
        binding: { kind: 'field', value: 'status' },
      };

      const data = { status: 'Approved' };
      const { container } = render(<Tag block={block} data={data} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.textContent).toBe('Approved');
    });

    it('should apply color variant', () => {
      const block: Block = {
        type: 'tag',
        label: 'Success',
        style: { color: 'green' },
      };

      const { container } = render(<Tag block={block} data={{}} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('success');
    });

    it('should auto-detect success color', () => {
      const block: Block = {
        type: 'tag',
        binding: { kind: 'field', value: 'status' },
      };

      const data = { status: 'Active' };
      const { container } = render(<Tag block={block} data={data} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('success');
    });

    it('should auto-detect warning color', () => {
      const block: Block = {
        type: 'tag',
        binding: { kind: 'field', value: 'status' },
      };

      const data = { status: 'Pending' };
      const { container } = render(<Tag block={block} data={data} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('warning');
    });

    it('should auto-detect danger color', () => {
      const block: Block = {
        type: 'tag',
        binding: { kind: 'field', value: 'status' },
      };

      const data = { status: 'Failed' };
      const { container } = render(<Tag block={block} data={data} />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('danger');
    });
  });

  describe('Static Tag', () => {
    it('should render static tag with default color', () => {
      const { container } = render(<StaticTag label="Default" />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.textContent).toBe('Default');
      expect(tag?.getAttribute('data-color')).toBe('default');
    });

    it('should render static tag with success color', () => {
      const { container } = render(<StaticTag label="Success" color="success" />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('success');
    });

    it('should render static tag with warning color', () => {
      const { container } = render(<StaticTag label="Warning" color="warning" />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('warning');
    });

    it('should render static tag with danger color', () => {
      const { container } = render(<StaticTag label="Danger" color="danger" />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('danger');
    });

    it('should render static tag with primary color', () => {
      const { container } = render(<StaticTag label="Primary" color="primary" />);
      const tag = container.querySelector('[data-liquid-type="tag"]');

      expect(tag?.getAttribute('data-color')).toBe('primary');
    });
  });
});
