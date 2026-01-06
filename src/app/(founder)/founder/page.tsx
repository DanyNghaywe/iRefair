"use client";

import React, { useEffect, useState } from "react";

import { SkeletonCard } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";
import { LogoutButton } from "./LogoutButton";

type Stats = {
  applicants: number | null;
  referrers: number | null;
  applications: number | null;
};

export default function FounderDashboard() {
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
    { title: "Active applicants", value: stats.applicants, hint: "Realtime from Sheets" },
    { title: "Referrers", value: stats.referrers, hint: "Latest sync" },
    { title: "Applications", value: stats.applications, hint: "Past 7 days" },
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
