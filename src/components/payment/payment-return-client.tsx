"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge, buttonClass } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PaymentState =
  | "checking"
  | "paid"
  | "awaiting"
  | "pending"
  | "failed"
  | "auth"
  | "error";

const MAX_ATTEMPTS = 20;
const INTERVAL = 4_000;

export function PaymentReturnClient({ orderId }: { orderId: string | null }) {
  const { mode, refresh } = useApp();
  const [state, setState] = useState<PaymentState>("checking");
  const [message, setMessage] = useState("Confirming your payment with the gateway…");
  const [attempts, setAttempts] = useState(0);

  const check = useCallback(
    async (silent = false): Promise<PaymentState> => {
      if (!orderId) {
        setState("error");
        setMessage("No order was attached to this return link.");
        return "error";
      }
      if (!silent) setState("checking");

      try {
        const supabase = getSupabaseBrowser();
        if (!supabase) {
          setState("error");
          setMessage("Supabase is not configured for this deployment.");
          return "error";
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          setState("auth");
          setMessage("Sign in with the same account you used to book the slot.");
          return "auth";
        }

        const response = await fetch(
          `/api/payments/status?orderId=${encodeURIComponent(orderId)}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        const payload = (await response.json()) as {
          state?: "paid" | "awaiting" | "pending" | "failed";
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setState("auth");
            setMessage(payload.error ?? "Sign in again to verify this payment.");
            return "auth";
          }
          throw new Error(payload.error ?? "The status check failed.");
        }

        switch (payload.state) {
          case "paid":
            setState("paid");
            setMessage("Payment verified. Your slot is locked.");
            await refresh();
            return "paid";
          case "awaiting":
            setState("awaiting");
            setMessage("Payment received but still being reconciled by the desk.");
            return "awaiting";
          case "failed":
            setState("failed");
            setMessage("This payment did not go through. No slot has been charged.");
            return "failed";
          default:
            setState("pending");
            setMessage("The gateway has not seen your payment yet. This can take a minute.");
            return "pending";
        }
      } catch (cause) {
        setState("error");
        setMessage(cause instanceof Error ? cause.message : "Could not verify the payment.");
        return "error";
      }
    },
    [orderId, refresh],
  );

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setMessage("No order was attached to this return link.");
      return;
    }
    if (mode === "demo") {
      setState("error");
      setMessage("Demo checkouts complete inside the app — there is no external payment return.");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let count = 0;

    async function tick() {
      if (cancelled) return;
      count += 1;
      setAttempts(count);
      const result = await check(count > 1);
      if (cancelled) return;

      // Keep polling while the gateway settles, but stop once a terminal state is reached.
      if (["paid", "failed", "auth", "error"].includes(result)) return;
      if (count >= MAX_ATTEMPTS) return;
      timer = window.setTimeout(() => void tick(), INTERVAL);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // `check` is stable for a given order id.
  }, [check, mode, orderId]);

  const copy = {
    checking: {
      icon: <Loader2 className="size-6 animate-spin text-lime" />,
      title: "Confirming payment",
      tone: "border-lime/20 bg-lime/[0.06]",
    },
    paid: {
      icon: <Check className="size-7 text-ink" strokeWidth={3.5} />,
      title: "Slot locked",
      tone: "bg-lime text-ink",
    },
    awaiting: {
      icon: <Clock3 className="size-6 text-[#8cebff]" />,
      title: "Payment submitted",
      tone: "border-[#56E1FF]/25 bg-[#56E1FF]/10",
    },
    pending: {
      icon: <Clock3 className="size-6 text-[#ff9a80]" />,
      title: "Waiting for the gateway",
      tone: "border-orange/25 bg-orange/10",
    },
    failed: {
      icon: <X className="size-6 text-[#ff9a80]" />,
      title: "Payment failed",
      tone: "border-orange/25 bg-orange/10",
    },
    auth: {
      icon: <ShieldCheck className="size-6 text-violet" />,
      title: "Sign in required",
      tone: "border-lime/20 bg-lime/[0.06]",
    },
    error: {
      icon: <TriangleAlert className="size-6 text-[#ff9a80]" />,
      title: "Could not verify",
      tone: "border-orange/25 bg-orange/10",
    },
  }[state];

  return (
    <div data-payment-state={state} className="mx-auto max-w-lg">
      <div className="panel relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lime/70 to-transparent" />
        <span
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full border",
            copy.tone,
          )}
        >
          {copy.icon}
        </span>

        <Badge
          tone={state === "paid" ? "lime" : state === "failed" || state === "error" ? "orange" : "ice"}
          className="mt-4"
        >
          {state === "paid" ? <BadgeCheck className="size-3" /> : null}
          {state === "paid"
            ? "ORDER COMPLETE"
            : state === "checking"
              ? "VERIFYING"
              : state === "awaiting" || state === "pending"
                ? "PROCESSING"
                : "ACTION NEEDED"}
        </Badge>

        <h1 className="display mt-3 text-4xl text-mist">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted">{message}</p>

        {orderId ? (
          <p className="mt-4 inline-flex rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 font-mono text-[9px] tracking-[0.08em] text-muted">
            {orderId}
          </p>
        ) : null}

        {state === "checking" ? (
          <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.14em] text-muted/50">
            Check {attempts} of {MAX_ATTEMPTS}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          {state === "paid" ? (
            <Link href="/my-matches" className={cn(buttonClass("primary", "lg"), "w-full")}>
              View my match pass <ArrowRight className="size-4" />
            </Link>
          ) : state === "auth" ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/payment/return?orderId=${orderId ?? ""}`)}`}
              className={cn(buttonClass("primary", "md"), "w-full")}
            >
              Sign in <ArrowRight className="size-4" />
            </Link>
          ) : state === "failed" || state === "error" ? (
            <>
              <button
                type="button"
                onClick={() => void check(false)}
                className={cn(buttonClass("secondary", "md"), "w-full")}
              >
                <RefreshCw className="size-3.5" /> Check again
              </button>
              <Link href="/my-matches" className={cn(buttonClass("ghost", "md"), "w-full")}>
                My matches
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void check(false)}
                className={cn(buttonClass("secondary", "md"), "w-full")}
              >
                <RefreshCw className="size-3.5" /> Check payment now
              </button>
              <Link href="/my-matches" className={cn(buttonClass("ghost", "md"), "w-full")}>
                Go to my matches
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.13em] text-muted/45">
        <ShieldCheck className="size-3 text-violet/60" />
        Amount and UTR are verified against the gateway before a slot is confirmed
      </p>
    </div>
  );
}
