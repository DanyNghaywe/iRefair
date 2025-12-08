'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { useNavigationLoader } from '@/components/NavigationLoader';

type RoleOption = {
  id: 'candidate' | 'referrer';
  label: string;
  description: string;
  path: string;
  accent: string;
};

const roles: RoleOption[] = [
  {
    id: 'candidate',
    label: 'Candidate',
    description: 'Find referrers for your applications and track progress in one place.',
    path: '/candidate',
    accent: '#4cc8e0',
  },
  {
    id: 'referrer',
    label: 'Referrer',
    description: 'Refer strong candidates and help them land interviews at your company.',
    path: '/referrer',
    accent: '#8ad1ff',
  },
];

function RoleIcon({ id }: { id: RoleOption['id'] }) {
  if (id === 'candidate') {
    return (
      <svg viewBox="0 0 24 24" fill="none" role="presentation" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M5 19.2c0-3.44 3.06-5.9 7-5.9s7 2.46 7 5.9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M9 4.8c.8-1 2-1.6 3-1.6 1 0 2.2.6 3 1.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" role="presentation" aria-hidden="true">
      <path d="M4.8 10.8a2.8 2.8 0 1 1 5.6 0 2.8 2.8 0 1 1-5.6 0Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.6 9.8h3.2a2.4 2.4 0 0 1 0 4.8H13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M11.2 13.3 9 15.5c-.4.4-.6 1-.6 1.6V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M15.4 6.8c-.6-1.1-1.8-1.8-3-1.8-1.9 0-3.4 1.5-3.4 3.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M18.2 18.2 16 16c-.3-.3-.7-.5-1.1-.5h-1.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 11.8c1.1-1 2.9-1.5 5.2-.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="presentation" aria-hidden="true">
      <path
        d="M12 12.5a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5.2 18.6C6.1 16 8.8 14.2 12 14.2s5.9 1.8 6.8 4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoader();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);

  const filteredRoles = roles;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !selectRef.current) return;

    const options = Array.from(selectRef.current.querySelectorAll<HTMLButtonElement>('.role-select__option'));
    options.forEach((option) => {
      option.style.animation = 'none';
      void option.offsetHeight; // Force reflow so the animation restarts on every open
      option.style.animation = '';
    });
  }, [isOpen]);

  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');

    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    element.appendChild(ripple);

    window.setTimeout(() => {
      ripple.remove();
    }, 650);
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (role: RoleOption, event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    setSelectedRole(role);
    setIsOpen(false);
    startNavigation(role.path);
    router.push(role.path);
  };

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <main className="role-picker">
          <section className="role-shell" aria-labelledby="role-heading">
            <header className="role-shell__header">
              <h1 id="role-heading" className="title-animate">
                Choose your path
              </h1>
            </header>

            <div className="select-panel">
              <div
                className="role-select"
                ref={selectRef}
                style={{ '--role-accent': selectedRole?.accent ?? '#7ad7e3' } as CSSProperties}
              >
                <button
                  type="button"
                  className={`role-select__trigger ${isOpen ? 'is-open' : ''}`}
                  onClick={(event) => {
                    createRipple(event);
                    toggleDropdown();
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isOpen}
                  aria-controls="role-dropdown"
                >
                  <div className="role-select__selected">
                    <span
                      className={`role-select__pill ${
                        selectedRole ? `role-select__pill--${selectedRole.id}` : 'role-select__pill--placeholder'
                      }`}
                    >
                      {selectedRole ? <RoleIcon id={selectedRole.id} /> : <PlaceholderIcon />}
                    </span>
                    <div className="role-select__labels">
                      <span className={`role-select__name ${selectedRole ? '' : 'is-placeholder'}`}>
                        {selectedRole ? selectedRole.label : 'Choose your role'}
                      </span>
                      <span className="role-select__hint">
                        {selectedRole ? selectedRole.description : 'Start as a Candidate or a Referrer'}
                      </span>
                    </div>
                  </div>
                  <span className="role-select__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                <div
                  id="role-dropdown"
                  className={`role-select__dropdown ${isOpen ? 'is-open' : ''}`}
                  role="listbox"
                  aria-label="Choose your role"
                >
                  <div className={`role-select__options ${filteredRoles.length === 0 ? 'is-empty' : ''}`}>
                    {filteredRoles.map((role, index) => (
                      <button
                        key={role.id}
                        type="button"
                        role="option"
                        aria-selected={selectedRole?.id === role.id}
                        className={`role-select__option ${selectedRole?.id === role.id ? 'is-active' : ''}`}
                        onClick={(event) => handleSelect(role, event)}
                        style={{ animationDelay: `${index * 0.08}s` }}
                      >
                        <div className="role-select__option-text">
                          <span className="role-select__option-name">{role.label}</span>
                          <span className="role-select__option-desc">{role.description}</span>
                        </div>
                        <span className="role-select__option-action">Continue</span>
                      </button>
                    ))}
                  </div>

                  <div className={`role-select__no-results ${filteredRoles.length === 0 ? 'show' : ''}`}>
                    <div className="role-select__no-results-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
                        <path d="m15.5 15.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p>No results found</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
