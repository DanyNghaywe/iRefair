// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Disclaimer } from '../Disclaimer';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const copy = {
  body: 'By applying you agree to our',
  linksLead: 'Review our',
  termsLabel: 'Terms',
  privacyLabel: 'Privacy Policy',
  separator: 'and',
  ariaLabel: 'Legal disclaimer',
};

describe('Disclaimer', () => {
  it('renders terms and privacy links', () => {
    render(<Disclaimer copy={copy} />);

    expect(screen.getByRole('note')).toHaveAttribute('aria-label', 'Legal disclaimer');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('omits links when hrefs are empty', () => {
    render(<Disclaimer copy={copy} termsHref="" privacyHref="" />);

    expect(screen.queryByRole('link')).toBeNull();
  });
});
