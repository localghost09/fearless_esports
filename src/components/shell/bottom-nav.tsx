"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Swords, Ticket, Trophy, UserRound } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/scrims", label: "Scrims", icon: Swords },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
  { href: "/my-matches", label: "My Matches", icon: Ticket },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const { registrations } = useApp();

  const hidden =
    pathname.includes("/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/payment");
  if (hidden) return null;

  const activeCount = registrations.filter((reg) =>
    ["confirmed", "pending_payment", "awaiting_verification"].includes(reg.status),
  ).length;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-50 md:hidden"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#0a0910] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_50px_-18px_rgba(0,0,0,0.95)]">
        <span className="brand-hairline pointer-events-none absolute inset-x-8 top-0 h-px" />
        <div className="grid h-[56px] grid-cols-5">
          {ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.href === "/leaderboard" ? "Team ranking" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-xl text-[7px] font-bold uppercase tracking-[0.03em] transition-colors min-[360px]:text-[8px] min-[360px]:tracking-[0.07em]",
                  active ? "text-violet" : "text-muted/70 active:text-mist",
                )}
              >
                {active ? (
                  <span className="absolute inset-x-2 inset-y-1 rounded-lg bg-violet/[0.09]" />
                ) : null}
                <span className="relative">
                  <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 1.9} />
                  {item.href === "/my-matches" && activeCount > 0 ? (
                    <span className="absolute -right-2 -top-1 flex size-3.5 items-center justify-center rounded-full bg-orange text-[8px] font-bold text-white shadow-[0_0_10px_rgba(255,106,69,0.5)]">
                      {activeCount}
                    </span>
                  ) : null}
                </span>
                <span className="relative whitespace-nowrap">{item.label}</span>
                {active ? (
                  <span className="absolute top-[3px] h-0.5 w-0.5 rounded-full bg-violet shadow-[0_0_8px_rgba(183,166,255,0.95)]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
