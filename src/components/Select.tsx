'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ChangeEvent } from 'react';

type Option = { value: string; label: string };

type SelectProps = {
  id: string;
  name: string;
  options: Array<string | Option>;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  values?: string[];
  multi?: boolean;
  required?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  onChange?: (value: string | string[]) => void;
};

export function Select({
  id,
  name,
  options,
  placeholder = 'Select',
  defaultValue = '',
  value,
  values,
  multi = false,
  required,
  ariaDescribedBy,
  ariaInvalid,
  onChange,
}: SelectProps) {
  const normalizedOptions = useMemo<Option[]>(
    () => options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt)),
    [options],
  );

  const [selectedValue, setSelectedValue] = useState<string>(value ?? defaultValue);
  const [selectedValues, setSelectedValues] = useState<string[]>(values ?? []);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isControlledSingle = value !== undefined;
  const isControlledMulti = values !== undefined;
  const resolvedSelectedValue = isControlledSingle ? value : selectedValue;
  const resolvedSelectedValues = isControlledMulti ? values ?? [] : selectedValues;
  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === resolvedSelectedValue);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (index: number) => {
    const option = normalizedOptions[index];
    if (!option) return;
    if (multi) {
      const exists = resolvedSelectedValues.includes(option.value);
      const next = exists ? resolvedSelectedValues.filter((v) => v !== option.value) : [...resolvedSelectedValues, option.value];
      if (!isControlledMulti) setSelectedValues(next);
      onChange?.(next);
    } else {
      if (!isControlledSingle) setSelectedValue(option.value);
      onChange?.(option.value);
      setIsOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (multi) {
      const next = Array.from(event.target.selectedOptions).map((opt) => opt.value);
      if (!isControlledMulti) setSelectedValues(next);
      onChange?.(next);
    } else {
      const next = event.target.value;
      if (!isControlledSingle) setSelectedValue(next);
      onChange?.(next);
      setIsOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => {
      if (!normalizedOptions.length) return current;
      const next = current + direction;
      if (next < 0) return normalizedOptions.length - 1;
      if (next >= normalizedOptions.length) return 0;
      return next;
    });
  };

  const openDropdown = () => {
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement | HTMLUListElement>) => {
    if (!isOpen && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      openDropdown();
      return;
    }

    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSelect(highlightedIndex);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  const selectedLabel = selectedIndex >= 0 ? normalizedOptions[selectedIndex]?.label : '';
  const listboxId = `${id}-listbox`;
  const activeOptionId = `${id}-option-${highlightedIndex}`;
  const selectedLabelMulti =
    resolvedSelectedValues.length > 0
      ? normalizedOptions.filter((opt) => resolvedSelectedValues.includes(opt.value)).map((opt) => opt.label)
      : [];

  return (
    <div className={`select-field ${isOpen ? 'is-open' : ''}`} ref={wrapperRef}>
      <select
        id={id}
        name={name}
        multiple={multi}
        value={multi ? resolvedSelectedValues : resolvedSelectedValue}
        onChange={handleNativeChange}
        required={required}
        aria-hidden="true"
        tabIndex={-1}
        className="select-native"
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
      >
        {!multi && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        ref={triggerRef}
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        onClick={() => {
          setIsOpen((open) => {
            const next = !open;
            if (next) {
              setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
            }
            return next;
          });
        }}
        onKeyDown={handleKeyDown}
      >
        {multi ? (
          <span className={`select-value ${resolvedSelectedValues.length ? '' : 'is-placeholder'}`}>
            {resolvedSelectedValues.length ? (
              <span className="select-chips">
                {selectedLabelMulti.map((label) => (
                  <span key={label} className="select-chip">
                    {label}
                  </span>
                ))}
              </span>
            ) : (
              placeholder
            )}
          </span>
        ) : (
          <span className={`select-value ${selectedLabel ? '' : 'is-placeholder'}`}>{selectedLabel || placeholder}</span>
        )}
        <span className="select-chevron" aria-hidden="true">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul
          className="select-dropdown"
          role="listbox"
          id={listboxId}
          aria-activedescendant={activeOptionId}
          aria-multiselectable={multi || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {normalizedOptions.map((opt, index) => {
            const isHighlighted = index === highlightedIndex;
            const isSelected = multi ? selectedValues.includes(opt.value) : opt.value === selectedValue;
            return (
              <li
                key={opt.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`select-option ${isHighlighted ? 'is-highlighted' : ''} ${isSelected ? 'is-selected' : ''}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(index);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
