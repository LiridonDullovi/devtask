import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { scopeQueryKey } from "../db/dataScope";
import {
  createContext,
  deleteContext,
  getContextDeleteSummary,
  getContexts,
  updateContext,
  type DeleteContextMode,
} from "../db/queries";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { useDataScope } from "./useDataScope";

export function useContexts() {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["contexts"], dataScope),
    queryFn: () => getContexts(dataScope),
  });
}

export function useCreateContext() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) =>
      createContext(input, dataScope),
    onSuccess: () => void invalidateScopedData(qc, dataScope),
  });
}

export function useUpdateContext() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      contextId,
      name,
      color,
      description,
    }: {
      contextId: string;
      name?: string;
      color?: string;
      description?: string;
    }) => updateContext(contextId, { name, color, description }),
    onSuccess: () => void invalidateScopedData(qc, dataScope),
  });
}

export function useDeleteContext() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: (input: {
      contextId: string;
      mode: DeleteContextMode;
      reassignToContextId?: string;
    }) => deleteContext(input, dataScope),
    onSuccess: () => void invalidateScopedData(qc, dataScope),
  });
}

export function useContextDeleteSummary(
  contextId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["contexts", "delete-summary", contextId],
    queryFn: () => getContextDeleteSummary(contextId!),
    enabled: enabled && contextId !== null,
  });
}
