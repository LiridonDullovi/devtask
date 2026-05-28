import { IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useContexts } from "../hooks/useContexts";
import { useTasks } from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: tasks = [] } = useTasks();
  const { data: contexts = [] } = useContexts();
  const { openTask } = useContextsStore();
  const { setSelectedTaskId } = useTasksStore();

  const contextMap = useMemo(
    () => Object.fromEntries(contexts.map((c) => [c.id, c])),
    [contexts],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 20);
    return tasks
      .filter((task) => task.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, tasks]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        selectTask(results[activeIndex].id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex, onClose]);

  function selectTask(taskId: string) {
    setSelectedTaskId(taskId);
    openTask(taskId);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[12vh] p-4">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tasks"
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
          <IconSearch size={16} className="shrink-0 text-neutral-400" stroke={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-neutral-400">
              No tasks found
            </li>
          ) : (
            results.map((task, index) => {
              const context = contextMap[task.context_id];
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => selectTask(task.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left ${
                      index === activeIndex
                        ? "bg-neutral-100 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: context?.color ?? "#378ADD" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-900 dark:text-neutral-100">
                      {task.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-neutral-400">
                      {context?.name}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
