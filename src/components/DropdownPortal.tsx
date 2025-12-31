'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * DropdownPortal - Renders dropdown content in a portal to document.body
 *
 * This component solves the Safari stacking context issue where backdrop-filter
 * creates an isolated stacking context, causing dropdowns to be hidden behind
 * elements that appear later in the DOM. By rendering to a portal at the body
 * level with position: fixed, the dropdown escapes all ancestor stacking contexts.
 *
 * @see https://bugs.webkit.org/show_bug.cgi?id=176308
 */

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  direction: 'down' | 'up';
};

type DropdownPortalProps = {
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  matchWidth?: boolean;
  maxHeight?: number;
  /** Offset from the trigger element (default: 8) */
  offset?: number;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function DropdownPortal({
  triggerRef,
  isOpen,
  children,
  onClose,
  className = '',
  matchWidth = true,
  maxHeight = 260,
  offset = 8,
}: DropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate and update dropdown position
  const updatePosition = () => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom - offset;
    const spaceAbove = triggerRect.top - offset;

    // Decide direction: prefer below, flip up if not enough space
    const dropdownHeight = dropdownRef.current?.offsetHeight || maxHeight;
    const direction: 'down' | 'up' =
      spaceBelow >= Math.min(dropdownHeight, maxHeight) || spaceBelow >= spaceAbove ? 'down' : 'up';

    let top: number;
    if (direction === 'down') {
      top = triggerRect.bottom + offset;
    } else {
      top = triggerRect.top - offset - Math.min(dropdownHeight, maxHeight);
    }

    // Clamp to viewport bounds
    top = Math.max(8, Math.min(top, viewportHeight - 8 - (direction === 'down' ? maxHeight : 0)));

    setPosition({
      top,
      left: triggerRect.left,
      width: matchWidth ? triggerRect.width : 0,
      direction,
    });
  };

  // Position on open and recalculate on scroll/resize
  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !mounted) {
      setPosition(null);
      return;
    }

    // Initial position calculation
    updatePosition();

    // Recalculate on window scroll/resize
    const handleReposition = () => updatePosition();

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, mounted, triggerRef, matchWidth, maxHeight, offset]);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsideDropdown && isOutsideTrigger) {
        onClose();
      }
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const portalContent = (
    <div
      ref={dropdownRef}
      className={`dropdown-portal ${className}`.trim()}
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: matchWidth && position?.width ? position.width : 'auto',
        maxHeight,
        zIndex: 9999,
        visibility: position ? 'visible' : 'hidden',
      }}
      data-direction={position?.direction}
    >
      {children}
    </div>
  );

  return createPortal(portalContent, document.body);
}
