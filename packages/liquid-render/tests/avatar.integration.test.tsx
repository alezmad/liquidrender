import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { parseUI } from '../src/compiler/compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';

describe('Avatar - Integration', () => {
  it('should render avatar through LiquidUI', () => {
    const code = 'Av :user.avatar';
    const schema = parseUI(code);

    const data = {
      user: {
        avatar: 'https://example.com/avatar.jpg',
      },
    };

    const { container } = render(<LiquidUI schema={schema} data={data} />);
    const avatar = container.querySelector('[data-liquid-type="avatar"]');
    const img = avatar?.querySelector('img');

    expect(avatar).toBeTruthy();
    expect(img).toBeTruthy();
    expect(img?.src).toBe('https://example.com/avatar.jpg');
  });

  it('should render avatar with initials through LiquidUI', () => {
    const code = 'Av "John Doe"';
    const schema = parseUI(code);

    const { container } = render(<LiquidUI schema={schema} data={{}} />);
    const avatar = container.querySelector('[data-liquid-type="avatar"]');

    expect(avatar).toBeTruthy();
    expect(avatar?.textContent).toBe('JD');
  });

  it('should render multiple avatars in container', () => {
    const code = `{
  Av :user1.avatar
  Av :user2.avatar
  Av "AB"
}`;
    const schema = parseUI(code);

    const data = {
      user1: { avatar: 'https://example.com/1.jpg' },
      user2: { avatar: 'https://example.com/2.jpg' },
    };

    const { container } = render(<LiquidUI schema={schema} data={data} />);
    const avatars = container.querySelectorAll('[data-liquid-type="avatar"]');

    expect(avatars.length).toBe(3);
  });

  it('should render avatar with size modifier', () => {
    const code = 'Av :user.avatar %lg';
    const schema = parseUI(code);

    const data = {
      user: { avatar: 'https://example.com/avatar.jpg' },
    };

    const { container } = render(<LiquidUI schema={schema} data={data} />);
    const avatar = container.querySelector('[data-liquid-type="avatar"]');

    expect(avatar).toBeTruthy();
    expect(avatar?.getAttribute('data-size')).toBe('lg');
  });
});
