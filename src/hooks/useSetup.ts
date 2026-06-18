import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initializeDemoSetup,
  initializeFreshSetup,
  isSetupComplete,
} from "../db/queries";

import { invalidateAllAppData } from "../lib/queryInvalidation";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({
    queryKey: ["app", "setup"],
    refetchType: "active",
  });
  void invalidateAllAppData(qc);
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ["app", "setup"],
    queryFn: isSetupComplete,
  });
}

export function useInitializeFreshSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: initializeFreshSetup,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useInitializeDemoSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: initializeDemoSetup,
    onSuccess: () => invalidateAll(qc),
  });
}
