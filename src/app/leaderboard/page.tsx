import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Crown, Flame, Medal, Swords, Trophy } from "lucide-react";
import { Badge, SectionHeader } from "@/components/ui";
import { getLeague } from "@/lib/data";
import { cn, formatINR } from "@/lib/utils";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Season 07 leaderboard",
  description:
    "The Fearless Esports championship ladder — cumulative points, wins and kills across every verified BGMI lobby this season.",
};

export default async function LeaderboardPage() {
  const league = await getLeague();
  const podium = league.slice(0, 3);
  const totalPrize = 497_910;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-violet-deep/[0.18] blur-[90px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">
              <Trophy className="size-3" /> SEASON 07
            </Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted/60">
              Aug — Nov 2026 · IST
            </span>
          </div>
          <h1 className="display mt-3 text-[clamp(2.4rem,11vw,3.9rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            The pecking order<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
            Points from every verified lobby this season. Win a lobby, stack kills, climb the ladder.
            Top squads get seeded into the Season Finals.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[9px] font-bold uppercase tracking-[0.13em] text-muted">
            <span>
              <span className="text-mist">{league.length}</span> ranked squads
            </span>
            <span>
              <span className="text-lime">{formatINR(totalPrize)}</span> season payouts
            </span>
            <span>
              <span className="text-mist">16</span> finals slots
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {podium.map((row, index) => {
            const icons = [Crown, Medal, Flame];
            const Icon = icons[index] ?? Medal;
            const first = index === 0;
            return (
              <div
                key={row.teamId}
                className={cn(
                  "panel relative overflow-hidden p-3 sm:p-5",
                  first && "border-lime/30",
                  index === 1 && "sm:mt-6",
                )}
              >
                {first ? (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,#d3ff55,transparent)]" />
                ) : null}
                <div className="absolute -right-3 -top-5 font-display text-[64px] font-extrabold leading-none text-white/[0.035] sm:-right-6 sm:-top-8 sm:text-[96px]">
                  {index + 1}
                </div>
                <div className="relative flex items-center justify-between">
                  <span
                    className="flex size-9 items-center justify-center rounded-xl font-display text-[11px] font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] sm:size-11 sm:text-base"
                    style={{ background: row.logoColor }}
                  >
                    {row.tag}
                  </span>
                  <Icon
                    className={cn(
                      "size-4 sm:size-5",
                      first ? "text-lime" : "text-muted/60",
                    )}
                  />
                </div>
                <h2 className="font-display relative mt-2.5 truncate text-[12px] font-bold uppercase tracking-[-0.02em] text-mist sm:mt-3 sm:text-2xl sm:tracking-normal">
                  {row.name}
                </h2>
                <div className="relative mt-2.5 flex items-end justify-between gap-1 border-t border-white/[0.07] pt-2.5 sm:mt-3 sm:pt-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg leading-none font-bold tracking-[-0.03em] text-lime sm:text-2xl">
                      {row.points}
                    </p>
                    <p className="mt-1 truncate text-[6px] font-bold uppercase tracking-[0.1em] text-muted/70 sm:text-[7px] sm:tracking-[0.14em]">
                      <span className="sm:hidden">Points</span>
                      <span className="hidden sm:inline">Season points</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[7px] font-semibold uppercase tracking-[0.04em] text-muted sm:text-[9px] sm:tracking-[0.08em]">
                    <p>{row.wins} WWCD</p>
                    <p className="mt-0.5">{row.kills} kills</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <SectionHeader
            eyebrow="Full ladder"
            title="Every ranked squad"
            description="Updated after each verified result. Ties break on kills, then best placement."
          />
          <LeaderboardTable league={league} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Swords, label: "Verified lobbies only", detail: "ID-checked, marshal-run" },
            { icon: Trophy, label: "Every match counts", detail: "Placement + kills, no black box" },
            { icon: ArrowUpRight, label: "Qualify for finals", detail: "Top 16 squads get seeded" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3"
              >
                <Icon className="size-4 shrink-0 text-violet" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-mist/85">
                    {item.label}
                  </p>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/60">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/scrims"
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet hover:underline"
          >
            Climb the ladder — find a lobby <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
