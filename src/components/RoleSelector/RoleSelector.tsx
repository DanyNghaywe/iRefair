"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import "./RoleSelector.css";

type Role = {
  id: string;
  label: string;
  href: string;
  description: string;
};

const roles: Role[] = [
  {
    id: "applicant",
    label: "I'm a Candidate",
    href: "/applicant",
    description: "Looking for job referrals in Canada",
  },
  {
    id: "referrer",
    label: "I'm a Referrer",
    href: "/referrer",
    description: "I can refer candidates at my company",
  },
];

export function RoleSelector() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoader();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tiltDirection, setTiltDirection] = useState<"up" | "down" | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedRole = roles[selectedIndex];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, roles.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case " ":
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleSelect(focusedIndex);
          }
          break;
        case "Tab":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex]);

  // Focus management
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      items[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setFocusedIndex(selectedIndex);
      }
      return !prev;
    });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (index: number) => {
      const previousIndex = selectedIndex;

      // Set tilt direction
      setTiltDirection(index > previousIndex ? "down" : "up");
      setSelectedIndex(index);

      // Close and navigate after animation
      setTimeout(() => {
        setTiltDirection(null);
        setIsOpen(false);
        setFocusedIndex(-1);
        startNavigation(roles[index].href);
        router.push(roles[index].href);
      }, 500);
    },
    [selectedIndex, router, startNavigation]
  );

  const menuClasses = [
    "role-selector",
    isOpen && "is-open",
    tiltDirection === "up" && "tilt-up",
    tiltDirection === "down" && "tilt-down",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={menuRef}
      className={menuClasses}
      style={{ "--selected-offset": `${selectedIndex * -72}px` } as React.CSSProperties}
    >
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        className="role-selector__button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="role-selector__content">
          <span className="role-selector__label">{selectedRole.label}</span>
          <span className="role-selector__description">{selectedRole.description}</span>
        </span>
        <span className="role-selector__arrow" aria-hidden="true" />
      </button>

      {/* Dropdown list */}
      <ul
        ref={listRef}
        className="role-selector__list"
        role="listbox"
        aria-label="Select your role"
      >
        {roles.map((role, index) => (
          <li
            key={role.id}
            role="option"
            aria-selected={index === selectedIndex}
            tabIndex={isOpen ? 0 : -1}
            className={[
              "role-selector__option",
              index === selectedIndex && "is-selected",
              index === focusedIndex && "is-focused",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleSelect(index)}
            onMouseEnter={() => setFocusedIndex(index)}
          >
            <span className="role-selector__option-label">{role.label}</span>
            <span className="role-selector__option-description">{role.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
