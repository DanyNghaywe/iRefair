"use client";

import { usePathname } from "next/navigation";
import React from "react";

import { ActionBtn } from "@/components/ActionBtn";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  items: NavItem[];
  collapsed: boolean;
};

export const Sidebar = React.forwardRef<HTMLDivElement, Props>(function Sidebar({ items, collapsed }, ref) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <aside ref={ref} className={`ops-sidebar founder-sidebar ${collapsed ? "is-collapsed" : "is-open"}`}>
      <div className="founder-sidebar__header">
        <div className="founder-sidebar__brand">
          <span className="dot" />
          <span>Moe's Console</span>
        </div>
      </div>
      <nav className="founder-sidebar__nav">
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
              className="founder-nav-btn"
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
