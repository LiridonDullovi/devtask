import type { DataScope } from "../types/workspace";

interface ScopeToggleProps {
  value: DataScope;
  onChange: (scope: DataScope) => void;
}

const OPTIONS: { value: DataScope; label: string; hint: string }[] = [
  { value: "personal", label: "Personal", hint: "Local" },
  { value: "workspace", label: "Workspace", hint: "Team" },
];

export function ScopeToggle({ value, onChange }: ScopeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Data scope"
      className="inline-flex rounded-md border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-700 dark:bg-neutral-900/80"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors ${
              active
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            {opt.label}
            <span className="sr-only"> ({opt.hint})</span>
          </button>
        );
      })}
    </div>
  );
}
