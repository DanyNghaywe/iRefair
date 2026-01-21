"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { useLanguage } from "@/components/LanguageProvider";
import { Sidebar } from "@/components/founder/Sidebar";
import { ActionBtn } from "@/components/ActionBtn";

const navItemsData = [
  { href: "/founder", labelKey: "dashboard" },
  { href: "/founder/applicants", labelKey: "applicants" },
  { href: "/founder/referrers", labelKey: "referrers" },
  { href: "/founder/applications", labelKey: "applications" },
  { href: "/founder/archive", labelKey: "archive" },
  { href: "/founder/settings", labelKey: "settings" },
] as const;

const navLabels = {
  en: {
    dashboard: "Dashboard",
    applicants: "Applicants",
    referrers: "Referrers",
    applications: "Applications",
    archive: "Archive",
    settings: "Settings",
  },
  fr: {
    dashboard: "Tableau de bord",
    applicants: "Candidats",
    referrers: "Référents",
    applications: "Candidatures",
    archive: "Archives",
    settings: "Paramètres",
  },
};

const uiLabels = {
  en: {
    menu: "Menu",
    close: "Close",
    openNav: "Open navigation",
    closeNav: "Close navigation",
  },
  fr: {
    menu: "Menu",
    close: "Fermer",
    openNav: "Ouvrir la navigation",
    closeNav: "Fermer la navigation",
  },
};

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isLogin = pathname?.startsWith("/founder/login");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const prevPathnameRef = useRef(pathname);

  const navItems = navItemsData.map((item) => ({
    href: item.href,
    label: navLabels[language][item.labelKey],
    iconKey: item.labelKey,
  }));
  const ui = uiLabels[language];

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

  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsNavigating(false);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  const handleNavItemClick = () => {
    if (isMobile) {
      setIsNavigating(true);
      setSidebarOpen(false);
    }
  };

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
            aria-label={sidebarOpen ? ui.closeNav : ui.openNav}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen && isMobile ? ui.close : ui.menu}
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
            onItemClick={handleNavItemClick}
          />
          <section className="ops-main">
            {isNavigating && isMobile && (
              <div className="ops-nav-loading">
                <span className="loading-indicator" />
              </div>
            )}
            {children}
          </section>
        </main>
      </div>
    </AppShell>
  );
}
