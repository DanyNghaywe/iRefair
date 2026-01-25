// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ActionBtn } from '../ActionBtn';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../ActionBtn.module.css', () => ({
  default: {
    btn: 'btn',
    primary: 'primary',
    ghost: 'ghost',
    sm: 'sm',
    disabled: 'disabled',
  },
}));

describe('ActionBtn', () => {
  it('renders a link when as="link"', () => {
    render(
      <ActionBtn as="link" href="/apply">
        Apply now
      </ActionBtn>,
    );

    const link = screen.getByRole('link', { name: 'Apply now' });
    expect(link).toHaveAttribute('href', '/apply');
  });

  it('renders a disabled span when as="link" and disabled', () => {
    render(
      <ActionBtn as="link" href="/apply" disabled>
        Apply now
      </ActionBtn>,
    );

    const text = screen.getByText('Apply now');
    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders a button by default', () => {
    render(<ActionBtn>Submit</ActionBtn>);

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('marks disabled buttons as busy', () => {
    render(
      <ActionBtn disabled variant="ghost" size="sm">
        Saving
      </ActionBtn>,
    );

    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
