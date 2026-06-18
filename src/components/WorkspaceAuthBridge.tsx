import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { DEFAULT_WORKSPACE, getStoredActiveWorkspaceId } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";

/**
 * Resets workspace UI + query cache when auth session changes (sign out / switch user).
 */
export function WorkspaceAuthBridge() {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const { data: workspaces, isFetched } = useWorkspaces(userId);

  const resetForSignOut = useWorkspaceStore((s) => s.resetForSignOut);
  const resetWorkspaceSelection = useWorkspaceStore(
    (s) => s.resetWorkspaceSelection,
  );
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  useEffect(() => {
    if (loading) return;

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev === undefined) {
      return;
    }

    if (prev === userId) return;

    queryClient.removeQueries({ queryKey: ["workspaces"] });

    if (!userId) {
      resetForSignOut();
      return;
    }

    resetWorkspaceSelection();
  }, [
    userId,
    loading,
    queryClient,
    resetForSignOut,
    resetWorkspaceSelection,
  ]);

  useEffect(() => {
    if (!userId || !isFetched || workspaces === undefined) return;

    const { workspace } = useWorkspaceStore.getState();
    const storedId = getStoredActiveWorkspaceId(userId);
    const match =
      workspaces.find((w) => w.id === workspace.id) ??
      (storedId ? workspaces.find((w) => w.id === storedId) : undefined);

    if (match) {
      if (match.id !== workspace.id || match.name !== workspace.name) {
        setWorkspace(match, userId);
      }
      return;
    }

    if (workspaces.length > 0) {
      setWorkspace(workspaces[0], userId);
      return;
    }

    if (workspace.id !== DEFAULT_WORKSPACE.id) {
      resetWorkspaceSelection();
    }
  }, [
    userId,
    isFetched,
    workspaces,
    setWorkspace,
    resetWorkspaceSelection,
  ]);

  return null;
}
