import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Crown, Crosshair, Target } from "lucide-react";
import { getLeague } from "@/lib/data";
import { Badge } from "@/components/ui";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "MVP kill leaders",
  description: "The top Fearless Esports BGMI squads ranked by verified season kills.",
};

export default async function MvpPage() {
  const leaders = [...(await getLeague())]
    .sort((a, b) => b.kills - a.kills || b.points - a.points)
    .slice(0, 20);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.14]" />
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-violet-deep/[0.16] blur-[80px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10">
          <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-mist">
            <ArrowLeft className="size-3" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <Badge tone="violet"><Crown className="size-3" /> SEASON 07 · MVP BOARD</Badge>
            <Badge tone="outline">VERIFIED KILLS</Badge>
          </div>
          <h1 className="display mt-4 text-[clamp(2.8rem,11vw,5.2rem)] leading-[0.86] tracking-[-0.05em] text-mist">
            Top fragging<br /><span className="text-violet">squads.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[11px] leading-relaxed text-muted sm:text-xs">
            MVP board, ranked by verified squad kills across the season. Per-player kill stats are not
            currently collected, so this list recognizes the squads doing the damage.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-violet">Season leaderboard</p>
            <h2 className="mt-1 font-display text-xl font-bold uppercase text-mist">Kill leaders</h2>
          </div>
          <Link href="/leaderboard" className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-muted transition hover:text-violet">
            Points table <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="panel overflow-hidden">
          <div className="grid grid-cols-[38px_1fr_54px_62px] gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3 py-3 text-[7px] font-bold uppercase tracking-[0.12em] text-muted/60 sm:grid-cols-[52px_1fr_80px_90px_90px] sm:px-5">
            <span>Rank</span><span>Squad</span><span className="hidden text-right sm:block">Events</span><span className="text-right">Kills</span><span className="text-right">Points</span>
          </div>
          {leaders.map((team, index) => (
            <div key={team.teamId} className="grid grid-cols-[38px_1fr_54px_62px] items-center gap-2 border-b border-white/[0.05] px-3 py-3 last:border-0 sm:grid-cols-[52px_1fr_80px_90px_90px] sm:px-5">
              <span className={index === 0 ? "flex size-7 items-center justify-center rounded-lg bg-lime text-ink" : "flex size-7 items-center justify-center rounded-lg border border-white/10 text-muted"}>
                {index === 0 ? <Crown className="size-3.5" /> : <span className="font-display text-xs font-bold">{String(index + 1).padStart(2, "0")}</span>}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[7px] font-extrabold text-ink" style={{ background: team.logoColor }}>{team.tag}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-extrabold uppercase text-mist sm:text-xs">{team.name}</span>
                  <span className="block text-[7px] font-semibold uppercase tracking-[0.1em] text-muted/60">{team.wins} {team.wins === 1 ? "win" : "wins"}</span>
                </span>
              </span>
              <span className="hidden text-right text-[10px] font-semibold tabular text-muted sm:block">{team.events}</span>
              <span className="flex items-center justify-end gap-1 text-right font-display text-sm font-bold tabular text-violet sm:text-base"><Crosshair className="hidden size-3 text-violet/60 sm:block" />{team.kills}</span>
              <span className="hidden items-center justify-end gap-1 text-right text-[10px] font-semibold tabular text-mist/60 sm:flex"><Target className="size-3 text-muted/50" />{team.points}</span>
            </div>
          ))}
          {!leaders.length ? <p className="px-5 py-12 text-center text-[11px] text-muted">No verified results have been published yet.</p> : null}
        </div>
        <p className="mt-3 text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-muted/45">Team kill totals · Updated with published season results</p>
      </div>
    </main>
  );
}
