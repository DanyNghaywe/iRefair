"use client";

import React from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function Drawer({ open, title, description, onClose, actions, footer, children }: Props) {
  return (
    <div className={`founder-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="founder-drawer__overlay" onClick={onClose} />
      <aside className="founder-drawer__panel" role="dialog" aria-modal="true">
        <header className="founder-drawer__header">
          <div>
            {title ? <h2 className="founder-drawer__title">{title}</h2> : null}
            {description ? <p className="founder-drawer__description">{description}</p> : null}
          </div>
          <div className="founder-drawer__header-actions">
            {actions}
            <button type="button" className="founder-icon-button" onClick={onClose} aria-label="Close drawer">
              ×
            </button>
          </div>
        </header>
        <div className="founder-drawer__body">{children}</div>
        {footer ? <footer className="founder-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}
