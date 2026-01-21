'use client';

/**
 * Select Component - Custom accessible select/dropdown
 *
 * SAFARI STACKING CONTEXT FIX:
 * In Safari, backdrop-filter creates an isolated stacking context. When a Select
 * dropdown is inside a fieldset/card and the next sibling section has backdrop-filter,
 * the dropdown gets painted behind it regardless of z-index. This component uses
 * a React Portal to render the dropdown list at document.body level with position: fixed,
 * completely escaping all ancestor stacking contexts.
 *
 * @see https://bugs.webkit.org/show_bug.cgi?id=176308
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';

import styles from './Select.module.css';

type Option = { value: string; label: string };

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  direction: 'down' | 'up';
};

type SelectProps = {
  id: string;
  name: string;
  options: Array<string | Option>;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  values?: string[];
  multi?: boolean;
  preferNative?: boolean;
  required?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  onChange?: (value: string | string[]) => void;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function Select({
  id,
  name,
  options,
  placeholder = 'Select',
  defaultValue = '',
  value,
  values,
  multi = false,
  preferNative = true,
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
  const [prefersNative, setPrefersNative] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const typeaheadRef = useRef('');
  const typeaheadTimeoutRef = useRef<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const isControlledSingle = value !== undefined;
  const isControlledMulti = values !== undefined;
  const resolvedSelectedValue = isControlledSingle ? value : selectedValue;
  const resolvedSelectedValues = isControlledMulti ? values ?? [] : selectedValues;
  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === resolvedSelectedValue);
  const shouldUseNative = !multi && prefersNative && preferNative;

  const DROPDOWN_OFFSET = 8;
  const DROPDOWN_MAX_HEIGHT = 260;

  // Client-side mount detection for portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Calculate dropdown position based on trigger element
  const updateDropdownPosition = () => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom - DROPDOWN_OFFSET;
    const spaceAbove = triggerRect.top - DROPDOWN_OFFSET;

    // Decide direction: prefer below, flip up if not enough space
    const direction: 'down' | 'up' =
      spaceBelow >= Math.min(DROPDOWN_MAX_HEIGHT, spaceBelow) || spaceBelow >= spaceAbove ? 'down' : 'up';

    let top: number;
    if (direction === 'down') {
      top = triggerRect.bottom + DROPDOWN_OFFSET;
    } else {
      const listHeight = listRef.current?.offsetHeight || DROPDOWN_MAX_HEIGHT;
      top = triggerRect.top - DROPDOWN_OFFSET - Math.min(listHeight, DROPDOWN_MAX_HEIGHT);
    }

    // Clamp to viewport bounds with padding
    top = Math.max(8, top);

    setDropdownPosition({
      top,
      left: triggerRect.left,
      width: triggerRect.width,
      direction,
    });
  };

  // Position dropdown when open and reposition on scroll/resize
  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !mounted) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();

    // Listen for scroll on all ancestors and window
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, mounted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarseHoverQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    const syncNativePreference = () => {
      const isCoarse = coarseHoverQuery.matches;
      const isNarrow = window.innerWidth < 720;
      setPrefersNative(isCoarse || isNarrow);
    };

    syncNativePreference();

    const addListener = (media: MediaQueryList, handler: () => void) => {
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handler);
      } else {
        media.addListener(handler);
      }
    };

    const removeListener = (media: MediaQueryList, handler: () => void) => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handler);
      } else {
        media.removeListener(handler);
      }
    };

    addListener(coarseHoverQuery, syncNativePreference);
    window.addEventListener('resize', syncNativePreference);

    return () => {
      removeListener(coarseHoverQuery, syncNativePreference);
      window.removeEventListener('resize', syncNativePreference);
    };
  }, []);

  // Handle outside clicks - updated to work with portal
  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(target);
      const isOutsideList = listRef.current && !listRef.current.contains(target);

      if (isOutsideWrapper && isOutsideList) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('touchstart', handlePointer, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (typeaheadTimeoutRef.current) {
        window.clearTimeout(typeaheadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const optionEl = listRef.current?.querySelector<HTMLElement>(`[data-option-index="${highlightedIndex}"]`);
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

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

  const clearTypeahead = () => {
    if (typeaheadTimeoutRef.current) {
      window.clearTimeout(typeaheadTimeoutRef.current);
      typeaheadTimeoutRef.current = null;
    }
    typeaheadRef.current = '';
  };

  const queueTypeaheadClear = () => {
    if (typeaheadTimeoutRef.current) window.clearTimeout(typeaheadTimeoutRef.current);
    typeaheadTimeoutRef.current = window.setTimeout(() => {
      typeaheadRef.current = '';
      typeaheadTimeoutRef.current = null;
    }, 700);
  };

  const findMatch = (query: string) => {
    if (!query) return -1;
    const lowerQuery = query.toLowerCase();
    return normalizedOptions.findIndex((opt) => opt.label.toLowerCase().startsWith(lowerQuery));
  };

  const handleTypeahead = (key: string) => {
    if (!normalizedOptions.length) return;
    const char = key.toLowerCase();
    const nextQuery = `${typeaheadRef.current}${char}`;
    const matchIndex = findMatch(nextQuery);
    const fallbackIndex = matchIndex >= 0 ? matchIndex : findMatch(char);
    const targetIndex = matchIndex >= 0 ? matchIndex : fallbackIndex;

    typeaheadRef.current = matchIndex >= 0 ? nextQuery : char;
    if (targetIndex >= 0) setHighlightedIndex(targetIndex);
    queueTypeaheadClear();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement | HTMLUListElement>) => {
    if (!isOpen && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      openDropdown();
      return;
    }

    const isCharacterKey =
      event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (isCharacterKey) {
      if (!isOpen) {
        event.preventDefault();
        openDropdown();
      }
      handleTypeahead(event.key);
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
        clearTypeahead();
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

  if (shouldUseNative) {
    return (
      <div className={`${styles.field} ${styles.isNative}`} ref={wrapperRef}>
        <select
          id={id}
          name={name}
          value={resolvedSelectedValue}
          onChange={handleNativeChange}
          required={required}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={`${styles.native} ${styles.nativeVisible}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.field} ${isOpen ? styles.isOpen : ''}`} ref={wrapperRef}>
      <select
        id={id}
        name={name}
        multiple={multi}
        value={multi ? resolvedSelectedValues : resolvedSelectedValue}
        onChange={handleNativeChange}
        required={required}
        aria-hidden="true"
        tabIndex={-1}
        className={styles.native}
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
        id={`${id}-trigger`}
        ref={triggerRef}
        className={styles.trigger}
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
          <span className={`${styles.value} ${resolvedSelectedValues.length ? '' : styles.isPlaceholder}`}>
            {resolvedSelectedValues.length ? (
              <span className={styles.chips}>
                {selectedLabelMulti.map((label) => (
                  <span key={label} className={styles.chip}>
                    {label}
                  </span>
                ))}
              </span>
            ) : (
              placeholder
            )}
          </span>
        ) : (
          <span className={`${styles.value} ${selectedLabel ? '' : styles.isPlaceholder}`}>{selectedLabel || placeholder}</span>
        )}
        <span className={styles.chevron} aria-hidden="true">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Dropdown rendered in portal to escape Safari stacking context issues */}
      {isOpen && mounted && createPortal(
        <ul
          className={`${styles.dropdown} ${styles.dropdownPortal}`}
          role="listbox"
          id={listboxId}
          aria-activedescendant={activeOptionId}
          aria-multiselectable={multi || undefined}
          aria-labelledby={`${id}-trigger`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          ref={listRef}
          style={{
            position: 'fixed',
            top: dropdownPosition?.top ?? 0,
            left: dropdownPosition?.left ?? 0,
            width: dropdownPosition?.width ?? 'auto',
            visibility: dropdownPosition ? 'visible' : 'hidden',
          }}
          data-direction={dropdownPosition?.direction}
        >
          {normalizedOptions.map((opt, index) => {
            const isHighlighted = index === highlightedIndex;
            const isSelected = multi
              ? resolvedSelectedValues.includes(opt.value)
              : opt.value === resolvedSelectedValue;
            return (
              <li
                key={opt.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isHighlighted ? styles.optionHighlighted : ''} ${isSelected ? styles.optionSelected : ''}`}
                data-option-index={index}
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
        </ul>,
        document.body
      )}
    </div>
  );
}
