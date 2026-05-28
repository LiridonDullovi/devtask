import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initializeDemoSetup,
  initializeFreshSetup,
  isSetupComplete,
} from "../db/queries";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["app", "setup"] });
  qc.invalidateQueries({ queryKey: ["contexts"] });
  qc.invalidateQueries({ queryKey: ["tasks"] });
  qc.invalidateQueries({ queryKey: ["groups"] });
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
