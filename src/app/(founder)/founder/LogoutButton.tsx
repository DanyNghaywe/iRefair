"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";

const translations = {
  en: {
    signingOut: "Signing out...",
    logOut: "Log out",
  },
  fr: {
    signingOut: "Déconnexion...",
    logOut: "Se déconnecter",
  },
};

export function LogoutButton() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/founder/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Founder logout failed", error);
    } finally {
      router.replace("/founder/login");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <ActionBtn as="button" variant="ghost" onClick={handleLogout} disabled={loading} aria-busy={loading}>
      {loading ? t.signingOut : t.logOut}
    </ActionBtn>
  );
}
