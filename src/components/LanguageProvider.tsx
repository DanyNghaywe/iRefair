'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { usePersistedLanguage, type PersistedLanguage } from '@/lib/usePersistedLanguage';

type LanguageContextValue = ReturnType<typeof usePersistedLanguage>;

const LanguageContext = createContext<LanguageContextValue | null>(null);

type LanguageProviderProps = {
  children: ReactNode;
  defaultLanguage?: PersistedLanguage;
};

export function LanguageProvider({ children, defaultLanguage = 'en' }: LanguageProviderProps) {
  const value = usePersistedLanguage(defaultLanguage);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
