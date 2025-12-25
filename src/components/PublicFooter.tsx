'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePersistedLanguage } from '@/lib/usePersistedLanguage';

export function PublicFooter() {
  const { withLanguage } = usePersistedLanguage();

  return (
    <footer className="card public-footer" role="contentinfo">
      <div className="public-footer__grid">
        <div className="public-footer__brand">
          <div className="public-footer__brand-row">
            <Image
              src="/logo-small.png"
              alt=""
              width={32}
              height={32}
              className="public-footer__logo"
            />
            <p className="public-footer__title">iRefair</p>
          </div>
          <p className="public-footer__text">
            A community-first referral initiative helping newcomers connect with hiring teams in Canada.
          </p>
        </div>
        <div className="public-footer__links">
          <span className="public-footer__label">Resources</span>
          <div className="public-footer__link-row">
            <Link href={withLanguage('/privacy')}>Privacy</Link>
            <Link href={withLanguage('/terms')}>Terms</Link>
            <Link href={withLanguage('/contact')}>Contact</Link>
          </div>
        </div>
        <div className="public-footer__contact">
          <span className="public-footer__label">Contact</span>
          <a href="mailto:info@andbeyondca.com">info@andbeyondca.com</a>
        </div>
      </div>
      <p className="public-footer__meta">For questions or data requests, reach out anytime.</p>
    </footer>
  );
}
