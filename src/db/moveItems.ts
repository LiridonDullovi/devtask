import {
  getAllGroups,
  getChildTasks,
  getContexts,
  getDb,
  getGroup,
  getTask,
  updateTaskContext,
  updateTaskGroup,
} from "./queries";
import { PERSONAL_SCOPE, type QueryScope } from "./dataScope";
import {
  getRowWorkspaceId,
  upsertCloudContextsMany,
  upsertCloudGroupsMany,
  type CloudContext,
  type CloudGroup,
} from "./workspaceCache";
import {
  pushGroupDelete,
  pushGroupLinkDelete,
  pushGroupLinkUpsert,
  pushGroupUpsert,
  pushTaskDelete,
  pushTaskUpsert,
} from "../sync/workspacePush";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import type { Context, Group, GroupLink, Task } from "../types";

export interface MoveDestination {
  workspaceId: string | null;
  contextId: string;
  groupId: string | null;
}

export interface MoveResult {
  crossedScope: boolean;
  moved: boolean;
  sourceWorkspaceId: string | null;
  destWorkspaceId: string | null;
}

function scopeFromWorkspaceId(workspaceId: string | null): QueryScope {
  return workspaceId
    ? { kind: "workspace", workspaceId }
    : PERSONAL_SCOPE;
}

function now(): string {
  return new Date().toISOString();
}

function sameWorkspace(
  a: string | null,
  b: string | null,
): boolean {
  return a === b;
}

/** Load contexts/groups for a dest workspace, fetching from cloud if the local cache is empty. */
export async function loadMoveHierarchy(
  workspaceId: string | null,
): Promise<{ contexts: Context[]; groups: Group[] }> {
  const scope = scopeFromWorkspaceId(workspaceId);
  let contexts = await getContexts(scope);
  let groups = await getAllGroups(scope);

  if (workspaceId && isSupabaseConfigured) {
    try {
      const supabase = getSupabase();
      const [ctxRes, groupRes] = await Promise.all([
        supabase
          .from("contexts")
          .select(
            "id, name, color, description, position, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .order("position"),
        supabase
          .from("groups")
          .select(
            "id, context_id, name, description, color, position, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .order("position"),
      ]);
      if (ctxRes.error) throw ctxRes.error;
      if (groupRes.error) throw groupRes.error;

      const cloudContexts = (ctxRes.data ?? []) as CloudContext[];
      const cloudGroups = (groupRes.data ?? []) as CloudGroup[];
      await upsertCloudContextsMany(workspaceId, cloudContexts);
      await upsertCloudGroupsMany(workspaceId, cloudGroups);
      contexts = await getContexts(scope);
      groups = await getAllGroups(scope);
    } catch {
      /* offline — use whatever is cached locally */
    }
  }

  return { contexts, groups };
}

async function detachTask(taskId: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE tasks SET parent_id = NULL, updated_at = $1 WHERE id = $2",
    [now(), taskId],
  );
}

async function pushOrDeleteTask(
  taskId: string,
  sourceWorkspaceId: string | null,
  destWorkspaceId: string | null,
): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  if (destWorkspaceId) {
    await pushTaskUpsert(task, destWorkspaceId);
    return;
  }
  if (sourceWorkspaceId) {
    await pushTaskDelete(taskId);
  }
}

async function reassignComments(
  taskIds: string[],
  destWorkspaceId: string | null,
): Promise<void> {
  if (taskIds.length === 0) return;
  const database = await getDb();
  const timestamp = now();

  if (destWorkspaceId) {
    await database.execute(
      `UPDATE task_comments SET workspace_id = $1, updated_at = $2
       WHERE task_id IN (${taskIds.map((_, i) => `$${i + 3}`).join(", ")})`,
      [destWorkspaceId, timestamp, ...taskIds],
    );
  } else {
    await database.execute(
      `DELETE FROM task_comments WHERE task_id IN (${taskIds.map((_, i) => `$${i + 1}`).join(", ")})`,
      taskIds,
    );
  }

  if (!isSupabaseConfigured) return;
  try {
    const { error } = await getSupabase().rpc(
      "reassign_task_comments_workspace",
      {
        task_ids: taskIds,
        dest_workspace_id: destWorkspaceId,
      },
    );
    if (error) throw error;
  } catch {
    /* local already updated; cloud catch-up happens on next sync if RPC is missing */
  }
}

async function reassignTaskRows(
  tasks: Task[],
  dest: MoveDestination,
  options: { detachRootId?: string | null; clearAssignee: boolean },
): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  for (const task of tasks) {
    const parentId =
      options.detachRootId === task.id ? null : (task.parent_id ?? null);
    const assigneeId = options.clearAssignee
      ? null
      : (task.assignee_id ?? null);
    await database.execute(
      `UPDATE tasks
       SET workspace_id = $1,
           context_id = $2,
           group_id = $3,
           parent_id = $4,
           assignee_id = $5,
           updated_at = $6
       WHERE id = $7`,
      [
        dest.workspaceId,
        dest.contextId,
        dest.groupId,
        parentId,
        assigneeId,
        timestamp,
        task.id,
      ],
    );
  }
}

async function resolveDestContextGroup(
  dest: MoveDestination,
): Promise<MoveDestination> {
  if (dest.groupId) {
    const group = await getGroup(dest.groupId);
    if (!group) throw new Error("Destination group not found.");
    return {
      ...dest,
      contextId: group.context_id,
      groupId: group.id,
    };
  }

  const { contexts } = await loadMoveHierarchy(dest.workspaceId);
  if (!contexts.some((ctx) => ctx.id === dest.contextId)) {
    throw new Error("Destination context not found.");
  }
  return { ...dest, groupId: null };
}

export async function moveTask(
  taskId: string,
  destInput: MoveDestination,
): Promise<MoveResult> {
  const task = await getTask(taskId);
  if (!task) throw new Error("Task not found.");

  const dest = await resolveDestContextGroup(destInput);
  const sourceWorkspaceId = await getRowWorkspaceId("tasks", taskId);
  const destWorkspaceId = dest.workspaceId;

  const locationChanged =
    !sameWorkspace(sourceWorkspaceId, destWorkspaceId) ||
    dest.contextId !== task.context_id ||
    (dest.groupId ?? null) !== (task.group_id ?? null);

  if (!locationChanged) {
    return {
      crossedScope: false,
      moved: false,
      sourceWorkspaceId,
      destWorkspaceId,
    };
  }

  if (sameWorkspace(sourceWorkspaceId, destWorkspaceId)) {
    if (task.parent_id) await detachTask(taskId);
    if (dest.groupId) {
      await updateTaskGroup(taskId, dest.groupId);
    } else if (dest.contextId !== task.context_id) {
      await updateTaskContext(taskId, dest.contextId);
    } else {
      await updateTaskGroup(taskId, null);
    }
    return {
      crossedScope: false,
      moved: true,
      sourceWorkspaceId,
      destWorkspaceId,
    };
  }

  const children = task.parent_id
    ? []
    : await getChildTasks(taskId, { includeArchived: true });
  const moving = task.parent_id ? [task] : [task, ...children];
  const detachRootId = task.parent_id ? task.id : null;

  await reassignTaskRows(moving, dest, {
    detachRootId,
    clearAssignee: true,
  });

  for (const row of moving) {
    await pushOrDeleteTask(row.id, sourceWorkspaceId, destWorkspaceId);
  }
  await reassignComments(
    moving.map((row) => row.id),
    destWorkspaceId,
  );

  return {
    crossedScope: true,
    moved: true,
    sourceWorkspaceId,
    destWorkspaceId,
  };
}

async function getAllTasksInGroup(groupId: string): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    "SELECT * FROM tasks WHERE group_id = $1",
    [groupId],
  );
}

export async function moveGroup(
  groupId: string,
  dest: { workspaceId: string | null; contextId: string },
): Promise<MoveResult> {
  const group = await getGroup(groupId);
  if (!group) throw new Error("Group not found.");

  const { contexts } = await loadMoveHierarchy(dest.workspaceId);
  if (!contexts.some((ctx) => ctx.id === dest.contextId)) {
    throw new Error("Destination context not found.");
  }

  const sourceWorkspaceId = await getRowWorkspaceId("groups", groupId);
  const destWorkspaceId = dest.workspaceId;
  const crossedScope = !sameWorkspace(sourceWorkspaceId, destWorkspaceId);
  const contextChanged = dest.contextId !== group.context_id;

  if (!crossedScope && !contextChanged) {
    return {
      crossedScope: false,
      moved: false,
      sourceWorkspaceId,
      destWorkspaceId,
    };
  }

  const database = await getDb();
  const timestamp = now();
  const tasks = await getAllTasksInGroup(groupId);

  await database.execute(
    `UPDATE groups SET context_id = $1, workspace_id = $2, updated_at = $3 WHERE id = $4`,
    [dest.contextId, destWorkspaceId, timestamp, groupId],
  );
  await database.execute(
    `UPDATE group_links SET workspace_id = $1, updated_at = $2 WHERE group_id = $3`,
    [destWorkspaceId, timestamp, groupId],
  );

  await reassignTaskRows(
    tasks,
    {
      workspaceId: destWorkspaceId,
      contextId: dest.contextId,
      groupId,
    },
    { clearAssignee: crossedScope },
  );

  const updatedGroup = await getGroup(groupId);
  if (!updatedGroup) throw new Error("Group not found after move.");

  if (destWorkspaceId) {
    await pushGroupUpsert(updatedGroup, destWorkspaceId);
  } else if (sourceWorkspaceId) {
    await pushGroupDelete(groupId);
  }

  const links = await database.select<
    (GroupLink & { created_at: string; updated_at: string })[]
  >(
    `SELECT id, group_id, label, url, kind, position, created_at, updated_at
     FROM group_links WHERE group_id = $1`,
    [groupId],
  );

  for (const link of links) {
    if (destWorkspaceId) {
      await pushGroupLinkUpsert(link, destWorkspaceId, {
        createdAt: link.created_at,
        updatedAt: timestamp,
      });
    } else if (sourceWorkspaceId) {
      await pushGroupLinkDelete(link.id);
    }
  }

  for (const task of tasks) {
    await pushOrDeleteTask(task.id, sourceWorkspaceId, destWorkspaceId);
  }
  await reassignComments(
    tasks.map((task) => task.id),
    destWorkspaceId,
  );

  return {
    crossedScope,
    moved: true,
    sourceWorkspaceId,
    destWorkspaceId,
  };
}
