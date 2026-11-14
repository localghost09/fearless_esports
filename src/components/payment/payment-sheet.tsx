"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Badge, Button, buttonClass } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/components/providers/app-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  DEMO_UPI_VPA,
  UPI_PAYEE_NAME,
  UPI_VPA,
} from "@/lib/config";
import type { PaymentProvider, Registration, Scrim } from "@/lib/types";
import { cn, formatAmount, formatDayLabel, formatTime } from "@/lib/utils";

type Stage = "prep" | "ready" | "processing" | "awaiting" | "success" | "error";

interface PaymentOrder {
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  checkoutUrl?: string;
  upiUri?: string;
}

function buildUpiUri(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: UPI_VPA || DEMO_UPI_VPA,
    pn: UPI_PAYEE_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export function PaymentSheet({
  open,
  onClose,
  scrim,
  registration,
  onPaid,
  onAwaiting,
}: {
  open: boolean;
  onClose: () => void;
  scrim: Scrim;
  registration: Registration;
  onPaid: (orderId: string) => Promise<void>;
  onAwaiting: (orderId: string, utr: string) => Promise<void>;
}) {
  const { mode } = useApp();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("prep");
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [simulating, setSimulating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reset = useCallback(() => {
    setStage("prep");
    setOrder(null);
    setError(null);
    setUtr("");
    setSecondsLeft(600);
    setSimulating(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset();
    let cancelled = false;

    async function createOrder() {
      try {
        if (mode === "demo") {
          const orderId = `DEMO-${registration.id.slice(-6).toUpperCase()}`;
          const upiUri = buildUpiUri(scrim.entryFee, `Fearless Esports ${scrim.slug}`);
          if (cancelled) return;
          setOrder({ orderId, provider: "demo", amount: scrim.entryFee, upiUri });
          setStage("ready");
          return;
        }

        const supabase = getSupabaseBrowser();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        if (!session) {
          if (!cancelled) {
            setError("Your session expired. Sign in again to complete checkout.");
            setStage("error");
          }
          return;
        }

        const response = await fetch("/api/payments/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            registrationId: registration.id,
            returnUrl: `${window.location.origin}/payment/return`,
          }),
        });
        const payload = (await response.json()) as {
          orderId?: string;
          checkoutUrl?: string;
          upiUri?: string;
          provider?: PaymentProvider;
          amount?: number;
          error?: string;
        };
        if (!response.ok || !payload.orderId) {
          throw new Error(payload.error ?? "Could not start checkout.");
        }
        if (cancelled) return;
        setOrder({
          orderId: payload.orderId,
          provider: payload.provider ?? "upi",
          amount: payload.amount ?? scrim.entryFee,
          checkoutUrl: payload.checkoutUrl,
          upiUri: payload.upiUri,
        });
        setStage("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not start checkout.");
        setStage("error");
      }
    }

    void createOrder();
    return () => {
      cancelled = true;
    };
  }, [open, mode, registration.id, scrim.entryFee, scrim.slug, attempt, reset]);

  const confirmCheckout = useCallback(async () => {
    if (!order) return;
    setStage("success");
    await onPaid(order.orderId);
  }, [onPaid, order]);

  const simulatePayment = useCallback(async () => {
    if (!order) return;
    setSimulating(true);
    setStage("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    try {
      await confirmCheckout();
    } catch {
      setStage("error");
      setError("We could not lock your slot. Please retry or contact support.");
    } finally {
      setSimulating(false);
    }
  }, [confirmCheckout, order]);

  const pollStatus = useCallback(
    async (silent = false) => {
      if (!order) return;
      if (!silent) setStage("processing");
      try {
        const supabase = getSupabaseBrowser();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const response = await fetch(
          `/api/payments/status?orderId=${encodeURIComponent(order.orderId)}`,
          {
            cache: "no-store",
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
          },
        );
        const payload = (await response.json()) as {
          state?: "paid" | "awaiting" | "pending" | "failed";
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Could not verify payment.");
        if (payload.state === "paid") {
          await confirmCheckout();
          return;
        }
        if (payload.state === "awaiting") {
          setStage("awaiting");
          await onAwaiting(order.orderId, "");
          return;
        }
        if (payload.state === "failed") {
          setStage("error");
          setError("The payment did not go through. No slot has been charged.");
          return;
        }
        setStage("ready");
        if (!silent) {
          toast({
            title: "Payment not seen yet",
            description: "Give the bank alert a few seconds, then check again.",
            tone: "info",
          });
        }
      } catch (cause) {
        setStage("ready");
        if (!silent) {
          setError(cause instanceof Error ? cause.message : "Could not verify payment.");
        }
      }
    },
    [confirmCheckout, onAwaiting, order, toast],
  );

  useEffect(() => {
    if (!open || !order || order.provider !== "youpi") return;
    if (stage !== "ready" && stage !== "awaiting") return;
    const interval = window.setInterval(() => void pollStatus(true), 6000);
    return () => window.clearInterval(interval);
  }, [open, order, stage, pollStatus]);

  const submitUtr = useCallback(async () => {
    if (!order) return;
    const clean = utr.replace(/\D/g, "");
    if (clean.length < 12) {
      setError("Enter the 12-digit UTR from your UPI app.");
      return;
    }
    setStage("processing");
    setError(null);
    try {
      if (order.provider === "demo") {
        await simulatePayment();
        return;
      }
      const supabase = getSupabaseBrowser();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/payments/upi-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.orderId, utr: clean }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not submit UTR.");
      await onAwaiting(order.orderId, clean);
      setStage("awaiting");
    } catch (cause) {
      setStage("ready");
      setError(cause instanceof Error ? cause.message : "Could not submit UTR.");
    }
  }, [onAwaiting, order, simulatePayment, utr]);

  if (!open) return null;

  const amount = order?.amount ?? scrim.entryFee;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close checkout"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Secure checkout"
        className="relative z-10 max-h-[94dvh] w-full overflow-y-auto rounded-t-[26px] border border-white/[0.1] bg-[#0a0c0e] shadow-[0_-20px_80px_rgba(0,0,0,0.8)] animate-[rise_.25s_ease-out] sm:max-w-[430px] sm:rounded-[22px]"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0a0c0e]/95 px-4 py-3.5 backdrop-blur-xl">
          <span className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.16em] text-muted">
            <Lock className="size-3 text-violet" /> Secure checkout
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-muted transition hover:border-white/20 hover:text-mist"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-mist">
                {scrim.title}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
                {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)} · slot{" "}
                {registration.slot ?? "auto"}
              </p>
            </div>
            <p className="shrink-0 font-display text-2xl font-bold text-lime">
              {formatAmount(amount)}
            </p>
          </div>

          {stage === "prep" || stage === "processing" ? (
            <div className="flex flex-col items-center py-12">
              <span className="relative flex size-14 items-center justify-center rounded-full border border-lime/20 bg-lime/[0.06]">
                <Loader2 className="size-6 animate-spin text-lime" />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-mist">
                {stage === "processing" ? "Confirming payment" : "Opening secure checkout"}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {stage === "processing" ? "Locking your slot, hang tight." : "One moment..."}
              </p>
            </div>
          ) : null}

          {stage === "ready" && order ? (
            <div className="mt-4">
              {order.provider === "youpi" ? (
                <>
                  <div className="rounded-xl border border-lime/20 bg-lime/[0.035] p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime">
                        <ShieldCheck className="size-3.5" /> YouPI secure UPI
                      </span>
                      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
                        <Clock3 className="size-3" /> {Math.floor(secondsLeft / 60)}:
                        {String(secondsLeft % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted">
                      You&apos;ll be taken to the self-hosted YouPI checkout. Pay with GPay, PhonePe,
                      Paytm or any UPI app. Your slot is held while the gateway verifies the credit.
                    </p>
                    <a
                      href={order.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonClass("primary", "md"), "mt-3 w-full")}
                    >
                      Open YouPI checkout
                      <ArrowRight className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void pollStatus(false)}
                      className={cn(buttonClass("secondary", "sm"), "mt-2 w-full")}
                    >
                      <RefreshCw className="size-3.5" />
                      I&apos;ve paid — check status
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/50">
                    Order {order.orderId} · auto-verifying
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime">
                      <QrCode className="size-3.5" />
                      {order.provider === "demo" ? "Demo UPI QR" : "Scan to pay"}
                    </p>
                    <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
                      <Clock3 className="size-3" />
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr?data=${encodeURIComponent(order.upiUri ?? buildUpiUri(amount, scrim.title))}`}
                      alt="UPI payment QR code"
                      width={188}
                      height={188}
                      className="size-[188px]"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2">
                    <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
                      Pay to
                    </span>
                    <span className="font-mono text-[10px] text-mist">
                      {order.provider === "demo" ? DEMO_UPI_VPA : UPI_VPA || "merchant UPI"}
                    </span>
                  </div>

                  {order.provider === "demo" ? (
                    <>
                      <div className="mt-3 rounded-lg border border-orange/25 bg-orange/[0.06] px-3 py-2 text-[9px] leading-relaxed text-[#ffaf9b]">
                        <strong className="font-extrabold">DEMO MODE.</strong> No real money is
                        charged. Tap below to simulate a successful UPI payment and lock the slot.
                      </div>
                      <Button
                        onClick={() => void simulatePayment()}
                        disabled={simulating}
                        size="lg"
                        className="mt-3 w-full"
                      >
                        {simulating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Simulate payment · {formatAmount(amount)}
                      </Button>
                    </>
                  ) : (
                    <>
                      <a
                        href={order.upiUri}
                        className={cn(buttonClass("primary", "md"), "mt-3 w-full")}
                      >
                        <Smartphone className="size-4" />
                        Open UPI app
                      </a>
                      <div className="mt-3">
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                          Already paid? Enter UTR
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={utr}
                            onChange={(event) => setUtr(event.target.value.replace(/[^0-9]/g, ""))}
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="12-digit UTR"
                            className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-3 font-mono text-[13px] tracking-[0.12em] text-mist placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/45 focus:border-violet/50 focus:bg-white/[0.05] focus:outline-none"
                          />
                          <Button onClick={() => void submitUtr()} size="md" className="shrink-0">
                            Verify
                          </Button>
                        </div>
                        {error ? (
                          <p className="mt-2 text-[10px] leading-relaxed text-[#ff8b70]">{error}</p>
                        ) : null}
                      </div>
                    </>
                  )}
                  <p className="mt-3 text-center text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/50">
                    Order {order.orderId} ·{" "}
                    {order.provider === "demo"
                      ? "demo mode · no real money"
                      : "direct UPI · zero platform markup"}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {stage === "awaiting" ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border border-ice/25 bg-ice/10">
                <Clock3 className="size-6 text-[#a8efff]" />
              </span>
              <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-mist">
                Payment submitted
              </p>
              <p className="mt-1.5 max-w-[280px] text-[10px] leading-relaxed text-muted">
                Your slot is held while the desk verifies the UPI credit. You&apos;ll see it
                confirmed in My Matches, usually within a few minutes.
              </p>
              {utr ? (
                <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-mist">
                  UTR {utr}
                </p>
              ) : null}
              <Link
                href="/my-matches"
                className={cn(buttonClass("secondary", "md"), "mt-5 w-full")}
              >
                View my matches
              </Link>
            </div>
          ) : null}

          {stage === "success" ? (
            <div className="flex flex-col items-center pb-2 pt-6 text-center">
              <span className="relative flex size-16 items-center justify-center rounded-full bg-[linear-gradient(160deg,#e7ff9b,#d3ff55_55%,#b6ee2e)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_44px_-6px_rgba(211,255,85,0.6)]">
                <Check className="size-8" strokeWidth={3.5} />
              </span>
              <Badge tone="lime" className="mt-4">
                <BadgeCheck className="size-3" /> SLOT LOCKED
              </Badge>
              <p className="display mt-2 text-[34px] text-mist">
                Slot {registration.slot ?? "assigned"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-muted">
                {registration.teamName} · {registration.teamTag}
              </p>

              <div className="mt-5 w-full divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02] text-left">
                <TicketLine label="Lobby" value={scrim.title} />
                <TicketLine
                  label="Kickoff"
                  value={`${formatDayLabel(scrim.startAt)} · ${formatTime(scrim.startAt)}`}
                />
                <TicketLine label="Paid" value={formatAmount(amount)} lime />
                <TicketLine label="Order" value={order?.orderId ?? registration.orderId ?? "—"} />
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                <Lock className="size-3 text-violet" />
                Room ID unlocks 15 min before kickoff
              </p>

              <Link
                href="/my-matches"
                className={cn(buttonClass("primary", "lg"), "mt-4 w-full")}
              >
                View my match pass
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-mist"
              >
                Back to lobby
              </button>
            </div>
          ) : null}

          {stage === "error" ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border border-orange/25 bg-orange/10">
                <X className="size-6 text-[#ff9a80]" />
              </span>
              <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-mist">
                Checkout failed
              </p>
              <p className="mt-1.5 max-w-[280px] text-[10px] leading-relaxed text-muted">
                {error ?? "Something went wrong. No slot has been charged."}
              </p>
              <Button
                variant="secondary"
                className="mt-5 w-full"
                onClick={() => {
                  setAttempt((value) => value + 1);
                }}
              >
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] px-4 py-3 text-[8px] font-bold uppercase tracking-[0.12em] text-muted/45">
          <ShieldCheck className="size-3 text-violet/60" />
          {order?.provider === "youpi"
            ? "YouPI PG · self-hosted UPI"
            : order?.provider === "demo"
              ? "Demo mode · simulated UPI"
              : "Direct UPI · verified desk"}
          <span className="text-muted/25">·</span>
          <QrCode className="size-3 text-violet/60" />
          No card data stored
        </div>
      </div>
    </div>
  );
}

function TicketLine({ label, value, lime }: { label: string; value: string; lime?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-[8px] font-bold uppercase tracking-[0.13em] text-muted">{label}</span>
      <span
        className={cn(
          "max-w-[70%] truncate text-[10px] font-semibold",
          lime ? "text-lime" : "text-mist/85",
        )}
      >
        {value}
      </span>
    </div>
  );
}
