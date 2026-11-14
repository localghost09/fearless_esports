"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type State = "working" | "error";

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/my-matches";
  }
  if (value.length > 512) return "/my-matches";
  if (value.startsWith("/auth/") || value.startsWith("/login")) return "/my-matches";
  return value;
}

function friendlyError(value?: string | null) {
  if (!value) return "Verifying your sign-in link…";
  const normalized = value.toLowerCase();
  if (normalized.includes("access_denied") || normalized.includes("cancel")) {
    return "Google sign-in was cancelled. Try again or use your email instead.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the verification link.";
  }
  return value;
}

export function AuthCallbackClient({
  code,
  next,
  errorDescription,
}: {
  code: string | null;
  next: string;
  errorDescription?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>(errorDescription ? "error" : "working");
  const [message, setMessage] = useState(friendlyError(errorDescription));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (errorDescription) return;

    async function finish() {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setState("error");
        setMessage("Supabase is not configured for this deployment.");
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // detectSessionInUrl may have already consumed a hash token.
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("This link is missing or has expired.");
        }

        setMessage("Signed in. Taking you to your matches…");
        router.replace(safeNext(next));
        router.refresh();
      } catch (cause) {
        setState("error");
        setMessage(
          cause instanceof Error
            ? cause.message
            : "We could not verify this link. Request a fresh one and try again.",
        );
      }
    }

    void finish();
  }, [code, errorDescription, next, router]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col justify-center px-4 py-12">
      <Logo />
      <div className="panel mt-8 p-6 text-center">
        {state === "working" ? (
          <>
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet/25 bg-violet/[0.08]">
              <Loader2 className="size-6 animate-spin text-violet" />
            </span>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-violet">
              <ShieldCheck className="size-3.5" /> Secure sign-in
            </p>
            <h1 className="display mt-2 text-3xl text-mist">Hold tight</h1>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{message}</p>
          </>
        ) : (
          <>
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-orange/25 bg-orange/10">
              <TriangleAlert className="size-6 text-[#ff9a80]" />
            </span>
            <p className="mt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#ff9a80]">
              Sign-in issue
            </p>
            <h1 className="display mt-2 text-3xl text-mist">Sign-in failed</h1>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{message}</p>
            <Link href="/login" className={cn(buttonClass("primary", "md"), "mt-5 w-full")}>
              Try another way <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </div>
      <p className="mt-5 text-center text-[9px] leading-relaxed text-muted/50">
        Sign-in links work once and expire quickly. If this keeps failing, try Google or your
        password instead.
      </p>
    </div>
  );
}
