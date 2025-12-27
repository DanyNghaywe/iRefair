"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
};

export function Topbar({ title, subtitle, searchValue, searchPlaceholder, onSearchChange, actions }: Props) {
  return (
    <div className="founder-topbar">
      <div className="founder-topbar__titles">
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
