"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Swords } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import type { SeasonStanding } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeaderboardTable({ league }: { league: SeasonStanding[] }) {
  const { teams } = useApp();
  const myTeamIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-[30px_1fr_30px_44px] gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[7px] font-bold uppercase tracking-[0.1em] text-muted/60 min-[360px]:grid-cols-[32px_1fr_32px_46px] sm:grid-cols-[52px_1fr_70px_70px_80px] sm:gap-2 sm:px-4 sm:text-[8px] sm:tracking-[0.12em]">
        <span>Rank</span>
        <span>Squad</span>
        <span className="hidden text-right sm:block">Events</span>
        <span className="text-right">Kills</span>
        <span className="text-right">Points</span>
      </div>

      {league.map((row) => {
        const mine = myTeamIds.has(row.teamId);
        const podium = row.rank <= 3;
        return (
          <div
            key={row.teamId}
            className={cn(
              "grid grid-cols-[30px_1fr_30px_44px] items-center gap-1.5 border-b border-white/[0.05] px-3 py-2.5 last:border-0 min-[360px]:grid-cols-[32px_1fr_32px_46px] sm:grid-cols-[52px_1fr_70px_70px_80px] sm:gap-2 sm:px-4 sm:py-3",
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
                <span className="flex items-center gap-1 truncate text-[6.5px] font-semibold uppercase tracking-[0.08em] text-muted/55 sm:text-[7px]">
                  {row.wins} WWCD
                  {mine ? <span className="text-violet">· your squad</span> : null}
                </span>
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

      {!league.length ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <Swords className="size-6 text-violet" />
          <p className="mt-3 font-display text-xl font-bold uppercase text-mist">Ladder is empty</p>
          <p className="mt-1 max-w-sm text-[11px] text-muted">
            Season points appear after the first verified lobby. Book a slot to be the first squad
            on the board.
          </p>
          <Link
            href="/scrims"
            className="mt-4 inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet hover:underline"
          >
            Find a lobby <ArrowUpRight className="size-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
