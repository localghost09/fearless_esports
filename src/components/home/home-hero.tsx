import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Crown,
  Trophy,
} from "lucide-react";
import { ButtonLink } from "@/components/ui";

const HERO_IMAGE_URL = "/home-hero-background.webp";

const HERO_LINKS = [
  {
    href: "/scrims?q=daily",
    label: "Daily scrims",
    detail: "Find a lobby",
    icon: CalendarDays,
    accent: "text-lime border-lime/25 bg-lime/[0.09]",
  },
  {
    href: "/scrims?q=weekly",
    label: "Tournament",
    detail: "Compete for more",
    icon: Trophy,
    accent: "text-orange border-orange/25 bg-orange/[0.09]",
  },
  {
    href: "/standings",
    label: "PT",
    detail: "Points table",
    icon: BarChart3,
    accent: "text-ice border-ice/25 bg-ice/[0.09]",
  },
  {
    href: "/mvp",
    label: "MVP",
    detail: "Top fragging squads",
    icon: Crown,
    accent: "text-violet border-violet/25 bg-violet/[0.1]",
  },
];

export function HomeHero() {
  return (
    <section className="mx-auto max-w-6xl px-3 pb-4 pt-3 sm:px-6 sm:pb-7 sm:pt-7">
      <div
        className="hero-card-background relative isolate min-h-[500px] overflow-hidden rounded-[24px] border border-white/10 bg-[#09080e] shadow-[0_34px_100px_-45px_rgba(107,59,245,0.55)] sm:min-h-[500px] sm:rounded-[28px] lg:min-h-[530px]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7,6,11,0.99) 0%, rgba(7,6,11,0.9) 34%, rgba(7,6,11,0.4) 60%, rgba(7,6,11,0.08) 100%), linear-gradient(0deg, rgba(7,6,11,0.9) 0%, transparent 38%, rgba(7,6,11,0.12) 100%), url("${HERO_IMAGE_URL}")`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] bg-grid opacity-[0.1]" />
        <div className="pointer-events-none absolute -left-28 -top-28 z-[1] size-96 rounded-full bg-violet-deep/20 blur-[100px]" />

        <div className="relative z-10 flex min-h-[500px] flex-col justify-center px-4 py-6 sm:min-h-[500px] sm:px-8 sm:py-9 lg:min-h-[530px] lg:px-11">
          <div className="w-full max-w-[590px]">
            <p className="text-[8px] font-extrabold uppercase tracking-[0.24em] text-lime sm:text-[9px]">
              Fearless Esports presents
            </p>
            <h1 className="display mt-3 text-[clamp(3.2rem,13vw,6.8rem)] leading-[0.82] tracking-[-0.065em] text-white">
              Own the
              <br />
              <span className="text-lime">lobby.</span>
            </h1>
            <p className="mt-4 max-w-[350px] text-[11px] leading-[1.65] text-white/70 sm:mt-5 sm:text-sm">
              Squad up for BGMI scrims and tournaments. Claim your slot, take the drop, climb the
              table.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:max-w-[430px] sm:gap-2.5">
              <ButtonLink
                href="/scrims"
                size="md"
                className="h-12 w-full gap-1.5 rounded-xl px-3 text-[9px] sm:h-14 sm:px-5 sm:text-[11px]"
                arrow
              >
                Explore scrims
              </ButtonLink>
              <ButtonLink
                href="/my-matches"
                variant="secondary"
                size="md"
                className="h-12 w-full rounded-xl border-white/20 bg-black/35 px-3 text-[9px] text-white backdrop-blur sm:h-14 sm:px-5 sm:text-[11px]"
              >
                My matches
              </ButtonLink>
            </div>

            <nav aria-label="Quick links" className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-4 sm:max-w-[520px] sm:gap-2.5">
              {HERO_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-label={`${item.label}: ${item.detail}`}
                    className="group relative flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.1] bg-[#09080e]/75 px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition hover:border-white/20 hover:bg-[#111019]/90 active:scale-[0.98] sm:min-h-[68px] sm:gap-1.5 sm:px-2"
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${item.accent}`}>
                      <Icon className="size-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="block max-w-full truncate text-[7px] font-extrabold uppercase leading-tight tracking-[0.045em] text-white sm:text-[9px] sm:tracking-[0.07em]">
                      {item.label}
                    </span>
                    <span className="hidden max-w-full truncate text-[7px] font-medium leading-none text-white/45 sm:block">
                      {item.detail}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
