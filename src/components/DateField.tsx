import { IconCalendar, IconX } from "@tabler/icons-react";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
  min?: string;
  onClear?: () => void;
}

export function DateField({
  label,
  value,
  onChange,
  onCommit,
  min,
  onClear,
}: DateFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-[12px] text-neutral-500">{label}</label>
      <div className="flex items-center rounded-md border border-neutral-200 bg-white focus-within:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
        <IconCalendar
          size={14}
          stroke={1.75}
          className="ml-3 shrink-0 text-neutral-400"
        />
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit?.()}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-2 pr-2 text-[13px] text-neutral-900 outline-none dark:text-neutral-100 [color-scheme:light] dark:[color-scheme:dark]"
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mr-2 shrink-0 cursor-pointer rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            aria-label={`Clear ${label.toLowerCase()} date`}
          >
            <IconX size={14} stroke={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}
