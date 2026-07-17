import { useCallback, type MouseEvent } from "react";
import type { NameDisplayMode } from "../../features/modeling/types";

type NameModeControlProps = {
  value: NameDisplayMode;
  onChange: (mode: NameDisplayMode) => void;
  compact?: boolean;
};

const options: Array<{ value: NameDisplayMode; label: string }> = [
  { value: "business", label: "Business" },
  { value: "system", label: "System" },
  { value: "physical", label: "Physical" }
];

export function NameModeControl({ value, onChange, compact = false }: NameModeControlProps) {
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onChange(event.currentTarget.dataset.mode as NameDisplayMode);
  }, [onChange]);

  return (
    <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1" role="group" aria-label="Name display mode">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-mode={option.value}
          className={`whitespace-nowrap rounded-md ${compact ? "px-1 py-1 text-[10px]" : "px-2 py-2 text-xs"} font-bold transition-colors ${
            value === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
          aria-pressed={value === option.value}
          onClick={handleClick}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
