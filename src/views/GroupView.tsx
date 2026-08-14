import {
  IconArrowLeft,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { ColorPicker } from "../components/ColorPicker";
import { AddGroupLinkForm, GroupLinkRow } from "../components/GroupLinkRow";
import { DeleteGroupDialog } from "../components/DeleteGroupDialog";
import { GroupLinkPills } from "../components/GroupLinkPills";
import { MarkdownContent } from "../components/MarkdownContent";
import { MarkdownDescriptionField } from "../components/MarkdownDescriptionField";
import { TaskList } from "../components/TaskList";
import { useContexts } from "../hooks/useContexts";
import {
  useCreateGroupLink,
  useDeleteGroupLink,
  useGroup,
  useGroupLinks,
  useUpdateGroupColor,
  useUpdateGroupDescription,
  useUpdateGroupLink,
  useUpdateGroupName,
} from "../hooks/useGroups";
import { useCycleTaskState, useGroupTasks, useReorderTasks } from "../hooks/useTasks";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";
import type { Context, Group, GroupLink, GroupLinkKind } from "../types";

interface GroupViewProps {
  onAddTask: () => void;
}

export function GroupView({ onAddTask }: GroupViewProps) {
  const { activeContextId, activeGroupId, backToContext, openTask } =
    useContextsStore();
  const { data: contexts = [] } = useContexts();
  const { data: group } = useGroup(activeGroupId);
  const { data: links = [] } = useGroupLinks(activeGroupId);
  const { data: tasks = [], isLoading } = useGroupTasks(activeGroupId);
  const { selectedTaskId, setSelectedTaskId, setLastUsedContextId } =
    useTasksStore();
  const cycleState = useCycleTaskState();
  const reorderTasks = useReorderTasks();
  const updateName = useUpdateGroupName();
  const updateDescription = useUpdateGroupDescription();
  const updateColor = useUpdateGroupColor();
  const createLink = useCreateGroupLink();
  const updateLink = useUpdateGroupLink();
  const deleteLink = useDeleteGroupLink();

  const context = contexts.find((c) => c.id === activeContextId);
  const displayColor = group?.color ?? context?.color ?? "#378ADD";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setShowAddLink(false);
  }, [activeGroupId]);

  useEffect(() => {
    if (activeContextId) {
      setLastUsedContextId(activeContextId);
    }
  }, [activeContextId, setLastUsedContextId]);

  useEffect(() => {
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
  }, [group?.name, group?.description, activeGroupId]);

  if (!activeGroupId || !group) return null;

  const groupId = activeGroupId;
  const currentGroup = group;

  async function saveName() {
    if (!name.trim() || name === group?.name) return;
    await updateName.mutateAsync({ groupId, name });
  }

  async function saveDescription() {
    if (description === (group?.description ?? "")) return;
    await updateDescription.mutateAsync({ groupId, description });
  }

  function handleOpenTask(taskId: string) {
    setSelectedTaskId(taskId);
    openTask(taskId);
  }

  function exitEditMode() {
    setShowAddLink(false);
    setIsEditing(false);
    setName(currentGroup.name);
    setDescription(currentGroup.description ?? "");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={backToContext}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-[13px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <IconArrowLeft size={15} stroke={1.75} />
            {context?.name}
          </button>
          <span className="shrink-0 text-neutral-300 dark:text-neutral-600">
            /
          </span>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: displayColor }}
          />
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-neutral-900 outline-none dark:text-neutral-100"
              placeholder="Group name…"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
              {group.name}
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onAddTask}
              className="cursor-pointer rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[13px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              Add task
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={exitEditMode}
                className="cursor-pointer rounded-md border border-neutral-200 bg-neutral-900 px-3 py-1.5 text-[13px] text-white hover:bg-neutral-800 dark:border-neutral-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[13px] text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <IconPencil size={14} stroke={1.75} />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <GroupEditPanel
          group={group}
          context={context}
          description={description}
          links={links}
          showAddLink={showAddLink}
          onDescriptionChange={setDescription}
          onDescriptionSave={() => void saveDescription()}
          onColorChange={(color) =>
            void updateColor.mutateAsync({ groupId, color })
          }
          onShowAddLink={() => setShowAddLink(true)}
          onLinkSave={(linkId, updates) =>
            updateLink.mutateAsync({ linkId, groupId, ...updates })
          }
          onLinkDelete={(linkId) =>
            deleteLink.mutateAsync({ linkId, groupId })
          }
          onAddLink={async (input) => {
            await createLink.mutateAsync({ groupId, ...input });
            setShowAddLink(false);
          }}
          onCancelAddLink={() => setShowAddLink(false)}
          onDeleteGroup={() => setShowDeleteDialog(true)}
        />
      ) : (
        <GroupReadPanel group={group} links={links} />
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-neutral-400">
          Loading…
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          contexts={contexts}
          groups={group ? [group] : []}
          sortable
          selectedTaskId={selectedTaskId}
          onSelectTask={handleOpenTask}
          onCycleState={(id) => cycleState.mutate(id)}
          onReorder={(taskIds) => reorderTasks.mutate(taskIds)}
          emptyTitle="Add a task or drop a link to get started."
          emptyHint="Press N to capture a task, or use Edit to add repo and folder links."
        />
      )}

      <DeleteGroupDialog
        open={showDeleteDialog}
        group={group}
        taskCount={tasks.length}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={backToContext}
      />
    </div>
  );
}

function GroupReadPanel({
  group,
  links,
}: {
  group: { description: string | null };
  links: Parameters<typeof GroupLinkPills>[0]["links"];
}) {
  return (
    <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
      {group.description ? (
        <div className="mb-4">
          <MarkdownContent source={group.description} />
        </div>
      ) : (
        <p className="mb-4 text-[13px] text-neutral-400">No description.</p>
      )}

      <GroupLinkPills
        links={links}
        title="Links"
        emptyMessage="No links yet — use Edit to add folders or websites."
      />
    </div>
  );
}

function GroupEditPanel({
  group,
  context,
  description,
  links,
  showAddLink,
  onDescriptionChange,
  onDescriptionSave,
  onColorChange,
  onShowAddLink,
  onLinkSave,
  onLinkDelete,
  onAddLink,
  onCancelAddLink,
  onDeleteGroup,
}: {
  group: Pick<Group, "color">;
  context?: Context;
  description: string;
  links: GroupLink[];
  showAddLink: boolean;
  onDescriptionChange: (v: string) => void;
  onDescriptionSave: () => void;
  onColorChange: (color: string | null) => void;
  onShowAddLink: () => void;
  onLinkSave: (
    linkId: string,
    updates: { label: string; url: string; kind: GroupLinkKind },
  ) => void;
  onLinkDelete: (linkId: string) => void;
  onAddLink: (input: {
    label: string;
    url: string;
    kind: GroupLinkKind;
  }) => void | Promise<void>;
  onCancelAddLink: () => void;
  onDeleteGroup: () => void;
}) {
  return (
    <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
      <div className="mb-4">
        <MarkdownDescriptionField
          value={description}
          onChange={onDescriptionChange}
          onBlur={onDescriptionSave}
          placeholder="Group description…"
          rows={4}
        />
      </div>

      <div className="mb-4">
        <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
          Color
        </span>
        <ColorPicker
          value={group.color}
          inheritColor={context?.color ?? "#378ADD"}
          onChange={onColorChange}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">
            Links
          </span>
          {!showAddLink && (
            <button
              type="button"
              onClick={onShowAddLink}
              className="flex cursor-pointer items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <IconPlus size={13} stroke={1.75} />
              Add link
            </button>
          )}
        </div>

        {links.length > 0 && (
          <div className="mb-3 space-y-2">
            {links.map((link) => (
              <GroupLinkRow
                key={link.id}
                link={link}
                onSave={(updates) => onLinkSave(link.id, updates)}
                onDelete={() => onLinkDelete(link.id)}
              />
            ))}
          </div>
        )}

        {links.length === 0 && !showAddLink && (
          <p className="mb-3 text-[12px] text-neutral-400">
            No links — add a folder or website.
          </p>
        )}

        {showAddLink && (
          <AddGroupLinkForm onAdd={onAddLink} onCancel={onCancelAddLink} />
        )}
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={onDeleteGroup}
          className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          Delete group
        </button>
      </div>
    </div>
  );
}
