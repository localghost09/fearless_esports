import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronRight, Swords, Trophy } from "lucide-react";
import { getLeague, getScrims } from "@/lib/data";
import { Badge, SectionHeader } from "@/components/ui";
import { formatDayLabel, formatINR, formatTime } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Standings & results",
  description:
    "Every published Fearless Esports points table, match-wise results and the Season 07 championship ladder.",
};

export default async function StandingsIndexPage() {
  const [scrims, league] = await Promise.all([getScrims(), getLeague()]);
  const published = scrims
    .filter((scrim) => scrim.status === "completed" || scrim.status === "live")
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.14]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-8 sm:px-6">
          <Badge tone="violet">
            <Trophy className="size-3" /> RESULTS DESK
          </Badge>
          <h1 className="display mt-3 text-[44px] text-mist sm:text-[56px]">
            Points don&apos;t lie<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
            Match-wise results, verified kills and final tables. Every lobby is marshalled, every
            result is published.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <SectionHeader
          eyebrow="Published lobbies"
          title="Match results"
          description="Open a lobby for the full points table and match-by-match breakdown."
        />
        {published.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {published.map((scrim) => (
              <Link
                key={scrim.id}
                href={`/scrims/${scrim.slug}/standings`}
                className="panel panel-hover group flex items-center gap-4 p-4"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl border text-violet"
                  style={{
                    background:
                      scrim.banner === "ember"
                        ? "rgba(255,90,54,0.08)"
                        : scrim.banner === "violet"
                          ? "rgba(139,124,255,0.08)"
                          : scrim.banner === "ice"
                            ? "rgba(86,225,255,0.08)"
                            : "rgba(200,255,61,0.07)",
                    borderColor:
                      scrim.banner === "ember"
                        ? "rgba(255,90,54,0.22)"
                        : "rgba(255,255,255,0.08)",
                  }}
                >
                  <Swords className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-xl font-bold uppercase text-mist transition group-hover:text-violet">
                      {scrim.title}
                    </h3>
                    <Badge tone={scrim.status === "live" ? "orange" : "outline"}>
                      {scrim.status === "live" ? "LIVE" : "FINAL"}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                    <CalendarDays className="size-3 text-violet/70" />
                    {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)} ·{" "}
                    {formatINR(scrim.prizePool)} pool
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-violet" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center text-[11px] text-muted">
            No results published yet. The first table drops after tonight&apos;s lobby.
          </div>
        )}

        <div className="mt-10">
          <SectionHeader
            eyebrow="Season 07"
            title="Championship ladder"
            description="Cumulative points across every Fearless Esports result this season."
            actionHref="/leaderboard"
            actionLabel="Full leaderboard"
          />
          <div className="panel overflow-hidden">
            {league.slice(0, 5).map((row) => (
              <Link
                key={row.teamId}
                href="/leaderboard"
                className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 hover:bg-white/[0.02]"
              >
                <span className="w-7 font-display text-lg font-bold text-lime">
                  {String(row.rank).padStart(2, "0")}
                </span>
                <span
                  className="flex size-7 items-center justify-center rounded-md text-[7px] font-extrabold text-ink"
                  style={{ background: row.logoColor }}
                >
                  {row.tag}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-mist">
                  {row.name}
                </span>
                <span className="text-[10px] font-semibold tabular text-muted">
                  {row.points} pts
                </span>
                <ArrowUpRight className="size-3.5 text-muted/40" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
