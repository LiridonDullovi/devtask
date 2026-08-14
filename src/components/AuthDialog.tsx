import { Dialog } from "./Dialog";
import { WorkspaceAuthPanel } from "./WorkspaceAuthPanel";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  return (
    <Dialog open={open} title="Sign in to DevTask" onClose={onClose}>
      <WorkspaceAuthPanel />
    </Dialog>
  );
}
