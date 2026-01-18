'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { sharedUi } from '@/lib/translations';

export function PublicFooter() {
  const { language, withLanguage } = useLanguage();
  const t = sharedUi.footer[language];

  return (
    <footer className="card public-footer" role="contentinfo">
      <div className="public-footer__grid">
        <div className="public-footer__brand">
          <div className="public-footer__brand-row">
            <Image
              src="/iRefair transparent white text.png"
              alt=""
              width={32}
              height={32}
              className="public-footer__logo"
            />
            <p className="public-footer__title">iRefair</p>
          </div>
          <p className="public-footer__text">{t.blurb}</p>
        </div>
        <div className="public-footer__links">
          <span className="public-footer__label">{t.resourcesLabel}</span>
          <div className="public-footer__link-row">
            <Link href={withLanguage('/privacy')}>{t.privacy}</Link>
            <Link href={withLanguage('/terms')}>{t.terms}</Link>
            <Link href={withLanguage('/contact')}>{t.contact}</Link>
          </div>
        </div>
        <div className="public-footer__contact">
          <span className="public-footer__label">{t.contactLabel}</span>
          <a href="mailto:irefair.andbeyondconsulting@gmail.com">irefair.andbeyondconsulting@gmail.com</a>
        </div>
      </div>
      <p className="public-footer__meta">{t.meta}</p>
    </footer>
  );
}
