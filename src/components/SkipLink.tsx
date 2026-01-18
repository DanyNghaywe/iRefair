'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { sharedUi } from '@/lib/translations';

export function SkipLink() {
  const { language } = useLanguage();
  const label = sharedUi.skipLink[language];

  return (
    <a href="#main-content" className="skip-link">
      {label}
    </a>
  );
}
