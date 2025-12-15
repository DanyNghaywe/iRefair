"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  items: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
};

export const Sidebar = React.forwardRef<HTMLDivElement, Props>(function Sidebar({ items, collapsed, onToggle }, ref) {
  const pathname = usePathname();

  return (
    <aside ref={ref} className={`ops-sidebar founder-sidebar ${collapsed ? "is-collapsed" : "is-open"}`}>
      <div className="founder-sidebar__header">
        <div className="founder-sidebar__brand">
          <span className="dot" />
          <span>Ops Console</span>
        </div>
      </div>
      <div className="founder-card__meta" aria-hidden="true" style={{ margin: "6px 0 2px" }}>
        Navigation
      </div>
      <nav className="founder-sidebar__nav">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`founder-sidebar__link ${active ? "is-active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
});
