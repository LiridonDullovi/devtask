import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { invalidateAllAppData } from "../lib/queryInvalidation";

/** Refreshes UI when a push conflict replaced local rows with cloud data. */
export function SyncConflictBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function onConflict() {
      void invalidateAllAppData(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["task-comments"] });
    }

    window.addEventListener("devtask-sync-conflict", onConflict);
    return () =>
      window.removeEventListener("devtask-sync-conflict", onConflict);
  }, [queryClient]);

  return null;
}
