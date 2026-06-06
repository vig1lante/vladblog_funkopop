import { type HTMLAttributes, type ReactNode } from "react";

type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "article" | "section" | "div";
};

export function GlassPanel({
  as: Tag = "section",
  children,
  className = "",
  ...props
}: GlassPanelProps) {
  return (
    <Tag className={`glass-panel ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
