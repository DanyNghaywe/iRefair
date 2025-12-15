"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./founder.module.css";

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
    <button
      type="button"
      className={`${styles.button} ${styles.secondary}`}
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
