import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryScope } from "../db/dataScope";
import { scopeQueryKey } from "../db/dataScope";
import {
  createGroup,
  createGroupLink,
  deleteGroup,
  deleteGroupLink,
  getAllGroups,
  getGroup,
  getGroupLinks,
  getGroupsByContext,
  updateGroupColor,
  updateGroupDescription,
  updateGroupLink,
  updateGroupName,
  reorderGroups,
} from "../db/queries";
import { invalidateScopedData } from "../lib/queryInvalidation";
import type { GroupLinkKind } from "../types";
import type { DeleteGroupMode } from "../db/queries";
import { useDataScope } from "./useDataScope";

function refreshGroupViews(
  qc: ReturnType<typeof useQueryClient>,
  scope: QueryScope,
  groupId?: string,
): void {
  void invalidateScopedData(qc, scope);
  if (groupId) {
    void qc.invalidateQueries({
      queryKey: ["groups", "detail", groupId],
      refetchType: "active",
    });
    void qc.invalidateQueries({
      queryKey: ["groups", "links", groupId],
      refetchType: "active",
    });
  }
}

export function useGroupsByContext(contextId: string | null) {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["groups", contextId], dataScope),
    queryFn: () => getGroupsByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useAllGroups() {
  const dataScope = useDataScope();
  return useQuery({
    queryKey: scopeQueryKey(["groups", "all"], dataScope),
    queryFn: () => getAllGroups(dataScope),
  });
}

export function useGroup(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", "detail", groupId],
    queryFn: () => getGroup(groupId!),
    enabled: groupId !== null,
  });
}

export function useGroupLinks(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", "links", groupId],
    queryFn: () => getGroupLinks(groupId!),
    enabled: groupId !== null,
  });
}

export type CreateGroupInput = Parameters<typeof createGroup>[0] & {
  scopeOverride?: Parameters<typeof createGroup>[1];
};

export function useCreateGroup() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => {
      const { scopeOverride, ...groupInput } = input;
      return createGroup(groupInput, scopeOverride ?? dataScope);
    },
    onSuccess: (_data, variables) => {
      refreshGroupViews(qc, variables.scopeOverride ?? dataScope);
    },
  });
}

export function useUpdateGroupDescription() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      groupId,
      description,
    }: {
      groupId: string;
      description: string;
    }) => updateGroupDescription(groupId, description),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useUpdateGroupName() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      updateGroupName(groupId, name),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useUpdateGroupColor() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      groupId,
      color,
    }: {
      groupId: string;
      color: string | null;
    }) => updateGroupColor(groupId, color),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useCreateGroupLink() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: (input: Parameters<typeof createGroupLink>[0]) =>
      createGroupLink(input, dataScope),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useUpdateGroupLink() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      linkId,
      label,
      url,
      kind,
    }: {
      linkId: string;
      groupId: string;
      label?: string;
      url?: string;
      kind?: GroupLinkKind;
    }) => updateGroupLink(linkId, { label, url, kind }),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useDeleteGroupLink() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({ linkId }: { linkId: string; groupId: string }) =>
      deleteGroupLink(linkId),
    onSuccess: (_data, variables) =>
      refreshGroupViews(qc, dataScope, variables.groupId),
  });
}

export function useReorderGroups() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      contextId,
      groupIds,
    }: {
      contextId: string;
      groupIds: string[];
    }) => reorderGroups(contextId, groupIds),
    onSuccess: () => refreshGroupViews(qc, dataScope),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const dataScope = useDataScope();
  return useMutation({
    mutationFn: ({
      groupId,
      mode,
    }: {
      groupId: string;
      mode: DeleteGroupMode;
    }) => deleteGroup({ groupId, mode }),
    onSuccess: () => refreshGroupViews(qc, dataScope),
  });
}
