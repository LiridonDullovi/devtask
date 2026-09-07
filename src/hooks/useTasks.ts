import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryScope } from "../db/dataScope";
import { scopeQueryKey } from "../db/dataScope";
import {
  createTask,
  cycleTaskState,
  deleteTask,
  getTask,
  getTasks,
  getChildTasks,
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
  updateTaskAssignee,
  updateTaskState,
} from "../db/queries";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { getSupabase } from "../lib/supabase";
import type { TaskRecurrence, TaskState } from "../types";
import { useDataScope } from "./useDataScope";

function refreshTaskViews(
  qc: ReturnType<typeof useQueryClient>,
  scope: QueryScope,
  taskId?: string,
): void {
  void invalidateScopedData(qc, scope);
  if (taskId) {
    void qc.invalidateQueries({
      queryKey: ["tasks", "detail", taskId],
      refetchType: "active",
    });
    void qc.invalidateQueries({
      queryKey: ["tasks", "children", taskId],
      refetchType: "active",
    });
  }
  void qc.invalidateQueries({
    queryKey: ["tasks", "children"],
    refetchType: "active",
  });
}

export function useTasks() {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["tasks"], dataScope),
    queryFn: () => getTasks(dataScope),
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: () => getTask(taskId!),
    enabled: taskId !== null,
  });
}

export function useChildTasks(parentId: string | null) {
  return useQuery({
    queryKey: ["tasks", "children", parentId],
    queryFn: () => getChildTasks(parentId!),
    enabled: parentId !== null,
  });
}

export function useTodayTasks() {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["tasks", "today"], dataScope),
    queryFn: () => getTodayTasks(dataScope),
  });
}

export function useContextTasks(contextId: string | null) {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["tasks", "context", contextId], dataScope),
    queryFn: () => getTasksByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useTaskNonGroupByContext(contextId: string | null) {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["tasks", "non-group", contextId], dataScope),
    queryFn: () => getTasksNonGroupByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useGroupTasks(groupId: string | null) {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["tasks", "group", groupId], dataScope),
    queryFn: () => getTasksByGroup(groupId!),
    enabled: groupId !== null,
  });
}

export type CreateTaskInput = Parameters<typeof createTask>[0] & {
  scopeOverride?: Parameters<typeof createTask>[1];
};

export function useCreateTask() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { scopeOverride, ...taskInput } = input;
      const scope = scopeOverride ?? dataScope;
      let createdById = taskInput.createdById;
      if (scope.kind === "workspace" && !createdById) {
        const { data } = await getSupabase().auth.getUser();
        createdById = data.user?.id;
      }
      return createTask({ ...taskInput, createdById }, scope);
    },
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, variables.scopeOverride ?? dataScope);
      if (variables.parentId) {
        void qc.invalidateQueries({
          queryKey: ["tasks", "children", variables.parentId],
          refetchType: "active",
        });
        void qc.invalidateQueries({
          queryKey: ["tasks", "detail", variables.parentId],
          refetchType: "active",
        });
      }
    },
  });
}

export function useUpdateTaskState() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({ taskId, state }: { taskId: string; state: TaskState }) =>
      updateTaskState(taskId, state),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useCycleTaskState() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: cycleTaskState,
    onSuccess: (_state, taskId) => {
      refreshTaskViews(qc, dataScope, taskId);
    },
  });
}

export function useToggleTaskToday() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: toggleTaskToday,
    onSuccess: (_data, taskId) => {
      refreshTaskViews(qc, dataScope, taskId);
    },
  });
}

export function useUpdateTaskDescription() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      taskId,
      description,
    }: {
      taskId: string;
      description: string;
    }) => updateTaskDescription(taskId, description),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useUpdateTaskDates() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
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
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useUpdateTaskGroup() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      taskId,
      groupId,
    }: {
      taskId: string;
      groupId: string | null;
    }) => updateTaskGroup(taskId, groupId),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useUpdateTaskContext() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      taskId,
      contextId,
    }: {
      taskId: string;
      contextId: string;
    }) => updateTaskContext(taskId, contextId),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useUpdateTaskRecurrence() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      taskId,
      recurrence,
    }: {
      taskId: string;
      recurrence: TaskRecurrence;
    }) => updateTaskRecurrence(taskId, recurrence),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useUpdateTaskAssignee() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      taskId,
      assigneeId,
    }: {
      taskId: string;
      assigneeId: string | null;
    }) => updateTaskAssignee(taskId, assigneeId),
    onSuccess: (_data, variables) => {
      refreshTaskViews(qc, dataScope, variables.taskId);
    },
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: reorderTasks,
    onSuccess: () => refreshTaskViews(qc, dataScope),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => refreshTaskViews(qc, dataScope),
  });
}
