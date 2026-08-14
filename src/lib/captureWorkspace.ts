import type { DataScope } from "../types/workspace";
import {
  DEFAULT_WORKSPACE,
  storeCaptureWorkspace,
} from "./workspace";
import { useWorkspaceStore } from "../store/workspace";

export function applyCaptureWorkspace(
  scope: DataScope,
  workspace?: { id: string; name: string } | null,
): void {
  const { setScope, setWorkspace } = useWorkspaceStore.getState();
  setScope(scope);
  if (scope === "workspace" && workspace) {
    setWorkspace({ id: workspace.id, name: workspace.name, plan: "free" });
    storeCaptureWorkspace(workspace);
    return;
  }
  setWorkspace({ ...DEFAULT_WORKSPACE });
  storeCaptureWorkspace(null);
}
