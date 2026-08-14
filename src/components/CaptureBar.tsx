import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconBolt, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CaptureMentionMenu } from "./CaptureMentionMenu";
import { Select } from "./Select";
import { useAuth } from "../hooks/useAuth";
import { useContexts } from "../hooks/useContexts";
import {
  useAllGroups,
  useCreateGroup,
  useGroupsByContext,
} from "../hooks/useGroups";
import { useCreateTask, useTasks } from "../hooks/useTasks";
import { useWorkspaces } from "../hooks/useWorkspaces";
import {
  applyMentionSelection,
  getActiveMention,
  getContextMentionSuggestions,
  getGroupMentionSuggestions,
  getWorkspaceMentionSuggestions,
} from "../lib/captureMentions";
import { readCaptureNav } from "../lib/captureDefaults";
import { getContexts } from "../db/queries";
import { getQueryScopeFromStorage, scopeQueryKey } from "../db/dataScope";
import { applyCaptureWorkspace } from "../lib/captureWorkspace";
import {
  getStoredCaptureWorkspace,
  getStoredDataScope,
} from "../lib/workspace";
import { emitTaskCreated, setCaptureWindowHeight } from "../lib/captureWindow";
import { normalizeTag, parseCaptureInput } from "../lib/parseCapture";
import { useTasksStore } from "../store/tasks";

export interface CaptureBarHandle {
  focus: () => void;
}

interface CaptureBarProps {
  mode?: "inline" | "floating";
  onDismiss?: () => void;
}

export const CaptureBar = forwardRef<CaptureBarHandle, CaptureBarProps>(
  function CaptureBar({ mode = "inline", onDismiss }, ref) {
  const isFloating = mode === "floating";
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupSelectOpen, setGroupSelectOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const createGroup = useCreateGroup();
  const { user, isSignedIn } = useAuth();
  const { data: workspaces = [] } = useWorkspaces(user?.id);
  const { data: contexts = [] } = useContexts();
  const { data: allGroups = [] } = useAllGroups();
  const { data: allTasks = [] } = useTasks();
  const {
    lastUsedContextId,
    setLastUsedContextId,
    selectedTaskId,
    setSelectedTaskId,
  } = useTasksStore();

  const [captureNav, setCaptureNav] = useState(readCaptureNav);
  const [captureScope, setCaptureScope] = useState(getStoredDataScope);
  const [captureWorkspace, setCaptureWorkspace] = useState(
    getStoredCaptureWorkspace,
  );

  function refreshCaptureNav() {
    setCaptureNav(readCaptureNav());
    setCaptureScope(getStoredDataScope());
    setCaptureWorkspace(getStoredCaptureWorkspace());
  }

  const defaultContextId =
    (captureNav.activeView === "context" ||
      captureNav.activeView === "group") &&
    captureNav.activeContextId
      ? captureNav.activeContextId
      : lastUsedContextId;

  const navGroupId =
    captureNav.activeView === "group" && captureNav.activeGroupId
      ? captureNav.activeGroupId
      : null;

  function syncCaptureDefaults() {
    const nav = readCaptureNav();
    setCaptureNav(nav);
    setSelectedGroupId(
      nav.activeView === "group" && nav.activeGroupId ? nav.activeGroupId : "",
    );
  }

  useEffect(() => {
    refreshCaptureNav();
    syncCaptureDefaults();
  }, []);

  const parsed = useMemo(
    () => parseCaptureInput(value, contexts, allGroups, workspaces),
    [value, contexts, allGroups, workspaces],
  );

  const displayScope = parsed.dataScope ?? captureScope;
  const displayWorkspace =
    parsed.workspaceId != null
      ? (workspaces.find((w) => w.id === parsed.workspaceId) ??
        captureWorkspace)
      : parsed.dataScope === "personal"
        ? null
        : captureWorkspace;

  const contextId =
    parsed.contextId ??
    contexts.find((c) => c.id === defaultContextId)?.id ??
    contexts[0]?.id;

  const { data: groups = [] } = useGroupsByContext(contextId ?? null);
  const activeContext = contexts.find((c) => c.id === contextId);
  const parsedGroup = parsed.groupId
    ? allGroups.find((g) => g.id === parsed.groupId)
    : undefined;
  const effectiveGroupId = parsed.groupId ?? selectedGroupId;

  const activeMention = useMemo(
    () => getActiveMention(value, cursor),
    [value, cursor],
  );

  const mentionSuggestions = useMemo(() => {
    if (!activeMention) return [];
    if (activeMention.type === "context") {
      return getContextMentionSuggestions(contexts, activeMention.query);
    }
    if (activeMention.type === "workspace") {
      return getWorkspaceMentionSuggestions(
        workspaces,
        activeMention.query,
        isSignedIn,
      );
    }
    return getGroupMentionSuggestions(
      groups,
      activeMention.query,
      activeContext?.name,
      activeContext?.color,
    );
  }, [activeMention, contexts, groups, activeContext, workspaces, isSignedIn]);

  const mentionMenuOpen =
    focused &&
    !mentionDismissed &&
    activeMention !== null &&
    (mentionSuggestions.length > 0 || activeMention.query.length > 0);

  useEffect(() => {
    setMentionHighlight(0);
    setMentionDismissed(false);
  }, [activeMention?.type, activeMention?.start, activeMention?.query]);

  useEffect(() => {
    if (mentionHighlight >= mentionSuggestions.length) {
      setMentionHighlight(Math.max(0, mentionSuggestions.length - 1));
    }
  }, [mentionHighlight, mentionSuggestions.length]);

  const recentTasks = useMemo(
    () =>
      [...allTasks]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 30),
    [allTasks],
  );

  useImperativeHandle(ref, () => ({
    focus: () => {
      syncCaptureDefaults();
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (!isFloating) return;
    syncCaptureDefaults();
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isFloating]);

  useEffect(() => {
    if (!isFloating) return;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .listen("tauri://focus", () => {
        syncCaptureDefaults();
        inputRef.current?.focus();
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => {
      unlisten?.();
    };
  }, [isFloating]);

  useLayoutEffect(() => {
    if (!isFloating || !panelRef.current) return;
    let height = panelRef.current.scrollHeight + 24;
    if (showGroupPicker && groupSelectOpen) {
      height += 220;
    }
    void setCaptureWindowHeight(height);
  }, [
    isFloating,
    focused,
    mentionMenuOpen,
    showGroupPicker,
    groupSelectOpen,
    mentionSuggestions.length,
    groups.length,
    value,
  ]);

  function syncCursor() {
    const pos = inputRef.current?.selectionStart ?? value.length;
    setCursor(pos);
  }

  async function applyMention(index: number) {
    if (!activeMention || !mentionSuggestions[index]) return;
    const item = mentionSuggestions[index];
    if (item.disabled) return;

    let tag = item.tag;
    if (item.action === "create-group") {
      const name = item.createName?.trim();
      if (!name || !contextId) return;
      try {
        const created = await createGroup.mutateAsync({
          contextId,
          name,
          scopeOverride: getQueryScopeFromStorage(),
        });
        tag = normalizeTag(created.name);
      } catch {
        return;
      }
    }

    if (activeMention.type === "workspace") {
      if (item.id === "__personal__") {
        applyCaptureWorkspace("personal");
      } else if (
        !item.disabled &&
        item.id !== "__hint__" &&
        item.id !== "__nomatch__"
      ) {
        applyCaptureWorkspace("workspace", {
          id: item.id,
          name: item.label,
        });
      }
      setSelectedGroupId("");
      refreshCaptureNav();
    }

    const { nextValue, nextCursor } = applyMentionSelection(
      value,
      activeMention,
      tag,
    );
    setValue(nextValue);
    setCursor(nextCursor);
    setMentionDismissed(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleSubmit() {
    const parsedSubmit = parseCaptureInput(
      value,
      contexts,
      allGroups,
      workspaces,
    );
    const {
      title,
      contextId: parsedContextId,
      groupId: parsedGroupId,
      dataScope: parsedScope,
      workspaceId: parsedWorkspaceId,
    } = parsedSubmit;
    if (!title) return;

    if (parsedScope) {
      if (parsedScope === "personal") {
        applyCaptureWorkspace("personal");
      } else if (parsedWorkspaceId) {
        const ws = workspaces.find((w) => w.id === parsedWorkspaceId);
        if (ws) {
          applyCaptureWorkspace("workspace", { id: ws.id, name: ws.name });
        }
      }
      refreshCaptureNav();
    }

    const scopeOverride = getQueryScopeFromStorage();

    let submitContexts = contexts;
    if (parsedScope) {
      submitContexts = await queryClient.fetchQuery({
        queryKey: scopeQueryKey(["contexts"], scopeOverride),
        queryFn: () => getContexts(scopeOverride),
      });
    }

    const nav = readCaptureNav();
    const isToday = nav.activeView === "today";
    const resolvedContextId =
      parsedContextId ??
      submitContexts.find((c) => c.id === contextId)?.id ??
      submitContexts.find((c) => c.id === defaultContextId)?.id ??
      submitContexts[0]?.id;
    if (!resolvedContextId) return;

    const submitGroupId =
      nav.activeView === "group" && nav.activeGroupId
        ? nav.activeGroupId
        : null;
    const groupId =
      (parsedGroupId ?? selectedGroupId ?? submitGroupId) || null;

    try {
      await createTask.mutateAsync({
        title,
        contextId: resolvedContextId,
        groupId,
        isToday,
        scopeOverride,
      });
    } catch {
      return;
    }

    setLastUsedContextId(resolvedContextId);
    setValue("");
    syncCaptureDefaults();
    setShowGroupPicker(false);
    setMentionDismissed(false);
    if (isFloating) {
      await emitTaskCreated();
      onDismiss?.();
    } else {
      inputRef.current?.blur();
      setFocused(false);
    }
  }

  function cycleContext() {
    if (contexts.length === 0) return;
    const idx = contexts.findIndex((c) => c.id === contextId);
    const next = contexts[(idx + 1) % contexts.length];
    setLastUsedContextId(next.id);
    setSelectedGroupId("");
  }

  function cycleWorkspace() {
    const options: Array<
      | { kind: "personal" }
      | { kind: "workspace"; id: string; name: string }
    > = [{ kind: "personal" }, ...workspaces.map((w) => ({
      kind: "workspace" as const,
      id: w.id,
      name: w.name,
    }))];
    if (options.length <= 1) return;

    const current =
      displayScope === "workspace" && displayWorkspace
        ? displayWorkspace.id
        : "personal";
    const idx = options.findIndex((o) =>
      o.kind === "personal"
        ? current === "personal"
        : o.id === current,
    );
    const next = options[(idx + 1) % options.length];
    if (next.kind === "personal") {
      applyCaptureWorkspace("personal");
    } else {
      applyCaptureWorkspace("workspace", { id: next.id, name: next.name });
    }
    setSelectedGroupId("");
    refreshCaptureNav();
  }

  function navigateRecent(direction: 1 | -1) {
    if (recentTasks.length === 0) return;
    const currentIndex = selectedTaskId
      ? recentTasks.findIndex((t) => t.id === selectedTaskId)
      : -1;
    let nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : recentTasks.length - 1
        : currentIndex + direction;
    if (nextIndex < 0) nextIndex = recentTasks.length - 1;
    if (nextIndex >= recentTasks.length) nextIndex = 0;
    setSelectedTaskId(recentTasks[nextIndex].id);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionMenuOpen && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionHighlight((i) =>
          i + 1 >= mentionSuggestions.length ? 0 : i + 1,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionHighlight((i) =>
          i - 1 < 0 ? mentionSuggestions.length - 1 : i - 1,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const item = mentionSuggestions[mentionHighlight];
        if (item && !item.disabled) {
          e.preventDefault();
          void applyMention(mentionHighlight);
        }
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
      return;
    }

    if (e.key === "Escape") {
      if (mentionMenuOpen) {
        e.preventDefault();
        setMentionDismissed(true);
        return;
      }
      if (isFloating) {
        e.preventDefault();
        onDismiss?.();
        return;
      }
      setValue("");
      inputRef.current?.blur();
      return;
    }

    if (
      !isFloating &&
      value.trim() === "" &&
      (e.key === "ArrowDown" || e.key === "ArrowUp")
    ) {
      e.preventDefault();
      navigateRecent(e.key === "ArrowDown" ? 1 : -1);
    }
  }

  return (
    <div
      ref={panelRef}
      className={
        isFloating
          ? "flex flex-col gap-2 bg-neutral-50 px-4 py-3 dark:bg-neutral-950"
          : "border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950"
      }
      onFocusCapture={() => setFocused(true)}
      onBlur={(e) => {
        if (!panelRef.current?.contains(e.relatedTarget as Node)) {
          setFocused(false);
          if (isFloating && !value.trim()) {
            onDismiss?.();
          }
        }
      }}
    >
      {isFloating && mentionMenuOpen && (
        <CaptureMentionMenu
          variant="inline"
          open={mentionMenuOpen}
          type={activeMention?.type ?? "context"}
          suggestions={mentionSuggestions}
          highlightIndex={mentionHighlight}
          onHighlight={setMentionHighlight}
          onSelect={applyMention}
        />
      )}

      <div
        className={`relative flex items-center gap-2.5 rounded-md border bg-white px-3 py-2 dark:bg-neutral-900 ${
          focused
            ? "border-neutral-300 dark:border-neutral-600"
            : "border-neutral-200 dark:border-neutral-700"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {!isFloating && (
          <CaptureMentionMenu
            open={mentionMenuOpen}
            type={activeMention?.type ?? "context"}
            suggestions={mentionSuggestions}
            highlightIndex={mentionHighlight}
            onHighlight={setMentionHighlight}
            onSelect={applyMention}
          />
        )}
        <IconBolt
          size={16}
          className="shrink-0 text-neutral-400"
          stroke={1.75}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCursor(e.target.selectionStart ?? e.target.value.length);
            setMentionDismissed(false);
          }}
          onSelect={syncCursor}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onKeyDown={handleInputKeyDown}
          placeholder="Quick capture… $team #work @project"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />
        {!focused && !isFloating && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>Space</Kbd>
          </div>
        )}
      </div>
      {(focused || isFloating) && (
        <div className={`mt-2 space-y-2 ${isFloating ? "" : "px-1"}`}>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-400">
            <span>Enter to save</span>
            {isFloating && (
              <>
                <span>·</span>
                <span>Esc to close</span>
              </>
            )}
            <span>·</span>
            <span>
              {displayScope === "workspace" && displayWorkspace
                ? `workspace: ${displayWorkspace.name}`
                : "personal"}
              {parsed.dataScope && (
                <span className="text-neutral-500"> (from $)</span>
              )}
            </span>
            {(workspaces.length > 0 || displayScope === "workspace") && (
              <>
                <span>·</span>
                <button
                  type="button"
                  className="underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cycleWorkspace}
                >
                  cycle workspace
                </button>
              </>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              context:{" "}
              {activeContext && (
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: activeContext.color }}
                />
              )}
              {activeContext?.name ?? "none"}
              {parsed.contextId && parsed.contextId !== defaultContextId && (
                <span className="text-neutral-500"> (from #)</span>
              )}
            </span>
            {(parsedGroup || effectiveGroupId || navGroupId) && (
              <>
                <span>·</span>
                <span>
                  group:{" "}
                  {parsedGroup?.name ??
                    groups.find((g) => g.id === effectiveGroupId)?.name ??
                    groups.find((g) => g.id === navGroupId)?.name ??
                    "selected"}
                  {parsed.groupId && (
                    <span className="text-neutral-500"> (from @)</span>
                  )}
                </span>
              </>
            )}
            {contexts.length > 1 && (
              <>
                <span>·</span>
                <button
                  type="button"
                  className="underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cycleContext}
                >
                  cycle context
                </button>
              </>
            )}
            <span>·</span>
            <span>$ workspace · # context · @ group</span>
            {!isFloating && (
              <>
                <span>·</span>
                <span>↑↓ recent tasks</span>
              </>
            )}
          </p>

          {groups.length > 0 ? (
            <div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowGroupPicker((v) => {
                    if (v) setGroupSelectOpen(false);
                    return !v;
                  });
                }}
                className="flex cursor-pointer items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showGroupPicker ? (
                  <IconChevronUp size={12} stroke={1.75} />
                ) : (
                  <IconChevronDown size={12} stroke={1.75} />
                )}
                Assign to group (optional)
              </button>
              {showGroupPicker && (
                <div
                  className="mt-1.5 max-w-xs"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Select
                    menuPlacement={isFloating ? "bottom" : "top"}
                    onOpenChange={isFloating ? setGroupSelectOpen : undefined}
                    value={selectedGroupId}
                    onChange={setSelectedGroupId}
                    options={[
                      { value: "", label: "No group" },
                      ...groups.map((g) => ({
                        value: g.id,
                        label: g.name,
                        color: g.color ?? activeContext?.color,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-neutral-400">
              No groups in {activeContext?.name ?? "this context"}. Type{" "}
              <span className="font-mono">@name</span> to create one.
            </p>
          )}
        </div>
      )}
    </div>
  );
});

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
      {children}
    </span>
  );
}
