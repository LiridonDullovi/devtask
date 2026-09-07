import { useState } from "react";
import { taskStateCheckboxClass } from "../lib/taskStates";
import {
  useChildTasks,
  useCreateTask,
  useCycleTaskState,
} from "../hooks/useTasks";
import type { Task } from "../types";

interface TaskSubtasksSectionProps {
  parent: Task;
  onOpenTask: (taskId: string) => void;
}

export function TaskSubtasksSection({
  parent,
  onOpenTask,
}: TaskSubtasksSectionProps) {
  const { data: children = [] } = useChildTasks(parent.id);
  const createTask = useCreateTask();
  const cycleState = useCycleTaskState();
  const [title, setTitle] = useState("");

  if (parent.parent_id) return null;

  const doneCount = children.filter((child) => child.state === "done").length;

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;
    await createTask.mutateAsync({
      title: trimmed,
      contextId: parent.context_id,
      groupId: parent.group_id,
      parentId: parent.id,
    });
    setTitle("");
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="block text-[11px] uppercase tracking-wider text-neutral-400">
          Subtasks
        </label>
        {children.length > 0 && (
          <span className="text-[11px] tabular-nums text-neutral-400">
            {doneCount}/{children.length}
          </span>
        )}
      </div>

      {children.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-2 dark:border-neutral-800"
            >
              <button
                type="button"
                onClick={() => cycleState.mutate(child.id)}
                aria-label={`Cycle state of "${child.title}"`}
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${taskStateCheckboxClass(child.state)}`}
              />
              <button
                type="button"
                onClick={() => onOpenTask(child.id)}
                className={`min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] ${
                  child.state === "done"
                    ? "text-neutral-400 line-through"
                    : "text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {child.title}
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleAdd();
          }
        }}
        placeholder="Add a subtask…"
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-600"
      />
    </div>
  );
}
