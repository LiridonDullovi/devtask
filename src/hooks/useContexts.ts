import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  deleteContext,
  getContextDeleteSummary,
  getContexts,
  updateContext,
  type DeleteContextMode,
} from "../db/queries";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["contexts"] });
  qc.invalidateQueries({ queryKey: ["tasks"] });
  qc.invalidateQueries({ queryKey: ["groups"] });
}

export function useContexts() {
  return useQuery({
    queryKey: ["contexts"],
    queryFn: getContexts,
  });
}

export function useCreateContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContext,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateContext() {
  const qc = useQueryClient();
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
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      contextId: string;
      mode: DeleteContextMode;
      reassignToContextId?: string;
    }) => deleteContext(input),
    onSuccess: () => invalidateAll(qc),
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
