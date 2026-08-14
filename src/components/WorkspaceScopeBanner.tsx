import { IconCloud } from "@tabler/icons-react";
import { useWorkspaceStore } from "../store/workspace";

/** Shown in main content when Workspace scope is selected but sync is not live yet. */
export function WorkspaceScopeBanner() {
  const { scope } = useWorkspaceStore();

  if (scope !== "workspace") return null;

  return (
    <div className="flex shrink-0 items-start gap-2.5 border-b border-[#E6F1FB] bg-[#F5FAFF] px-5 py-2.5 dark:border-[#378ADD]/30 dark:bg-[#378ADD]/10">
      <IconCloud
        size={16}
        stroke={1.75}
        className="mt-0.5 shrink-0 text-[#378ADD]"
      />
      <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">
          Team workspace
        </span>{" "}
        — Tasks sync with Supabase for the active workspace. Personal mode stays
        local-only on this device.
      </p>
    </div>
  );
}
