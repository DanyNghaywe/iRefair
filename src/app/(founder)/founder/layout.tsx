"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { Sidebar } from "@/components/founder/Sidebar";
import { ActionBtn } from "@/components/ActionBtn";

const navItems = [
  { href: "/founder", label: "Dashboard" },
  { href: "/founder/applicants", label: "Applicants" },
  { href: "/founder/referrers", label: "Referrers" },
  { href: "/founder/applications", label: "Applications" },
  { href: "/founder/matches", label: "Matches" },
  { href: "/founder/settings", label: "Settings" },
];

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/founder/login");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const applyMatch = () => {
      setIsMobile(media.matches);
      setSidebarOpen(!media.matches);
    };

    applyMatch();
    media.addEventListener("change", applyMatch);
    return () => media.removeEventListener("change", applyMatch);
  }, []);

  useEffect(() => {
    if (isMobile && sidebarOpen && sidebarRef.current) {
      const firstLink = sidebarRef.current.querySelector<HTMLAnchorElement>("a");
      firstLink?.focus();
    }
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (!isMobile) return undefined;
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isMobile, sidebarOpen]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AppShell variant="wide">
      <div className="ops-scope">
        <main className="ops-layout">
          <ActionBtn
            as="button"
            variant="ghost"
            className={`ops-menu-button ${sidebarOpen && isMobile ? "is-hidden" : ""}`}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen && isMobile ? "Close" : "Menu"}
          </ActionBtn>

          <div
            className={`ops-backdrop ${sidebarOpen && isMobile ? "is-open" : ""}`}
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />

          <Sidebar
            items={navItems}
            collapsed={!sidebarOpen}
            isOpen={sidebarOpen && isMobile}
            ref={sidebarRef}
          />
          <section className="ops-main">{children}</section>
        </main>
      </div>
    </AppShell>
  );
}
