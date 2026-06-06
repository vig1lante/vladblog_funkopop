import { useEffect, type ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = "" }: PageShellProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <main className={`page-shell ${className}`.trim()}>
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />
      <div className="page-enter">{children}</div>
    </main>
  );
}
