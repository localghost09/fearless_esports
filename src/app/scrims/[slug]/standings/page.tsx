import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Radio, Trophy } from "lucide-react";
import { Badge } from "@/components/ui";
import { StandingsView } from "@/components/standings/standings-view";
import { getStandings } from "@/lib/data";
import { formatDayLabel, formatFull, formatINR } from "@/lib/utils";

export const revalidate = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStandings(slug);
  if (!data) return { title: "Standings" };
  return {
    title: `${data.scrim.title} — Points table`,
    description: `Final standings, kills and points for ${data.scrim.title}. ${data.scrim.prizePool ? `Prize pool ${formatINR(data.scrim.prizePool)}.` : ""}`,
  };
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStandings(slug);
  if (!data) notFound();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.14]" />
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-deep/[0.18] blur-[80px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6">
          <nav className="mb-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted/60">
            <Link href="/scrims" className="flex items-center gap-1 transition hover:text-violet">
              <ArrowLeft className="size-3" /> Scrims
            </Link>
            <ChevronRight className="size-3 text-muted/30" />
            <Link href={`/scrims/${data.scrim.slug}`} className="transition hover:text-violet">
              {data.scrim.title}
            </Link>
            <ChevronRight className="size-3 text-muted/30" />
            <span className="text-muted/90">Standings</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.scrim.status === "completed" ? "outline" : "orange"}>
              {data.scrim.status === "live" ? <Radio className="size-3" /> : <Trophy className="size-3" />}
              {data.scrim.status === "completed" ? "FINAL STANDINGS" : data.scrim.status === "live" ? "LIVE POINTS" : "POINTS TABLE"}
            </Badge>
            <Badge tone="outline">{data.scrim.game} · {data.scrim.mode}</Badge>
          </div>
          <h1 className="display mt-3 text-[42px] text-mist sm:text-[56px]">
            {data.scrim.title}
          </h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {formatDayLabel(data.scrim.startAt)} · {formatFull(data.scrim.startAt)} · {data.matches.length} matches played
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <StandingsView data={data} />
        <p className="py-6 text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-muted/45">
          Results are verified by a human marshal before publishing · Payouts within 24 hours
        </p>
      </div>
    </div>
  );
}
