"use client";

import React, { useCallback, useEffect, useState } from "react";

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
    syncedHint: "Synced every 5 min",
    past7Days: "Past 7 days",
    syncNow: "Sync now",
    syncing: "Syncing...",
    syncSuccess: "Synced",
    syncError: "Sync failed",
    openSheets: "Open Sheets",
  },
  fr: {
    title: "Console Ops",
    subtitle: "Espace de travail du Fondateur et Directeur G??n??ral",
    activeApplicants: "Candidats actifs",
    referrers: "R??f??rents",
    applications: "Candidatures",
    syncedHint: "Synchronis?? toutes les 5 min",
    past7Days: "7 derniers jours",
    syncNow: "Synchroniser",
    syncing: "Synchronisation...",
    syncSuccess: "Synchronis??",
    syncError: "??chec de sync",
    openSheets: "Ouvrir Sheets",
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
  const [syncState, setSyncState] = useState<"idle" | "running" | "success" | "error">("idle");

  const loadStats = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSyncNow = async () => {
    if (syncState === "running") return;
    setSyncState("running");
    try {
      const response = await fetch("/api/founder/sync-sheets", { method: "POST" });
      const data = await response.json();
      if (data?.ok) {
        setSyncState("success");
        await loadStats();
      } else {
        setSyncState("error");
      }
    } catch (error) {
      console.error("Failed to sync sheets", error);
      setSyncState("error");
    } finally {
      setTimeout(() => setSyncState("idle"), 4000);
    }
  };

  const syncLabel =
    syncState === "running"
      ? t.syncing
      : syncState === "success"
      ? t.syncSuccess
      : syncState === "error"
      ? t.syncError
      : t.syncNow;

  const cards = [
    { title: t.activeApplicants, value: stats.applicants, hint: t.syncedHint },
    { title: t.referrers, value: stats.referrers, hint: t.syncedHint },
    { title: t.applications, value: stats.applications, hint: t.past7Days },
  ];

  return (
    <div className="founder-page">
      <Topbar
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <div className="founder-topbar__actions">
            <a
              className="founder-button founder-button--ghost"
              href="/api/founder/sheets"
              target="_blank"
              rel="noreferrer"
            >
              {t.openSheets}
            </a>
            <button
              className="founder-button founder-button--ghost"
              type="button"
              onClick={handleSyncNow}
              disabled={syncState === "running"}
            >
              {syncLabel}
            </button>
            <LogoutButton />
          </div>
        }
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
