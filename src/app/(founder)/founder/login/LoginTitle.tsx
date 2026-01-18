"use client";

import { useLanguage } from "@/components/LanguageProvider";

const translations = {
  en: {
    title: "Login",
  },
  fr: {
    title: "Connexion",
  },
};

export function LoginTitle() {
  const { language } = useLanguage();
  const t = translations[language];
  return <>{t.title}</>;
}
