import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import type { GroupLinkKind } from "../types";
import type { DeleteGroupMode } from "../db/queries";

function invalidateGroups(
  qc: ReturnType<typeof useQueryClient>,
  groupId?: string,
) {
  qc.invalidateQueries({ queryKey: ["groups"] });
  if (groupId) {
    qc.invalidateQueries({ queryKey: ["groups", "detail", groupId] });
    qc.invalidateQueries({ queryKey: ["groups", "links", groupId] });
  }
}

export function useGroupsByContext(contextId: string | null) {
  return useQuery({
    queryKey: ["groups", contextId],
    queryFn: () => getGroupsByContext(contextId!),
    enabled: contextId !== null,
  });
}

export function useAllGroups() {
  return useQuery({
    queryKey: ["groups", "all"],
    queryFn: getAllGroups,
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

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useUpdateGroupDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      description,
    }: {
      groupId: string;
      description: string;
    }) => updateGroupDescription(groupId, description),
    onSuccess: (_data, variables) => invalidateGroups(qc, variables.groupId),
  });
}

export function useUpdateGroupName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      updateGroupName(groupId, name),
    onSuccess: (_data, variables) => invalidateGroups(qc, variables.groupId),
  });
}

export function useUpdateGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      color,
    }: {
      groupId: string;
      color: string | null;
    }) => updateGroupColor(groupId, color),
    onSuccess: (_data, variables) => invalidateGroups(qc, variables.groupId),
  });
}

export function useCreateGroupLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroupLink,
    onSuccess: (_data, variables) =>
      invalidateGroups(qc, variables.groupId),
  });
}

export function useUpdateGroupLink() {
  const qc = useQueryClient();
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
      invalidateGroups(qc, variables.groupId),
  });
}

export function useDeleteGroupLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId }: { linkId: string; groupId: string }) =>
      deleteGroupLink(linkId),
    onSuccess: (_data, variables) =>
      invalidateGroups(qc, variables.groupId),
  });
}

export function useReorderGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contextId,
      groupIds,
    }: {
      contextId: string;
      groupIds: string[];
    }) => reorderGroups(contextId, groupIds),
    onSuccess: () => invalidateGroups(qc),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      mode,
    }: {
      groupId: string;
      mode: DeleteGroupMode;
    }) => deleteGroup({ groupId, mode }),
    onSuccess: () => {
      invalidateGroups(qc);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
