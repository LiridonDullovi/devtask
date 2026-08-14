import { IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from "../hooks/useTaskComments";
import { useAuth } from "../hooks/useAuth";
import { useWorkspaceMembers } from "../hooks/useWorkspaceMembers";
import { MarkdownContent } from "./MarkdownContent";
import { MarkdownEditor } from "./MarkdownEditor";

interface TaskCommentsSectionProps {
  taskId: string;
  workspaceId: string;
  onImageUpload?: (file: File) => Promise<string>;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskCommentsSection({
  taskId,
  workspaceId,
  onImageUpload,
}: TaskCommentsSectionProps) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const createComment = useCreateTaskComment(taskId);
  const updateComment = useUpdateTaskComment(taskId);
  const deleteComment = useDeleteTaskComment(taskId);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const authorLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.user_id] =
        member.display_name || member.email.split("@")[0];
    }
    return map;
  }, [members]);

  async function submitComment() {
    const body = draft.trim();
    if (!body) return;
    await createComment.mutateAsync(body);
    setDraft("");
  }

  function startEdit(commentId: string, body: string) {
    setEditingId(commentId);
    setEditDraft(body);
  }

  async function saveEdit(commentId: string) {
    const body = editDraft.trim();
    if (!body) return;
    await updateComment.mutateAsync({ commentId, body });
    setEditingId(null);
    setEditDraft("");
  }

  return (
    <section className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-wider text-neutral-400">
        Comments
      </h2>

      {isLoading ? (
        <p className="text-[13px] text-neutral-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-[13px] text-neutral-400">
          No comments yet. Start the thread below.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const isAuthor = comment.author_id === user?.id;
            const isEditing = editingId === comment.id;
            const authorName =
              authorLabels[comment.author_id] ?? "Teammate";

            return (
              <li
                key={comment.id}
                className="rounded-md border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[12px] text-neutral-500">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {authorName}
                    </span>
                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">
                      ·
                    </span>
                    <time dateTime={comment.created_at}>
                      {formatWhen(comment.created_at)}
                    </time>
                    {comment.updated_at !== comment.created_at && (
                      <span className="ml-1 text-neutral-400">(edited)</span>
                    )}
                  </div>
                  {isAuthor && !isEditing && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(comment.id, comment.body)}
                        className="cursor-pointer text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteComment.mutateAsync(comment.id)
                        }
                        aria-label="Delete comment"
                        className="cursor-pointer text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <IconTrash size={14} stroke={1.75} />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <MarkdownEditor
                      value={editDraft}
                      onChange={setEditDraft}
                      minHeight={100}
                      onImageUpload={onImageUpload}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit(comment.id)}
                        disabled={updateComment.isPending}
                        className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1.5 text-[12px] text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft("");
                        }}
                        className="cursor-pointer rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <MarkdownContent source={comment.body} compact />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <MarkdownEditor
          value={draft}
          onChange={setDraft}
          placeholder="Write a comment… (Markdown supported)"
          minHeight={100}
          onImageUpload={onImageUpload}
        />
        <button
          type="button"
          onClick={() => void submitComment()}
          disabled={!draft.trim() || createComment.isPending}
          className="cursor-pointer rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {createComment.isPending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </section>
  );
}
