import { type HTMLAttributes, type ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "article" | "section" | "div";
};

export function Card({
  as: Tag = "article",
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <Tag className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
