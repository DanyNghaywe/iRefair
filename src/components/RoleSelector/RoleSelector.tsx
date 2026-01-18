"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import { useLanguage } from "@/components/LanguageProvider";
import "./RoleSelector.css";

const translations = {
  en: {
    tagline: 'Get referred to jobs in Canada',
    question: 'I am a...',
    applicant: 'Job Seeker',
    applicantDesc: 'Looking for referrals to Canadian companies',
    referrer: 'Referrer',
    referrerDesc: 'Ready to help newcomers get hired',
    continue: 'Continue',
    selectRole: 'Select your role',
  },
  fr: {
    tagline: 'Obtenez des recommandations pour des emplois au Canada',
    question: 'Je suis...',
    applicant: 'Chercheur d\'emploi',
    applicantDesc: 'À la recherche de recommandations pour des entreprises canadiennes',
    referrer: 'Recommandateur',
    referrerDesc: 'Prêt à aider les nouveaux arrivants à être embauchés',
    continue: 'Continuer',
    selectRole: 'Sélectionnez votre rôle',
  },
};

type Role = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export function RoleSelector() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoader();
  const { language } = useLanguage();
  const t = translations[language];

  const roles: Role[] = useMemo(() => [
    {
      id: "applicant",
      label: t.applicant,
      href: "/applicant",
      description: t.applicantDesc,
    },
    {
      id: "referrer",
      label: t.referrer,
      href: "/referrer",
      description: t.referrerDesc,
    },
  ], [t.applicant, t.applicantDesc, t.referrer, t.referrerDesc]);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
  }, [isOpen, focusedIndex, roles.length]);

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
      setSelectedIndex(index);
      setIsOpen(false);
      setFocusedIndex(-1);
      startNavigation(roles[index].href);
      router.push(roles[index].href);
    },
    [router, startNavigation, roles]
  );

  const menuClasses = [
    "role-selector",
    isOpen && "is-open",
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
        aria-label={t.selectRole}
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
