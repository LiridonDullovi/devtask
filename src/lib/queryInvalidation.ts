import type { QueryClient } from "@tanstack/react-query";
import type { QueryScope } from "../db/dataScope";

const DATA_ROOTS = new Set(["contexts", "tasks", "groups"]);

function scopeTag(scope: QueryScope): string {
  return scope.kind === "workspace" ? scope.workspaceId : "personal";
}

/** True when a React Query key belongs to contexts/tasks/groups for this scope. */
export function matchesQueryScope(
  queryKey: readonly unknown[],
  scope: QueryScope,
): boolean {
  const root = queryKey[0];
  if (typeof root !== "string" || !DATA_ROOTS.has(root)) return false;
  return queryKey.includes(scopeTag(scope));
}

/** Invalidate + refetch active queries for one personal/workspace data scope. */
export async function invalidateScopedData(
  queryClient: QueryClient,
  scope: QueryScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => matchesQueryScope(query.queryKey, scope),
    refetchType: "active",
  });
}

/** Invalidate + refetch all task hierarchy queries (every scope). */
export async function invalidateAllAppData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    [...DATA_ROOTS].map((root) =>
      queryClient.invalidateQueries({
        queryKey: [root],
        refetchType: "active",
      }),
    ),
  );
}
