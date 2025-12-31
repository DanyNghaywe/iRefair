"use client";

import React from "react";

import { Select } from "./Select";

export type FilterConfig =
  | {
      type: "select";
      key: string;
      label: string;
      value: string;
      options: { value: string; label: string }[];
      onChange: (value: string) => void;
    }
  | {
      type: "text";
      key: string;
      placeholder: string;
      value: string;
      onChange: (value: string) => void;
    };

type Props = {
  filters: FilterConfig[];
  actions?: React.ReactNode;
};

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      />
    </svg>
  );
}

export function FilterBar({ filters, actions }: Props) {
  return (
    <div className="founder-filter-bar">
      <div className="founder-filter-bar__filters">
        {filters.map((filter) => {
          if (filter.type === "select") {
            return (
              <Select
                key={filter.key}
                value={filter.value}
                options={filter.options}
                placeholder={filter.label}
                onChange={filter.onChange}
              />
            );
          }

          const isActive = filter.value.trim() !== "";
          return (
            <div
              key={filter.key}
              className={`founder-filter-bar__input-wrapper${isActive ? " is-active" : ""}`}
            >
              <input
                type="text"
                placeholder={filter.placeholder}
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
              />
              {isActive && (
                <button
                  type="button"
                  className="founder-filter-bar__clear"
                  onClick={() => filter.onChange("")}
                  aria-label={`Clear ${filter.placeholder} filter`}
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {actions && <div className="founder-filter-bar__actions">{actions}</div>}
    </div>
  );
}
