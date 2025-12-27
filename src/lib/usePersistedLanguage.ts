'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type PersistedLanguage = 'en' | 'fr';

const STORAGE_KEY = 'irefair.language';

const isLanguage = (value: string | null | undefined): value is PersistedLanguage => value === 'en' || value === 'fr';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

  const [language, setLanguageState] = useState<PersistedLanguage>(defaultLanguage);

  // Sync language before paint to avoid toggle flicker on navigation.
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const queryLang = new URLSearchParams(window.location.search).get('lang');
    const next = isLanguage(queryLang) ? queryLang : isLanguage(stored) ? stored : defaultLanguage;
    setLanguageState((prev) => (prev === next ? prev : next));
  }, [defaultLanguage, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: PersistedLanguage) => {
      setLanguageState(next);
      if (typeof window === 'undefined' || !pathname) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('lang') === next) return;
      params.set('lang', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const withLanguage = useCallback((href: string) => withLanguageParam(href, language), [language]);

  return { language, setLanguage, withLanguage };
}
