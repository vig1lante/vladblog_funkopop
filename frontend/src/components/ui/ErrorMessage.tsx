import { type ReactNode } from "react";

type ErrorMessageProps = {
  action?: ReactNode;
  details?: string | null;
  message: string;
};

export function ErrorMessage({ action, details, message }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <p>{message}</p>
      {action}
      {details && import.meta.env.DEV && (
        <details>
          <summary>Технические детали</summary>
          <pre>{details}</pre>
        </details>
      )}
    </div>
  );
}
