import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Clock3,
  Crosshair,
  Map,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Divider } from "@/components/ui";
import { ScrimBanner } from "@/components/scrims/scrim-card";
import { tierLabel } from "@/lib/scrims";
import {
  BookingCard,
  MobileBookingBar,
  SlotBoard,
} from "@/components/scrims/booking";
import { LockedSquads } from "@/components/scrims/locked-squads";
import { SlotCountStat } from "@/components/scrims/slot-count";
import { getScrimBySlug } from "@/lib/data";
import { cn, formatDayLabel, formatFull, formatINR, formatTime } from "@/lib/utils";
import { BRAND } from "@/lib/config";

export const revalidate = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scrim = await getScrimBySlug(slug);
  if (!scrim) return { title: "Lobby not found" };
  return {
    title: `${scrim.title} — ${formatDayLabel(scrim.startAt)} ${formatTime(scrim.startAt)}`,
    description: `${scrim.subtitle ?? scrim.description ?? ""} Entry ${formatINR(scrim.entryFee)}, prize pool ${formatINR(scrim.prizePool)}. ${scrim.totalSlots} slots.`,
  };
}

export default async function ScrimDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scrim = await getScrimBySlug(slug);
  if (!scrim) notFound();
  if (scrim.status === "completed") redirect(`/scrims/${scrim.slug}/standings`);

  const perKill = scrim.perKill ?? 0;

  return (
    <div className="pb-44 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <nav className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted/60">
          <Link href="/scrims" className="flex items-center gap-1 transition hover:text-violet">
            <ArrowLeft className="size-3" />
            All scrims
          </Link>
          <ChevronRight className="size-3 text-muted/30" />
          <span className="text-muted/90">{tierLabel(scrim.tier)}</span>
        </nav>

        <div className="panel group relative overflow-hidden rounded-[22px]">
          <ScrimBanner scrim={scrim} tall eager />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline">
                <Swords className="size-3" /> {scrim.mode}
              </Badge>
              <Badge tone="outline">
                <Map className="size-3" /> {scrim.map}
              </Badge>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
              <Users className="size-3 text-violet" />
              {scrim.matchesCount} matches · {scrim.totalSlots} squads
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBlock
            icon={<Trophy className="size-4" />}
            label="Prize pool"
            value={formatINR(scrim.prizePool)}
            highlight
            sub={`₹${perKill} per kill`}
          />
          <StatBlock
            icon={<Wallet className="size-4" />}
            label="Entry fee"
            value={scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
            sub="per squad"
          />
          <SlotCountStat scrim={scrim} />
          <StatBlock
            icon={<CalendarClock className="size-4" />}
            label="Kickoff"
            value={formatTime(scrim.startAt)}
            sub={formatDayLabel(scrim.startAt)}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <SlotBoard scrim={scrim} />

            <section className="panel overflow-hidden">
              <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                <p className="eyebrow mb-1.5 text-violet/80">Briefing</p>
                <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                  The lobby
                </h2>
              </div>
              <div className="px-4 py-4 sm:px-5">
                <p className="text-[12px] leading-relaxed text-muted">
                  {scrim.description ??
                    "A verified BGMI custom room with manual marshalling, published points and a flat prize pool."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { icon: Crosshair, label: "Format", value: scrim.mode },
                    { icon: Map, label: "Drop maps", value: scrim.map },
                    { icon: Swords, label: "Matches", value: `${scrim.matchesCount} per lobby` },
                    { icon: ShieldCheck, label: "Marshals", value: "Manual + POV checks" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <p className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.13em] text-muted/70">
                          <Icon className="size-3 text-violet/70" />
                          {item.label}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-mist/85">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
                <div>
                  <p className="eyebrow mb-1.5 text-violet/80">Payouts</p>
                  <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                    Prize distribution
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-lime/20 bg-lime/[0.05] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-lime">
                  ₹{perKill}/kill
                </span>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {scrim.prizes.map((prize, index) => (
                  <div
                    key={prize.place}
                    className="flex items-center justify-between px-4 py-3 sm:px-5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-7 items-center justify-center rounded-md border font-display text-sm font-bold ${
                          index === 0
                            ? "border-lime/30 bg-lime/10 text-lime"
                            : "border-white/10 bg-white/[0.03] text-muted"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-mist/85">
                          {prize.place} place
                        </p>
                        <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/60">
                          {index === 0 ? "Champions of the lobby" : "Verified payout"}
                        </p>
                      </div>
                    </div>
                    <p className="font-display text-lg font-bold tabular text-mist">
                      {formatINR(prize.amount)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-lime/[0.035] px-4 py-3 sm:px-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                    Total prize pool
                  </p>
                  <p className="font-display text-lg font-bold tabular text-lime">
                    {formatINR(scrim.prizePool)}
                  </p>
                </div>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
                <p className="eyebrow mb-1.5 text-violet/80">Schedule</p>
                <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                  Match flow
                </h2>
              </div>
              <div className="px-4 py-4 sm:px-5">
                <div className="space-y-3">
                  <TimelineRow
                    icon={<CalendarClock className="size-3.5" />}
                    label="Kickoff"
                    value={`${formatDayLabel(scrim.startAt)} · ${formatFull(scrim.startAt)}`}
                  />
                  <TimelineRow
                    icon={<Clock3 className="size-3.5" />}
                    label="Registration closes"
                    value={formatFull(scrim.registrationClosesAt)}
                  />
                  <TimelineRow
                    icon={<ShieldCheck className="size-3.5" />}
                    label="Room credentials"
                    value="Unlocked 15 minutes before kickoff in My Matches"
                  />
                  <TimelineRow
                    icon={<Trophy className="size-3.5" />}
                    label="Points & payouts"
                    value="Standings published after the final match; UPI inside 24 hours"
                  />
                </div>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="eyebrow mb-1.5 text-violet/80">Fair play</p>
                    <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                      Rulebook
                    </h2>
                    <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                      Read before you lock a slot
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted transition group-open:rotate-90" />
                </summary>
                <ol className="space-y-3 border-t border-white/[0.06] px-4 py-4 sm:px-5">
                  {scrim.rules.map((rule, index) => (
                    <li key={rule} className="flex gap-3">
                      <span className="font-display text-sm font-bold text-violet/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[10px] leading-relaxed text-muted">{rule}</p>
                    </li>
                  ))}
                </ol>
              </details>
            </section>

            <LockedSquads scrim={scrim} />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[112px] space-y-3">
              <BookingCard scrim={scrim} />
              <div className="panel p-4">
                <p className="eyebrow flex items-center gap-2 text-violet">
                  <ShieldCheck className="size-3.5" /> Need a hand?
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  Slot not showing up? Payment stuck? Message the desk with your team tag and order
                  ID — a human replies between 10 AM and 2 AM IST.
                </p>
                <a
                  href={
                    BRAND.supportWhatsapp
                      ? `https://wa.me/${BRAND.supportWhatsapp.replace(/\D/g, "")}`
                      : "/legal/contact"
                  }
                  target={BRAND.supportWhatsapp ? "_blank" : undefined}
                  rel={BRAND.supportWhatsapp ? "noreferrer" : undefined}
                  className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-violet/30 bg-violet/[0.08] text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet transition hover:bg-violet/15"
                >
                  Contact support
                </a>
              </div>
            </div>
          </aside>
        </div>

        <Divider className="mt-8" />
        <p className="py-5 text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-muted/45">
          Entry fees are non-refundable once the lobby is locked · All times in IST (GMT +5:30)
        </p>
      </div>

      <MobileBookingBar scrim={scrim} />
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel relative overflow-hidden px-3.5 py-3.5 sm:px-4",
        highlight && "border-lime/20",
      )}
    >
      {highlight ? (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(211,255,85,0.55),transparent)]" />
      ) : null}
      <p className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.13em] text-muted/75">
        <span className="text-lime/70">{icon}</span>
        {label}
      </p>
      <p
        className={cn(
          "mt-2 truncate font-display text-[22px] leading-none font-bold tracking-[-0.04em] tabular sm:text-[25px]",
          highlight ? "text-lime" : "text-mist",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 truncate text-[7px] font-semibold uppercase tracking-[0.1em] text-muted/55">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-violet/70">
        {icon}
      </span>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-muted/70">{label}</p>
        <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-mist/80">{value}</p>
      </div>
    </div>
  );
}
