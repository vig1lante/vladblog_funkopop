type SpinnerProps = {
  size?: "sm" | "md";
};

export function Spinner({ size = "sm" }: SpinnerProps) {
  return <span aria-hidden="true" className={`spinner spinner-${size}`} />;
}
