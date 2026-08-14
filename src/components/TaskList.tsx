import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import { useMemo } from "react";
import type { Context, Group, Task } from "../types";
import { useDataScope } from "../hooks/useDataScope";
import { useWorkspaceMembers } from "../hooks/useWorkspaceMembers";
import { EmptyState } from "./EmptyState";
import { TASK_COLUMNS } from "../lib/taskStates";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  contexts: Context[];
  groups?: Group[];
  embedded?: boolean;
  sortable?: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onCycleState: (id: string) => void;
  onReorder?: (taskIds: string[]) => void;
  emptyTitle?: string;
  emptyHint?: string;
}

function SortableTaskRow({
  task,
  context,
  group,
  assigneeLabel,
  showStateBadge,
  selected,
  onSelect,
  onCycleState,
}: {
  task: Task;
  context?: Context;
  group?: Group;
  assigneeLabel?: string;
  showStateBadge?: boolean;
  selected: boolean;
  onSelect: () => void;
  onCycleState: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-0.5">
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${task.title}`}
        className="flex shrink-0 cursor-grab items-center px-0.5 text-neutral-300 hover:text-neutral-500 active:cursor-grabbing dark:text-neutral-600 dark:hover:text-neutral-400"
      >
        <IconGripVertical size={14} stroke={1.75} />
      </button>
      <div className="min-w-0 flex-1">
        <TaskItem
          task={task}
          context={context}
          group={group}
          assigneeLabel={assigneeLabel}
          showStateBadge={showStateBadge}
          selected={selected}
          onSelect={onSelect}
          onCycleState={onCycleState}
        />
      </div>
    </div>
  );
}

function TaskColumn({
  columnTasks,
  sortable,
  contextMap,
  groupMap,
  selectedTaskId,
  onSelectTask,
  onCycleState,
  onReorder,
  showStateBadge,
  assigneeLabels,
}: {
  columnTasks: Task[];
  sortable: boolean;
  contextMap: Record<string, Context>;
  groupMap: Record<string, Group>;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onCycleState: (id: string) => void;
  onReorder?: (taskIds: string[]) => void;
  showStateBadge?: boolean;
  assigneeLabels?: Record<string, string>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
    const newIndex = columnTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(columnTasks, oldIndex, newIndex);
    onReorder(reordered.map((t) => t.id));
  }

  const items = columnTasks.map((task) =>
    sortable ? (
      <SortableTaskRow
        key={task.id}
        task={task}
        context={contextMap[task.context_id]}
        group={task.group_id ? groupMap[task.group_id] : undefined}
        assigneeLabel={
          task.assignee_id ? assigneeLabels?.[task.assignee_id] : undefined
        }
        showStateBadge={showStateBadge}
        selected={selectedTaskId === task.id}
        onSelect={() => onSelectTask(task.id)}
        onCycleState={() => onCycleState(task.id)}
      />
    ) : (
      <TaskItem
        key={task.id}
        task={task}
        context={contextMap[task.context_id]}
        group={task.group_id ? groupMap[task.group_id] : undefined}
        assigneeLabel={
          task.assignee_id ? assigneeLabels?.[task.assignee_id] : undefined
        }
        showStateBadge={showStateBadge}
        selected={selectedTaskId === task.id}
        onSelect={() => onSelectTask(task.id)}
        onCycleState={() => onCycleState(task.id)}
      />
    ),
  );

  if (!sortable) return <>{items}</>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columnTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {items}
      </SortableContext>
    </DndContext>
  );
}

export function TaskList({
  tasks,
  contexts,
  groups = [],
  embedded = false,
  sortable = false,
  selectedTaskId,
  onSelectTask,
  onCycleState,
  onReorder,
  emptyTitle = "No tasks yet.",
  emptyHint = "Press N to capture one.",
}: TaskListProps) {
  const contextMap = Object.fromEntries(contexts.map((c) => [c.id, c]));
  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));
  const dataScope = useDataScope();
  const workspaceId =
    dataScope.kind === "workspace" ? dataScope.workspaceId : undefined;
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const assigneeLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.user_id] =
        member.display_name || member.email.split("@")[0];
    }
    return map;
  }, [members]);

  if (tasks.length === 0) {
    if (embedded && !emptyTitle) return null;
    return (
      <EmptyState title={emptyTitle} hint={emptyHint} embedded={embedded} />
    );
  }

  const listClass = embedded ? "py-3" : "flex-1 overflow-y-auto py-3";
  const boardClass = embedded
    ? "py-3"
    : "min-h-0 flex-1 overflow-hidden py-3";

  return (
    <>
      <div className={`flex flex-col gap-1 px-5 lg:hidden ${listClass}`}>
        {TASK_COLUMNS.map(({ key, label }) => {
          const columnTasks = tasks.filter((t) => t.state === key);
          if (columnTasks.length === 0) return null;

          return (
            <div key={key}>
              <div className="mb-1.5 mt-3 px-0.5 text-[11px] uppercase tracking-wider text-neutral-400 first:mt-0">
                {label}
              </div>
              <TaskColumn
                columnTasks={columnTasks}
                sortable={sortable}
                contextMap={contextMap}
                groupMap={groupMap}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onCycleState={onCycleState}
                onReorder={onReorder}
                assigneeLabels={assigneeLabels}
              />
            </div>
          );
        })}
      </div>

      <div className={`hidden min-h-0 gap-3 px-5 lg:grid lg:grid-cols-4 ${boardClass}`}>
        {TASK_COLUMNS.map(({ key, label }) => {
          const columnTasks = tasks.filter((t) => t.state === key);

          return (
            <section
              key={key}
              className="flex min-h-0 flex-col rounded-lg border border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/40"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {label}
                </span>
                <span className="rounded-full bg-neutral-200/80 px-1.5 py-px text-[10px] tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {columnTasks.length}
                </span>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[12px] text-neutral-400">
                    No tasks
                  </p>
                ) : (
                  <TaskColumn
                    columnTasks={columnTasks}
                    sortable={sortable}
                    contextMap={contextMap}
                    groupMap={groupMap}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={onSelectTask}
                    onCycleState={onCycleState}
                    onReorder={onReorder}
                    showStateBadge={false}
                    assigneeLabels={assigneeLabels}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
