import { useEffect, useId, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

type EditorTab = "write" | "preview";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: number;
  id?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write in Markdown…",
  minHeight = 120,
  id,
}: MarkdownEditorProps) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const [tab, setTab] = useState<EditorTab>("write");
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleDraftChange(next: string) {
    setDraft(next);
    onChange(next);
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
      </div>

      {tab === "write" ? (
        <textarea
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
