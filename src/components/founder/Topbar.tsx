"use client";

import React from "react";
import Link from "next/link";

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
  return (
    <div className="founder-topbar">
      <div className="founder-topbar__titles">
        {backHref && (
          <Link href={backHref} className="founder-topbar__back">
            ← {backLabel || "Back"}
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
              placeholder={searchPlaceholder || "Search"}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
