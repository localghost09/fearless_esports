"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LiveDot } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { BRAND } from "@/lib/config";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/scrims", label: "Scrims" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/my-matches", label: "My Matches" },
  { href: "/teams", label: "Squads" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { profile, ready, isAdmin } = useApp();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/78 pt-[env(safe-area-inset-top)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="brand-hairline pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 md:h-[72px]">
        <Logo />

        <nav className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] transition",
                  active
                    ? "bg-violet/[0.1] text-mist"
                    : "text-muted hover:bg-white/[0.035] hover:text-violet",
                )}
              >
                {item.label}
                {active ? <span className="size-1 rounded-full bg-violet shadow-[0_0_8px_rgba(183,166,255,0.9)]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-mist/75 lg:inline-flex">
            <LiveDot />
            Lobbies live daily
          </span>

          {isAdmin ? (
            <Link
              href="/admin"
              aria-label="Admin console"
              className={cn(
                "hidden size-9 items-center justify-center rounded-full border transition sm:flex",
                pathname.startsWith("/admin")
                  ? "border-violet/40 bg-violet/10 text-violet"
                  : "border-white/10 text-muted hover:border-white/20 hover:bg-white/[0.04] hover:text-mist",
              )}
            >
              <LayoutDashboard className="size-4" />
            </Link>
          ) : null}

          {ready && profile ? (
            <Link
              href="/profile"
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 pl-1 pr-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-violet/30 sm:pr-3"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(160deg,#c9bbff,#8f6bff_55%,#6b3bf5)] font-display text-[11px] font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {initials(profile.name) || "P"}
              </span>
              <span className="hidden max-w-24 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-mist sm:block">
                {profile.name}
              </span>
            </Link>
          ) : pathname.startsWith("/login") ? (
            <Link
              href="/scrims"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted transition hover:border-white/20 hover:text-mist"
            >
              Browse
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,#e4ff91,#d3ff55_50%,#c1f238)] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_22px_-10px_rgba(211,255,85,0.6)] transition hover:brightness-105"
            >
              <UserRound className="size-3.5" strokeWidth={2.5} />
              Sign in
            </Link>
          )}
        </div>
      </div>

      {pathname !== "/" ? (
        <div className="hidden border-t border-white/[0.05] bg-black/15 md:block">
          <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-6 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/60">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-3 text-violet/70" />
              Verified lobbies · manual marshal on every match
            </span>
            <span className="flex items-center gap-3">
              <span>BGMI · TPP SQUAD · IST</span>
              <span className="h-2.5 w-px bg-white/10" />
              <span className="text-mist/45">Season 07</span>
            </span>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.06] bg-black/20 pb-32 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[11px] leading-relaxed text-muted">
              Daily BGMI custom rooms for squads who take the grind seriously. Transparent slots,
              verified IDs and payouts within 24 hours.
            </p>
            <p className="mt-5 flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.18em] text-muted/45">
              <span className="h-px w-5 bg-violet/40" />
              {BRAND.tagline} · Made in India
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-4 text-[8px] font-extrabold uppercase tracking-[0.22em] text-mist/50">
                Compete
              </p>
              <div className="flex flex-col gap-2.5 text-[11px] text-muted">
                <Link href="/scrims" className="transition hover:text-violet">
                  All scrims
                </Link>
                <Link href="/leaderboard" className="transition hover:text-violet">
                  Leaderboard
                </Link>
                <Link href="/my-matches" className="transition hover:text-violet">
                  My matches
                </Link>
                <Link href="/teams" className="transition hover:text-violet">
                  Squad hub
                </Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-[8px] font-extrabold uppercase tracking-[0.22em] text-mist/50">
                Platform
              </p>
              <div className="flex flex-col gap-2.5 text-[11px] text-muted">
                <Link href="/legal/terms" className="transition hover:text-violet">
                  Terms
                </Link>
                <Link href="/legal/refund" className="transition hover:text-violet">
                  Refund policy
                </Link>
                <Link href="/legal/privacy" className="transition hover:text-violet">
                  Privacy
                </Link>
                {BRAND.supportWhatsapp ? (
                  <a
                    href={`https://wa.me/${BRAND.supportWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-violet"
                  >
                    Support
                  </a>
                ) : (
                  <Link href="/legal/contact" className="transition hover:text-violet">
                    Support
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[8px] uppercase tracking-[0.14em] text-muted/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 {BRAND.name}. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lime/70 shadow-[0_0_8px_rgba(211,255,85,0.6)]" />
            UPI checkout · 0% platform markup on direct UPI
          </span>
        </div>
      </div>
    </footer>
  );
}
