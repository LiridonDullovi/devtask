import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadMoveHierarchy,
  moveGroup,
  moveTask,
  type MoveDestination,
} from "../db/moveItems";
import { invalidateAllAppData } from "../lib/queryInvalidation";

export function useMoveHierarchy(
  workspaceId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "move-hierarchy",
      workspaceId ?? "personal",
    ],
    queryFn: () => loadMoveHierarchy(workspaceId),
    enabled,
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      dest,
    }: {
      taskId: string;
      dest: MoveDestination;
    }) => moveTask(taskId, dest),
    onSuccess: async (_result, variables) => {
      await invalidateAllAppData(qc);
      void qc.invalidateQueries({
        queryKey: ["tasks", "detail", variables.taskId],
      });
      void qc.invalidateQueries({ queryKey: ["tasks", "children"] });
      void qc.invalidateQueries({ queryKey: ["move-hierarchy"] });
    },
  });
}

export function useMoveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      dest,
    }: {
      groupId: string;
      dest: { workspaceId: string | null; contextId: string };
    }) => moveGroup(groupId, dest),
    onSuccess: async (_result, variables) => {
      await invalidateAllAppData(qc);
      void qc.invalidateQueries({
        queryKey: ["groups", "detail", variables.groupId],
      });
      void qc.invalidateQueries({ queryKey: ["move-hierarchy"] });
    },
  });
}
