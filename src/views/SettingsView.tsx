import {
  IconDatabase,
  IconDownload,
  IconFolderOpen,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  exportDatabaseSnapshot,
  exportFilename,
  exportTasksCsv,
} from "../db/export";
import {
  getDatabaseDirectory,
  getDatabasePath,
  revealDatabaseInFolder,
} from "../lib/dataLocation";
import { saveTextExport } from "../lib/exportFile";
import { getErrorMessage } from "../lib/errors";
import { toastError, toastSuccess } from "../store/toast";
import { ViewToolbar } from "../components/ViewToolbar";
import { AccountSettingsTab } from "../components/settings/AccountSettingsTab";
import { TeamSettingsTab } from "../components/settings/TeamSettingsTab";
import { useWorkspaceStore } from "../store/workspace";

type SettingsTab = "general" | "account" | "team";

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "account", label: "Account" },
  { value: "team", label: "Team" },
];

export function SettingsView() {
  const { scope } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [dbDir, setDbDir] = useState<string | null>(null);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    void getDatabasePath().then(setDbPath);
    void getDatabaseDirectory().then(setDbDir);
  }, []);

  async function handleExportJson() {
    setExportingJson(true);
    try {
      const snapshot = await exportDatabaseSnapshot();
      const content = JSON.stringify(snapshot, null, 2);
      const filename = exportFilename("devtask-export", "json");
      const saved = await saveTextExport(content, filename, "json", "JSON");
      if (saved) toastSuccess("Database exported to JSON.");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setExportingJson(false);
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const content = await exportTasksCsv();
      const filename = exportFilename("devtask-tasks", "csv");
      const saved = await saveTextExport(content, filename, "csv", "CSV");
      if (saved) toastSuccess("Tasks exported to CSV.");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleRevealData() {
    try {
      await revealDatabaseInFolder();
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  async function handleCopyPath() {
    const path = dbPath ?? dbDir;
    if (!path) {
      toastError("Database path is only available in the desktop app.");
      return;
    }
    try {
      await navigator.clipboard.writeText(path);
      toastSuccess("Path copied to clipboard.");
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ViewToolbar title="Settings" />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-xl space-y-6">
          <div
            role="tablist"
            aria-label="Settings section"
            className="inline-flex rounded-md border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-700 dark:bg-neutral-900/80"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.value)}
                  className={`cursor-pointer rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors ${
                    active
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "general" && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
                  {scope === "personal"
                    ? "Your data stays on your machine"
                    : "Local copy on this device"}
                </h2>
                <p className="mb-4 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {scope === "personal"
                    ? "DevTask stores everything locally in a SQLite file. No cloud, no account — you own it. Back it up anytime or export to JSON/CSV."
                    : "Until cloud sync is enabled, workspace mode still uses the same local database on this device. Export regularly as a backup."}
                </p>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
                    <IconDatabase size={14} stroke={1.75} />
                    Database location
                  </div>
                  {dbPath ? (
                    <p className="break-all font-mono text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {dbPath}
                    </p>
                  ) : (
                    <p className="text-[13px] text-neutral-500">
                      Run the desktop app to see your database path. In the
                      browser preview, data is not persisted.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dbPath && (
                      <button
                        type="button"
                        onClick={() => void handleRevealData()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[13px] text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <IconFolderOpen size={14} stroke={1.75} />
                        Show in folder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleCopyPath()}
                      disabled={!dbPath && !dbDir}
                      className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[13px] text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      Copy path
                    </button>
                  </div>
                  {dbPath && (
                    <p className="mt-3 text-[12px] text-neutral-400">
                      Tip: copy this file to Backups or iCloud/Dropbox for
                      manual backups.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
                  Export
                </h2>
                <p className="mb-4 text-[13px] text-neutral-500 dark:text-neutral-400">
                  Download a snapshot of your data for backups or migration.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={exportingJson}
                    onClick={() => void handleExportJson()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <IconDownload size={14} stroke={1.75} />
                    {exportingJson
                      ? "Exporting…"
                      : "Export JSON (full database)"}
                  </button>
                  <button
                    type="button"
                    disabled={exportingCsv}
                    onClick={() => void handleExportCsv()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <IconDownload size={14} stroke={1.75} />
                    {exportingCsv ? "Exporting…" : "Export CSV (tasks only)"}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "account" && <AccountSettingsTab />}

          {activeTab === "team" && (
            <TeamSettingsTab onGoToAccount={() => setActiveTab("account")} />
          )}
        </div>
      </div>
    </div>
  );
}
