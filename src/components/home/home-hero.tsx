"use client";

import Link from "next/link";
import { Check, Radio, ShieldCheck, Zap } from "lucide-react";
import { Badge, ButtonLink, LiveDot } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { buildSlotMap, myRegistrationForScrim } from "@/lib/slots";
import type { Scrim } from "@/lib/types";
import { cn, formatDayLabel, formatINR, formatTime } from "@/lib/utils";
import { Countdown } from "@/components/scrims/countdown";

export function HomeHero({
  featured,
  stats,
}: {
  featured: Scrim;
  stats: { teams: number; matches: number; prize: number; players: number };
}) {
  const { registrations } = useApp();
  const occupied = buildSlotMap(featured, registrations);
  const filled = occupied.filter((cell) => cell.team).length;
  const mine = myRegistrationForScrim(featured, registrations);
  const remaining = Math.max(0, featured.totalSlots - filled);

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.14]" />
      <div className="pointer-events-none absolute -top-44 right-[-14%] size-[560px] rounded-full bg-violet-deep/[0.2] blur-[110px]" />
      <div className="pointer-events-none absolute -left-44 top-40 size-[440px] rounded-full bg-violet/[0.08] blur-[110px]" />
      <div className="brand-hairline pointer-events-none absolute inset-x-0 top-0 h-px" />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-8 lg:pb-16 lg:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Badge tone="violet" className="gap-2">
                <LiveDot />
                BGMI · DAILY CUSTOM ROOMS
              </Badge>
              <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted/60">
                <span className="h-px w-4 bg-white/15" />
                Season 07 · IST
              </span>
            </div>

            <h1 className="display text-[clamp(3.25rem,12.5vw,6rem)] leading-[0.87] tracking-[-0.05em] text-mist">
              Forged in
              <br />
              the <span className="text-violet text-glow">lobby.</span>
            </h1>

            <p className="mt-5 max-w-[430px] text-[13px] leading-[1.75] text-muted sm:text-sm">
              Book your squad into verified BGMI scrims, take the drop, and climb the points table.
              Real slots. Manual marshals. Payouts inside 24 hours.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <ButtonLink
                href={mine ? "/my-matches" : `/scrims/${featured.slug}`}
                size="lg"
                className="w-full sm:w-auto"
                arrow
              >
                {mine ? "You're in — view match" : "Claim your slot"}
              </ButtonLink>
              <ButtonLink
                href="/scrims"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Browse all scrims
              </ButtonLink>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["PH", "NV", "RF", "VY"].map((tag, index) => (
                  <span
                    key={tag}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border-2 border-ink text-[7.5px] font-extrabold tracking-[-0.02em] text-ink shadow-[0_4px_12px_rgba(0,0,0,0.35)]",
                      ["bg-lime", "bg-violet", "bg-ice", "bg-orange"][index],
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                <span className="text-mist">{stats.teams.toLocaleString("en-IN")}+</span> squads
                already grinding
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/[0.07] pt-6 sm:grid-cols-4 sm:gap-3">
              <Stat value={`₹${formatCompact(stats.prize)}`} label="Paid out" />
              <Stat value={`${formatCompact(stats.matches)}+`} label="Matches run" />
              <Stat value={`${formatCompact(stats.players)}+`} label="Active players" />
              <Stat value="<24H" label="Payout window" />
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-5 rounded-[38px] bg-violet-deep/[0.16] blur-3xl" />
            <div className="glass relative overflow-hidden rounded-[22px]">
              <div
                className="relative overflow-hidden px-4 pb-5 pt-4 sm:px-5 sm:pb-6"
                style={{
                  backgroundImage:
                    "radial-gradient(460px 200px at 92% -12%, rgba(140,92,255,0.34), transparent 70%), linear-gradient(145deg,#1c1233,#0c0814 62%,#08060c)",
                }}
              >
                <div className="absolute inset-0 bg-diagonal opacity-20" />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-violet">
                    <span className="flex size-5 items-center justify-center rounded-full border border-violet/30 bg-violet/10">
                      <Radio className="size-2.5" />
                    </span>
                    Tonight&apos;s featured
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-mist/65 backdrop-blur">
                    {formatDayLabel(featured.startAt)} · {formatTime(featured.startAt)}
                  </span>
                </div>

                <h2 className="display relative mt-6 max-w-[92%] text-[clamp(1.85rem,8.5vw,2.6rem)] leading-[0.95] tracking-[-0.04em] text-mist">
                  {featured.title}
                </h2>
                <p className="relative mt-2 max-w-[300px] text-[11px] leading-relaxed text-white/45">
                  {featured.subtitle}
                </p>

                <div className="relative mt-5 flex items-end justify-between gap-3">
                  <Countdown target={featured.startAt} format="boxes" />
                  <div className="text-right">
                    <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">
                      Winner takes
                    </p>
                    <p className="mt-0.5 font-display text-[22px] leading-none font-bold tracking-[-0.03em] text-lime">
                      {formatINR(featured.prizes[0]?.amount ?? featured.prizePool)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.13em]">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="size-1.5 rounded-full bg-lime shadow-[0_0_8px_rgba(211,255,85,0.8)]" />
                    Slot board · {filled}/{featured.totalSlots}
                  </span>
                  <span className={remaining <= 4 ? "text-orange" : "text-lime"}>
                    {remaining} left
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-9 gap-1">
                  {occupied.map((cell) => (
                    <span
                      key={cell.slot}
                      title={
                        cell.team ? `Slot ${cell.slot} · ${cell.team.tag}` : `Slot ${cell.slot} · open`
                      }
                      className={cn(
                        "flex h-7 items-center justify-center rounded-md border text-[6px] font-bold",
                        cell.team
                          ? "border-white/[0.08] bg-white/[0.06] text-white/40"
                          : "border-dashed border-lime/25 bg-lime/[0.035] text-lime/65",
                      )}
                    >
                      {cell.team ? cell.team.tag.slice(0, 3) : cell.slot}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.07] rounded-xl border border-white/[0.07] bg-black/20 py-3">
                  <MiniStat label="Entry" value={featured.entryFee === 0 ? "FREE" : formatINR(featured.entryFee)} />
                  <MiniStat label="Prize pool" value={formatINR(featured.prizePool)} lime />
                  <MiniStat label="Per kill" value={`₹${featured.perKill ?? 0}`} />
                </div>

                {mine ? (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-lime/25 bg-lime/[0.06] px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-lime">
                      <Check className="size-3.5" strokeWidth={3} />
                      Slot {mine.slot} locked
                    </span>
                    <Link
                      href="/my-matches"
                      className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/70 underline-offset-4 hover:underline"
                    >
                      View pass
                    </Link>
                  </div>
                ) : (
                  <ButtonLink
                    href={`/scrims/${featured.slug}`}
                    size="md"
                    className="mt-4 w-full"
                    arrow
                  >
                    {featured.status === "full" ? "Join waitlist" : "Book a slot"}
                  </ButtonLink>
                )}

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted/55">
                  <ShieldCheck className="size-3 text-violet/70" />
                  Room credentials unlock 15 min before drop
                </div>
              </div>
            </div>

            <div className="absolute -right-2 -top-3 hidden rotate-3 items-center gap-1.5 rounded-full border border-orange/25 bg-[#231009] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#ff9a80] shadow-xl sm:flex">
              <Zap className="size-3" />
              {remaining} slots left
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-[24px] leading-none font-bold tracking-[-0.04em] text-mist sm:text-[27px]">
        {value}
      </p>
      <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-muted/60">
        {label}
      </p>
    </div>
  );
}

function MiniStat({ label, value, lime }: { label: string; value: string; lime?: boolean }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-muted/60">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-display text-[15px] leading-none font-bold tracking-[-0.03em]",
          lime ? "text-lime" : "text-mist",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatCompact(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(2)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}
