import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Breadcrumb, StaticBreadcrumb } from '../src/renderer/components/breadcrumb';
import type { Block } from '../src/compiler/ui-emitter';

describe('Breadcrumb Component', () => {
  describe('Basic Rendering', () => {
    it('renders breadcrumb with children blocks', () => {
      const block: Block = {
        uid: 'bc-1',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home', signals: { emit: { name: 'nav', value: 'home' } } },
          { uid: 'c2', type: 'crumb', label: 'Products', signals: { emit: { name: 'nav', value: 'products' } } },
          { uid: 'c3', type: 'crumb', label: 'Details' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      // Check structure
      const nav = container.querySelector('nav[data-liquid-type="breadcrumb"]');
      expect(nav).toBeTruthy();

      const list = nav?.querySelector('ol');
      expect(list).toBeTruthy();

      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(3);

      // First two should have links
      const firstLink = items?.[0]?.querySelector('a');
      expect(firstLink).toBeTruthy();
      expect(firstLink?.textContent).toBe('Home');

      const secondLink = items?.[1]?.querySelector('a');
      expect(secondLink).toBeTruthy();
      expect(secondLink?.textContent).toBe('Products');

      // Last should be current (no link)
      const current = items?.[2]?.querySelector('[aria-current="page"]');
      expect(current).toBeTruthy();
      expect(current?.textContent).toBe('Details');
    });

    it('renders breadcrumb from data binding', () => {
      const block: Block = {
        uid: 'bc-2',
        type: 'breadcrumb',
        binding: { kind: 'field', value: 'path' },
      };

      const data = {
        path: ['Home', 'Products', 'Details'],
      };

      const { container } = render(Breadcrumb({ block, data }));

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toContain('Home');
      expect(items[1].textContent).toContain('Products');
      expect(items[2].textContent).toBe('Details');
    });

    it('renders empty state when no items', () => {
      const block: Block = {
        uid: 'bc-3',
        type: 'breadcrumb',
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const current = container.querySelector('[aria-current="page"]');
      expect(current?.textContent).toBe('—');
    });
  });

  describe('Separator', () => {
    it('renders default "/" separator', () => {
      const block: Block = {
        uid: 'bc-4',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'crumb', label: 'Products' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator?.textContent).toBe('/');
    });

    it('renders custom separator from label', () => {
      const block: Block = {
        uid: 'bc-5',
        type: 'breadcrumb',
        label: '>',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'crumb', label: 'Products' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator?.textContent).toBe('>');
    });

    it('does not render separator after last item', () => {
      const block: Block = {
        uid: 'bc-6',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const items = container.querySelectorAll('li');
      const lastItem = items[items.length - 1];
      expect(lastItem.querySelector('[aria-hidden="true"]')).toBeFalsy();
    });
  });

  describe('Signals', () => {
    it('adds data-signal attribute to links', () => {
      const block: Block = {
        uid: 'bc-7',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home', signals: { emit: { name: 'nav', value: 'home' } } },
          { uid: 'c2', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const link = container.querySelector('a[data-signal="nav=home"]');
      expect(link).toBeTruthy();
    });

    it('does not add data-signal to current item', () => {
      const block: Block = {
        uid: 'bc-8',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home', signals: { emit: { name: 'nav', value: 'home' } } },
          { uid: 'c2', type: 'crumb', label: 'Current', signals: { emit: { name: 'nav', value: 'current' } } },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const items = container.querySelectorAll('li');
      const lastItem = items[items.length - 1];
      expect(lastItem.querySelector('[data-signal]')).toBeFalsy();
    });
  });

  describe('Clickability', () => {
    it('all items except last are clickable', () => {
      const block: Block = {
        uid: 'bc-9',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home', signals: { emit: { name: 'nav', value: 'home' } } },
          { uid: 'c2', type: 'crumb', label: 'Products', signals: { emit: { name: 'nav', value: 'products' } } },
          { uid: 'c3', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const links = container.querySelectorAll('a');
      expect(links.length).toBe(2);

      // Last item should have no link
      const items = container.querySelectorAll('li');
      const lastItem = items[items.length - 1];
      expect(lastItem.querySelector('a')).toBeFalsy();
    });

    it('prevents default on link click', () => {
      const block: Block = {
        uid: 'bc-10',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home', signals: { emit: { name: 'nav', value: 'home' } } },
          { uid: 'c2', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('#');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on nav', () => {
      const block: Block = {
        uid: 'bc-11',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const nav = container.querySelector('nav');
      expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
    });

    it('marks last item with aria-current="page"', () => {
      const block: Block = {
        uid: 'bc-12',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const current = container.querySelector('[aria-current="page"]');
      expect(current?.textContent).toBe('Current');
    });

    it('hides separator from screen readers', () => {
      const block: Block = {
        uid: 'bc-13',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'crumb', label: 'Products' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toBeTruthy();
    });
  });

  describe('Data Binding', () => {
    it('resolves crumb labels from bindings', () => {
      const block: Block = {
        uid: 'bc-14',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', binding: { kind: 'field', value: 'home' } },
          { uid: 'c2', type: 'crumb', binding: { kind: 'field', value: 'section' } },
          { uid: 'c3', type: 'crumb', label: 'Current' },
        ],
      };

      const data = {
        home: 'Dashboard',
        section: 'Analytics',
      };

      const { container } = render(Breadcrumb({ block, data }));

      expect(container.textContent).toContain('Dashboard');
      expect(container.textContent).toContain('Analytics');
      expect(container.textContent).toContain('Current');
    });

    it('handles numeric values in bindings', () => {
      const block: Block = {
        uid: 'bc-15',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', binding: { kind: 'field', value: 'id' } },
          { uid: 'c2', type: 'crumb', label: 'Current' },
        ],
      };

      const data = {
        id: 12345,
      };

      const { container } = render(Breadcrumb({ block, data }));

      // formatDisplayValue formats numbers >= 1000 with K suffix
      expect(container.textContent).toContain('12.3K');
    });
  });

  describe('Edge Cases', () => {
    it('handles single crumb', () => {
      const block: Block = {
        uid: 'bc-16',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(1);

      // Single item should be current (not clickable)
      const current = container.querySelector('[aria-current="page"]');
      expect(current?.textContent).toBe('Home');
      expect(container.querySelector('a')).toBeFalsy();
    });

    it('handles empty array from binding', () => {
      const block: Block = {
        uid: 'bc-17',
        type: 'breadcrumb',
        binding: { kind: 'field', value: 'path' },
      };

      const data = {
        path: [],
      };

      const { container } = render(Breadcrumb({ block, data }));

      const current = container.querySelector('[aria-current="page"]');
      expect(current?.textContent).toBe('—');
    });

    it('handles non-array binding', () => {
      const block: Block = {
        uid: 'bc-18',
        type: 'breadcrumb',
        binding: { kind: 'field', value: 'notAnArray' },
      };

      const data = {
        notAnArray: 'invalid',
      };

      const { container } = render(Breadcrumb({ block, data }));

      // Should show empty state
      const current = container.querySelector('[aria-current="page"]');
      expect(current?.textContent).toBe('—');
    });

    it('filters out non-crumb children', () => {
      const block: Block = {
        uid: 'bc-19',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
          { uid: 'c2', type: 'button', label: 'Invalid' }, // Should be filtered
          { uid: 'c3', type: 'crumb', label: 'Current' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(2); // Only crumb items
    });
  });

  describe('StaticBreadcrumb', () => {
    it('renders static breadcrumb', () => {
      const items = [
        { label: 'Home', onClick: () => {} },
        { label: 'Products', onClick: () => {} },
        { label: 'Details' },
      ];

      const { container } = render(StaticBreadcrumb({ items }));

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toContain('Home');
      expect(listItems[2].textContent).toBe('Details');
    });

    it('renders custom separator', () => {
      const items = [
        { label: 'Home' },
        { label: 'Current' },
      ];

      const { container } = render(StaticBreadcrumb({ items, separator: '>' }));

      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator?.textContent).toBe('>');
    });
  });

  describe('Component Attributes', () => {
    it('has data-liquid-type attribute', () => {
      const block: Block = {
        uid: 'bc-20',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      expect(container.querySelector('[data-liquid-type="breadcrumb"]')).toBeTruthy();
    });

    it('uses semantic HTML (nav + ol)', () => {
      const block: Block = {
        uid: 'bc-21',
        type: 'breadcrumb',
        children: [
          { uid: 'c1', type: 'crumb', label: 'Home' },
        ],
      };

      const { container } = render(Breadcrumb({ block, data: {} }));

      expect(container.querySelector('nav')).toBeTruthy();
      expect(container.querySelector('ol')).toBeTruthy();
      expect(container.querySelector('li')).toBeTruthy();
    });
  });
});
