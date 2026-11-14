"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Lock, ShieldCheck, Share2, Ticket, Trophy } from "lucide-react";
import { Badge, Progress, buttonClass } from "@/components/ui";
import { Countdown } from "@/components/scrims/countdown";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import { buildSlotMap, myRegistrationForScrim } from "@/lib/slots";
import type { Scrim } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

export function SlotBoard({ scrim }: { scrim: Scrim }) {
  const { registrations } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const cells = buildSlotMap(scrim, registrations);
  const filled = cells.filter((cell) => cell.team).length;
  const mine = myRegistrationForScrim(scrim, registrations);
  const closed =
    scrim.status === "completed" ||
    scrim.status === "cancelled" ||
    (scrim.status !== "live" && new Date(scrim.startAt).getTime() < Date.now());
  const full = filled >= scrim.totalSlots || scrim.status === "full";

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 flex items-center gap-2 text-violet">
            <span className="size-1 rounded-full bg-violet shadow-[0_0_8px_rgba(183,166,255,0.85)]" />
            Live board
          </p>
          <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
            Slot board
          </h2>
          <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
            {filled} of {scrim.totalSlots} locked · pick an open slot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.1em] text-muted">
            <span className="size-1.5 rounded-full border border-white/20 bg-white/15" /> Taken
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-lime/20 bg-lime/[0.05] px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.1em] text-lime">
            <span className="size-1.5 rounded-full border border-dashed border-lime/60 bg-lime/10" /> Open
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {cells.map((cell) => {
            const isMine = cell.team && (cell.team.isMine || mine?.slot === cell.slot);
            const isSelected = selected === cell.slot;
            if (cell.team) {
              return (
                <div
                  key={cell.slot}
                  title={`Slot ${cell.slot} · ${cell.team.name}`}
                  className={cn(
                    "relative flex h-12 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border px-0.5 transition sm:h-[52px]",
                    isMine
                      ? "border-lime/45 bg-lime/[0.09] shadow-[inset_0_1px_0_rgba(211,255,85,0.14)]"
                      : "border-white/[0.07] bg-white/[0.03]",
                  )}
                >
                  <span
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: cell.team.logoColor }}
                  />
                  <span
                    className={cn(
                      "max-w-full truncate px-0.5 text-[7px] font-extrabold uppercase tracking-[0.03em] sm:text-[8px]",
                      isMine ? "text-lime" : "text-mist/65",
                    )}
                  >
                    {cell.team.tag}
                  </span>
                  <span className="text-[6px] font-semibold uppercase tracking-[0.08em] text-muted/45">
                    #{cell.slot}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={cell.slot}
                type="button"
                disabled={closed}
                onClick={() => setSelected(isSelected ? null : cell.slot)}
                aria-pressed={isSelected}
                aria-label={`Select slot ${cell.slot}`}
                className={cn(
                  "slot-open flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-[52px]",
                  isSelected && "border-lime bg-lime/15 text-lime ring-2 ring-lime/35",
                )}
              >
                <span className="text-[11px] font-bold leading-none tabular">
                  {isSelected ? <Check className="size-3" strokeWidth={3} /> : cell.slot}
                </span>
                <span className="text-[6px] font-bold uppercase tracking-[0.12em] opacity-70">
                  {isSelected ? "Selected" : "Open"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.14em] text-muted">
            <span>Lobby capacity</span>
            <span className="tabular text-mist/70">
              {filled}/{scrim.totalSlots}
            </span>
          </div>
          <Progress value={filled} total={scrim.totalSlots} />
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3.5 sm:flex sm:items-center sm:justify-between sm:gap-3">
          {mine ? (
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-lime/25 bg-lime/10 text-lime">
                <Check className="size-4" strokeWidth={3} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-mist">
                  You&apos;re locked in · slot {mine.slot}
                </p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-muted">
                  Room credentials unlock 15 minutes before kickoff.
                </p>
              </div>
            </div>
          ) : closed ? (
            <div className="flex items-center gap-2.5 text-[10px] font-semibold text-muted">
              <Lock className="size-4 text-muted/60" />
              Registrations are closed for this lobby.
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Ticket className="size-4 shrink-0 text-violet" />
              <p className="text-[10px] leading-relaxed text-muted">
                {selected
                  ? `Slot ${selected} is yours if you check out now.`
                  : "Select a slot above, or let us assign the next open one."}
              </p>
            </div>
          )}

          {mine ? (
            <Link
              href="/my-matches"
              className={cn(buttonClass("secondary", "sm"), "mt-3 w-full sm:mt-0 sm:w-auto")}
            >
              View match pass
            </Link>
          ) : closed ? (
            <Link
              href={`/scrims/${scrim.slug}/standings`}
              className={cn(buttonClass("secondary", "sm"), "mt-3 w-full sm:mt-0 sm:w-auto")}
            >
              Final standings
            </Link>
          ) : full && !selected ? (
            <span className={cn(buttonClass("secondary", "sm"), "pointer-events-none mt-3 w-full opacity-50 sm:mt-0 sm:w-auto")}>
              Lobby full
            </span>
          ) : (
            <Link
              href={`/scrims/${scrim.slug}/register${selected ? `?slot=${selected}` : ""}`}
              className={cn(buttonClass("primary", "sm"), "mt-3 w-full sm:mt-0 sm:w-auto")}
            >
              Register squad
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingCard({ scrim }: { scrim: Scrim }) {
  const { registrations } = useApp();
  const { toast } = useToast();
  const mine = myRegistrationForScrim(scrim, registrations);
  const filled = buildSlotMap(scrim, registrations).filter((cell) => cell.team).length;
  const remaining = Math.max(0, scrim.totalSlots - filled);
  const closed =
    scrim.status === "completed" ||
    scrim.status === "cancelled" ||
    new Date(scrim.startAt).getTime() < Date.now();
  const full = remaining === 0 || scrim.status === "full";

  async function share() {
    const url = `${window.location.origin}/scrims/${scrim.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${scrim.title} · Fearless Esports`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Lobby link copied", description: "Send it to your squad." });
      }
    } catch {
      // user cancelled the share sheet
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="relative border-b border-white/[0.07] px-5 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(211,255,85,0.4),transparent)]" />
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-muted">Entry fee</p>
          <Badge tone={full ? "neutral" : "lime"}>{full ? "LOBBY FULL" : `${remaining} SLOTS LEFT`}</Badge>
        </div>
        <div className="mt-2.5 flex items-end gap-1.5">
          <p className="font-display text-[42px] leading-none font-bold tracking-[-0.04em] text-mist">
            {scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
          </p>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">/ squad</p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-muted">
          <Trophy className="size-3 text-lime" />
          {formatINR(scrim.prizePool)} prize pool · ₹{scrim.perKill ?? 0}/kill
        </p>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5">
          <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted">
            {closed ? "Status" : "Starts in"}
          </span>
          {closed ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-mist/70">
              {scrim.status === "completed" ? "Match ended" : "Registration closed"}
            </span>
          ) : (
            <Countdown target={scrim.startAt} className="text-[11px] font-bold text-mist" />
          )}
        </div>

        {mine ? (
          <Link href="/my-matches" className={cn(buttonClass("primary", "lg"), "mt-3 w-full")}>
            <Check className="size-4" strokeWidth={3} />
            Slot {mine.slot} · view pass
          </Link>
        ) : closed ? (
          <Link
            href={`/scrims/${scrim.slug}/standings`}
            className={cn(buttonClass("primary", "lg"), "mt-3 w-full")}
          >
            View final standings
          </Link>
        ) : full ? (
          <button disabled className={cn(buttonClass("primary", "lg"), "mt-3 w-full")}>
            Lobby full
          </button>
        ) : (
          <Link
            href={`/scrims/${scrim.slug}/register`}
            className={cn(buttonClass("primary", "lg"), "mt-3 w-full")}
          >
            Register squad
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
        )}

        <button
          type="button"
          onClick={share}
          className={cn(buttonClass("ghost", "sm"), "mt-2 w-full text-muted")}
        >
          <Share2 className="size-3.5" />
          Share this lobby
        </button>

        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3.5">
          {[
            "Instant slot confirmation",
            "UPI checkout · no hidden fees",
            "Room ID 15 min before kickoff",
            "Payouts within 24 hours",
          ].map((line) => (
            <p key={line} className="flex items-center gap-2 text-[9px] font-semibold text-muted">
              <ShieldCheck className="size-3 shrink-0 text-violet/70" />
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileBookingBar({ scrim }: { scrim: Scrim }) {
  const { registrations } = useApp();
  const mine = myRegistrationForScrim(scrim, registrations);
  const filled = buildSlotMap(scrim, registrations).filter((cell) => cell.team).length;
  const remaining = Math.max(0, scrim.totalSlots - filled);
  const closed = new Date(scrim.startAt).getTime() < Date.now() || scrim.status === "completed";
  if (scrim.status === "completed") return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0c0e] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_44px_-16px_rgba(0,0,0,0.95)]">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(211,255,85,0.4),transparent)]" />
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[20px] leading-none font-bold tracking-[-0.03em] text-mist">
              {scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
            </p>
            <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
              {mine
                ? `Slot ${mine.slot} locked`
                : closed
                  ? "Registration closed"
                  : `${remaining} slots left · per squad`}
            </p>
          </div>
          {mine ? (
            <Link href="/my-matches" className={cn(buttonClass("primary", "md"), "shrink-0")}>
              View pass
            </Link>
          ) : closed ? (
            <Link
              href={`/scrims/${scrim.slug}/standings`}
              className={cn(buttonClass("secondary", "md"), "shrink-0")}
            >
              Standings
            </Link>
          ) : (
            <Link
              href={`/scrims/${scrim.slug}/register`}
              className={cn(buttonClass("primary", "md"), "shrink-0")}
            >
              Register
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
