import { IconColorPicker } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  isCustomColor,
  isSameColor,
  normalizeHexColor,
  PRESET_COLORS,
} from "../lib/colors";

interface ColorPickerProps {
  value: string | null;
  inheritColor: string;
  inheritLabel?: string;
  onChange: (color: string | null) => void;
}

export function ColorPicker({
  value,
  inheritColor,
  inheritLabel = "Inherit from context",
  onChange,
}: ColorPickerProps) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const customActive = isCustomColor(selected, inheritColor);
  const customDisplay = customActive
    ? (normalizeHexColor(selected!) ?? selected!)
    : "#378ADD";

  function pick(color: string | null) {
    setSelected(color);
    onChange(color);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        title={inheritLabel}
        onClick={() => pick(null)}
        className={`flex size-7 cursor-pointer items-center justify-center rounded-full border-2 ${
          selected === null
            ? "border-neutral-400 dark:border-neutral-500"
            : "border-dashed border-neutral-300 dark:border-neutral-600"
        }`}
      >
        <span
          className="size-4 rounded-full"
          style={{ backgroundColor: inheritColor }}
        />
      </button>

      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => pick(color)}
          className={`size-7 cursor-pointer rounded-full border-2 ${
            isSameColor(selected, color)
              ? "border-neutral-900 dark:border-neutral-100"
              : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
        />
      ))}

      <div
        className={`relative size-7 shrink-0 rounded-full border-2 ${
          customActive
            ? "border-neutral-900 dark:border-neutral-100"
            : "border-dashed border-neutral-300 dark:border-neutral-600"
        }`}
        style={customActive ? { backgroundColor: customDisplay } : undefined}
      >
        <input
          type="color"
          value={customDisplay}
          onChange={(e) => {
            const normalized = normalizeHexColor(e.target.value);
            if (normalized) pick(normalized);
          }}
          title="Custom color"
          className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
        />
        {!customActive && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <IconColorPicker
              size={14}
              stroke={1.75}
              className="text-neutral-400"
            />
          </span>
        )}
      </div>

      {customActive && (
        <input
          type="text"
          value={customDisplay}
          onChange={(e) => {
            const normalized = normalizeHexColor(e.target.value);
            if (normalized) pick(normalized);
          }}
          onBlur={(e) => {
            const normalized = normalizeHexColor(e.target.value);
            if (normalized) pick(normalized);
          }}
          spellCheck={false}
          className="w-[4.5rem] rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-600 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
        />
      )}
    </div>
  );
}
