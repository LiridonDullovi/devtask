import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
  useAuth,
} from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import { isSupabaseConfigured } from "../lib/supabase";
import { useWorkspaceStore } from "../store/workspace";
import { toastError, toastSuccess } from "../store/toast";

export function WorkspaceAuthPanel() {
  const queryClient = useQueryClient();
  const resetForSignOut = useWorkspaceStore((s) => s.resetForSignOut);
  const { user, loading, isSignedIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <p className="text-[13px] text-amber-700 dark:text-amber-300">
        Add <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
        <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to{" "}
        <span className="font-mono">.env.local</span>, then restart the dev
        server.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-[13px] text-neutral-400">Checking session…</p>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
          Signed in as{" "}
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {user.email}
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setPending(true);
            void signOut()
              .then(() => {
                queryClient.removeQueries({ queryKey: ["workspaces"] });
                resetForSignOut();
                setEmail("");
                setPassword("");
                toastSuccess("Signed out.");
              })
              .catch((e) => toastError(getErrorMessage(e)))
              .finally(() => setPending(false));
          }}
          disabled={pending}
          className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        toastSuccess("Signed in.");
      } else {
        const { session } = await signUpWithPassword(email.trim(), password);
        if (session) {
          toastSuccess("Account created and signed in.");
        } else {
          toastSuccess("Check your email to confirm your account.");
        }
      }
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] ${
            mode === "signin"
              ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] ${
            mode === "signup"
              ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Sign up
        </button>
      </div>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:opacity-50 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
