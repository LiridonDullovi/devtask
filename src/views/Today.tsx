import { TaskList } from "../components/TaskList";
import { ViewToolbar } from "../components/ViewToolbar";
import { useContexts } from "../hooks/useContexts";
import { useAllGroups } from "../hooks/useGroups";
import { useCycleTaskState, useTodayTasks, useReorderTasks } from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";

interface TodayProps {
  onAddTask: () => void;
}

export function Today({ onAddTask }: TodayProps) {
  const { data: tasks = [], isLoading } = useTodayTasks();
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
      <ViewToolbar title="Today" onAction={onAddTask} />
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
          emptyTitle="Nothing here yet."
          emptyHint="Press M on any task to add it to Today, or press N to capture a new one."
        />
      )}
    </div>
  );
}
