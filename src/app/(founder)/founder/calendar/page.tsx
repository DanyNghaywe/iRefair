"use client";

import { useEffect, useState } from "react";

import { Topbar } from "@/components/founder/Topbar";
import { useLanguage } from "@/components/LanguageProvider";

const translations = {
  en: {
    title: "Calendar",
    subtitle: "Manage referrer meetings",
    localTime: "Local time",
    loading: "Loading...",
    scheduledEvents: {
      title: "Scheduled Events",
      description: "View and manage upcoming meetings",
    },
    eventTypes: {
      title: "Event Types",
      description: "Configure your meeting templates",
    },
    shareLink: {
      title: "Share Link",
      description: "Copy your booking page link",
    },
    quickBooking: "Quick booking view",
    openCalendly: "Open in Calendly",
  },
  fr: {
    title: "Calendrier",
    subtitle: "Gérer les rendez-vous des référents",
    localTime: "Heure locale",
    loading: "Chargement...",
    scheduledEvents: {
      title: "Événements planifiés",
      description: "Voir et gérer les rendez-vous à venir",
    },
    eventTypes: {
      title: "Types d'événements",
      description: "Configurer vos modèles de rendez-vous",
    },
    shareLink: {
      title: "Lien de partage",
      description: "Copier le lien de réservation",
    },
    quickBooking: "Vue rapide des réservations",
    openCalendly: "Ouvrir dans Calendly",
  },
};

export default function CalendarPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on client
    setCurrentTime(new Date());

    // Update every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const locale = language === "fr" ? "fr-CA" : "en-US";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const actionCards = [
    {
      icon: (
        <svg
          className="calendar-action__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
      title: t.scheduledEvents.title,
      description: t.scheduledEvents.description,
      href: "https://calendly.com/app/scheduled_events/user/me",
    },
    {
      icon: (
        <svg
          className="calendar-action__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      title: t.eventTypes.title,
      description: t.eventTypes.description,
      href: "https://calendly.com/event_types/user/me",
    },
    {
      icon: (
        <svg
          className="calendar-action__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
      ),
      title: t.shareLink.title,
      description: t.shareLink.description,
      href: "https://calendly.com/mbissani/30min",
    },
  ];

  return (
    <div className="founder-page">
      <Topbar title={t.title} subtitle={t.subtitle} />

      {/* Hero stat card */}
      <div className="glass-card founder-card calendar-stat">
        <div className="calendar-stat__row">
          <div className="calendar-stat__date">
            {currentTime ? formatDate(currentTime) : t.loading}
          </div>
          <div className="calendar-stat__time">
            {currentTime ? formatTime(currentTime) : "--:--"}
          </div>
          <div className="calendar-stat__label">{t.localTime}</div>
        </div>
      </div>

      {/* Action cards row */}
      <div className="calendar-actions">
        {actionCards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card founder-card calendar-action"
          >
            {card.icon}
            <div className="calendar-action__content">
              <div className="calendar-action__title">{card.title}</div>
              <div className="calendar-action__desc">{card.description}</div>
            </div>
            <svg
              className="calendar-action__arrow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        ))}
      </div>

      {/* Calendly embed section */}
      <div className="glass-card founder-card calendar-embed">
        <div className="calendar-embed__header">{t.quickBooking}</div>
        <div className="calendar-embed__frame">
          <iframe
            src="https://calendly.com/mbissani/30min"
            title="Calendly Booking"
            className="calendar-embed__iframe"
          />
        </div>
        <a
          href="https://calendly.com/mbissani/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="calendar-embed__fallback"
        >
          {t.openCalendly}
        </a>
      </div>
    </div>
  );
}
