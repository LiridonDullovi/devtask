import { IconFolderOpen, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getGroupLinkIcon, GroupLinkIcon } from "../lib/groupLinkIcon";
import { openGroupLink, pickFolder } from "../lib/openGroupLink";
import type { GroupLink, GroupLinkKind } from "../types";

interface GroupLinkRowProps {
  link: GroupLink;
  onSave: (updates: {
    label: string;
    url: string;
    kind: GroupLinkKind;
  }) => void;
  onDelete: () => void;
}

export function GroupLinkRow({ link, onSave, onDelete }: GroupLinkRowProps) {
  const [label, setLabel] = useState(link.label ?? "");
  const [url, setUrl] = useState(link.url);
  const [kind, setKind] = useState<GroupLinkKind>(link.kind);

  useEffect(() => {
    setLabel(link.label ?? "");
    setUrl(link.url);
    setKind(link.kind);
  }, [link.label, link.url, link.kind, link.id]);

  function save() {
    if (
      label === (link.label ?? "") &&
      url === link.url &&
      kind === link.kind
    ) {
      return;
    }
    onSave({ label, url, kind });
  }

  async function browseFolder() {
    const path = await pickFolder();
    if (!path) return;
    setUrl(path);
    if (!label.trim()) setLabel("Project");
    onSave({ label: label.trim() || "Project", url: path, kind: "folder" });
  }

  const iconLink = { ...link, label, url, kind };
  const { hint } = getGroupLinkIcon(iconLink);

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex w-16 shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-400"
        title={hint}
      >
        <GroupLinkIcon link={iconLink} size={14} />
        <span className="truncate">{hint}</span>
      </span>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={save}
        placeholder="Label"
        className="w-24 shrink-0 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={save}
        placeholder={kind === "folder" ? "/path/to/folder" : "https://…"}
        className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      {kind === "folder" && (
        <button
          type="button"
          onClick={() => void browseFolder()}
          className="shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900"
        >
          Browse
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          void openGroupLink({ ...link, label, url, kind }).catch(console.error)
        }
        className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-600"
        aria-label={kind === "folder" ? "Open folder" : "Open link"}
      >
        {kind === "folder" ? (
          <IconFolderOpen size={14} stroke={1.75} />
        ) : (
          <GroupLinkIcon link={iconLink} size={14} />
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 cursor-pointer rounded p-1 text-neutral-400 hover:text-red-500"
        aria-label="Delete link"
      >
        <IconTrash size={14} stroke={1.75} />
      </button>
    </div>
  );
}

interface AddGroupLinkFormProps {
  onAdd: (input: {
    label: string;
    url: string;
    kind: GroupLinkKind;
  }) => void | Promise<void>;
  onCancel: () => void;
}

export function AddGroupLinkForm({ onAdd, onCancel }: AddGroupLinkFormProps) {
  const [kind, setKind] = useState<GroupLinkKind>("url");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  async function handleBrowse() {
    const path = await pickFolder();
    if (!path) return;
    setUrl(path);
    if (!label.trim()) setLabel("Project");
    setKind("folder");
  }

  async function submit() {
    const value = url.trim();
    if (!value) return;
    await onAdd({
      label: label.trim() || (kind === "folder" ? "Project" : ""),
      url: value,
      kind,
    });
    setLabel("");
    setUrl("");
    setKind("url");
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div className="flex gap-1">
        {(["url", "folder"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] ${
              kind === k
                ? "bg-white font-medium text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {k === "url" ? "Website" : "Folder"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="w-28 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        {kind === "url" ? (
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-500">
              {url || "No folder selected"}
            </span>
            <button
              type="button"
              onClick={() => void handleBrowse()}
              className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
            >
              Choose folder…
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!url.trim()}
          className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer px-2 py-1.5 text-[12px] text-neutral-400 hover:text-neutral-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
