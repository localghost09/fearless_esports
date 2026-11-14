import { getLeague, getPlatformStats, getScrims } from "@/lib/data";
import { HomeHero } from "@/components/home/home-hero";
import { ScrimCard } from "@/components/scrims/scrim-card";
import {
  ClosingCta,
  HowItWorks,
  LeaderboardPreview,
  LiveStrip,
  ScheduleSection,
  Ticker,
  WeeklyBanner,
} from "@/components/home/sections";
import { SectionHeader } from "@/components/ui";

export const revalidate = 30;

export default async function HomePage() {
  const [scrims, stats, league] = await Promise.all([
    getScrims(),
    getPlatformStats(),
    getLeague(),
  ]);

  const open = scrims
    .filter((scrim) => scrim.status === "open" || scrim.status === "full")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const featured = open.find((scrim) => scrim.featured) ?? open[0];
  const live = scrims.find((scrim) => scrim.status === "live");
  const weekly = scrims.find((scrim) => scrim.tier === "weekly");
  const openCards = open.filter((scrim) => scrim.id !== featured?.id).slice(0, 3);

  return (
    <>
      {featured ? <HomeHero featured={featured} stats={stats} /> : null}
      {live ? <LiveStrip scrim={live} /> : null}
      <Ticker
        items={[
          "PHANTOM leads Season 07 with 186 points",
          "Weekend War 5K · 18 slots · ₹5,000 pool",
          "Every lobby manually marshalled",
          "UPI payouts settled inside 24 hours",
          "Nightfall finals standings are live",
        ]}
      />

      {openCards.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <SectionHeader
            eyebrow="Open lobbies"
            title="Pick your fight"
            description="Three formats, one standard. Verified squads only, room credentials 15 minutes before drop."
            actionHref="/scrims"
            actionLabel="All scrims"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openCards.map((scrim) => (
              <ScrimCard key={scrim.id} scrim={scrim} />
            ))}
          </div>
        </section>
      ) : null}

      <WeeklyBanner scrim={weekly} />
      <ScheduleSection scrims={open} />
      <LeaderboardPreview league={league} />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
