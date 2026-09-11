import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Must be an address on a domain you've verified in Resend, e.g.
// "DevTask <noreply@yourdomain.com>". No default — an unverified sender is
// rejected by Resend with an error that's hard to trace back to config.
const INVITE_FROM = Deno.env.get("INVITE_FROM_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not set" }, 500);
  if (!INVITE_FROM) return json({ error: "INVITE_FROM_EMAIL is not set" }, 500);

  let workspaceId: string;
  let email: string;
  try {
    const body = await req.json();
    workspaceId = String(body.workspaceId ?? "");
    email = String(body.email ?? "").trim().toLowerCase();
    if (!workspaceId || !email) throw new Error("workspaceId and email are required");
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  // Act as the caller, never as service_role. The existing RLS on
  // workspace_invites only exposes rows to owners/admins of that workspace,
  // so a successful lookup proves both that the caller is allowed to invite
  // and that this invite genuinely exists — without that, this function
  // would be an open spam relay for anyone holding the public anon key.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("id, email, role")
    .eq("workspace_id", workspaceId)
    .ilike("email", email)
    .maybeSingle();

  if (inviteError) return json({ error: inviteError.message }, 403);
  if (!invite) return json({ error: "No pending invite found for that email" }, 404);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  const workspaceName = workspace?.name ?? "a workspace";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: INVITE_FROM,
      to: [invite.email],
      subject: `You've been invited to ${workspaceName} on DevTask`,
      text: [
        `You've been invited to join "${workspaceName}" on DevTask.`,
        "",
        "DevTask is a local-first, keyboard-driven task manager for developers.",
        "",
        "To accept: download DevTask, then sign up using this email address —",
        `${invite.email} — and you'll join the workspace automatically.`,
        "",
        "Download: https://github.com/LiridonDullovi/devtask/releases",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    return json({ error: `Resend rejected the send: ${await response.text()}` }, 502);
  }

  return json({ sent: true });
});
