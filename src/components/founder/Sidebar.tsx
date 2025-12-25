"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import React from "react";

import { ActionBtn } from "@/components/ActionBtn";
import styles from "./Sidebar.module.css";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  items: NavItem[];
  collapsed: boolean;
  isOpen?: boolean;
};

export const Sidebar = React.forwardRef<HTMLDivElement, Props>(function Sidebar({ items, collapsed, isOpen }, ref) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <aside ref={ref} className={`glass-card ops-sidebar ${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${isOpen ? "is-open" : ""}`}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/logo-small.png"
            alt="iRefair"
            width={36}
            height={36}
            className={styles.brandLogo}
          />
          <span className={styles.brandText}>iRefair</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {items.map((item) => {
          const isRoot = item.href === "/founder";
          const active = isRoot ? currentPath === item.href : currentPath.startsWith(item.href);
          return (
            <ActionBtn
              key={item.href}
              as="link"
              href={item.href}
              variant={active ? "primary" : "ghost"}
              size="sm"
              className={styles.navBtn}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </ActionBtn>
          );
        })}
      </nav>
    </aside>
  );
});
