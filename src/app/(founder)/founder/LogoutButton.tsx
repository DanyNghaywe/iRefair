"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";

export function LogoutButton() {
  const router = useRouter();
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
      {loading ? "Signing out..." : "Log out"}
    </ActionBtn>
  );
}
