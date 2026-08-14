import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
  updateTaskComment,
} from "../db/taskComments";
import { getSupabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { useDataScope } from "./useDataScope";

function taskCommentsKey(taskId: string) {
  return ["task-comments", taskId] as const;
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: taskCommentsKey(taskId ?? ""),
    queryFn: () => getTaskComments(taskId!),
    enabled: taskId !== null,
  });
}

export function useCreateTaskComment(taskId: string) {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (body: string) => {
      if (dataScope.kind !== "workspace") {
        throw new Error("Comments are only available in workspace mode.");
      }
      let authorId = user?.id;
      if (!authorId) {
        const { data } = await getSupabase().auth.getUser();
        authorId = data.user?.id;
      }
      if (!authorId) throw new Error("Sign in to comment.");

      return createTaskComment({
        taskId,
        workspaceId: dataScope.workspaceId,
        authorId,
        body,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskCommentsKey(taskId) });
    },
  });
}

export function useUpdateTaskComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      body,
    }: {
      commentId: string;
      body: string;
    }) => updateTaskComment(commentId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskCommentsKey(taskId) });
    },
  });
}

export function useDeleteTaskComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskCommentsKey(taskId) });
    },
  });
}
