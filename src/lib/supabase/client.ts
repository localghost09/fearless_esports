"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // /auth/callback exchanges the one-time PKCE code explicitly. Leaving
        // auto-detection on would race that exchange and consume the verifier.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }
  return browserClient;
}
