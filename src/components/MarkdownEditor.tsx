import { IconPhoto } from "@tabler/icons-react";
import { useEffect, useId, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

type EditorTab = "write" | "preview";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: number;
  id?: string;
  /** When set, shows an image upload control (workspace tasks). Returns markdown snippet. */
  onImageUpload?: (file: File) => Promise<string>;
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write in Markdown…",
  minHeight = 120,
  id,
  onImageUpload,
}: MarkdownEditorProps) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<EditorTab>("write");
  const [draft, setDraft] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleDraftChange(next: string) {
    setDraft(next);
    onChange(next);
  }

  function insertSnippet(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleDraftChange(`${draft}${draft.endsWith("\n") || !draft ? "" : "\n"}${snippet}\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${draft.slice(0, start)}${snippet}${draft.slice(end)}`;
    handleDraftChange(next);
    const cursor = start + snippet.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleImageSelected(file: File | undefined) {
    if (!file || !onImageUpload) return;
    setUploadError(null);
    setUploading(true);
    try {
      const snippet = await onImageUpload(file);
      insertSnippet(`\n${snippet}\n`);
      setTab("write");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700">
      <div className="flex border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setTab("write")}
          className={`cursor-pointer px-3 py-2 text-[12px] ${
            tab === "write"
              ? "border-b-2 border-neutral-900 font-medium text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setTab("preview")}
          className={`cursor-pointer px-3 py-2 text-[12px] ${
            tab === "preview"
              ? "border-b-2 border-neutral-900 font-medium text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          }`}
        >
          Preview
        </button>
        {onImageUpload && tab === "write" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => void handleImageSelected(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto flex cursor-pointer items-center gap-1 px-3 py-2 text-[12px] text-neutral-400 hover:text-neutral-600 disabled:opacity-50 dark:hover:text-neutral-300"
            >
              <IconPhoto size={14} stroke={1.75} />
              {uploading ? "Uploading…" : "Image"}
            </button>
          </>
        )}
      </div>

      {uploadError && (
        <p className="border-b border-neutral-200 px-3 py-1.5 text-[11px] text-red-600 dark:border-neutral-800 dark:text-red-400">
          {uploadError}
        </p>
      )}

      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          id={fieldId}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="block w-full resize-y bg-white px-3 py-2.5 text-[13px] leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 dark:bg-neutral-900 dark:text-neutral-100"
          style={{ minHeight }}
          spellCheck
        />
      ) : (
        <div
          className="overflow-y-auto bg-white px-3 py-2.5 dark:bg-neutral-900"
          style={{ minHeight }}
        >
          {draft.trim() ? (
            <MarkdownContent source={draft} compact />
          ) : (
            <p className="text-[13px] text-neutral-400">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
