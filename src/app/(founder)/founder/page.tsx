"use client";

import React, { useEffect, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { SkeletonCard } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";
import { LogoutButton } from "./LogoutButton";

const translations = {
  en: {
    title: "Ops Console",
    subtitle: "Founder & Managing Director workspace",
    activeApplicants: "Active applicants",
    referrers: "Referrers",
    applications: "Applications",
    realtimeHint: "Realtime from Sheets",
    latestSync: "Latest sync",
    past7Days: "Past 7 days",
  },
  fr: {
    title: "Console Ops",
    subtitle: "Espace de travail du Fondateur et Directeur Général",
    activeApplicants: "Candidats actifs",
    referrers: "Référents",
    applications: "Candidatures",
    realtimeHint: "Temps réel depuis Sheets",
    latestSync: "Dernière synchronisation",
    past7Days: "7 derniers jours",
  },
};

type Stats = {
  applicants: number | null;
  referrers: number | null;
  applications: number | null;
};

export default function FounderDashboard() {
  const { language } = useLanguage();
  const t = translations[language];
  const [stats, setStats] = useState<Stats>({
    applicants: null,
    referrers: null,
    applications: null,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/founder/stats", { cache: "no-store" });
        const data = await response.json();
        if (data?.ok) {
          setStats({
            applicants: data.applicants ?? null,
            referrers: data.referrers ?? null,
            applications: data.applications ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load stats", error);
      }
    };
    loadStats();
  }, []);

  const cards = [
    { title: t.activeApplicants, value: stats.applicants, hint: t.realtimeHint },
    { title: t.referrers, value: stats.referrers, hint: t.latestSync },
    { title: t.applications, value: stats.applications, hint: t.past7Days },
  ];

  return (
    <div className="founder-page">
      <Topbar
        title={t.title}
        subtitle={t.subtitle}
        actions={<LogoutButton />}
      />

      <div className="founder-grid">
        {cards.map((card) => (
          <div key={card.title} className="glass-card founder-card">
            {card.value === null ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="founder-card__title">{card.title}</div>
                <div className="founder-card__value">{card.value}</div>
                <div className="founder-card__meta">{card.hint}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
