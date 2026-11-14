"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Button, Field, Input, buttonClass } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import { BRAND } from "@/lib/config";
import type { Profile } from "@/lib/types";
import { cn, formatINR, initials } from "@/lib/utils";

export function ProfileClient() {
  const {
    ready,
    mode,
    profile,
    teams,
    registrations,
    isAdmin,
    updateProfile,
    resetDemo,
    signOut,
  } = useApp();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  if (!ready) return <div className="panel h-64 shimmer" />;

  if (!profile) {
    return (
      <div className="panel mx-auto max-w-lg p-6 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet/25 bg-violet/[0.08] text-violet">
          <UserRound className="size-6" />
        </span>
        <h2 className="font-display mt-4 text-3xl font-bold uppercase text-mist">
          Sign in to your account
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Track bookings, save squads and pull room credentials from any device.
        </p>
        <Link href="/login?next=/profile" className={cn(buttonClass("primary", "lg"), "mt-5 w-full")}>
          Sign in <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const confirmed = registrations.filter((reg) => reg.status === "confirmed");
  const pending = registrations.filter((reg) =>
    ["pending_payment", "awaiting_verification"].includes(reg.status),
  );
  const spend = confirmed.reduce((sum, reg) => sum + reg.amount, 0);

  async function save() {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      toast({ title: "Name too short", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        ...profile!,
        name: draft.name.trim(),
        phone: draft.phone?.trim() || null,
      });
      toast({ title: "Profile updated", description: "Your captain details are saved." });
    } catch (cause) {
      toast({
        title: "Could not save profile",
        description: cause instanceof Error ? cause.message : "Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    toast({ title: "Signed out", description: "See you in the next lobby." , tone: "info" });
  }

  return (
    <div className="space-y-4">
      <div className="panel relative overflow-hidden">
        <div className="absolute inset-0 bg-diagonal opacity-15" />
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-violet-deep/[0.22] blur-3xl" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#c9bbff,#8f6bff_55%,#6b3bf5)] font-display text-2xl font-extrabold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_36px_-8px_rgba(140,92,255,0.65)]">
            {initials(profile.name) || "FE"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-[-0.035em] text-mist">
                {profile.name}
              </h1>
              {isAdmin ? <Badge tone="orange">ADMIN</Badge> : <Badge tone="violet">CAPTAIN</Badge>}
              <Badge tone={mode === "demo" ? "ice" : "outline"}>
                {mode === "demo" ? "DEMO MODE" : "LIVE ACCOUNT"}
              </Badge>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
              <span className="flex items-center gap-1">
                <Mail className="size-3 text-violet/70" /> {profile.email ?? "No email"}
              </span>
              <span className="text-muted/30">·</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3 text-violet/70" /> {profile.role === "admin" ? "League admin" : "Verified player"}
              </span>
            </p>
          </div>
          {isAdmin ? (
            <Link href="/admin" className={cn(buttonClass("secondary", "md"), "shrink-0")}>
              Admin console
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard icon={<Users className="size-4" />} label="Squads" value={String(teams.length)} href="/teams" />
        <StatCard icon={<Ticket className="size-4" />} label="Matches" value={String(confirmed.length)} href="/my-matches" />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Entry spend"
          value={formatINR(spend)}
          href="/my-matches"
        />
        <StatCard
          icon={<CircleDollarSign className="size-4" />}
          label="Pending"
          value={String(pending.length)}
          href="/my-matches"
          highlight={pending.length > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <p className="eyebrow mb-1.5 text-violet/80">Identity</p>
              <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                Captain details
              </h2>
              <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
                Used for payouts and match-day contact
              </p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Field label="Display name">
                <Input
                  value={draft?.name ?? ""}
                  onChange={(event) => draft && setDraft({ ...draft, name: event.target.value })}
                  placeholder="Aarav"
                  maxLength={28}
                />
              </Field>
              <Field label="WhatsApp number" hint="Payouts & room alerts">
                <Input
                  value={draft?.phone ?? ""}
                  onChange={(event) => draft && setDraft({ ...draft, phone: event.target.value })}
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                />
              </Field>
              <Field label="Email" hint="Managed by your login">
                <Input value={profile.email ?? ""} readOnly className="opacity-60" />
              </Field>
              <Button onClick={() => void save()} disabled={saving} size="md">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save changes
              </Button>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <p className="eyebrow mb-1.5 text-violet/80">Rosters</p>
                <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
                  My squads
                </h2>
              </div>
              <Link href="/teams" className={cn(buttonClass("ghost", "sm"))}>
                Manage <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {teams.length ? (
                teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[8px] font-extrabold text-ink"
                      style={{ background: team.logoColor }}
                    >
                      {team.tag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold uppercase tracking-[0.03em] text-mist">
                        {team.name}
                      </p>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.09em] text-muted">
                        {team.members.filter((member) => !member.isSub).length} players · {team.tag}
                      </p>
                    </div>
                    <BadgeCheck className="size-4 text-violet/70" />
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-[11px] text-muted">
                  No squads yet.{" "}
                  <Link href="/teams" className="text-violet hover:underline">
                    Create your first roster
                  </Link>
                  .
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="panel p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet">
              <Sparkles className="size-3.5" /> Account
            </p>
            <div className="mt-3 space-y-2.5 text-[9px] font-semibold text-muted">
              <Row label="Account ID" value={`${profile.id.slice(0, 8)}…`} />
              <Row label="Member since" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN") : "Season 07"} />
              <Row label="Platform" value={mode === "demo" ? "Local demo" : "Supabase cloud"} />
              <Row label="Payments" value={mode === "demo" ? "Simulated UPI" : "YouPI / UPI"} />
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={cn(buttonClass("secondary", "sm"), "mt-4 w-full")}
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>

          {mode === "demo" ? (
            <div className="panel border-[#56E1FF]/20 p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8cebff]">
                <BadgeCheck className="size-3.5" /> Demo mode
              </p>
              <p className="mt-2 text-[9px] leading-relaxed text-muted">
                Data is stored in this browser. Slots, payments and results are fully interactive but
                no real money moves.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetDemo();
                  toast({ title: "Demo reset", description: "Bookings cleared, sample squad restored." });
                }}
                className={cn(buttonClass("secondary", "sm"), "mt-3 w-full")}
              >
                <RotateCcw className="size-3.5" /> Reset demo data
              </button>
            </div>
          ) : null}

          <div className="panel p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet">
              <Trophy className="size-3.5" /> Need the desk?
            </p>
            <p className="mt-2 text-[9px] leading-relaxed text-muted">
              Payment stuck or roster issue? Send your team tag and order ID. A human replies 10 AM –
              2 AM IST.
            </p>
            <div className="mt-3 space-y-2">
              {BRAND.supportWhatsapp ? (
                <a
                  href={`https://wa.me/${BRAND.supportWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonClass("primary", "sm"), "w-full")}
                >
                  <MessageCircle className="size-3.5" /> WhatsApp support
                </a>
              ) : null}
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className={cn(buttonClass("secondary", "sm"), "w-full")}
              >
                <Mail className="size-3.5" /> Email the desk
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2.5 text-[8px] font-bold uppercase tracking-[0.12em] text-muted/50">
            <Lock className="size-3 text-violet/60" /> Your data is never sold
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="panel panel-hover relative overflow-hidden p-3.5">
      <p className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.12em] text-muted/70">
        <span className={highlight ? "text-orange" : "text-violet/70"}>{icon}</span>
        {label}
      </p>
      <p
        className={cn(
          "font-display mt-2 truncate text-[22px] font-bold leading-none tracking-[-0.04em] tabular",
          highlight ? "text-orange" : "text-mist",
        )}
      >
        {value}
      </p>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="uppercase tracking-[0.08em]">{label}</span>
      <span className="max-w-[150px] truncate font-semibold text-mist/80">{value}</span>
    </div>
  );
}
