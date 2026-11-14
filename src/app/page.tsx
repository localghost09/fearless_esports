import { getLeague, getScrims } from "@/lib/data";
import { HomeHero } from "@/components/home/home-hero";
import { ScrimCard } from "@/components/scrims/scrim-card";
import {
  LeaderboardPreview,
  LiveStrip,
  ScheduleSection,
  WeeklyBanner,
} from "@/components/home/sections";
import { SectionHeader } from "@/components/ui";

export const revalidate = 30;

export default async function HomePage() {
  const [scrims, league] = await Promise.all([getScrims(), getLeague()]);

  const open = scrims
    .filter((scrim) => scrim.status === "open" || scrim.status === "full")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const featured = open.find((scrim) => scrim.featured) ?? open[0];
  const live = scrims.find((scrim) => scrim.status === "live");
  const weekly = scrims.find((scrim) => scrim.tier === "weekly");
  const openCards = open.filter((scrim) => scrim.id !== featured?.id).slice(0, 3);

  return (
    <>
      <HomeHero />
      {live ? <LiveStrip scrim={live} /> : null}

      {openCards.length ? (
        <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-6 sm:pt-12">
          <SectionHeader
            eyebrow="Open lobbies"
            title="Pick your fight"
            description="Choose your format, lock a squad, and get ready for the drop."
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
      <LeaderboardPreview league={league} />
      <ScheduleSection scrims={open} />
    </>
  );
}
