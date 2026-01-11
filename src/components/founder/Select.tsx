"use client";

import React, { useEffect, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
    >
      <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
  );
}

export function Select({ value, options, placeholder, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;
  const isActive = value !== "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!open);
    } else if (event.key === "ArrowDown" && open) {
      event.preventDefault();
      const firstItem = listRef.current?.querySelector<HTMLLIElement>('[role="option"]');
      firstItem?.focus();
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, optionValue: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(optionValue);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (event.target as HTMLElement).nextElementSibling as HTMLElement | null;
      next?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (event.target as HTMLElement).previousElementSibling as HTMLElement | null;
      prev?.focus();
    }
  };

  return (
    <div ref={containerRef} className={`founder-select ${isActive ? "is-active" : ""} ${className}`}>
      <button
        type="button"
        className="founder-select__trigger"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={isActive ? "founder-select__label--active" : "founder-select__label"}>
          {displayLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul ref={listRef} className="founder-select__dropdown" role="listbox">
          <li
            role="option"
            aria-selected={value === ""}
            className={`founder-select__option ${value === "" ? "is-selected" : ""}`}
            onClick={() => handleSelect("")}
            onKeyDown={(e) => handleOptionKeyDown(e, "")}
            tabIndex={0}
          >
            {placeholder}
          </li>
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={`founder-select__option ${value === option.value ? "is-selected" : ""}`}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
              tabIndex={0}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
