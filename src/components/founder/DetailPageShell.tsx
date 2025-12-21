import { type ReactNode } from "react";

type DetailPageShellProps = {
  main: ReactNode;
  sidebar: ReactNode;
};

export function DetailPageShell({ main, sidebar }: DetailPageShellProps) {
  return (
    <div className="referrer-review">
      <div className="referrer-review__main">{main}</div>
      <aside className="referrer-review__sidebar">{sidebar}</aside>
    </div>
  );
}
