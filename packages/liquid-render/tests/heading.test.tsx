// Heading Component Tests
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Heading, StaticHeading } from '../src/renderer/components/heading';
import type { Block } from '../src/compiler/ui-emitter';

describe('Heading Component', () => {
  it('should render h2 by default', () => {
    const block: Block = {
      type: 'heading',
      label: 'Dashboard',
    };

    const { container } = render(<Heading block={block} data={{}} />);
    const heading = container.querySelector('h2');

    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Dashboard');
    expect(heading?.getAttribute('data-liquid-type')).toBe('heading');
    expect(heading?.getAttribute('data-level')).toBe('2');
  });

  it('should render h1 when level is 1', () => {
    const block: Block = {
      type: 'heading',
      label: 'Main Title',
      style: { level: 1 },
    };

    const { container } = render(<Heading block={block} data={{}} />);
    const heading = container.querySelector('h1');

    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Main Title');
    expect(heading?.getAttribute('data-level')).toBe('1');
  });

  it('should render h3 through h6 correctly', () => {
    for (let level = 3; level <= 6; level++) {
      const block: Block = {
        type: 'heading',
        label: `Heading Level ${level}`,
        style: { level },
      };

      const { container } = render(<Heading block={block} data={{}} />);
      const heading = container.querySelector(`h${level}`);

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe(`Heading Level ${level}`);
      expect(heading?.getAttribute('data-level')).toBe(String(level));
    }
  });

  it('should resolve binding', () => {
    const block: Block = {
      type: 'heading',
      binding: { kind: 'field', value: 'title' },
    };

    const data = { title: 'Dynamic Title' };
    const { container } = render(<Heading block={block} data={data} />);
    const heading = container.querySelector('h2');

    expect(heading?.textContent).toBe('Dynamic Title');
  });

  it('should apply custom color', () => {
    const block: Block = {
      type: 'heading',
      label: 'Colored Heading',
      style: { color: 'primary', level: 1 },
    };

    const { container } = render(<Heading block={block} data={{}} />);
    const heading = container.querySelector('h1');

    expect(heading).toBeTruthy();
    // Style should include color property
    expect(heading?.style.color).toBeTruthy();
  });
});

describe('StaticHeading Component', () => {
  it('should render with default props', () => {
    const { container } = render(<StaticHeading>Static Heading</StaticHeading>);
    const heading = container.querySelector('h2');

    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Static Heading');
    expect(heading?.getAttribute('data-liquid-type')).toBe('heading');
  });

  it('should render custom level', () => {
    const { container } = render(<StaticHeading level={4}>H4 Heading</StaticHeading>);
    const heading = container.querySelector('h4');

    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('H4 Heading');
    expect(heading?.getAttribute('data-level')).toBe('4');
  });

  it('should apply custom styles', () => {
    const { container } = render(
      <StaticHeading level={1} color="success" style={{ textAlign: 'center' }}>
        Custom Heading
      </StaticHeading>
    );
    const heading = container.querySelector('h1');

    expect(heading).toBeTruthy();
    expect(heading?.style.textAlign).toBe('center');
  });
});
