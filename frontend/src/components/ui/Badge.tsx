import { type HTMLAttributes, type ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "blue" | "purple" | "gold" | "dark" | "neutral";
};

export function Badge({
  children,
  className = "",
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span className={`ui-badge badge-${tone} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
