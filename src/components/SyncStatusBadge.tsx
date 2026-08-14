import {
  IconCloud,
  IconCloudOff,
  IconCloudUpload,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import type { CloudSyncStatus } from "../types/workspace";
import { SYNC_STATUS_LABELS } from "../lib/workspace";

interface SyncStatusBadgeProps {
  status: CloudSyncStatus;
  lastSyncedAt?: string | null;
  compact?: boolean;
}

function StatusIcon({ status }: { status: CloudSyncStatus }) {
  const className = "shrink-0";
  const stroke = 1.75;
  switch (status) {
    case "syncing":
      return (
        <IconLoader2
          size={14}
          stroke={stroke}
          className={`${className} animate-spin text-[#378ADD]`}
        />
      );
    case "synced":
    case "idle":
      return (
        <IconCloud size={14} stroke={stroke} className={`${className} text-[#1D9E75]`} />
      );
    case "error":
      return (
        <IconRefresh size={14} stroke={stroke} className={`${className} text-[#E24B4A]`} />
      );
    case "disconnected":
      return (
        <IconCloudUpload
          size={14}
          stroke={stroke}
          className={`${className} text-neutral-400`}
        />
      );
    default:
      return (
        <IconCloudOff size={14} stroke={stroke} className={`${className} text-neutral-400`} />
      );
  }
}

export function SyncStatusBadge({
  status,
  lastSyncedAt,
  compact = false,
}: SyncStatusBadgeProps) {
  const label = SYNC_STATUS_LABELS[status];
  const detail =
    status === "synced" && lastSyncedAt
      ? `Last sync ${formatRelativeTime(lastSyncedAt)}`
      : null;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400"
        title={detail ?? label}
      >
        <StatusIcon status={status} />
        <span className="hidden sm:inline">{label}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
        <StatusIcon status={status} />
        {label}
      </span>
      {detail && (
        <span className="text-[10px] text-neutral-400">{detail}</span>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
