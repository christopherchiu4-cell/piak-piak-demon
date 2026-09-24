"use client";

/**
 * Shared by every catalog toolbar. A group with a single option is never worth
 * showing — call sites drop it rather than rendering a lone "All".
 */
export function Chips<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (next: T) => void; options: Array<{ value: T; label: string }>;
}) {
  return <div className="filter-chips" role="group" aria-label={label}>
    <span className="filter-chips-label">{label}</span>
    {options.map((option) => <button key={option.value} type="button" className="chip"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
