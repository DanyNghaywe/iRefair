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
    syncedHint: "Synced daily",
    past7Days: "Past 7 days",
    syncNow: "Sync now",
    syncing: "Syncing...",
    syncSuccess: "Synced",
    syncError: "Sync failed",
    openSheets: "Open Sheets",
    sheetSyncTitle: "Sheet sync alerts",
    sheetSyncAllClear: "All clear",
    sheetSyncLoading: "Loading sheet sync alerts...",
    sheetSyncEmpty: "No outstanding sheet sync errors.",
    sheetSyncRetry: "Retry",
    sheetSyncRetrying: "Retrying...",
    sheetSyncLoadError: "Unable to load sheet sync alerts.",
    sheetSyncRetryError: "Retry failed. Please try again.",
    sheetSyncAttempts: "Attempts:",
    sheetSyncLastAttempt: "Last attempt:",
    sheetSyncFirstSeen: "First seen:",
    sheetSyncErrorBadge: "Check",
  },
  fr: {
    title: "Console Ops",
    subtitle: "Espace de travail du Fondateur et Directeur General",
    activeApplicants: "Candidats actifs",
    referrers: "Referents",
    applications: "Candidatures",
    syncedHint: "Synchronise quotidiennement",
    past7Days: "7 derniers jours",
    syncNow: "Synchroniser",
    syncing: "Synchronisation...",
    syncSuccess: "Synchronise",
    syncError: "Echec de sync",
    openSheets: "Ouvrir Sheets",
    sheetSyncTitle: "Alertes de synchronisation",
    sheetSyncAllClear: "Tout va bien",
    sheetSyncLoading: "Chargement des alertes de synchronisation...",
    sheetSyncEmpty: "Aucune erreur de synchronisation en attente.",
    sheetSyncRetry: "Reessayer",
    sheetSyncRetrying: "Nouvelle tentative...",
    sheetSyncLoadError: "Impossible de charger les alertes de synchronisation.",
    sheetSyncRetryError: "Nouvelle tentative echouee.",
    sheetSyncAttempts: "Tentatives :",
    sheetSyncLastAttempt: "Derniere tentative :",
    sheetSyncFirstSeen: "Premiere alerte :",
    sheetSyncErrorBadge: "Verifier",
  },
};

type Stats = {
  applicants: number | null;
  referrers: number | null;
  applications: number | null;
};

type SheetSyncIssue = {
  id: string;
  sheetName: string;
  actionType: string;
  actionLabel: string;
  error: string;
  attempts: number;
  createdAt: string;
  lastAttemptAt?: string | null;
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
  const [issues, setIssues] = useState<SheetSyncIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [retryingIssueId, setRetryingIssueId] = useState<string | null>(null);
  const [issuesError, setIssuesError] = useState("");

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

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    setIssuesError("");
    try {
      const response = await fetch("/api/founder/sheet-sync-issues", { cache: "no-store" });
      const data = await response.json();
      if (data?.ok) {
        setIssues(Array.isArray(data.issues) ? data.issues : []);
      } else {
        setIssues([]);
        setIssuesError(data?.error || t.sheetSyncLoadError);
      }
    } catch (error) {
      console.error("Failed to load sheet sync issues", error);
      setIssues([]);
      setIssuesError(t.sheetSyncLoadError);
    } finally {
      setIssuesLoading(false);
    }
  }, [t.sheetSyncLoadError]);

  useEffect(() => {
    loadStats();
    loadIssues();
  }, [loadStats, loadIssues]);

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

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRetryIssue = async (id: string) => {
    if (retryingIssueId) return;
    setRetryingIssueId(id);
    try {
      const response = await fetch(`/api/founder/sheet-sync-issues/${id}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data?.ok) {
        setIssuesError(data?.error || t.sheetSyncRetryError);
      } else {
        setIssuesError("");
      }
      await loadIssues();
    } catch (error) {
      console.error("Failed to retry sheet sync issue", error);
      setIssuesError(t.sheetSyncRetryError);
    } finally {
      setRetryingIssueId(null);
    }
  };

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

        <div className="glass-card founder-card founder-card--wide">
          <div className="founder-card__header">
            <div className="founder-card__title">{t.sheetSyncTitle}</div>
            {issuesLoading ? (
              <span className="founder-badge founder-badge--neutral">...</span>
            ) : issuesError ? (
              <span className="founder-badge founder-badge--warning">{t.sheetSyncErrorBadge}</span>
            ) : issues.length > 0 ? (
              <span className="founder-badge founder-badge--danger">{issues.length}</span>
            ) : (
              <span className="founder-badge founder-badge--success">{t.sheetSyncAllClear}</span>
            )}
          </div>

          {issuesLoading ? (
            <div className="founder-card__meta">{t.sheetSyncLoading}</div>
          ) : (
            <>
              {issuesError ? <div className="founder-card__meta">{issuesError}</div> : null}
              {issues.length === 0 ? (
                <div className="founder-card__meta">{t.sheetSyncEmpty}</div>
              ) : (
                <ul className="founder-sync-issues">
                  {issues.map((issue) => (
                    <li key={issue.id} className="founder-sync-issue">
                      <div className="founder-sync-issue__main">
                        <div className="founder-sync-issue__title">{issue.actionLabel}</div>
                        <div className="founder-sync-issue__meta">
                          {issue.sheetName} - {t.sheetSyncAttempts} {issue.attempts}
                          {issue.lastAttemptAt
                            ? ` - ${t.sheetSyncLastAttempt} ${formatTimestamp(issue.lastAttemptAt)}`
                            : issue.createdAt
                            ? ` - ${t.sheetSyncFirstSeen} ${formatTimestamp(issue.createdAt)}`
                            : ""}
                        </div>
                        <div className="founder-sync-issue__error">{issue.error}</div>
                      </div>
                      <div className="founder-sync-issue__actions">
                        <button
                          className="founder-button founder-button--ghost founder-button--compact"
                          type="button"
                          onClick={() => handleRetryIssue(issue.id)}
                          disabled={retryingIssueId === issue.id}
                        >
                          {retryingIssueId === issue.id ? t.sheetSyncRetrying : t.sheetSyncRetry}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
