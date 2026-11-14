"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Radio,
  ShieldCheck,
  Ticket,
  Timer,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, ButtonLink, LiveDot, SectionHeader } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import type { Scrim, SeasonStanding } from "@/lib/types";
import { cn, formatDayLabel, formatINR, formatTime } from "@/lib/utils";
import { ScrimRow } from "@/components/scrims/scrim-card";
import { Countdown } from "@/components/scrims/countdown";

export function LiveStrip({ scrim }: { scrim: Scrim }) {
  return (
    <div className="relative overflow-hidden border-b border-orange/15 bg-[linear-gradient(90deg,#170c08,#0b0908_60%,#08090a)]">
      <div className="absolute inset-0 bg-diagonal opacity-15" />
      <div className="absolute -left-20 top-1/2 size-56 -translate-y-1/2 rounded-full bg-orange/[0.08] blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-orange/25 bg-orange/10 shadow-[0_0_24px_-8px_rgba(255,106,69,0.6)]">
            <Radio className="size-4 text-orange" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#ff9a80]">
              <LiveDot /> Lobby live now
            </p>
            <p className="truncate font-display text-[17px] font-bold uppercase leading-tight tracking-[-0.02em] text-mist">
              {scrim.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3 text-orange" />
            {formatINR(scrim.prizePool)} pool
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Timer className="size-3 text-orange" />
            Match 2 of {scrim.matchesCount}
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <Zap className="size-3 text-orange" /> {scrim.matchesCount * 3} matches left
          </span>
        </div>

        <Link
          href={`/scrims/${scrim.slug}`}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-orange/30 bg-orange/10 px-3.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#ffab96] transition hover:bg-orange/20"
        >
          Open lobby
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function Ticker({ items }: { items: string[] }) {
  const content = (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {items.map((item) => (
        <span
          key={item}
          className="flex items-center gap-6 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.18em] text-muted/70"
        >
          {item}
          <span className="size-1 rotate-45 bg-violet/40" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-white/[0.06] bg-black/25 py-2.5 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div
        className="flex w-max"
        style={{ animation: "ticker 34s linear infinite" }}
      >
        {content}
        <div aria-hidden="true">{content}</div>
      </div>
    </div>
  );
}

export function WeeklyBanner({ scrim }: { scrim?: Scrim }) {
  if (!scrim) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <Link
        href={`/scrims/${scrim.slug}`}
        className="group relative block overflow-hidden rounded-[22px] border border-orange/25 shadow-[0_30px_80px_-40px_rgba(255,106,69,0.35)]"
        style={{
          backgroundImage:
            "radial-gradient(640px 280px at 88% -30%, rgba(255,106,69,0.32), transparent 70%), linear-gradient(120deg,#2c140b,#110c09 60%,#08090a)",
        }}
      >
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute -right-6 -top-10 font-display text-[170px] leading-none font-extrabold tracking-[-0.06em] text-orange/[0.07] sm:text-[230px]">
          5K
        </div>
        <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">
                <Trophy className="size-3" /> WEEKLY FLAGSHIP
              </Badge>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
                {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)}
              </span>
            </div>
            <h2 className="display mt-4 text-[clamp(2.2rem,10vw,3.4rem)] leading-[0.92] tracking-[-0.045em] text-mist">
              Weekend war <span className="text-orange">5K</span>
            </h2>
            <p className="mt-2.5 max-w-md text-[11px] leading-relaxed text-white/45">
              Five matches. Eighteen squads. The biggest pot of the week. Entry closes once the
              lobby locks.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
              <span className="flex items-center gap-1.5">
                <Trophy className="size-3 text-orange" /> {formatINR(scrim.prizePool)} prize
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="size-3 text-orange" /> {scrim.totalSlots} slots
              </span>
              <span className="flex items-center gap-1.5">
                <Timer className="size-3 text-orange" /> Entry {formatINR(scrim.entryFee)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">Starts in</p>
              <Countdown target={scrim.startAt} className="mt-1 block text-sm font-bold text-mist" />
            </div>
            <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-orange px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_34px_-14px_rgba(255,106,69,0.8)] transition group-hover:brightness-110">
              Lock a slot
              <ArrowUpRight className="size-4" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

export function LeaderboardPreview({ league }: { league: SeasonStanding[] }) {
  const { teams } = useApp();
  const myTeamIds = new Set(teams.map((team) => team.id));
  const rows = league.slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <SectionHeader
        eyebrow="Season 07"
        title="The pecking order"
        description="Overall points across every verified Fearless Esports lobby this season."
        actionHref="/leaderboard"
        actionLabel="Full leaderboard"
      />
      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[30px_1fr_34px_44px] gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[7px] font-bold uppercase tracking-[0.1em] text-muted/60 min-[360px]:grid-cols-[32px_1fr_36px_46px] sm:grid-cols-[48px_1fr_60px_70px_80px] sm:gap-2 sm:px-4 sm:text-[8px] sm:tracking-[0.13em]">
          <span>Rank</span>
          <span>Squad</span>
          <span className="hidden text-right sm:block">Events</span>
          <span className="text-right">Kills</span>
          <span className="text-right">Points</span>
        </div>
        {rows.map((row) => {
          const mine = myTeamIds.has(row.teamId);
          return (
            <div
              key={row.teamId}
              className={cn(
                "grid grid-cols-[30px_1fr_34px_44px] items-center gap-1.5 border-b border-white/[0.05] px-3 py-2.5 last:border-0 min-[360px]:grid-cols-[32px_1fr_36px_46px] sm:grid-cols-[48px_1fr_60px_70px_80px] sm:gap-2 sm:px-4 sm:py-3",
                mine && "bg-violet/[0.06]",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md font-display text-[11px] leading-none font-bold tabular sm:size-7 sm:text-[13px]",
                  row.rank === 1
                    ? "bg-lime text-ink shadow-[0_0_16px_-4px_rgba(211,255,85,0.7)]"
                    : row.rank <= 3
                      ? "border border-white/10 bg-white/[0.05] text-mist"
                      : "text-muted",
                )}
              >
                {String(row.rank).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-[6.5px] font-extrabold text-ink sm:size-7 sm:text-[8px]"
                  style={{ background: row.logoColor }}
                >
                  {row.tag}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-bold text-mist sm:text-[11px]">
                    {row.name}
                  </span>
                  {mine ? (
                    <span className="text-[6.5px] font-extrabold uppercase tracking-[0.12em] text-violet">
                      your squad
                    </span>
                  ) : (
                    <span className="text-[6.5px] font-semibold uppercase tracking-[0.08em] text-muted/55">
                      {row.wins} WWCD
                    </span>
                  )}
                </span>
              </span>
              <span className="hidden text-right text-[11px] font-semibold tabular text-muted sm:block">
                {row.events}
              </span>
              <span className="text-right text-[10px] font-semibold tabular text-mist/75 sm:text-[11px]">
                {row.kills}
              </span>
              <span className="text-right font-display text-base font-bold tabular text-lime sm:text-lg">
                {row.points}
              </span>
            </div>
          );
        })}
        <Link
          href="/leaderboard"
          className="flex items-center justify-between px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted transition hover:bg-white/[0.03] hover:text-violet"
        >
          View all {league.length} ranked squads
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Pick your lobby",
      body: "Choose a scrim by time, entry and prize pool. Check the slot board before you commit.",
      icon: Ticket,
    },
    {
      number: "02",
      title: "Lock your squad",
      body: "Add your four + substitute, claim a slot, and pay securely over UPI. Instant confirmation.",
      icon: ShieldCheck,
    },
    {
      number: "03",
      title: "Drop and climb",
      body: "Room credentials unlock before the match. Play, verify results, and get paid within 24 hours.",
      icon: Trophy,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <SectionHeader
        eyebrow="The process"
        title="Three steps to the drop"
        description="No DMs, no spreadsheets, no chasing admins for your slot."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="panel relative overflow-hidden p-5">
              <span className="absolute right-3 top-2 font-display text-[54px] leading-none font-extrabold text-white/[0.035]">
                {step.number}
              </span>
              <span className="flex size-9 items-center justify-center rounded-lg border border-violet/25 bg-violet/[0.08] text-violet">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-4 font-display text-[20px] font-bold uppercase tracking-[-0.03em] text-mist">
                {step.title}
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{step.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          { icon: BadgeCheck, label: "Verified BGMI IDs", detail: "Tier-checked lobbies" },
          { icon: Wallet, label: "UPI payouts < 24h", detail: "Direct to IGL" },
          { icon: ShieldCheck, label: "Manual marshals", detail: "Every single match" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3"
            >
              <Icon className="size-4 shrink-0 text-violet" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-mist/85">
                  {item.label}
                </p>
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted/60">
                  {item.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ScheduleSection({ scrims }: { scrims: Scrim[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
        <div>
          <SectionHeader
            eyebrow="Next up"
            title="The drop schedule"
            description="Every lobby in IST. Slots close 20 minutes before start."
            actionHref="/scrims"
            actionLabel="Full calendar"
          />
          <div className="panel px-4 sm:px-5">
            {scrims.slice(0, 6).map((scrim, index) => (
              <ScrimRow key={scrim.id} scrim={scrim} index={index} />
            ))}
          </div>
        </div>

        <aside className="lg:pt-[72px]">
          <div className="panel relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-violet/[0.1] blur-2xl" />
            <p className="eyebrow flex items-center gap-2 text-violet">
              <ShieldCheck className="size-3.5" />
              Fair play, enforced
            </p>
            <h3 className="display mt-3 text-[28px] leading-[0.92] text-mist">
              One lobby.
              <br />
              Zero excuses.
            </h3>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Every squad is ID-checked. Every match has a live marshal. POV checks are mandatory
              on request. Cheaters get banned, not a warning.
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                "Manual room administration",
                "POV + screen-record checks",
                "Instant blacklist for teaming",
                "Transparent, published points",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[10px] font-semibold text-mist/75">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-violet" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/legal/terms"
              className="mt-5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted transition hover:text-violet"
            >
              Read the rulebook
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 px-6 py-10 text-center sm:px-12 sm:py-14">
        <div className="absolute inset-0 bg-grid opacity-25" />
        <div className="brand-hairline absolute inset-x-0 top-0 h-px" />
        <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-deep/[0.2] blur-[90px]" />
        <div className="relative">
          <p className="eyebrow text-violet">Your next match is waiting</p>
          <h2 className="display mx-auto mt-3 max-w-2xl text-[clamp(2.2rem,10vw,3.6rem)] leading-[0.9] tracking-[-0.045em] text-mist sm:text-[58px]">
            Your drop is <span className="text-violet">waiting.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[12px] leading-relaxed text-muted">
            Grab a slot before the lobby locks. First come, first served — no resale, no favours.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <ButtonLink href="/scrims" size="lg" arrow>
              Find a lobby
            </ButtonLink>
            <ButtonLink href="/teams" variant="secondary" size="lg">
              Set up your squad
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
