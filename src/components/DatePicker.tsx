'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import styles from './DatePicker.module.css';

type DatePickerProps = {
  id: string;
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  minDate?: string;
  locale?: 'en' | 'fr';
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export function DatePicker({
  id,
  value,
  onChange,
  required,
  placeholder = 'Select date',
  minDate,
  locale = 'en',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  // Calendar state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const WEEKDAYS = locale === 'fr' ? WEEKDAYS_FR : WEEKDAYS_EN;
  const MONTHS = locale === 'fr' ? MONTHS_FR : MONTHS_EN;

  // Parse value to Date
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const minDateParsed = minDate ? new Date(minDate + 'T00:00:00') : null;

  // Client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update view when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewMonth(selectedDate.getMonth());
      setViewYear(selectedDate.getFullYear());
    }
  }, [value]);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 340;
    const OFFSET = 8;

    let top = triggerRect.bottom + OFFSET;
    if (top + dropdownHeight > viewportHeight - 16) {
      top = triggerRect.top - dropdownHeight - OFFSET;
    }
    top = Math.max(8, top);

    setDropdownPosition({
      top,
      left: triggerRect.left,
      width: Math.max(triggerRect.width, 300),
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

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(target);
      const isOutsideCalendar = calendarRef.current && !calendarRef.current.contains(target);

      if (isOutsideWrapper && isOutsideCalendar) {
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

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return locale === 'fr' ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
  };

  // Format date as YYYY-MM-DD
  const formatISODate = (day: number, month: number, year: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Check if date is disabled
  const isDateDisabled = (day: number, month: number, year: number) => {
    if (!minDateParsed) return false;
    const date = new Date(year, month, day);
    return date < minDateParsed;
  };

  // Check if date is today
  const isToday = (day: number, month: number, year: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Check if date is selected
  const isSelected = (day: number, month: number, year: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  // Navigate months
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Handle day selection
  const handleDayClick = (day: number) => {
    if (isDateDisabled(day, viewMonth, viewYear)) return;
    const isoDate = formatISODate(day, viewMonth, viewYear);
    onChange(isoDate);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown')) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  const prevMonthDays = getDaysInMonth(viewMonth === 0 ? 11 : viewMonth - 1, viewMonth === 0 ? viewYear - 1 : viewYear);

  const calendarDays: { day: number; type: 'prev' | 'current' | 'next' }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, type: 'prev' });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, type: 'current' });
  }

  // Next month days
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, type: 'next' });
  }

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
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`${styles.value} ${!selectedDate ? styles.placeholder : ''}`}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={calendarRef}
          className={styles.calendar}
          style={{
            position: 'fixed',
            top: dropdownPosition?.top ?? 0,
            left: dropdownPosition?.left ?? 0,
            width: dropdownPosition?.width ?? 300,
            visibility: dropdownPosition ? 'visible' : 'hidden',
          }}
          role="dialog"
          aria-label="Choose date"
        >
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className={styles.monthYear}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map((day) => (
              <div key={day} className={styles.weekday}>{day}</div>
            ))}
          </div>

          <div className={styles.days}>
            {calendarDays.map((item, index) => {
              if (item.type !== 'current') {
                return (
                  <div key={`${item.type}-${item.day}`} className={`${styles.day} ${styles.dayOutside}`}>
                    {item.day}
                  </div>
                );
              }

              const disabled = isDateDisabled(item.day, viewMonth, viewYear);
              const selected = isSelected(item.day, viewMonth, viewYear);
              const todayClass = isToday(item.day, viewMonth, viewYear);

              return (
                <button
                  key={`current-${item.day}`}
                  type="button"
                  className={`${styles.day} ${selected ? styles.daySelected : ''} ${todayClass ? styles.dayToday : ''} ${disabled ? styles.dayDisabled : ''}`}
                  onClick={() => handleDayClick(item.day)}
                  disabled={disabled}
                  tabIndex={-1}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => {
                const isoDate = formatISODate(today.getDate(), today.getMonth(), today.getFullYear());
                onChange(isoDate);
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {locale === 'fr' ? "Aujourd'hui" : 'Today'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
