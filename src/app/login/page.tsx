import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/login-client";

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <LoginClient next={safeNext(next)} />;
}
