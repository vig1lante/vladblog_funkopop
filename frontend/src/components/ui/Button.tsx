import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { Spinner } from "./Spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingText,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button-${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading && <Spinner />}
      <span>{isLoading ? loadingText ?? children : children}</span>
    </button>
  );
}
