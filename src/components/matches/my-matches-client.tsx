"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Crosshair,
  KeyRound,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  Ticket,
  Trophy,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge, EmptyState, buttonClass } from "@/components/ui";
import { Countdown } from "@/components/scrims/countdown";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import type { Registration } from "@/lib/types";
import { cn, formatAmount, formatFull, ordinal } from "@/lib/utils";

type Tab = "upcoming" | "live" | "past" | "action";

const ACTIVE = ["confirmed", "pending_payment", "awaiting_verification"];

function isPast(reg: Registration) {
  return reg.scrimStatus === "completed" || new Date(reg.scrimStartAt).getTime() + 3 * 3600_000 < Date.now();
}

function isLive(reg: Registration) {
  const start = new Date(reg.scrimStartAt).getTime();
  return reg.scrimStatus === "live" || (start <= Date.now() && !isPast(reg));
}

export function MyMatchesClient() {
  const { ready, profile, mode, registrations, confirmRegistration, cancelRegistration } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(
    () => registrations.filter((reg) => ACTIVE.includes(reg.status)),
    [registrations],
  );

  const grouped = useMemo(() => {
    const upcoming = rows
      .filter((reg) => !isPast(reg) && !isLive(reg))
      .sort((a, b) => new Date(a.scrimStartAt).getTime() - new Date(b.scrimStartAt).getTime());
    const live = rows.filter((reg) => isLive(reg) && !isPast(reg));
    const past = rows
      .filter(isPast)
      .sort((a, b) => new Date(b.scrimStartAt).getTime() - new Date(a.scrimStartAt).getTime());
    const action = rows.filter(
      (reg) => reg.status === "pending_payment" || reg.status === "awaiting_verification",
    );
    return { upcoming, live, past, action };
  }, [rows]);

  const tabs = [
    { id: "upcoming" as const, label: "Upcoming", count: grouped.upcoming.length, icon: CalendarDays },
    { id: "live" as const, label: "Live", count: grouped.live.length, icon: Radio },
    { id: "past" as const, label: "Past", count: grouped.past.length, icon: Trophy },
    { id: "action" as const, label: "Action", count: grouped.action.length, icon: TriangleAlert },
  ];

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, description: value });
    } catch {
      toast({ title: "Copy failed", description: value, tone: "info" });
    }
  }

  async function handleCancel(reg: Registration) {
    setBusy(reg.id);
    try {
      await cancelRegistration(reg.id);
      toast({ title: "Hold released", description: `Slot ${reg.slot ?? ""} is open again.` });
    } catch (cause) {
      toast({
        title: "Could not release slot",
        description: cause instanceof Error ? cause.message : "Contact support with your order ID.",
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm(reg: Registration) {
    setBusy(reg.id);
    try {
      await confirmRegistration(reg.id, reg.orderId ?? undefined);
      toast({ title: "Payment confirmed", description: `Slot ${reg.slot ?? ""} is locked.` });
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return <div className="panel h-64 shimmer" />;
  }

  if (mode === "live" && !profile) {
    return (
      <EmptyState
        icon={<Lock className="size-5" />}
        title="Sign in to see your matches"
        description="Your slots, room credentials and match passes live in your account."
        action={
          <Link href="/login?next=/my-matches" className={buttonClass("primary", "md")}>
            Sign in
          </Link>
        }
      />
    );
  }

  const active = grouped[tab];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl border text-[7.5px] font-extrabold uppercase tracking-[0.08em] transition",
                selected
                  ? "border-violet/35 bg-violet/[0.1] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.12)]"
                  : "border-transparent text-muted/70 hover:bg-white/[0.03] hover:text-mist",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5" />
                <span
                  className={cn(
                    "flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[7px] tabular",
                    selected ? "bg-violet/20 text-violet" : "bg-white/[0.06] text-muted/80",
                  )}
                >
                  {item.count}
                </span>
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      {!active.length ? (
        <EmptyState
          icon={<Ticket className="size-5" />}
          title={tab === "action" ? "Nothing needs attention" : `No ${tab} matches`}
          description={
            tab === "action"
              ? "Every booking is settled. Go lock another slot."
              : "Your booked lobbies will show up here with room credentials and match passes."
          }
          action={
            <Link href="/scrims" className={buttonClass("primary", "md")}>
              Browse scrims <ArrowRight className="size-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {active.map((reg) => (
            <MatchPass
              key={reg.id}
              registration={reg}
              busy={busy === reg.id}
              live={isLive(reg)}
              past={isPast(reg)}
              onCancel={() => void handleCancel(reg)}
              onConfirm={() => void handleConfirm(reg)}
              onCopy={copy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchPass({
  registration,
  live,
  past,
  busy,
  onCancel,
  onConfirm,
  onCopy,
}: {
  registration: Registration;
  live: boolean;
  past: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onCopy: (value: string, label: string) => void;
}) {
  const reg = registration;
  const start = new Date(reg.scrimStartAt).getTime();
  const roomUnlocked = reg.status === "confirmed" && (live || start - Date.now() <= 15 * 60_000);
  const pending = reg.status === "pending_payment";
  const awaiting = reg.status === "awaiting_verification";
  const confirmed = reg.status === "confirmed";

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          {live ? (
            <Badge tone="orange">
              <Radio className="size-3" /> LIVE NOW
            </Badge>
          ) : past ? (
            <Badge tone="outline">FINAL</Badge>
          ) : pending ? (
            <Badge tone="orange">PAYMENT PENDING</Badge>
          ) : awaiting ? (
            <Badge tone="ice">VERIFYING UPI</Badge>
          ) : (
            <Badge tone="lime">
              <Check className="size-3" strokeWidth={3} /> SLOT LOCKED
            </Badge>
          )}
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
            {reg.slot ? `SLOT ${String(reg.slot).padStart(2, "0")}` : "SLOT PENDING"}
          </span>
        </div>
        {!past && !live ? (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            <Clock3 className="size-3 text-violet" />
            <Countdown target={reg.scrimStartAt} className="text-mist/80" hideIfStarted />
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={past ? `/scrims/${reg.scrimSlug}/standings` : `/scrims/${reg.scrimSlug}`}
              className="block truncate font-display text-[22px] font-bold uppercase leading-none tracking-[-0.03em] text-mist transition hover:text-violet"
            >
              {reg.scrimTitle}
            </Link>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3 text-violet/70" />
                {formatFull(reg.scrimStartAt)}
              </span>
              <span className="text-muted/30">·</span>
              <span>{ordinal(reg.slot ?? 0)} slot</span>
            </p>
          </div>
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[9px] font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            style={{ background: reg.logoColor }}
          >
            {reg.teamTag}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <InfoCell icon={<Users className="size-3" />} label="Squad" value={reg.teamName} />
          <InfoCell
            icon={<MapPin className="size-3" />}
            label="Drop"
            value={reg.dropLocation || "Flexible"}
          />
          <InfoCell
            icon={<Trophy className="size-3" />}
            label={confirmed ? "Paid" : pending ? "Due" : awaiting ? "Submitted" : "Amount"}
            value={reg.amount === 0 ? "FREE" : formatAmount(reg.amount)}
            lime={confirmed}
          />
        </div>

        {pending || awaiting ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-orange/20 bg-orange/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[#ff9a80]" />
              <p className="text-[9px] leading-relaxed text-[#ffb7a6]">
                {pending
                  ? "Your slot is held but not locked. Complete payment before the hold is released."
                  : "UPI payment submitted. The desk is verifying the credit — your slot stays held."}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {pending ? (
                <>
                  <Link
                    href={`/scrims/${reg.scrimSlug}/register`}
                    className={cn(buttonClass("primary", "sm"), "flex-1 sm:flex-none")}
                  >
                    Pay now
                  </Link>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className={cn(buttonClass("ghost", "sm"), "text-[#ff9a80]")}
                  >
                    Release
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={busy}
                  className={cn(buttonClass("secondary", "sm"), "flex-1 sm:flex-none")}
                >
                  Refresh status
                </button>
              )}
            </div>
          </div>
        ) : confirmed ? (
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-violet">
                <KeyRound className="size-3" /> Room credentials
              </p>
              <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-[0.1em] text-muted/60">
                <ShieldCheck className="size-2.5" /> {roomUnlocked ? "UNLOCKED" : "LOCKED"}
              </span>
            </div>

            {roomUnlocked && reg.roomId ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCopy(reg.roomId ?? "", "Room ID")}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left"
                >
                  <span>
                    <span className="block text-[7px] font-bold uppercase tracking-[0.12em] text-muted">
                      Room ID
                    </span>
                    <span className="font-display text-lg font-bold tracking-[0.08em] text-mist">
                      {reg.roomId}
                    </span>
                  </span>
                  <Copy className="size-3 text-muted/50 group-hover:text-violet" />
                </button>
                <button
                  type="button"
                  onClick={() => onCopy(reg.roomPass ?? "", "Password")}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left"
                >
                  <span>
                    <span className="block text-[7px] font-bold uppercase tracking-[0.12em] text-muted">
                      Password
                    </span>
                    <span className="font-display text-lg font-bold tracking-[0.08em] text-mist">
                      {reg.roomPass || "—"}
                    </span>
                  </span>
                  <Copy className="size-3 text-muted/50 group-hover:text-violet" />
                </button>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-[9px] leading-relaxed text-muted">
                <Lock className="size-3 shrink-0 text-violet/70" />
                {roomUnlocked
                  ? "Credentials will appear here as soon as the marshal opens the room."
                  : "Room ID and password unlock 15 minutes before kickoff."}
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/60">
            <Crosshair className="size-3 text-violet/60" />
            {reg.roster.length ? `${reg.roster.filter((m) => !m.isSub).length} players + ${reg.roster.filter((m) => m.isSub).length} sub` : "Roster locked"}
          </span>
          <div className="flex items-center gap-3">
            {past || live ? (
              <Link
                href={`/scrims/${reg.scrimSlug}/standings`}
                className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime hover:underline"
              >
                {past ? "Final table" : "Live points"} <ArrowRight className="size-3" />
              </Link>
            ) : null}
            <Link
              href={`/scrims/${reg.scrimSlug}`}
              className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-mist"
            >
              Lobby
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  lime,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  lime?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <p className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-[0.12em] text-muted/65">
        <span className="text-violet/60">{icon}</span>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-[10px] font-semibold",
          lime ? "text-lime" : "text-mist/85",
        )}
      >
        {value}
      </p>
    </div>
  );
}
