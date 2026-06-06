type StepIndicatorProps = {
  current: number;
  total: number;
};

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div aria-label={`Шаг ${current} из ${total}`} className="step-indicator">
      {Array.from({ length: total }, (_, index) => (
        <span
          className={index < current ? "active" : ""}
          key={`${current}-${index}`}
        />
      ))}
    </div>
  );
}
