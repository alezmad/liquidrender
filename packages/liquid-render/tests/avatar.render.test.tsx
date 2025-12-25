import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Avatar, StaticAvatar } from '../src/renderer/components/avatar';
import type { Block } from '../src/compiler/ui-emitter';

describe('Avatar Component - Render', () => {
  describe('Dynamic Avatar', () => {
    it('should render with image URL binding', () => {
      const block: Block = {
        type: 'avatar',
        binding: {
          kind: 'field',
          value: 'user.avatar',
        },
      };

      const data = {
        user: {
          avatar: 'https://example.com/avatar.jpg',
        },
      };

      const { container } = render(<Avatar block={block} data={data} />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');
      const img = avatar?.querySelector('img');

      expect(avatar).toBeTruthy();
      expect(img).toBeTruthy();
      expect(img?.src).toBe('https://example.com/avatar.jpg');
    });

    it('should render with initials from label', () => {
      const block: Block = {
        type: 'avatar',
        label: 'John Doe',
      };

      const { container } = render(<Avatar block={block} data={{}} />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.textContent).toBe('JD');
    });

    it('should render with user object binding', () => {
      const block: Block = {
        type: 'avatar',
        binding: {
          kind: 'field',
          value: 'user',
        },
      };

      const data = {
        user: {
          name: 'Alice Smith',
        },
      };

      const { container } = render(<Avatar block={block} data={data} />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.textContent).toBe('AS');
    });

    it('should render with different sizes', () => {
      const block: Block = {
        type: 'avatar',
        label: 'Test',
        style: {
          size: 'lg',
        },
      };

      const { container } = render(<Avatar block={block} data={{}} />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.getAttribute('data-size')).toBe('lg');
    });
  });

  describe('Static Avatar', () => {
    it('should render with image src', () => {
      const { container } = render(
        <StaticAvatar src="https://example.com/avatar.jpg" alt="User Avatar" />
      );

      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.src).toBe('https://example.com/avatar.jpg');
      expect(img?.alt).toBe('User Avatar');
    });

    it('should render with explicit initials', () => {
      const { container } = render(<StaticAvatar initials="JD" />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.textContent).toBe('JD');
    });

    it('should render with name-derived initials', () => {
      const { container } = render(<StaticAvatar name="Alice Smith" />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.textContent).toBe('AS');
    });

    it('should render with custom size', () => {
      const { container } = render(<StaticAvatar initials="XY" size="sm" />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.getAttribute('data-size')).toBe('sm');
    });

    it('should render fallback for missing data', () => {
      const { container } = render(<StaticAvatar />);
      const avatar = container.querySelector('[data-liquid-type="avatar"]');

      expect(avatar).toBeTruthy();
      expect(avatar?.textContent).toBe('?');
    });
  });
});
