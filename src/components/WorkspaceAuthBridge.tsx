import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useWorkspaces } from "../hooks/useWorkspaces";
import {
  DEFAULT_WORKSPACE,
  getStoredActiveWorkspaceId,
  getStoredPersonalSyncEnabled,
  getStoredPersonalWorkspaceId,
} from "../lib/workspace";
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
  const hydratePersonalSync = useWorkspaceStore((s) => s.hydratePersonalSync);

  useEffect(() => {
    if (loading) return;

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev === undefined) {
      // Initial mount with an already-established session (e.g. app restart
      // while signed in) — hydrate personal-sync state without treating it
      // as a sign-in transition.
      if (userId) {
        hydratePersonalSync(
          getStoredPersonalWorkspaceId(userId),
          getStoredPersonalSyncEnabled(userId),
        );
      }
      return;
    }

    if (prev === userId) return;

    queryClient.removeQueries({ queryKey: ["workspaces"] });

    if (!userId) {
      resetForSignOut();
      return;
    }

    hydratePersonalSync(
      getStoredPersonalWorkspaceId(userId),
      getStoredPersonalSyncEnabled(userId),
    );
    resetWorkspaceSelection();
  }, [
    userId,
    loading,
    queryClient,
    resetForSignOut,
    resetWorkspaceSelection,
    hydratePersonalSync,
  ]);

  useEffect(() => {
    if (!userId || !isFetched || workspaces === undefined) return;

    const teamWorkspaces = workspaces.filter((w) => !w.is_personal);
    const { workspace } = useWorkspaceStore.getState();
    const storedId = getStoredActiveWorkspaceId(userId);
    const match =
      teamWorkspaces.find((w) => w.id === workspace.id) ??
      (storedId ? teamWorkspaces.find((w) => w.id === storedId) : undefined);

    if (match) {
      if (match.id !== workspace.id || match.name !== workspace.name) {
        setWorkspace(match, userId);
      }
      return;
    }

    if (teamWorkspaces.length > 0) {
      setWorkspace(teamWorkspaces[0], userId);
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
