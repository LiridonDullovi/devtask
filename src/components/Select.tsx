import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  menuPlacement?: "top" | "bottom";
  onOpenChange?: (open: boolean) => void;
}

function optionLabel(
  value: string,
  options: SelectOption[],
  groups: SelectGroup[],
): string {
  for (const opt of options) {
    if (opt.value === value) return opt.label;
  }
  for (const group of groups) {
    const match = group.options.find((opt) => opt.value === value);
    if (match) return match.label;
  }
  return placeholderFallback(value);
}

function placeholderFallback(value: string) {
  return value || "Select…";
}

function optionColor(
  value: string,
  options: SelectOption[],
  groups: SelectGroup[],
): string | undefined {
  for (const opt of options) {
    if (opt.value === value) return opt.color;
  }
  for (const group of groups) {
    const match = group.options.find((opt) => opt.value === value);
    if (match) return match.color;
  }
  return undefined;
}

export function Select({
  value,
  onChange,
  options = [],
  groups = [],
  placeholder = "Select…",
  disabled = false,
  menuPlacement = "bottom",
  onOpenChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = value
    ? optionLabel(value, options, groups)
    : placeholder;
  const color = value ? optionColor(value, options, groups) : undefined;

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  function renderOption(opt: SelectOption) {
    const selected = opt.value === value;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => pick(opt.value)}
        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
          selected
            ? "bg-neutral-50 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {opt.color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: opt.color }}
          />
        )}
        <span className="truncate">{opt.label}</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 ${
          open
            ? "border-neutral-300 dark:border-neutral-600"
            : "hover:border-neutral-300 dark:hover:border-neutral-600"
        }`}
      >
        {color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className={`min-w-0 flex-1 truncate ${
            value
              ? "text-neutral-900 dark:text-neutral-100"
              : "text-neutral-400"
          }`}
        >
          {label}
        </span>
        <IconChevronDown
          size={14}
          stroke={1.75}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 ${
            menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map(renderOption)}
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-400">
                {group.label}
              </div>
              {group.options.map(renderOption)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
