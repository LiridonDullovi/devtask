import { TaskList } from "../components/TaskList";
import { ViewToolbar } from "../components/ViewToolbar";
import { useContexts } from "../hooks/useContexts";
import { useAllGroups } from "../hooks/useGroups";
import { useCycleTaskState, useTasks, useReorderTasks } from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

interface AllTasksProps {
  onAddTask: () => void;
}

export function AllTasks({ onAddTask }: AllTasksProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: contexts = [] } = useContexts();
  const { data: groups = [] } = useAllGroups();
  const { openTask } = useContextsStore();
  const { selectedTaskId, setSelectedTaskId } = useTasksStore();
  const cycleState = useCycleTaskState();
  const reorderTasks = useReorderTasks();

  function handleOpenTask(taskId: string) {
    setSelectedTaskId(taskId);
    openTask(taskId);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ViewToolbar title="All tasks" onAction={onAddTask} />
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-neutral-400">
          Loading…
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          contexts={contexts}
          groups={groups}
          sortable
          selectedTaskId={selectedTaskId}
          onSelectTask={handleOpenTask}
          onCycleState={(id) => cycleState.mutate(id)}
          onReorder={(taskIds) => reorderTasks.mutate(taskIds)}
          emptyTitle="No tasks yet."
          emptyHint="Press N to capture your first task."
        />
      )}
    </div>
  );
}
