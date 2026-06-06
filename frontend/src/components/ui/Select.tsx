import { type SelectHTMLAttributes } from "react";

import { type PresetOption } from "../../types/figure";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: PresetOption[];
};

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <label className={`select-field ${className}`.trim()}>
      <span>{label}</span>
      <select {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
