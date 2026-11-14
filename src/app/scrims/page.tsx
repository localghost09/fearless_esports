import type { Metadata } from "next";
import { Radio, Swords } from "lucide-react";
import { getScrims } from "@/lib/data";
import { ScrimBrowser } from "@/components/scrims/scrim-browser";
import { Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Scrims & open lobbies",
  description:
    "Browse daily BGMI scrims, advance lobbies and weekly tournaments. Check open slots, entry fees and prize pools, then lock your squad.",
};

export const revalidate = 30;

export default async function ScrimsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ q }, scrims] = await Promise.all([searchParams, getScrims()]);
  const initialQuery = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const live = scrims.filter((scrim) => scrim.status === "live").length;
  const openSlots = scrims.reduce(
    (total, scrim) =>
      scrim.status === "open" || scrim.status === "full"
        ? total + Math.max(0, scrim.totalSlots - scrim.filledSlots)
        : total,
    0,
  );

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.16]" />
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-violet-deep/[0.16] blur-[80px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pb-7 sm:pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">
              <Swords className="size-3" /> THE CALENDAR
            </Badge>
            {live > 0 ? (
              <Badge tone="orange">
                <Radio className="size-3" /> {live} LIVE
              </Badge>
            ) : null}
          </div>
          <h1 className="display mt-3 text-[clamp(2.4rem,11vw,3.7rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            All scrims<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
            Daily and weekly BGMI custom rooms, all in IST. Real slot boards, published points and
            payouts within 24 hours of the final match.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
            <span>
              <span className="text-mist">{scrims.length}</span> lobbies listed
            </span>
            <span>
              <span className="text-lime">{openSlots}</span> open slots
            </span>
            <span>
              <span className="text-mist">IST</span> kickoffs
            </span>
          </div>
        </div>
      </section>

      <ScrimBrowser scrims={scrims} initialQuery={initialQuery} />
      <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <p className="mt-8 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-muted/50">
          Slots close 20 minutes before kickoff · Entry fees are per squad, not per player
        </p>
      </div>
    </div>
  );
}
