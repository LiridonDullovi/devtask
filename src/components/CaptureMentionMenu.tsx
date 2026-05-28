import { useEffect, useRef } from "react";
import type { MentionSuggestion } from "../lib/captureMentions";

interface CaptureMentionMenuProps {
  open: boolean;
  type: "context" | "group";
  suggestions: MentionSuggestion[];
  highlightIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (index: number) => void;
  /** In-flow block (floating window) vs absolute overlay (inline bar) */
  variant?: "inline" | "dropdown";
  /** Open above or below the input anchor (dropdown only) */
  placement?: "top" | "bottom";
}

export function CaptureMentionMenu({
  open,
  type,
  suggestions,
  highlightIndex,
  onHighlight,
  onSelect,
  variant = "dropdown",
  placement = "top",
}: CaptureMentionMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const openBelow = placement === "bottom";

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-mention-index="${highlightIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  if (!open) return null;

  const menuPanel = (
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-400 dark:border-neutral-800">
          {type === "context" ? "Contexts" : "Groups"}
        </div>
        <div ref={listRef} className="max-h-40 overflow-y-auto py-1">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-neutral-400">No matches</p>
          ) : (
            suggestions.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                type="button"
                disabled={item.disabled}
                data-mention-index={index}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => !item.disabled && onHighlight(index)}
                onClick={() => !item.disabled && onSelect(index)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                  item.disabled
                    ? "cursor-default text-neutral-400"
                    : "cursor-pointer"
                } ${
                  !item.disabled && index === highlightIndex
                    ? "bg-neutral-100 dark:bg-neutral-800"
                    : !item.disabled
                      ? "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                      : ""
                }`}
              >
                {item.color && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] ${
                      item.disabled
                        ? "text-neutral-400"
                        : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.subtitle && (
                    <span className="block truncate text-[11px] text-neutral-400">
                      {item.subtitle}
                    </span>
                  )}
                </span>
                {item.tag && (
                  <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                    {type === "context" ? "#" : "@"}
                    {item.tag}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="border-t border-neutral-200 px-3 py-1.5 text-[10px] text-neutral-400 dark:border-neutral-800">
            ↑↓ navigate · Enter to select
          </div>
        )}
      </div>
  );

  if (variant === "inline") {
    return <div className="w-full shrink-0">{menuPanel}</div>;
  }

  return (
    <div
      className={`absolute left-0 z-50 w-full min-w-[220px] max-w-sm ${
        openBelow ? "top-full mt-1" : "bottom-full mb-1"
      }`}
    >
      {menuPanel}
    </div>
  );
}
