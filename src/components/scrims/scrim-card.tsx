"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Crosshair,
  Trophy,
} from "lucide-react";
import { Badge, LiveDot, Progress } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import type { BannerTheme, Scrim } from "@/lib/types";
import { statusMeta, tierLabel } from "@/lib/scrims";
import { activeSlotCount, myRegistrationForScrim } from "@/lib/slots";
import { cn, formatDayLabel, formatINR, formatTime } from "@/lib/utils";
import { Countdown } from "./countdown";

const THEMES: Record<
  BannerTheme,
  { accent: string; gradient: string; wash: string; chip: "lime" | "orange" | "violet" | "ice" }
> = {
  lime: {
    accent: "#D3FF55",
    gradient: "linear-gradient(132deg, #29380d 0%, #141c09 44%, #07090a 100%)",
    wash: "radial-gradient(440px 210px at 84% -22%, rgba(211,255,85,0.24), transparent 70%)",
    chip: "lime",
  },
  ember: {
    accent: "#FF6A45",
    gradient: "linear-gradient(132deg, #32180e 0%, #1a100c 44%, #09090a 100%)",
    wash: "radial-gradient(440px 210px at 84% -22%, rgba(255,106,69,0.26), transparent 70%)",
    chip: "orange",
  },
  violet: {
    accent: "#A99CFF",
    gradient: "linear-gradient(132deg, #201a42 0%, #131024 44%, #08080c 100%)",
    wash: "radial-gradient(440px 210px at 84% -22%, rgba(169,156,255,0.28), transparent 70%)",
    chip: "violet",
  },
  ice: {
    accent: "#8FE8FF",
    gradient: "linear-gradient(132deg, #0c2d36 0%, #0b161a 44%, #07090a 100%)",
    wash: "radial-gradient(440px 210px at 84% -22%, rgba(143,232,255,0.24), transparent 70%)",
    chip: "ice",
  },
};

export function ScrimBanner({
  scrim,
  tall = false,
  showStatus = true,
  eager = false,
}: {
  scrim: Scrim;
  tall?: boolean;
  showStatus?: boolean;
  eager?: boolean;
}) {
  const theme = THEMES[scrim.banner];
  const meta = statusMeta(scrim.status);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-ink",
        tall ? "h-[220px] sm:h-[260px]" : "h-[168px]",
      )}
    >
      <Image
        src="/brand/scrims-bg.webp"
        alt=""
        fill
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        sizes={
          tall
            ? "(max-width: 640px) 100vw, 1152px"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
        }
        className="object-cover object-[52%_34%] transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(118deg, ${theme.accent}30 0%, transparent 52%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,6,8,0.48) 0%, rgba(5,6,8,0.06) 38%, rgba(5,6,8,0.9) 100%), linear-gradient(90deg, rgba(5,6,8,0.5) 0%, rgba(5,6,8,0.08) 58%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent 78%)` }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-2.5 flex justify-center">
        <span className="text-[6.5px] font-extrabold uppercase tracking-[0.34em] text-white/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          Fearless Esports
        </span>
      </div>

      <div className="relative flex h-full flex-col justify-between p-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[8px] font-extrabold uppercase tracking-[0.14em] backdrop-blur-md"
              style={{
                borderColor: `${theme.accent}44`,
                background: `${theme.accent}14`,
                color: theme.accent,
              }}
            >
              <Crosshair className="size-2.5" />
              {scrim.game}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/65 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {tierLabel(scrim.tier)}
            </span>
          </div>
          {showStatus ? (
            <Badge tone={meta.tone} className="h-6 bg-black/45 backdrop-blur-md">
              {scrim.status === "live" ? <LiveDot /> : null}
              {meta.label}
            </Badge>
          ) : null}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            <CalendarDays className="size-3" style={{ color: theme.accent }} />
            {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)}
          </p>
          <h3
            className={cn(
              "display line-clamp-2 max-w-[90%] text-mist drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]",
              tall
                ? "text-[clamp(1.9rem,8vw,2.6rem)] leading-[0.95]"
                : "text-[24px] leading-[0.95]",
            )}
          >
            {scrim.title}
          </h3>
        </div>
      </div>
    </div>
  );
}

export function ScrimCard({ scrim, eager = false }: { scrim: Scrim; eager?: boolean }) {
  const { registrations } = useApp();
  const filled = activeSlotCount(scrim, registrations);
  const remaining = Math.max(0, scrim.totalSlots - filled);
  const mine = myRegistrationForScrim(scrim, registrations);
  const theme = THEMES[scrim.banner];
  const isCompleted = scrim.status === "completed" || new Date(scrim.startAt) < new Date();
  const href = isCompleted
    ? `/scrims/${scrim.slug}/standings`
    : `/scrims/${scrim.slug}`;

  return (
    <Link
      href={href}
      className="group panel panel-hover relative flex flex-col overflow-hidden hover:no-underline"
    >
      <ScrimBanner scrim={scrim} eager={eager} />
      {mine ? (
        <div className="absolute right-3 top-[62px] z-10">
          <Badge tone="lime" className="bg-black/50 backdrop-blur-md">
            YOU&apos;RE IN · SLOT {mine.slot}
          </Badge>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-3 divide-x divide-white/[0.07]">
          <div className="min-w-0 pr-3">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-muted/70">Entry</p>
            <p className="mt-1.5 truncate font-display text-[12.5px] leading-none font-bold tracking-[-0.03em] text-mist min-[360px]:text-[15px]">
              {scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
            </p>
          </div>
          <div className="min-w-0 px-3">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-muted/70">Prize pool</p>
            <p className="mt-1.5 truncate font-display text-[12.5px] leading-none font-bold tracking-[-0.03em] text-lime min-[360px]:text-[15px]">
              {formatINR(scrim.prizePool)}
            </p>
          </div>
          <div className="min-w-0 pl-3">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-muted/70">Format</p>
            <p className="mt-1.5 truncate font-display text-[12.5px] leading-none font-bold tracking-[-0.03em] text-mist min-[360px]:text-[15px]">
              {scrim.matchesCount} MATCH{scrim.matchesCount > 1 ? "ES" : ""}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em]">
            <span className="text-muted">
              {scrim.status === "live" ? "LOBBY LOCKED" : scrim.status === "completed" ? "FINAL STANDINGS" : `${remaining} SLOTS LEFT`}
            </span>
            <span className="tabular text-mist/60">
              {filled}/{scrim.totalSlots}
            </span>
          </div>
          <Progress
            value={filled}
            total={scrim.totalSlots}
            tone={scrim.banner === "ember" ? "orange" : scrim.banner === "violet" ? "violet" : "lime"}
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
          <div className="flex min-w-0 items-center gap-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
            <span className="flex shrink-0 items-center gap-1.5">
              <Trophy className="size-3" style={{ color: theme.accent }} />
              {scrim.mode}
            </span>
            <span className="hidden text-muted/40 sm:inline">·</span>
            <span className="hidden max-w-[120px] truncate sm:inline">{scrim.map}</span>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-mist transition-all duration-200 group-hover:border-violet/50 group-hover:bg-violet group-hover:text-ink">
            <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ScrimRow({ scrim, index }: { scrim: Scrim; index?: number }) {
  const { registrations } = useApp();
  const filled = activeSlotCount(scrim, registrations);
  const remaining = Math.max(0, scrim.totalSlots - filled);
  const theme = THEMES[scrim.banner];

  return (
    <Link
      href={scrim.status === "completed" ? `/scrims/${scrim.slug}/standings` : `/scrims/${scrim.slug}`}
      className="group relative flex items-center gap-3 border-b border-white/[0.06] py-3.5 transition last:border-0 hover:bg-white/[0.02] sm:gap-4"
    >
      <div className="w-[74px] shrink-0 border-r border-white/[0.07] pr-3 text-right">
        <p className="font-display text-[17px] leading-none font-bold tracking-[-0.02em] text-mist">
          {formatTime(scrim.startAt)}
        </p>
        <p className="mt-1.5 text-[7.5px] font-bold uppercase tracking-[0.08em] text-muted/70">
          {formatDayLabel(scrim.startAt)}
        </p>
      </div>

      <div
        className="hidden h-10 w-[3px] shrink-0 rounded-full sm:block"
        style={{ background: theme.accent }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-[17px] font-bold uppercase tracking-[0.01em] text-mist transition group-hover:text-violet">
            {scrim.title}
          </h3>
          {scrim.status === "live" ? (
            <span className="flex shrink-0 items-center gap-1 text-[8px] font-extrabold tracking-[0.12em] text-orange">
              <LiveDot /> LIVE
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>₹{scrim.entryFee} entry</span>
          <span className="text-muted/30">/</span>
          <span className="text-lime">{formatINR(scrim.prizePool)} pool</span>
          <span className="text-muted/30">/</span>
          <span>{scrim.matchesCount} matches</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {scrim.status === "completed" ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
            FINAL
          </span>
        ) : scrim.status === "live" ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-orange">LIVE</span>
        ) : (
          <>
            <p className="font-display text-base leading-none font-bold text-mist">{remaining}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">left</p>
          </>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-violet" />
      {typeof index === "number" ? <span className="sr-only">{index + 1}</span> : null}
    </Link>
  );
}

export function ScrimBannerV2({ scrim }: { scrim: Scrim }) {
  const theme = THEMES[scrim.banner];
  return (
    <div className="relative flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
      <span className="size-1.5 rounded-full" style={{ background: theme.accent }} />
      {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)}
      <span className="text-muted/40">·</span>
      <Countdown target={scrim.startAt} className="text-mist/70" />
    </div>
  );
}
