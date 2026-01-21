"use client";

import { useEffect, useState } from "react";

type SuccessAnimationProps = {
  show: boolean;
  title?: string;
  message?: string;
  variant?: "default" | "match" | "submit";
  size?: "sm" | "md" | "lg";
  onAnimationComplete?: () => void;
};

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring with gradient */}
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke="url(#successGradient)"
        strokeWidth="3"
        className="success-ring"
      />
      {/* Checkmark path */}
      <path
        d="M20 32L28 40L44 24"
        stroke="url(#successGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="success-check"
      />
      {/* Particle dots */}
      <circle cx="10" cy="20" r="2" fill="#3d8bfd" className="success-particle success-particle--1" />
      <circle cx="54" cy="18" r="2.5" fill="#7ad7e3" className="success-particle success-particle--2" />
      <circle cx="52" cy="48" r="2" fill="#f47c5d" className="success-particle success-particle--3" />
      <circle cx="12" cy="46" r="1.5" fill="#ffd166" className="success-particle success-particle--4" />
      <circle cx="32" cy="6" r="1.5" fill="#a78bfa" className="success-particle success-particle--5" />
      <circle cx="58" cy="32" r="1.5" fill="#34d399" className="success-particle success-particle--6" />
      <defs>
        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3d8bfd" />
          <stop offset="50%" stopColor="#7ad7e3" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MatchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Connection lines */}
      <path
        d="M20 32H44"
        stroke="url(#matchGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 4"
        className="match-line"
      />
      {/* Left person */}
      <circle cx="16" cy="24" r="6" fill="#3d8bfd" className="match-person match-person--left" />
      <path
        d="M8 40C8 34 12 32 16 32C20 32 24 34 24 40"
        stroke="#3d8bfd"
        strokeWidth="3"
        strokeLinecap="round"
        className="match-person match-person--left"
      />
      {/* Right person */}
      <circle cx="48" cy="24" r="6" fill="#7ad7e3" className="match-person match-person--right" />
      <path
        d="M40 40C40 34 44 32 48 32C52 32 56 34 56 40"
        stroke="#7ad7e3"
        strokeWidth="3"
        strokeLinecap="round"
        className="match-person match-person--right"
      />
      {/* Heart in center */}
      <path
        d="M32 28C32 26 30 24 28 24C26 24 24 26 24 28C24 32 32 38 32 38C32 38 40 32 40 28C40 26 38 24 36 24C34 24 32 26 32 28Z"
        fill="#f47c5d"
        className="match-heart"
      />
      {/* Celebration particles */}
      <circle cx="6" cy="16" r="2" fill="#ffd166" className="success-particle success-particle--1" />
      <circle cx="58" cy="14" r="2" fill="#a78bfa" className="success-particle success-particle--2" />
      <circle cx="4" cy="48" r="1.5" fill="#34d399" className="success-particle success-particle--3" />
      <circle cx="60" cy="50" r="2" fill="#f47c5d" className="success-particle success-particle--4" />
      <defs>
        <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d8bfd" />
          <stop offset="100%" stopColor="#7ad7e3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StarburstIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Central star */}
      <path
        d="M32 8L36.5 24.5H53L39.5 34L44 51L32 41L20 51L24.5 34L11 24.5H27.5L32 8Z"
        fill="url(#starGradient)"
        className="starburst-star"
      />
      {/* Rays */}
      <path d="M32 2V8" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M32 56V62" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M2 32H8" stroke="#7ad7e3" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M56 32H62" stroke="#7ad7e3" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M10 10L14 14" stroke="#f47c5d" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M50 50L54 54" stroke="#f47c5d" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M54 10L50 14" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      <path d="M14 50L10 54" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" className="starburst-ray" />
      {/* Sparkles */}
      <circle cx="8" cy="24" r="2" fill="#3d8bfd" className="success-particle success-particle--1" />
      <circle cx="56" cy="24" r="2" fill="#34d399" className="success-particle success-particle--2" />
      <circle cx="24" cy="56" r="1.5" fill="#ffd166" className="success-particle success-particle--3" />
      <circle cx="40" cy="4" r="1.5" fill="#7ad7e3" className="success-particle success-particle--4" />
      <defs>
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#f47c5d" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SuccessAnimation({
  show,
  title,
  message,
  variant = "default",
  size = "md",
  onAnimationComplete,
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, onAnimationComplete]);

  if (!visible) return null;

  const sizeClasses = {
    sm: "success-animation--sm",
    md: "success-animation--md",
    lg: "success-animation--lg",
  };

  const IconComponent = {
    default: CheckmarkIcon,
    match: MatchIcon,
    submit: StarburstIcon,
  }[variant];

  return (
    <div className={`success-animation ${sizeClasses[size]}`} role="status" aria-live="polite">
      <div className="success-animation__icon">
        <IconComponent className="success-animation__svg" />
      </div>
      {title && <h3 className="success-animation__title">{title}</h3>}
      {message && <p className="success-animation__message">{message}</p>}
    </div>
  );
}

// Hook for triggering success state
export function useSuccessAnimation() {
  const [show, setShow] = useState(false);

  const trigger = () => {
    setShow(true);
  };

  const reset = () => {
    setShow(false);
  };

  return { show, trigger, reset };
}
