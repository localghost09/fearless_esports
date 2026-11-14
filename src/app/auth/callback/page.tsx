import type { Metadata } from "next";
import { AuthCallbackClient } from "@/components/auth/auth-callback-client";

export const metadata: Metadata = {
  title: "Verifying sign-in",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/my-matches";
  }
  if (value.length > 512) return "/my-matches";
  if (value.startsWith("/auth/") || value.startsWith("/login")) return "/my-matches";
  return value;
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string | string[];
    next?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const providerError =
    first(params.error_description) ?? first(params.error) ?? first(params.error_code);
  const code = providerError ? null : first(params.code);
  const next = safeNext(first(params.next));

  return (
    <AuthCallbackClient
      code={code}
      next={next}
      errorDescription={providerError}
    />
  );
}
