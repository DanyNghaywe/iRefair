"use client";

import React, { useEffect, useState } from "react";

import { Topbar } from "@/components/founder/Topbar";
import { LogoutButton } from "./LogoutButton";

type Stats = {
  candidates: number | null;
  referrers: number | null;
  applications: number | null;
  matches: number | null;
};

export default function FounderDashboard() {
  const [stats, setStats] = useState<Stats>({
    candidates: null,
    referrers: null,
    applications: null,
    matches: null,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/founder/stats", { cache: "no-store" });
        const data = await response.json();
        if (data?.ok) {
          setStats({
            candidates: data.candidates ?? null,
            referrers: data.referrers ?? null,
            applications: data.applications ?? null,
            matches: data.matches ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load stats", error);
      }
    };
    loadStats();
  }, []);

  const cards = [
    { title: "Active candidates", value: stats.candidates, hint: "Realtime from Sheets" },
    { title: "Referrers", value: stats.referrers, hint: "Latest sync" },
    { title: "Applications", value: stats.applications, hint: "Past 7 days" },
    { title: "Matches", value: stats.matches, hint: "Ready to review" },
  ];

  return (
    <div className="founder-page">
      <Topbar
        title="Ops Console"
        subtitle="Founder & Managing Director workspace"
        actions={<LogoutButton />}
      />

      <div className="founder-grid">
        {cards.map((card) => (
          <div key={card.title} className="founder-card">
            <div className="founder-card__title">{card.title}</div>
            <div className="founder-card__value">{card.value ?? "-"}</div>
            <div className="founder-card__meta">{card.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
