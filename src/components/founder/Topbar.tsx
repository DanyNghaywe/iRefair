"use client";

import React from "react";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

const translations = {
  en: {
    back: "Back",
    search: "Search",
  },
  fr: {
    back: "Retour",
    search: "Rechercher",
  },
};

type Props = {
  title: string;
  subtitle?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function Topbar({ title, subtitle, searchValue, searchPlaceholder, onSearchChange, actions, backHref, backLabel }: Props) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="founder-topbar">
      <div className="founder-topbar__titles">
        {backHref && (
          <Link href={backHref} className="founder-topbar__back">
            ← {backLabel || t.back}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="founder-topbar__controls">
        {onSearchChange ? (
          <div className="founder-topbar__search">
            <input
              type="search"
              value={searchValue}
              placeholder={searchPlaceholder || t.search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
