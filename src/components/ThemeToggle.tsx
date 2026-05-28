import {
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useThemeStore } from "../store/theme";
import type { ThemeMode } from "../lib/theme";

const MODES: { mode: ThemeMode; label: string; icon: typeof IconSun }[] = [
  { mode: "system", label: "System", icon: IconDeviceDesktop },
  { mode: "light", label: "Light", icon: IconSun },
  { mode: "dark", label: "Dark", icon: IconMoon },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore();

  return (
    <div className="mt-auto border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <div className="mb-1.5 px-2 text-[11px] uppercase tracking-wider text-neutral-400">
        Theme
      </div>
      <div className="flex flex-col gap-0.5">
        {MODES.map(({ mode: value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-[7px] text-[13px] ${
              mode === value
                ? "bg-white font-medium text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900"
            }`}
          >
            <Icon size={15} stroke={1.75} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
