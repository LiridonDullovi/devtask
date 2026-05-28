import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createTask,
  cycleTaskState,
  deleteTask,
  getTask,
  getTasks,
  getTasksNonGroupByContext,
  getTasksByContext,
  getTasksByGroup,
  getTodayTasks,
  reorderTasks,
  toggleTaskToday,
  updateTaskContext,
  updateTaskDates,
  updateTaskDescription,
  updateTaskGroup,
  updateTaskRecurrence,
  updateTaskState,
} from "../db/queries";
import type { TaskRecurrence, TaskState } from "../types";

function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["tasks"] });
  qc.invalidateQueries({ queryKey: ["groups"] });
}

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: getTasks });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: () => getTask(taskId!),
    enabled: taskId !== null,
  });
}

export function useTodayTasks() {
  return useQuery({ queryKey: ["tasks", "today"], queryFn: getTodayTasks });
}

export function useContextTasks(contextId: string | null) {
  return useQuery({
    queryKey: ["tasks", "context", contextId],
    queryFn: () => getTasksByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useTaskNonGroupByContext(contextId: string | null) {
  return useQuery({
    queryKey: ["tasks", "non-group", contextId],
    queryFn: () => getTasksNonGroupByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useGroupTasks(groupId: string | null) {
  return useQuery({
    queryKey: ["tasks", "group", groupId],
    queryFn: () => getTasksByGroup(groupId!),
    enabled: groupId !== null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, state }: { taskId: string; state: TaskState }) =>
      updateTaskState(taskId, state),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useCycleTaskState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cycleTaskState,
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useToggleTaskToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleTaskToday,
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      description,
    }: {
      taskId: string;
      description: string;
    }) => updateTaskDescription(taskId, description),
    onSuccess: (_data, variables) => {
      invalidateTasks(qc);
      qc.invalidateQueries({
        queryKey: ["tasks", "detail", variables.taskId],
      });
    },
  });
}

export function useUpdateTaskDates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      startDate,
      endDate,
    }: {
      taskId: string;
      startDate: string | null;
      endDate: string | null;
    }) => updateTaskDates(taskId, { startDate, endDate }),
    onSuccess: (_data, variables) => {
      invalidateTasks(qc);
      qc.invalidateQueries({
        queryKey: ["tasks", "detail", variables.taskId],
      });
    },
  });
}

export function useUpdateTaskGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      groupId,
    }: {
      taskId: string;
      groupId: string | null;
    }) => updateTaskGroup(taskId, groupId),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      contextId,
    }: {
      taskId: string;
      contextId: string;
    }) => updateTaskContext(taskId, contextId),
    onSuccess: (_data, variables) => {
      invalidateTasks(qc);
      qc.invalidateQueries({
        queryKey: ["tasks", "detail", variables.taskId],
      });
    },
  });
}

export function useUpdateTaskRecurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      recurrence,
    }: {
      taskId: string;
      recurrence: TaskRecurrence;
    }) => updateTaskRecurrence(taskId, recurrence),
    onSuccess: (_data, variables) => {
      invalidateTasks(qc);
      qc.invalidateQueries({
        queryKey: ["tasks", "detail", variables.taskId],
      });
    },
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderTasks,
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => invalidateTasks(qc),
  });
}
