import type { GroupLink } from "../types";
import {
  getGroupLinkDisplayLabel,
  getGroupLinkIcon,
  GroupLinkIcon,
} from "../lib/groupLinkIcon";
import { openGroupLink } from "../lib/openGroupLink";

interface GroupLinkPillsProps {
  links: GroupLink[];
  title?: string;
  emptyMessage?: string;
}

export function GroupLinkPills({
  links,
  title = "Group links",
  emptyMessage,
}: GroupLinkPillsProps) {
  if (links.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div>
        {title && (
          <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
            {title}
          </span>
        )}
        <p className="text-[12px] text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
          {title}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const { hint } = getGroupLinkIcon(link);
          const label = getGroupLinkDisplayLabel(link);

          return (
            <button
              key={link.id}
              type="button"
              onClick={() => void openGroupLink(link).catch(console.error)}
              title={link.url}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[12px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <GroupLinkIcon link={link} />
              <span className="max-w-[12rem] truncate">{label}</span>
              <span className="text-[10px] text-neutral-400">{hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
