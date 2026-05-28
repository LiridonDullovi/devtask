import { useState } from "react";
import { DeleteContextDialog } from "../components/DeleteContextDialog";
import { EditContextDialog } from "../components/EditContextDialog";
import { EmptyState } from "../components/EmptyState";
import { MarkdownContent } from "../components/MarkdownContent";
import { SortableGroupGrid } from "../components/SortableGroupGrid";
import { TaskList } from "../components/TaskList";
import { ViewToolbar } from "../components/ViewToolbar";
import { useContexts } from "../hooks/useContexts";
import { useCreateGroup, useGroupsByContext, useReorderGroups } from "../hooks/useGroups";
import {
  useCycleTaskState,
  useReorderTasks,
  useTaskNonGroupByContext,
} from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

interface ContextViewProps {
  onAddTask: () => void;
}

export function ContextView({ onAddTask }: ContextViewProps) {
  const { activeContextId, setGroup, openTask, setView } = useContextsStore();
  const { data: contexts = [] } = useContexts();
  const { data: groups = [], isLoading: groupsLoading } =
    useGroupsByContext(activeContextId);
  const { data: ungroupedTasks = [], isLoading: tasksLoading } =
    useTaskNonGroupByContext(activeContextId);
  const createGroup = useCreateGroup();
  const cycleState = useCycleTaskState();
  const reorderGroups = useReorderGroups();
  const reorderTasks = useReorderTasks();
  const { selectedTaskId, setSelectedTaskId, setLastUsedContextId } =
    useTasksStore();
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const context = contexts.find((c) => c.id === activeContextId);
  const title = context?.name ?? "Context";
  const isLoading = groupsLoading || tasksLoading;
  const hasNoContent =
    !isLoading && groups.length === 0 && ungroupedTasks.length === 0;
  const otherContexts = contexts.filter((c) => c.id !== activeContextId);
  const canDelete = contexts.length > 1 && !!context;

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name || !activeContextId) return;
    await createGroup.mutateAsync({ contextId: activeContextId, name });
    setNewGroupName("");
    setShowNewGroup(false);
  }

  function cancelNewGroup() {
    setShowNewGroup(false);
    setNewGroupName("");
  }

  function handleOpenTask(taskId: string) {
    setSelectedTaskId(taskId);
    openTask(taskId);
  }

  function handleDeleted() {
    const fallback = otherContexts[0];
    if (fallback) {
      setLastUsedContextId(fallback.id);
    }
    setView("today");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ViewToolbar
        title={title}
        actions={[
          { label: "Edit context", onClick: () => setShowEditDialog(true), icon: "pencil" as const },
          { label: "Add group", onClick: () => setShowNewGroup(true) },
          { label: "Add task", onClick: onAddTask },
          ...(canDelete
            ? [
                {
                  label: "Delete context",
                  onClick: () => setShowDeleteDialog(true),
                  variant: "danger" as const,
                  icon: "trash" as const,
                },
              ]
            : []),
        ]}
      />
      {context?.description && (
        <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <MarkdownContent source={context.description} />
        </div>
      )}
      {contexts.length === 1 && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
            Contexts organize tasks by area. Use{" "}
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              + in the sidebar
            </span>{" "}
            to add Work, Personal, or other contexts — or edit this one&apos;s
            name above.
          </p>
        </div>
      )}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-neutral-400">
          Loading…
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {hasNoContent && !showNewGroup && (
            <EmptyState
              embedded
              title="Nothing here yet."
              hint="Add a group to organize projects, or press N to capture a task."
            />
          )}

          {showNewGroup && (
            <div className="flex gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <input
                autoFocus
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateGroup();
                  if (e.key === "Escape") cancelNewGroup();
                }}
                placeholder="Group name…"
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={!newGroupName.trim()}
                className="cursor-pointer rounded-md border border-neutral-200 bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Create
              </button>
              <button
                type="button"
                onClick={cancelNewGroup}
                className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          )}

          <section className="px-5 py-4">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-neutral-400">
              Groups
            </h2>

            {groups.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-neutral-400">
                No groups yet — click Add group to create one.
              </p>
            ) : (
              context && (
                <SortableGroupGrid
                  groups={groups}
                  context={context}
                  onSelectGroup={(groupId) => setGroup(context.id, groupId)}
                  onReorder={(groupIds) => {
                    if (activeContextId) {
                      reorderGroups.mutate({
                        contextId: activeContextId,
                        groupIds,
                      });
                    }
                  }}
                />
              )
            )}
          </section>

          {ungroupedTasks.length > 0 && (
            <section className="border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="px-5 pb-1 pt-4 text-[11px] uppercase tracking-wider text-neutral-400">
                Ungrouped tasks
              </h2>
              <TaskList
                embedded
                tasks={ungroupedTasks}
                contexts={contexts}
                sortable
                selectedTaskId={selectedTaskId}
                onSelectTask={handleOpenTask}
                onCycleState={(id) => cycleState.mutate(id)}
                onReorder={(taskIds) => reorderTasks.mutate(taskIds)}
                emptyTitle=""
              />
            </section>
          )}
        </div>
      )}

      <DeleteContextDialog
        open={showDeleteDialog}
        context={context ?? null}
        otherContexts={otherContexts}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={handleDeleted}
      />

      <EditContextDialog
        open={showEditDialog}
        context={context ?? null}
        onClose={() => setShowEditDialog(false)}
      />
    </div>
  );
}
