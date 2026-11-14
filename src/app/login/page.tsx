import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/login-client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to lock scrim slots, manage squads and pull room credentials.",
  robots: { index: false, follow: false },
};

function safeNext(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/my-matches";
  }
  if (raw.length > 512) return "/my-matches";
  // Never bounce back into auth or payment callback loops.
  if (raw.startsWith("/login") || raw.startsWith("/auth/")) return "/my-matches";
  return raw;
}

/**
 * GoTrue's public settings endpoint lists the external providers that are
 * switched on. Resolving it on the server keeps the Google button out of the
 * HTML entirely when the provider is not configured, instead of rendering a
 * button that fails with "Unsupported provider: provider is not enabled".
 */
async function googleSignInAvailable() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      next: { revalidate: 300 },
    });
    if (!response.ok) return true; // unknown — keep the option visible
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return Boolean(settings.external?.google);
  } catch {
    return true; // network blip — do not hide a working provider
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const googleEnabled = await googleSignInAvailable();
  return <LoginClient next={safeNext(next)} googleEnabled={googleEnabled} />;
}
