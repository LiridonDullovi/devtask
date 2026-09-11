import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/supabase.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Where Supabase auth emails (confirmation, password recovery) land. A hosted
 * page rather than a localhost URL, because a desktop app has no web server of
 * its own — served by the Cloudflare Worker in web/, source at
 * web/public/auth/callback/index.html. Must also be listed under
 * Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.
 */
export const AUTH_CALLBACK_URL = "https://devtask.lrdnd.com/auth/callback";

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.",
    );
  }
  if (!client) {
    client = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
