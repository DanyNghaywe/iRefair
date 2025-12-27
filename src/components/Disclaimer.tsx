'use client';

import Link from 'next/link';

type DisclaimerProps = {
  copy: {
    body: string;
    linksLead: string;
    termsLabel: string;
    privacyLabel: string;
    separator: string;
    ariaLabel: string;
  };
  termsHref?: string;
  privacyHref?: string;
};

export function Disclaimer({
  copy,
  termsHref = '/terms',
  privacyHref = '/privacy',
}: DisclaimerProps) {
  const hasTerms = Boolean(termsHref);
  const hasPrivacy = Boolean(privacyHref);

  return (
    <aside className="disclaimer" role="note" aria-label={copy.ariaLabel}>
      <p className="disclaimer__text">
        {copy.body}{' '}
        {(hasTerms || hasPrivacy) && (
          <>
            {copy.linksLead}{' '}
            {hasTerms && <Link href={termsHref}>{copy.termsLabel}</Link>}
            {hasTerms && hasPrivacy && ` ${copy.separator} `}
            {hasPrivacy && <Link href={privacyHref}>{copy.privacyLabel}</Link>}
            .
          </>
        )}
      </p>
    </aside>
  );
}
