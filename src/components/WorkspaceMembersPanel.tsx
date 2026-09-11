import { IconClock, IconMail, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useInviteWorkspaceMember,
  usePendingInvites,
  useRemoveWorkspaceMember,
  useRevokeInvite,
  useWorkspaceMembers,
} from "../hooks/useWorkspaceMembers";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { getErrorMessage } from "../lib/errors";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";
import type { WorkspaceRole } from "../types/workspace";
import { toastError, toastSuccess } from "../store/toast";

const INVITE_ROLES: Array<Exclude<WorkspaceRole, "owner">> = ["member", "admin"];

export function WorkspaceMembersPanel() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { data: workspaces = [] } = useWorkspaces(user?.id);
  const workspaceId =
    workspace.id !== DEFAULT_WORKSPACE.id ? workspace.id : undefined;

  const activeMeta = workspaces.find((w) => w.id === workspaceId);
  const canManage =
    activeMeta?.role === "owner" || activeMeta?.role === "admin";

  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);
  const { data: pendingInvites = [] } = usePendingInvites(
    canManage ? workspaceId : undefined,
  );
  const inviteMember = useInviteWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  const revokeInvite = useRevokeInvite(workspaceId);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<WorkspaceRole, "owner">>("member");

  if (!workspaceId) {
    return (
      <p className="text-[13px] text-neutral-500">
        Select a workspace in the header to manage members.
      </p>
    );
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const result = await inviteMember.mutateAsync({
        email: trimmed,
        role: inviteRole,
      });
      setEmail("");
      toastSuccess(
        result.status !== "pending"
          ? `Added ${result.email} to the workspace.`
          : result.emailSent
            ? `Invite emailed to ${result.email} — they'll join automatically once they sign up.`
            : `Invited ${result.email}, but the email couldn't be sent — tell them to sign up with this address.`,
      );
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  async function handleRemove(memberUserId: string, memberEmail: string) {
    try {
      await removeMember.mutateAsync(memberUserId);
      toastSuccess(`Removed ${memberEmail} from the workspace.`);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  async function handleRevokeInvite(inviteId: string, inviteEmail: string) {
    try {
      await revokeInvite.mutateAsync(inviteId);
      toastSuccess(`Revoked invite for ${inviteEmail}.`);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-[13px] text-neutral-400">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-[13px] text-neutral-500">No members listed.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            const ownerCount = members.filter((x) => x.role === "owner").length;
            const showRemove = isSelf
              ? m.role !== "owner" || ownerCount > 1
              : canManage &&
                (activeMeta?.role === "owner" || m.role !== "owner");

            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {m.display_name || m.email}
                    {isSelf ? (
                      <span className="ml-1 font-normal text-neutral-400">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  {m.display_name ? (
                    <p className="truncate text-[11px] text-neutral-400">
                      {m.email}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] capitalize text-neutral-400">
                    {m.role}
                  </span>
                  {showRemove ? (
                    <button
                      type="button"
                      title="Remove member"
                      disabled={removeMember.isPending}
                      onClick={() => void handleRemove(m.user_id, m.email)}
                      className="cursor-pointer rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-neutral-800"
                    >
                      <IconTrash size={14} stroke={1.75} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && pendingInvites.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-neutral-400">
            Pending invites
          </p>
          <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {invite.email}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <IconClock size={12} stroke={1.75} />
                    Pending — joins automatically on signup
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] capitalize text-neutral-400">
                    {invite.role}
                  </span>
                  <button
                    type="button"
                    title="Revoke invite"
                    disabled={revokeInvite.isPending}
                    onClick={() =>
                      void handleRevokeInvite(invite.id, invite.email)
                    }
                    className="cursor-pointer rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-neutral-800"
                  >
                    <IconTrash size={14} stroke={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <form onSubmit={(e) => void handleInvite(e)} className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-neutral-400">
            Invite by email
          </p>
          <p className="text-[12px] text-neutral-500">
            If they don't have a DevTask account yet, they'll join
            automatically once they sign up with this email.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <IconMail
                size={14}
                stroke={1.75}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full rounded-md border border-neutral-200 py-2 pl-8 pr-3 text-[13px] dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as Exclude<WorkspaceRole, "owner">)
              }
              className="rounded-md border border-neutral-200 px-2 py-2 text-[13px] capitalize dark:border-neutral-700 dark:bg-neutral-950"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!email.trim() || inviteMember.isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            >
              <IconUserPlus size={14} stroke={1.75} />
              Invite
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[12px] text-neutral-400">
          Only workspace owners and admins can invite or remove members.
        </p>
      )}
    </div>
  );
}
