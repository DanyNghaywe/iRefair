'use client';

import { useEffect, useLayoutEffect, useRef, useState, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import styles from './TimePicker.module.css';

type TimePickerProps = {
  id: string;
  value: string; // HH:mm format (24h)
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  interval?: 15 | 30 | 60; // minutes between slots
  minTime?: string; // HH:mm
  maxTime?: string; // HH:mm
  locale?: 'en' | 'fr';
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Generate time slots
function generateTimeSlots(interval: number, minTime: string, maxTime: string): string[] {
  const slots: string[] = [];
  const [minHour, minMinute] = minTime.split(':').map(Number);
  const [maxHour, maxMinute] = maxTime.split(':').map(Number);
  const minTotal = minHour * 60 + minMinute;
  const maxTotal = maxHour * 60 + maxMinute;

  for (let total = minTotal; total <= maxTotal; total += interval) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }

  return slots;
}

// Format time for display
function formatTimeDisplay(time: string, locale: 'en' | 'fr'): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);

  if (locale === 'fr') {
    // 24h format for French
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }

  // 12h format for English
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  required,
  placeholder,
  interval = 30,
  minTime = '06:00',
  maxTime = '22:00',
  locale = 'en',
}: TimePickerProps) {
  const defaultPlaceholder = locale === 'fr' ? 'Choisir l\'heure' : 'Select time';
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const timeSlots = useMemo(() => generateTimeSlots(interval, minTime, maxTime), [interval, minTime, maxTime]);
  const selectedIndex = timeSlots.indexOf(value);

  // Client-side mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 280;
    const OFFSET = 8;

    let top = triggerRect.bottom + OFFSET;
    if (top + dropdownHeight > viewportHeight - 16) {
      top = triggerRect.top - dropdownHeight - OFFSET;
    }
    top = Math.max(8, top);

    setDropdownPosition({
      top,
      left: triggerRect.left,
      width: Math.max(triggerRect.width, 160),
    });
  };

  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !mounted) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, mounted]);

  // Scroll to selected item when opening
  useEffect(() => {
    if (isOpen && selectedIndex >= 0 && listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIndex(selectedIndex);
    } else if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [isOpen, selectedIndex]);

  // Scroll to highlighted item
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const highlightedEl = listRef.current?.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
    highlightedEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  // Handle outside clicks
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

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, timeSlots.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(timeSlots[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  return (
    <div className={styles.field} ref={wrapperRef}>
      <input
        type="hidden"
        id={id}
        name={id}
        value={value}
        required={required}
      />
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`${styles.value} ${!value ? styles.placeholder : ''}`}>
          {value ? formatTimeDisplay(value, locale) : (placeholder || defaultPlaceholder)}
        </span>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {isOpen && mounted && createPortal(
        <ul
          ref={listRef}
          className={styles.dropdown}
          role="listbox"
          style={{
            position: 'fixed',
            top: dropdownPosition?.top ?? 0,
            left: dropdownPosition?.left ?? 0,
            width: dropdownPosition?.width ?? 160,
            visibility: dropdownPosition ? 'visible' : 'hidden',
          }}
        >
          {timeSlots.map((time, index) => (
            <li
              key={time}
              role="option"
              aria-selected={time === value}
              data-index={index}
              className={`${styles.option} ${time === value ? styles.optionSelected : ''} ${index === highlightedIndex ? styles.optionHighlighted : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(time);
              }}
            >
              {formatTimeDisplay(time, locale)}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
