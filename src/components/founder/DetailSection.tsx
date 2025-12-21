import { type ReactNode } from "react";

type DetailSectionProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

export function DetailSection({ title, className, children }: DetailSectionProps) {
  const classes = className ? `card ${className}` : "card";
  return (
    <section className={classes}>
      {title ? <p className="referrer-review__section-title">{title}</p> : null}
      {children}
    </section>
  );
}
