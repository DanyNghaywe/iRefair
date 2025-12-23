'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type PersistedLanguage = 'en' | 'fr';

const STORAGE_KEY = 'irefair.language';

const isLanguage = (value: string | null | undefined): value is PersistedLanguage => value === 'en' || value === 'fr';

const withLanguageParam = (href: string, language: PersistedLanguage) => {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('lang', language);
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
};

export function usePersistedLanguage(defaultLanguage: PersistedLanguage = 'en') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryLang = searchParams?.get('lang');

  const [language, setLanguageState] = useState<PersistedLanguage>(defaultLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = isLanguage(queryLang) ? queryLang : isLanguage(stored) ? stored : defaultLanguage;
    setLanguageState((prev) => (prev === next ? prev : next));
  }, [defaultLanguage, queryLang]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: PersistedLanguage) => {
      setLanguageState(next);
      if (!pathname) return;
      if (queryLang === next) return;
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('lang', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, queryLang, router, searchParams],
  );

  const withLanguage = useCallback((href: string) => withLanguageParam(href, language), [language]);

  return { language, setLanguage, withLanguage };
}
