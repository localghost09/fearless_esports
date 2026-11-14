"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crosshair, Skull, Swords, Trophy } from "lucide-react";
import { Badge } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { POINTS_SYSTEM } from "@/lib/config";
import type { StandingsData } from "@/lib/types";
import { cn, computeStandings, formatINR } from "@/lib/utils";

export function StandingsView({ data }: { data: StandingsData }) {
  const { resultOverrides, teams } = useApp();
  const [tab, setTab] = useState<"overall" | number>("overall");

  const matches = useMemo(
    () =>
      data.matches.map((match) =>
        resultOverrides[match.id]
          ? { ...match, results: resultOverrides[match.id] }
          : match,
      ),
    [data.matches, resultOverrides],
  );
  const standings = useMemo(() => computeStandings(matches), [matches]);
  const myTeamIds = new Set(teams.map((team) => team.id));
  const champion = standings[0];
  const activeMatch = typeof tab === "number" ? matches.find((m) => m.matchNo === tab) : null;

  if (!matches.length) {
    return (
      <div className="panel px-5 py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet/25 bg-violet/[0.08] text-violet shadow-[0_0_30px_-10px_rgba(140,92,255,0.6)]">
          <Trophy className="size-5" />
        </span>
        <h2 className="font-display mt-4 text-2xl font-bold uppercase tracking-[-0.03em] text-mist">
          Results not published yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted">
          The desk publishes the full points table within 30 minutes of the final match. Check back
          soon — every kill and placement is verified before it goes live.
        </p>
        <Link
          href={`/scrims/${data.scrim.slug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-violet hover:underline"
        >
          Back to lobby <ArrowUpRight className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="panel relative overflow-hidden p-4 sm:col-span-2"
          style={{
            backgroundImage:
              "radial-gradient(420px 180px at 92% -30%, rgba(140,92,255,0.24), transparent 70%), linear-gradient(180deg,#151022,#0a090f)",
          }}
        >
          <div className="absolute inset-0 bg-diagonal opacity-15" />
          <div className="relative flex items-center gap-3.5">
            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#e7ff9b,#d3ff55_55%,#b6ee2e)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_36px_-8px_rgba(211,255,85,0.6)]">
              <Trophy className="size-6" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.2em] text-lime">
                <span className="h-px w-3.5 bg-lime/50" />
                Lobby champion
              </p>
              <p className="mt-1 truncate font-display text-[26px] leading-none font-bold uppercase tracking-[-0.035em] text-mist sm:text-3xl">
                {champion?.name ?? "—"}
              </p>
              <p className="mt-1.5 truncate text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                {champion
                  ? `${champion.total} points · ${champion.kills} kills · ${champion.wins} WWCD`
                  : "Awaiting results"}
              </p>
            </div>
          </div>
        </div>
        <div className="panel grid grid-cols-2 divide-x divide-white/[0.06] p-4 sm:grid-cols-1 sm:divide-x-0 sm:divide-y">
          <div className="min-w-0 sm:pb-2">
            <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-muted/70">
              Prize pool
            </p>
            <p className="mt-1.5 truncate font-display text-[21px] leading-none font-bold tracking-[-0.03em] text-lime">
              {formatINR(data.scrim.prizePool)}
            </p>
          </div>
          <div className="min-w-0 pl-4 sm:pl-0 sm:pt-2">
            <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-muted/70">Matches</p>
            <p className="mt-1.5 font-display text-[21px] leading-none font-bold tracking-[-0.03em] text-mist">
              {matches.length}
            </p>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-3 sm:px-4">
          <div className="no-scrollbar -mx-0.5 flex min-w-0 items-center gap-1 overflow-x-auto px-0.5">
            <button
              type="button"
              onClick={() => setTab("overall")}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-[8.5px] font-extrabold uppercase tracking-[0.08em] transition sm:px-3.5 sm:tracking-[0.1em]",
                tab === "overall"
                  ? "border-violet/45 bg-violet/[0.12] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.14)]"
                  : "border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/15 hover:text-mist",
              )}
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">Overall table</span>
            </button>
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => setTab(match.matchNo)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3 text-[8.5px] font-extrabold uppercase tracking-[0.08em] transition sm:px-3.5 sm:tracking-[0.1em]",
                  tab === match.matchNo
                    ? "border-violet/45 bg-violet/[0.12] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.14)]"
                    : "border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/15 hover:text-mist",
                )}
              >
                Match {match.matchNo}
              </button>
            ))}
          </div>
          <span className="hidden shrink-0 sm:inline-flex">
            <Badge tone={data.scrim.status === "completed" ? "outline" : "orange"}>
              {data.scrim.status === "completed" ? "FINAL" : "LIVE TABLE"}
            </Badge>
          </span>
        </div>

        {tab === "overall" ? (
          <>
            <div className="grid grid-cols-[32px_1fr_32px_40px_44px] gap-1.5 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[7px] font-bold uppercase tracking-[0.1em] text-muted/60 min-[360px]:grid-cols-[34px_1fr_34px_42px_46px] sm:grid-cols-[46px_1fr_56px_64px_72px] sm:gap-2 sm:px-5 sm:text-[8px]">
              <span>Rank</span>
              <span>Squad</span>
              <span className="text-right">Kills</span>
              <span className="text-right">Place</span>
              <span className="text-right">Total</span>
            </div>
            {standings.map((row) => {
              const mine = myTeamIds.has(row.teamId);
              const podium = row.rank <= 3;
              return (
                <div
                  key={row.teamId}
                  className={cn(
                    "grid grid-cols-[32px_1fr_32px_40px_44px] items-center gap-1.5 border-b border-white/[0.05] px-3 py-2.5 last:border-0 min-[360px]:grid-cols-[34px_1fr_34px_42px_46px] sm:grid-cols-[46px_1fr_56px_64px_72px] sm:gap-2 sm:px-5 sm:py-3",
                    mine && "bg-violet/[0.06]",
                    !mine && row.rank === 1 && "bg-lime/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md font-display text-[11px] font-bold tabular sm:size-7 sm:text-[13px]",
                      row.rank === 1
                        ? "bg-lime text-ink shadow-[0_0_16px_-4px_rgba(211,255,85,0.7)]"
                        : podium
                          ? "border border-white/10 bg-white/[0.05] text-mist"
                          : "text-muted",
                    )}
                  >
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-[6.5px] font-extrabold text-ink sm:size-7 sm:text-[7px]"
                      style={{ background: row.logoColor }}
                    >
                      {row.tag}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-bold text-mist sm:text-[11px]">
                        {row.name}
                      </span>
                      <span className="block truncate text-[6.5px] font-semibold uppercase tracking-[0.08em] text-muted/55 sm:text-[7px]">
                        <span className="min-[360px]:hidden">
                          {row.played}M · {row.wins}W
                        </span>
                        <span className="hidden min-[360px]:inline">
                          {row.played} matches · {row.wins} {row.wins === 1 ? "win" : "wins"}
                          {mine ? <span className="hidden sm:inline"> · you</span> : null}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-end gap-1 text-[10px] font-semibold tabular text-mist/75 sm:text-[11px]">
                    <Skull className="hidden size-3 text-muted/50 sm:block" />
                    {row.kills}
                  </span>
                  <span className="text-right text-[10px] font-semibold tabular text-muted sm:text-[11px]">
                    {row.placementPoints}
                  </span>
                  <span className="text-right font-display text-base font-bold tabular text-lime sm:text-lg">
                    {row.total}
                  </span>
                </div>
              );
            })}
          </>
        ) : activeMatch ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
              <span className="flex items-center gap-1.5">
                <Swords className="size-3 text-violet" /> Match {activeMatch.matchNo}
              </span>
              <span>Map · {activeMatch.map}</span>
            </div>
            <div className="grid grid-cols-[32px_1fr_48px_48px] gap-2 border-b border-white/[0.06] px-4 py-2 text-[7px] font-bold uppercase tracking-[0.1em] text-muted/60">
              <span>#</span>
              <span>Squad</span>
              <span className="text-right">Kills</span>
              <span className="text-right">Points</span>
            </div>
            {activeMatch.results.map((result) => {
              const mine = myTeamIds.has(result.teamId);
              return (
                <div
                  key={result.teamId}
                  className={cn(
                    "grid grid-cols-[32px_1fr_48px_48px] items-center gap-2 border-b border-white/[0.05] px-4 py-2.5 last:border-0",
                    mine && "bg-violet/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-sm font-bold tabular",
                      result.placement === 1 ? "text-lime" : "text-muted",
                    )}
                  >
                    {String(result.placement).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-[6.5px] font-extrabold text-ink"
                      style={{ background: result.logoColor }}
                    >
                      {result.tag}
                    </span>
                    <span className="truncate text-[10px] font-bold text-mist/85">{result.name}</span>
                  </span>
                  <span className="flex items-center justify-end gap-1 text-[10px] font-semibold tabular text-mist/75">
                    <Crosshair className="size-2.5 text-muted/50" />
                    {result.kills}
                  </span>
                  <span className="text-right font-display text-sm font-bold tabular text-lime">
                    {result.points}
                  </span>
                </div>
              );
            })}
          </>
        ) : null}
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-violet/80">Scoring</p>
          <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-muted/50">
            Placement + kills
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {POINTS_SYSTEM.map((row) => (
            <div
              key={row.place}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-1.5 py-2 text-center"
            >
              <p className="text-[7px] font-bold uppercase tracking-[0.06em] text-muted">
                {row.place}
              </p>
              <p className="font-display mt-1 text-[15px] leading-none font-bold tabular text-mist">
                {row.points}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-muted/65">
          Total = placement points + kills. Ties are broken by total kills, then by best single-match
          placement. Admin decisions on disputes are final.
        </p>
      </div>
    </div>
  );
}
