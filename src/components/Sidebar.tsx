import {
  IconLayoutList,
  IconPlus,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";
import { AddContextDialog } from "./AddContextDialog";
import { ThemeToggle } from "./ThemeToggle";
import { useContexts } from "../hooks/useContexts";
import { useTasks } from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto rounded-[10px] border border-neutral-200 bg-neutral-100 px-[7px] py-px text-[11px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500 [.active_&]:bg-neutral-200 dark:[.active_&]:bg-neutral-700">
      {count}
    </span>
  );
}

function SidebarItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full border ${!active ? "border-transparent" : ""} cursor-pointer items-center gap-2 rounded-md px-2 py-[7px] text-[13px] text-neutral-500 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900 ${
        active
          ? "active border-neutral-200 bg-white font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          : ""
      }`}
    >
      {children}
    </button>
  );
}

export function Sidebar() {
  const { activeView, activeContextId, setView, setContext } =
    useContextsStore();
  const { data: contexts = [] } = useContexts();
  const { data: tasks = [] } = useTasks();
  const { setLastUsedContextId } = useTasksStore();
  const [showAddContext, setShowAddContext] = useState(false);

  const counts = useMemo(() => {
    const active = tasks.filter((t) => !t.archived_at);
    return {
      today: active.filter((t) => t.is_today === 1).length,
      all: active.length,
      byContext: Object.fromEntries(
        contexts.map((ctx) => [
          ctx.id,
          active.filter((t) => t.context_id === ctx.id).length,
        ]),
      ),
    };
  }, [tasks, contexts]);

  return (
    <>
      <aside className="flex h-full w-[200px] shrink-0 flex-col gap-1 border-r border-neutral-200 bg-neutral-50 p-3 px-3 dark:border-neutral-800 dark:bg-neutral-950">
        <SidebarItem
          active={activeView === "today"}
          onClick={() => setView("today")}
        >
          <IconSun size={15} className="text-[#E24B4A]" stroke={1.75} />
          Today
          <CountBadge count={counts.today} />
        </SidebarItem>

        <SidebarItem active={activeView === "all"} onClick={() => setView("all")}>
          <IconLayoutList size={15} stroke={1.75} />
          All tasks
          <CountBadge count={counts.all} />
        </SidebarItem>

        <div className="mb-1 mt-3 flex items-center justify-between px-2">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">
            Contexts
          </span>
          <button
            type="button"
            onClick={() => setShowAddContext(true)}
            title="Add context"
            className="flex cursor-pointer items-center justify-center rounded p-0.5 text-neutral-400 hover:bg-white hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
          >
            <IconPlus size={14} stroke={1.75} />
          </button>
        </div>

        {contexts.map((ctx) => (
          <SidebarItem
            key={ctx.id}
            active={
              (activeView === "context" || activeView === "group") &&
              activeContextId === ctx.id
            }
            onClick={() => setContext(ctx.id)}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: ctx.color }}
            />
            {ctx.name}
            <CountBadge count={counts.byContext[ctx.id] ?? 0} />
          </SidebarItem>
        ))}

        {contexts.length === 1 && (
          <p className="px-2 py-1.5 text-[11px] leading-relaxed text-neutral-400">
            Add more contexts with + above
          </p>
        )}

        <div className="mt-auto flex flex-col gap-1 pt-2">
          <SidebarItem
            active={activeView === "settings"}
            onClick={() => setView("settings")}
          >
            <IconSettings size={15} stroke={1.75} />
            Settings
          </SidebarItem>
          <ThemeToggle />
        </div>
      </aside>

      <AddContextDialog
        open={showAddContext}
        onClose={() => setShowAddContext(false)}
        onCreated={(contextId) => {
          setContext(contextId);
          setLastUsedContextId(contextId);
        }}
      />
    </>
  );
}
