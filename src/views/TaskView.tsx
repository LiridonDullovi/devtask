import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { DateField } from "../components/DateField";
import { DeleteTaskDialog } from "../components/DeleteTaskDialog";
import { GroupLinkPills } from "../components/GroupLinkPills";
import { MarkdownDescriptionField } from "../components/MarkdownDescriptionField";
import { Select } from "../components/Select";
import { useContexts } from "../hooks/useContexts";
import { useAllGroups, useGroup, useGroupLinks } from "../hooks/useGroups";
import {
  useCycleTaskState,
  useTask,
  useToggleTaskToday,
  useUpdateTaskContext,
  useUpdateTaskDates,
  useUpdateTaskDescription,
  useUpdateTaskGroup,
  useUpdateTaskRecurrence,
} from "../hooks/useTasks";
import { groupDisplayColor } from "../lib/colors";
import { RECURRENCE_OPTIONS } from "../lib/recurrence";
import { parseDateInput, toDateInputValue } from "../lib/taskDates";
import { STATE_LABELS, taskStateCheckboxClass } from "../lib/taskStates";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

export function TaskView() {
  const { activeTaskId, taskReturnTo, backFromTask } = useContextsStore();
  const { data: task } = useTask(activeTaskId);
  const { data: contexts = [] } = useContexts();
  const { data: allGroups = [] } = useAllGroups();
  const { data: assignedGroup } = useGroup(task?.group_id ?? null);
  const { data: groupLinks = [] } = useGroupLinks(task?.group_id ?? null);
  const updateDescription = useUpdateTaskDescription();
  const updateDates = useUpdateTaskDates();
  const updateGroup = useUpdateTaskGroup();
  const updateContext = useUpdateTaskContext();
  const updateRecurrence = useUpdateTaskRecurrence();
  const toggleToday = useToggleTaskToday();
  const cycleState = useCycleTaskState();
  const { setLastUsedContextId, setSelectedTaskId } = useTasksStore();

  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setDescription(task?.description ?? "");
    setStartDate(toDateInputValue(task?.start_date ?? null));
    setEndDate(toDateInputValue(task?.end_date ?? null));
  }, [task?.description, task?.start_date, task?.end_date, activeTaskId]);

  const context = contexts.find((c) => c.id === task?.context_id);
  const groupsByContext = useMemo(() => {
    const map = new Map<string, typeof allGroups>();
    for (const group of allGroups) {
      const list = map.get(group.context_id) ?? [];
      list.push(group);
      map.set(group.context_id, list);
    }
    return map;
  }, [allGroups]);

  const groupSelectGroups = useMemo(
    () =>
      contexts
        .map((ctx) => ({
          label: ctx.name,
          options: (groupsByContext.get(ctx.id) ?? []).map((g) => ({
            value: g.id,
            label: g.name,
            color: groupDisplayColor(g.color, ctx.color),
          })),
        }))
        .filter((g) => g.options.length > 0),
    [contexts, groupsByContext],
  );

  if (!activeTaskId || !task) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-neutral-400">
        Loading…
      </div>
    );
  }

  const taskId = activeTaskId;

  const backLabel =
    taskReturnTo?.view === "today"
      ? "Today"
      : taskReturnTo?.view === "all"
        ? "All tasks"
        : taskReturnTo?.view === "group"
          ? (allGroups.find((g) => g.id === taskReturnTo.groupId)?.name ??
            "Group")
          : taskReturnTo?.view === "context"
            ? (contexts.find((c) => c.id === taskReturnTo.contextId)?.name ??
              "Context")
            : "Back";

  async function saveDescription() {
    if (description === (task?.description ?? "")) return;
    await updateDescription.mutateAsync({
      taskId,
      description,
    });
  }

  async function saveDates() {
    const nextStart = parseDateInput(startDate);
    const nextEnd = parseDateInput(endDate);
    if (
      nextStart === (task?.start_date ?? null) &&
      nextEnd === (task?.end_date ?? null)
    ) {
      return;
    }
    await updateDates.mutateAsync({
      taskId,
      startDate: nextStart,
      endDate: nextEnd,
    });
  }

  function clearDates() {
    setStartDate("");
    setEndDate("");
    void updateDates.mutateAsync({
      taskId,
      startDate: null,
      endDate: null,
    });
  }

  return (
    <>
      <div className="border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={backFromTask}
            className="flex cursor-pointer items-center gap-1 text-[13px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <IconArrowLeft size={15} stroke={1.75} />
            {backLabel}
          </button>
          {assignedGroup && (
            <>
              <span className="text-neutral-300 dark:text-neutral-600">/</span>
              <span className="text-[13px] text-neutral-500">
                {assignedGroup.name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => cycleState.mutate(taskId)}
              aria-label="Cycle task state"
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${taskStateCheckboxClass(task.state)}`}
            />
            <div className="min-w-0 flex-1">
              <h1
                className={`text-[18px] font-medium leading-snug ${
                  task.state === "done"
                    ? "text-neutral-400 line-through"
                    : "text-neutral-900 dark:text-neutral-100"
                }`}
              >
                {task.title}
              </h1>
              <p className="mt-1 text-[12px] text-neutral-400">
                {STATE_LABELS[task.state]}
                {task.is_today ? " · On Today" : ""}
                {task.recurrence && task.recurrence !== "none"
                  ? ` · Repeats ${task.recurrence}`
                  : ""}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
              Description
            </label>
            <MarkdownDescriptionField
              value={description}
              onChange={setDescription}
              onBlur={() => void saveDescription()}
              rows={8}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">
                Deadline
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={clearDates}
                  className="cursor-pointer text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField
                label="Start"
                value={startDate}
                onChange={setStartDate}
                onCommit={() => void saveDates()}
                onClear={() => {
                  setStartDate("");
                  void updateDates.mutateAsync({
                    taskId,
                    startDate: null,
                    endDate: parseDateInput(endDate),
                  });
                }}
              />
              <DateField
                label="End"
                value={endDate}
                min={startDate || undefined}
                onChange={setEndDate}
                onCommit={() => void saveDates()}
                onClear={() => {
                  setEndDate("");
                  void updateDates.mutateAsync({
                    taskId,
                    startDate: parseDateInput(startDate),
                    endDate: null,
                  });
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
                Repeat
              </label>
              <Select
                value={task.recurrence ?? "none"}
                onChange={(recurrence) =>
                  void updateRecurrence.mutateAsync({
                    taskId,
                    recurrence: recurrence as typeof task.recurrence,
                  })
                }
                options={RECURRENCE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
                Context
              </label>
              {task.group_id ? (
                <>
                  <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: context?.color ?? "#378ADD" }}
                    />
                    <span className="text-[13px] text-neutral-700 dark:text-neutral-300">
                      {context?.name ?? "Unknown"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    Inherited from group — change group to move context.
                  </p>
                </>
              ) : (
                <Select
                  value={task.context_id}
                  onChange={(contextId) =>
                    void updateContext.mutateAsync({ taskId, contextId })
                  }
                  options={contexts.map((ctx) => ({
                    value: ctx.id,
                    label: ctx.name,
                    color: ctx.color,
                  }))}
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
                Group
              </label>
              <Select
                value={task.group_id ?? ""}
                onChange={(groupId) =>
                  void updateGroup.mutateAsync({
                    taskId,
                    groupId: groupId || null,
                  })
                }
                options={[{ value: "", label: "No group" }]}
                groups={groupSelectGroups}
              />
            </div>
          </div>

          {task.group_id && groupLinks.length > 0 && (
            <GroupLinkPills links={groupLinks} />
          )}

          <button
            type="button"
            onClick={() => {
              void toggleToday.mutateAsync(taskId);
              setLastUsedContextId(task.context_id);
            }}
            className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {task.is_today ? "Remove from Today" : "Add to Today"}
          </button>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
            >
              Delete task
            </button>
          </div>
        </div>
      </div>

      <DeleteTaskDialog
        open={showDeleteDialog}
        task={task}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => {
          setSelectedTaskId(null);
          backFromTask();
        }}
      />
    </>
  );
}
