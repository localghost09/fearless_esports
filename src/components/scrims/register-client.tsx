"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Crosshair,
  Info,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Smartphone,
  Ticket,
  UserRound,
  Zap,
} from "lucide-react";
import { Badge, Button, Divider, Field, Input, buttonClass } from "@/components/ui";
import { Countdown } from "@/components/scrims/countdown";
import { PaymentSheet } from "@/components/payment/payment-sheet";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import { DROP_LOCATIONS, getPaymentProvider } from "@/lib/config";
import { availableSlots, myRegistrationForScrim } from "@/lib/slots";
import type { MemberRole, Registration, Scrim, Team, TeamMember } from "@/lib/types";
import {
  cn,
  formatAmount,
  formatDayLabel,
  formatINR,
  formatTime,
  normalisePhone,
} from "@/lib/utils";

const ROLES: MemberRole[] = ["IGL", "Assaulter", "Support", "Sniper"];
const COLORS = ["#D3FF55", "#A99CFF", "#8FE8FF", "#FF6A45", "#FF4D8D", "#FFB03A", "#7AF2B0", "#E8ECF1"];

function emptyMember(role: MemberRole, isSub = false): TeamMember {
  return { id: crypto.randomUUID(), ign: "", uid: "", role: isSub ? "Substitute" : role, isSub };
}

function blankTeam(whatsapp = ""): Team {
  return {
    id: crypto.randomUUID(),
    name: "",
    tag: "",
    logoColor: "#C8FF3D",
    whatsapp,
    members: [
      emptyMember("IGL"),
      emptyMember("Assaulter"),
      emptyMember("Support"),
      emptyMember("Sniper"),
      emptyMember("Substitute", true),
    ],
  };
}

function cloneTeam(team: Team): Team {
  const byRole = new Map(team.members.map((member) => [member.role, member]));
  const members = ROLES.map(
    (role) =>
      byRole.get(role) ?? emptyMember(role),
  );
  const sub = team.members.find((member) => member.isSub || member.role === "Substitute");
  return {
    ...team,
    members: [...members.map((member) => ({ ...member })), sub ? { ...sub, isSub: true } : emptyMember("Substitute", true)],
  };
}

export function RegisterClient({ scrim }: { scrim: Scrim }) {
  const {
    mode,
    ready,
    user,
    profile,
    teams,
    registrations,
    saveTeam,
    createRegistration,
    confirmRegistration,
    awaitVerification,
    cancelRegistration,
  } = useApp();
  const { toast } = useToast();

  const [initialised, setInitialised] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedId, setSelectedId] = useState<string>("new");
  const [draft, setDraft] = useState<Team>(() => blankTeam());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedMap, setSelectedMap] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreeFair, setAgreeFair] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [creating, setCreating] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payReg, setPayReg] = useState<Registration | null>(null);
  const initialisedRef = useRef(false);

  const provider = getPaymentProvider();
  const paymentBlocked = mode === "live" && provider === "demo";
  const existing = myRegistrationForScrim(scrim, registrations);
  const pending = existing?.status === "pending_payment" ? existing : null;
  const confirmed = existing?.status === "confirmed";
  const openSlots = useMemo(() => availableSlots(scrim, registrations), [scrim, registrations]);

  const maps = useMemo(() => {
    const parts = scrim.map.split("·").map((part) => part.trim());
    const matched = parts
      .map((part) => Object.keys(DROP_LOCATIONS).find((key) => key.toLowerCase() === part.toLowerCase()))
      .filter((key): key is string => Boolean(key));
    return matched.length ? matched : ["Erangel"];
  }, [scrim.map]);

  useEffect(() => {
    if (!ready || initialisedRef.current) return;
    initialisedRef.current = true;
    const first = teams[0];
    if (first) {
      setSelectedId(first.id);
      setDraft(cloneTeam(first));
    } else {
      const fresh = blankTeam(profile?.phone ?? "");
      setSelectedId("new");
      setDraft(fresh);
    }
    setSelectedMap(maps[0] ?? "Erangel");
    const query = new URLSearchParams(window.location.search).get("slot");
    if (query) {
      const value = Number(query);
      if (Number.isInteger(value) && value > 0) setSelectedSlot(value);
    }
    setInitialised(true);
  }, [ready, teams, profile?.phone, maps]);

  useEffect(() => {
    if (!initialised) return;
    setDropLocation((current) => current || DROP_LOCATIONS[selectedMap]?.[0] || "");
  }, [initialised, selectedMap]);

  function chooseTeam(team: Team) {
    setSelectedId(team.id);
    setDraft(cloneTeam(team));
    setErrors({});
  }

  function createNewTeam() {
    setSelectedId("new");
    setDraft(blankTeam(profile?.phone ?? ""));
    setErrors({});
  }

  function updateMember(index: number, patch: Partial<TeamMember>) {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member,
      ),
    }));
  }

  function validateSquad() {
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 3) next.teamName = "Team name needs at least 3 characters.";
    if (!/^[A-Za-z0-9]{2,5}$/.test(draft.tag.trim())) next.teamTag = "Use 2–5 letters or numbers.";
    if (!/^\d{10}$/.test(draft.whatsapp?.replace(/\D/g, "").slice(-10) ?? "")) {
      next.whatsapp = "Enter a valid 10-digit WhatsApp number.";
    }
    draft.members.slice(0, 4).forEach((member, index) => {
      if (member.ign.trim().length < 3) next[`ign-${index}`] = "IGN required (3+ chars).";
      if (!/^\d{8,12}$/.test(member.uid.trim())) next[`uid-${index}`] = "8–12 digit BGMI UID.";
    });
    const sub = draft.members[4];
    if (sub && (sub.ign.trim() || sub.uid.trim())) {
      if (sub.ign.trim().length < 3) next["ign-4"] = "Sub IGN required.";
      if (!/^\d{8,12}$/.test(sub.uid.trim())) next["uid-4"] = "Sub UID must be 8–12 digits.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function persistTeam() {
    const cleaned: Team = {
      ...draft,
      name: draft.name.trim().toUpperCase(),
      tag: draft.tag.trim().toUpperCase(),
      whatsapp: normalisePhone(draft.whatsapp ?? ""),
      members: draft.members
        .filter((member) => member.isSub ? member.ign.trim() && member.uid.trim() : true)
        .map((member) => ({
          ...member,
          ign: member.ign.trim(),
          uid: member.uid.trim(),
        })),
    };
    setSavingTeam(true);
    try {
      const saved = await saveTeam(cleaned);
      setDraft(cloneTeam(saved));
      setSelectedId(saved.id);
      return saved;
    } finally {
      setSavingTeam(false);
    }
  }

  async function goToDrop() {
    if (!validateSquad()) {
      toast({ title: "Check your squad", description: "Some player details are missing.", tone: "error" });
      return;
    }
    try {
      const saved = await persistTeam();
      setDraft(cloneTeam(saved));
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      toast({
        title: "Could not save squad",
        description: cause instanceof Error ? cause.message : "Try again in a moment.",
        tone: "error",
      });
    }
  }

  function goToPayment() {
    const next: Record<string, string> = {};
    if (!dropLocation) next.drop = "Pick a drop location or choose flexible.";
    if (!agreeRules) next.rules = "Accept the rulebook to continue.";
    if (!agreeFair) next.fair = "Confirm the fair-play declaration.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay() {
    if (paymentBlocked) {
      toast({
        title: "Payments not configured",
        description: "Add a YouPI gateway or UPI VPA to accept real payments.",
        tone: "error",
      });
      return;
    }
    if (existing && existing.status !== "pending_payment") {
      toast({ title: "You're already in", description: `Slot ${existing.slot} is locked.` });
      return;
    }
    if (existing?.status === "pending_payment") {
      setPayReg(existing);
      setPayOpen(true);
      return;
    }

    setErrors({});
    setCreating(true);
    try {
      const saved = await persistTeam();
      const registration = await createRegistration({
        scrim,
        team: saved,
        dropLocation: `${selectedMap} · ${dropLocation}`,
        whatsapp: normalisePhone(saved.whatsapp ?? ""),
        preferredSlot: selectedSlot,
      });

      if (registration.status === "confirmed") {
        toast({
          title: "Slot locked",
          description: `You're in slot ${registration.slot}. No payment needed.`,
        });
        return;
      }

      setPayReg(registration);
      setPayOpen(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not book your slot.";
      const friendly =
        message.includes("SCRIM_FULL")
          ? "This lobby just filled up. Try another scrim."
          : message.includes("SLOT_TAKEN")
            ? "Someone grabbed that slot. Pick another one."
            : message.includes("AUTH_REQUIRED")
              ? "Sign in to book a slot."
              : message;
      toast({ title: "Booking failed", description: friendly, tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function handlePaid(orderId: string) {
    if (!payReg) return;
    await confirmRegistration(payReg.id, orderId);
    toast({ title: "Payment confirmed", description: `Slot ${payReg.slot} is locked.` });
  }

  async function handleAwaiting(orderId: string, utr: string) {
    if (!payReg) return;
    await awaitVerification(payReg.id, orderId);
    toast({
      title: "Payment under verification",
      description: utr ? `UTR ${utr} submitted.` : "The desk is checking the UPI credit.",
      tone: "info",
    });
  }

  async function handleCancelPending() {
    if (!pending) return;
    try {
      await cancelRegistration(pending.id);
      setPayOpen(false);
      setPayReg(null);
      toast({ title: "Registration cancelled", description: "Your slot has been released." });
    } catch {
      toast({ title: "Could not cancel", description: "Contact support with your order ID.", tone: "error" });
    }
  }

  if (mode === "live" && ready && !user) {
    return <AuthGate scrim={scrim} />;
  }

  if (!ready || !initialised) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4">
        <Loader2 className="size-6 animate-spin text-violet" />
      </div>
    );
  }

  const activeStep = step;
  const total = scrim.entryFee;
  const primaryAction =
    step === 1
      ? goToDrop
      : step === 2
        ? goToPayment
        : pay;
  const primaryLabel =
    step === 1 ? "Continue" : step === 2 ? "Continue" : pending ? "Complete payment" : "Pay & lock slot";

  return (
    <div className="pb-32 md:pb-8">
      <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-ink/90 backdrop-blur-xl md:top-[104px]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/scrims/${scrim.slug}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-white/25 hover:text-mist"
            aria-label="Back to lobby"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold uppercase tracking-[0.03em] text-mist">
              {scrim.title}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
              <Lock className="size-2.5 text-violet" />
              Secure slot booking · {formatDayLabel(scrim.startAt)} {formatTime(scrim.startAt)}
            </p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">Entry</p>
            <p className="font-display text-lg leading-none font-bold text-lime">
              {scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 px-4 pb-3 sm:px-6">
          {[
            { number: 1, label: "Squad" },
            { number: 2, label: "Drop" },
            { number: 3, label: "Payment" },
          ].map((item) => {
            const active = activeStep === item.number;
            const done = activeStep > item.number;
            return (
              <div key={item.number} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded text-[8px] font-extrabold",
                    done
                      ? "bg-violet text-ink"
                      : active
                        ? "border border-violet/50 bg-violet/10 text-violet"
                        : "border border-white/10 text-muted/60",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3.5} /> : item.number}
                </span>
                <span
                  className={cn(
                    "text-[7px] font-bold uppercase tracking-[0.1em] sm:text-[8px] sm:tracking-[0.14em]",
                    active ? "text-mist" : done ? "text-violet/70" : "text-muted/45",
                  )}
                >
                  {item.label}
                </span>
                {item.number < 3 ? (
                  <span
                    className={cn("h-px flex-1", done ? "bg-violet/40" : "bg-white/[0.07]")}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        {confirmed && !payOpen ? (
          <AlreadyRegistered registration={existing!} scrim={scrim} />
        ) : pending && !payOpen ? (
          <PendingHeld
            registration={pending}
            scrim={scrim}
            provider={provider}
            onResume={() => {
              setPayReg(pending);
              setPayOpen(true);
            }}
            onCancel={() => void handleCancelPending()}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {step === 1 ? (
                <SquadStep
                  teams={teams}
                  draft={draft}
                  selectedId={selectedId}
                  errors={errors}
                  onChoose={chooseTeam}
                  onCreateNew={createNewTeam}
                  onUpdate={setDraft}
                  onUpdateMember={updateMember}
                />
              ) : null}

              {step === 2 ? (
                <DropStep
                  scrim={scrim}
                  maps={maps}
                  selectedMap={selectedMap}
                  onMapChange={(value) => {
                    setSelectedMap(value);
                    setDropLocation(DROP_LOCATIONS[value]?.[0] ?? "");
                  }}
                  dropLocation={dropLocation}
                  onDropChange={setDropLocation}
                  openSlots={openSlots}
                  selectedSlot={selectedSlot}
                  onSlotChange={setSelectedSlot}
                  agreeRules={agreeRules}
                  agreeFair={agreeFair}
                  onAgreeRules={setAgreeRules}
                  onAgreeFair={setAgreeFair}
                  errors={errors}
                  onBack={() => setStep(1)}
                />
              ) : null}

              {step === 3 ? (
                <PayStep
                  scrim={scrim}
                  draft={draft}
                  dropLocation={`${selectedMap} · ${dropLocation}`}
                  selectedSlot={selectedSlot}
                  provider={provider}
                  paymentBlocked={paymentBlocked}
                  creating={creating}
                  onBack={() => setStep(2)}
                  onPay={() => void pay()}
                />
              ) : null}
            </div>

            <SidebarSummary
              scrim={scrim}
              draft={draft}
              selectedSlot={selectedSlot}
              provider={provider}
              step={step}
            />
          </div>
        )}
      </div>

      {!confirmed && !pending ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080a0d] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-18px_44px_-20px_rgba(0,0,0,0.95)] md:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-none font-bold text-mist">
                {scrim.entryFee === 0 ? "FREE" : formatAmount(scrim.entryFee)}
              </p>
              <p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
                Step {step}/3 · {selectedSlot ? `slot ${selectedSlot}` : "auto-assign"}
              </p>
            </div>
            <Button
              onClick={() => void primaryAction()}
              disabled={savingTeam || creating}
              size="md"
              className="shrink-0"
            >
              {savingTeam || creating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : step === 3 ? (
                <Lock className="size-3.5" />
              ) : null}
              {step === 3 ? (pending ? "Complete payment" : `Pay ${formatINR(total)}`) : primaryLabel}
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      ) : null}

      {payReg ? (
        <PaymentSheet
          open={payOpen}
          onClose={() => setPayOpen(false)}
          scrim={scrim}
          registration={payReg}
          onPaid={handlePaid}
          onAwaiting={handleAwaiting}
        />
      ) : null}
    </div>
  );
}

function AuthGate({ scrim }: { scrim: Scrim }) {
  const path = `/scrims/${scrim.slug}/register`;
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="panel p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-violet/25 bg-violet/[0.08] text-violet">
          <UserRound className="size-5" />
        </span>
        <h1 className="display mt-4 text-3xl text-mist">Sign in to lock your slot</h1>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Your squad, bookings and match passes live in your account. Sign in and you&apos;ll come
          right back to this checkout.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(path)}`}
          className={cn(buttonClass("primary", "lg"), "mt-5 w-full")}
        >
          Sign in / create account
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href={`/scrims/${scrim.slug}`}
          className="mt-3 inline-block text-[9px] font-bold uppercase tracking-[0.12em] text-muted hover:text-mist"
        >
          Back to lobby
        </Link>
      </div>
    </div>
  );
}

function SquadStep({
  teams,
  draft,
  selectedId,
  errors,
  onChoose,
  onCreateNew,
  onUpdate,
  onUpdateMember,
}: {
  teams: Team[];
  draft: Team;
  selectedId: string;
  errors: Record<string, string>;
  onChoose: (team: Team) => void;
  onCreateNew: () => void;
  onUpdate: (team: Team) => void;
  onUpdateMember: (index: number, patch: Partial<TeamMember>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Badge tone="violet">STEP 01 · YOUR SQUAD</Badge>
        <h1 className="display mt-2 text-[clamp(2rem,9vw,2.6rem)] leading-[0.94] tracking-[-0.045em] text-mist sm:text-[40px]">
          Who&apos;s taking the drop?
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Pick an existing squad or create a new one. Roster details are locked at kickoff.
        </p>
      </div>

      {teams.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((team) => {
            const selected = selectedId === team.id;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onChoose(team)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  selected
                    ? "border-violet/45 bg-violet/[0.055] ring-1 ring-violet/20"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                )}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-sm font-extrabold text-ink"
                  style={{ background: team.logoColor }}
                >
                  {team.tag || "FE"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold uppercase tracking-[0.03em] text-mist">
                    {team.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {team.members.filter((m) => !m.isSub).length} players · {team.tag}
                  </span>
                </span>
                {selected ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-violet text-ink">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                ) : (
                  <span className="size-5 rounded-full border border-white/15" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onCreateNew}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition",
              selectedId === "new"
                ? "border-violet/45 bg-violet/[0.055]"
                : "border-white/15 hover:border-violet/30 hover:bg-white/[0.02]",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-violet">
              <Plus className="size-4" />
            </span>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.03em] text-mist">
                New squad
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                Build a fresh roster
              </span>
            </span>
          </button>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Squad identity</h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-xl font-display text-xl font-extrabold text-ink"
              style={{ background: draft.logoColor }}
            >
              {draft.tag || "FE"}
            </span>
            <div className="min-w-0 flex-1">
              <Field label="Team name" error={errors.teamName}>
                <Input
                  value={draft.name}
                  onChange={(event) => onUpdate({ ...draft, name: event.target.value })}
                  placeholder="RIFT ESPORTS"
                  maxLength={28}
                  autoComplete="organization"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Team tag" hint="2–5 chars" error={errors.teamTag}>
              <Input
                value={draft.tag}
                onChange={(event) =>
                  onUpdate({ ...draft, tag: event.target.value.toUpperCase().slice(0, 5) })
                }
                placeholder="RFT"
                maxLength={5}
                className="uppercase"
              />
            </Field>
            <Field label="WhatsApp number" hint="+91" error={errors.whatsapp}>
              <Input
                value={draft.whatsapp ?? ""}
                onChange={(event) => onUpdate({ ...draft, whatsapp: event.target.value })}
                placeholder="98765 43210"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Team colour
            </p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdate({ ...draft, logoColor: color })}
                  aria-label={`Choose colour ${color}`}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border-2 transition",
                    draft.logoColor === color
                      ? "scale-110 border-mist"
                      : "border-transparent opacity-75 hover:opacity-100",
                  )}
                  style={{ background: color }}
                >
                  {draft.logoColor === color ? (
                    <Check className="size-3.5 text-ink" strokeWidth={3.5} />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Starting four</h2>
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
              BGMI IGN + numeric UID
            </p>
          </div>
          <Badge tone="outline">4 + 1 SUB</Badge>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {draft.members.map((member, index) => (
            <div
              key={member.id ?? index}
              className={cn(
                "rounded-xl border p-3",
                member.isSub ? "border-dashed border-white/10" : "border-white/[0.07] bg-white/[0.015]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.14em] text-muted">
                  <span className="flex size-4 items-center justify-center rounded bg-white/[0.05] text-[7px] text-violet">
                    {index + 1}
                  </span>
                  {member.role}
                  {member.isSub ? (
                    <span className="text-muted/40">· optional</span>
                  ) : (
                    <span className="text-orange/70">*</span>
                  )}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="In-game name" error={errors[`ign-${index}`]}>
                  <Input
                    value={member.ign}
                    onChange={(event) => onUpdateMember(index, { ign: event.target.value })}
                    placeholder={member.isSub ? "Substitute IGN" : "Rift•Viper"}
                    maxLength={20}
                    autoComplete="off"
                    className="h-11"
                  />
                </Field>
                <Field label="BGMI UID" error={errors[`uid-${index}`]}>
                  <Input
                    value={member.uid}
                    onChange={(event) =>
                      onUpdateMember(index, { uid: event.target.value.replace(/\D/g, "").slice(0, 12) })
                    }
                    placeholder="5123456789"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-11 font-mono tracking-[0.05em]"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2.5">
        <Info className="mt-0.5 size-3.5 shrink-0 text-violet/70" />
        <p className="text-[9px] leading-relaxed text-muted">
          Use the exact in-game names and UIDs. Mismatches at room check-in can void your slot
          without a refund.
        </p>
      </div>
    </div>
  );
}

function DropStep({
  scrim,
  maps,
  selectedMap,
  onMapChange,
  dropLocation,
  onDropChange,
  openSlots,
  selectedSlot,
  onSlotChange,
  agreeRules,
  agreeFair,
  onAgreeRules,
  onAgreeFair,
  errors,
  onBack,
}: {
  scrim: Scrim;
  maps: string[];
  selectedMap: string;
  onMapChange: (value: string) => void;
  dropLocation: string;
  onDropChange: (value: string) => void;
  openSlots: number[];
  selectedSlot: number | null;
  onSlotChange: (value: number | null) => void;
  agreeRules: boolean;
  agreeFair: boolean;
  onAgreeRules: (value: boolean) => void;
  onAgreeFair: (value: boolean) => void;
  errors: Record<string, string>;
  onBack: () => void;
}) {
  const drops = DROP_LOCATIONS[selectedMap] ?? [];
  return (
    <div className="space-y-4">
      <div>
        <Badge tone="violet">STEP 02 · DROP & SLOT</Badge>
        <h1 className="display mt-2 text-[clamp(2rem,9vw,2.6rem)] leading-[0.94] tracking-[-0.045em] text-mist sm:text-[40px]">
          Where are you landing?
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Claim a preferred slot and pick your drop. The marshal uses this to balance the lobby.
        </p>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Pick your slot</h2>
          <span className="hidden text-[8px] font-bold uppercase tracking-[0.1em] text-muted min-[360px]:block">
            Optional · auto-assign
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSlotChange(null)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[9px] font-bold uppercase tracking-[0.06em] transition",
                selectedSlot === null
                  ? "border-lime/45 bg-lime/10 text-lime"
                  : "border-white/10 text-muted hover:border-white/25 hover:text-mist",
              )}
            >
              <ZapIcon /> Auto assign
            </button>
            {openSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onSlotChange(slot)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-[10px] font-bold tabular transition",
                  selectedSlot === slot
                    ? "border-lime bg-lime text-ink"
                    : "border-dashed border-lime/25 bg-lime/[0.025] text-lime/75 hover:border-lime/50",
                )}
              >
                {slot}
              </button>
            ))}
          </div>
          {!openSlots.length ? (
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-orange">
              <AlertTriangle className="size-3.5" /> This lobby is full. Try another scrim.
            </p>
          ) : (
            <p className="mt-3 text-[8px] font-semibold uppercase tracking-[0.09em] text-muted/60">
              {openSlots.length} open slots · selection is not a reservation until payment
            </p>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Drop location</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {maps.map((map) => (
              <button
                key={map}
                type="button"
                onClick={() => onMapChange(map)}
                className={cn(
                  "h-8 shrink-0 rounded-lg border px-3 text-[9px] font-bold uppercase tracking-[0.1em] transition",
                  selectedMap === map
                    ? "border-violet/40 bg-violet/10 text-violet"
                    : "border-white/10 text-muted hover:text-mist",
                )}
              >
                {map}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {drops.map((drop) => (
              <button
                key={drop}
                type="button"
                onClick={() => onDropChange(drop)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[9px] font-semibold transition",
                  dropLocation === drop
                    ? "border-violet/40 bg-violet/10 text-violet"
                    : "border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/20 hover:text-mist",
                )}
              >
                <MapPin className="size-3" />
                {drop}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDropChange("Flexible")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[9px] font-semibold transition",
                dropLocation === "Flexible"
                  ? "border-violet/40 bg-violet/10 text-violet"
                  : "border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/20 hover:text-mist",
              )}
            >
              <Crosshair className="size-3" />
              Flexible
            </button>
          </div>
          {errors.drop ? <p className="mt-2 text-[10px] text-[#ff8b70]">{errors.drop}</p> : null}
          <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted/70">
            <Info className="mt-0.5 size-3 shrink-0 text-violet/60" />
            Drop calls are honoured where the flight path allows. Contested drops are part of the
            game — no admin intervention.
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Before you lock in</h2>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <CheckRow
            checked={agreeRules}
            onChange={onAgreeRules}
            label="I've read the rulebook"
            description="Late joins, account sharing, emulators and teaming are disqualification offences."
          />
          <CheckRow
            checked={agreeFair}
            onChange={onAgreeFair}
            label="Fair play declaration"
            description="Every player in this roster is the registered owner of the BGMI ID and is eligible to compete."
          />
          {errors.rules || errors.fair ? (
            <p className="text-[10px] text-[#ff8b70]">{errors.rules ?? errors.fair}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1 sm:flex-none">
          <ArrowLeft className="size-3.5" />
          Back
        </Button>
        <p className="ml-auto hidden text-[8px] font-semibold uppercase tracking-[0.1em] text-muted sm:block">
          Lobby: {scrim.title}
        </p>
      </div>
    </div>
  );
}

function PayStep({
  scrim,
  draft,
  dropLocation,
  selectedSlot,
  provider,
  paymentBlocked,
  creating,
  onBack,
  onPay,
}: {
  scrim: Scrim;
  draft: Team;
  dropLocation: string;
  selectedSlot: number | null;
  provider: ReturnType<typeof getPaymentProvider>;
  paymentBlocked: boolean;
  creating: boolean;
  onBack: () => void;
  onPay: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Badge tone="violet">STEP 03 · PAYMENT</Badge>
        <h1 className="display mt-2 text-[clamp(2rem,9vw,2.6rem)] leading-[0.94] tracking-[-0.045em] text-mist sm:text-[40px]">
          Lock the slot<span className="text-violet">.</span>
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          One last check. Your slot is held while the UPI payment is verified.
        </p>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Order summary</h2>
        </div>
        <div className="divide-y divide-white/[0.05] px-4 sm:px-5">
          <SummaryRow label="Lobby" value={scrim.title} />
          <SummaryRow label="Squad" value={`${draft.name || "New squad"} (${draft.tag || "—"})`} />
          <SummaryRow label="Slot" value={selectedSlot ? `Slot ${selectedSlot}` : "Auto-assigned"} />
          <SummaryRow label="Drop" value={dropLocation} />
          <SummaryRow
            label="Kickoff"
            value={`${formatDayLabel(scrim.startAt)} · ${formatTime(scrim.startAt)}`}
          />
          <SummaryRow label="Entry fee" value={scrim.entryFee === 0 ? "FREE" : formatAmount(scrim.entryFee)} />
          <SummaryRow label="Platform fee" value="₹0" lime />
          <div className="flex items-center justify-between py-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-mist">
              Total payable
            </span>
            <span className="font-display text-2xl font-bold text-lime">
              {scrim.entryFee === 0 ? "FREE" : formatAmount(scrim.entryFee)}
            </span>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Payment method</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime/[0.045] p-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-lime text-ink">
              <Smartphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-mist">
                UPI · GPay / PhonePe / Paytm
              </p>
              <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                {provider === "youpi"
                  ? "YouPI self-hosted checkout"
                  : provider === "upi"
                    ? "Direct UPI · desk verified"
                    : "Preview mode · simulated payment"}
              </p>
            </div>
            <span className="flex size-5 items-center justify-center rounded-full bg-lime text-ink">
              <Check className="size-3" strokeWidth={3.5} />
            </span>
          </div>

          {provider === "demo" && !paymentBlocked ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange/25 bg-orange/[0.06] px-3 py-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[#ff9a80]" />
              <p className="text-[9px] leading-relaxed text-[#ffaf9b]">
                You&apos;re in preview mode. The next screen uses a demo UPI QR and a simulated
                success button — no money moves. Add Supabase + YouPI or a UPI VPA for live
                checkout.
              </p>
            </div>
          ) : null}

          {paymentBlocked ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange/25 bg-orange/[0.06] px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#ff9a80]" />
              <p className="text-[9px] leading-relaxed text-[#ffaf9b]">
                Payments are not configured for this deployment. Add YouPI or a UPI VPA in the
                environment before taking real entries.
              </p>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Instant slot", "Secure UPI", "No hidden fee"].map((item) => (
              <div
                key={item}
                className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2.5 text-center"
              >
                <BadgeCheck className="size-3.5 text-lime" />
                <span className="text-[7px] font-bold uppercase tracking-[0.1em] text-muted">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1 sm:flex-none">
          <ArrowLeft className="size-3.5" />
          Back
        </Button>
        <p className="ml-auto hidden text-[8px] font-semibold uppercase tracking-[0.1em] text-muted sm:block">
          <Link href="/legal/refund" className="underline-offset-4 hover:text-violet hover:underline">
            Refund policy
          </Link>
        </p>
      </div>

      <div className="hidden md:block">
        <Button
          onClick={onPay}
          disabled={creating || paymentBlocked}
          size="lg"
          className="w-full"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {scrim.entryFee === 0 ? "Confirm free slot" : `Pay ${formatAmount(scrim.entryFee)} & lock slot`}
        </Button>
      </div>
    </div>
  );
}

function SidebarSummary({
  scrim,
  draft,
  selectedSlot,
  provider,
  step,
}: {
  scrim: Scrim;
  draft: Team;
  selectedSlot: number | null;
  provider: ReturnType<typeof getPaymentProvider>;
  step: number;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[124px] space-y-3">
        <div className="panel overflow-hidden">
          <div
            className="relative overflow-hidden px-4 py-4"
            style={{
              backgroundImage:
                "radial-gradient(300px 140px at 90% -20%, rgba(140,92,255,0.24), transparent 70%), linear-gradient(140deg,#171128,#0a090f)",
            }}
          >
            <div className="absolute inset-0 bg-diagonal opacity-20" />
            <p className="relative text-[8px] font-extrabold uppercase tracking-[0.16em] text-violet">
              {scrim.game} · {scrim.mode}
            </p>
            <h2 className="display relative mt-1.5 text-2xl text-mist">{scrim.title}</h2>
            <p className="relative mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
              {formatDayLabel(scrim.startAt)} · {formatTime(scrim.startAt)}
            </p>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
                <Clock3 className="size-3 text-violet" /> Starts in
              </span>
              <Countdown target={scrim.startAt} className="text-[10px] font-bold text-mist" />
            </div>
            <Divider />
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">Squad</span>
              <span className="max-w-[160px] truncate text-[10px] font-semibold text-mist">
                {draft.name || "Not set yet"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
                Preferred slot
              </span>
              <span className="text-[10px] font-semibold text-mist">
                {selectedSlot ? `Slot ${selectedSlot}` : "Auto"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
                Payment
              </span>
              <span className="text-[10px] font-semibold text-mist">
                {provider === "youpi" ? "YouPI UPI" : provider === "upi" ? "UPI" : "Demo UPI"}
              </span>
            </div>
            <Divider />
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
                Entry fee
              </span>
              <span className="font-display text-xl font-bold text-lime">
                {scrim.entryFee === 0 ? "FREE" : formatINR(scrim.entryFee)}
              </span>
            </div>
            <p className="text-center text-[7px] font-semibold uppercase tracking-[0.1em] text-muted/50">
              Step {step} of 3 · 100% refund if lobby is cancelled
            </p>
          </div>
        </div>

        <div className="panel p-4">
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-violet">
            <ShieldCheck className="size-3.5" /> Buyer protection
          </p>
          {[
            "Slot confirmed instantly",
            "Room ID before kickoff",
            "Refund if lobby cancels",
            "Support 10 AM – 2 AM IST",
          ].map((item) => (
            <p key={item} className="mt-2 flex items-center gap-1.5 text-[8px] font-semibold text-muted">
              <Check className="size-3 shrink-0 text-violet/70" strokeWidth={3} />
              {item}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

function PendingHeld({
  registration,
  scrim,
  provider,
  onResume,
  onCancel,
}: {
  registration: Registration;
  scrim: Scrim;
  provider: ReturnType<typeof getPaymentProvider>;
  onResume: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <Badge tone="orange">PAYMENT PENDING</Badge>
          <h1 className="display mt-2 text-3xl text-mist">Your slot is on hold</h1>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Finish checkout to lock slot {registration.slot ?? "—"}. Unpaid holds are released when
            the lobby fills or registration closes.
          </p>
        </div>
        <div className="divide-y divide-white/[0.05] px-5">
          <SummaryRow label="Lobby" value={scrim.title} />
          <SummaryRow label="Squad" value={`${registration.teamName} (${registration.teamTag})`} />
          <SummaryRow label="Slot" value={`Slot ${registration.slot ?? "auto"}`} />
          <SummaryRow label="Amount due" value={formatAmount(registration.amount)} lime />
          <SummaryRow
            label="Payment"
            value={
              provider === "youpi" ? "YouPI secure UPI" : provider === "upi" ? "Direct UPI" : "Demo UPI"
            }
          />
        </div>
        <div className="space-y-2 p-5">
          <Button onClick={onResume} size="lg" className="w-full">
            <Lock className="size-4" />
            Complete payment
            <ArrowRight className="size-4" />
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-[#ff8b70]"
          >
            Cancel & release slot
          </button>
        </div>
      </div>
    </div>
  );
}

function AlreadyRegistered({ registration, scrim }: { registration: Registration; scrim: Scrim }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="panel relative overflow-hidden text-center">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-lime to-transparent" />
        <div className="p-6">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-lime text-ink shadow-[0_0_40px_-8px_rgba(200,255,61,0.7)]">
            <Check className="size-8" strokeWidth={3.5} />
          </span>
          <Badge tone="lime" className="mt-4">
            SLOT LOCKED
          </Badge>
          <h1 className="display mt-2 text-4xl text-mist">
            You&apos;re in<span className="text-lime">.</span>
          </h1>
          <p className="mt-1 text-[11px] font-semibold text-muted">
            {registration.teamName} · slot {registration.slot}
          </p>

          <div className="mt-5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02] text-left">
            <SummaryRow label="Lobby" value={scrim.title} />
            <SummaryRow
              label="Kickoff"
              value={`${formatDayLabel(scrim.startAt)} · ${formatTime(scrim.startAt)}`}
            />
            <SummaryRow label="Paid" value={formatAmount(registration.amount)} lime />
            <SummaryRow label="Drop" value={registration.dropLocation} />
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
            <Lock className="size-3 text-lime" /> Room ID unlocks 15 min before kickoff
          </p>

          <Link
            href="/my-matches"
            className={cn(buttonClass("primary", "lg"), "mt-4 w-full")}
          >
            <Ticket className="size-4" />
            View my match pass
          </Link>
          <Link
            href={`/scrims/${scrim.slug}`}
            className="mt-2 inline-block py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted hover:text-mist"
          >
            Back to lobby
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, lime }: { label: string; value: string; lime?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span
        className={cn(
          "max-w-[65%] truncate text-[10px] font-semibold",
          lime ? "text-lime" : "text-mist/85",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
        checked ? "border-lime/30 bg-lime/[0.035]" : "border-white/[0.08] bg-white/[0.02]",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition",
          checked ? "border-lime bg-lime text-ink" : "border-white/20 text-transparent",
        )}
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-mist">
          {label}
        </span>
        <span className="mt-0.5 block text-[9px] leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  );
}

function ZapIcon() {
  return <Zap className="size-3" />;
}
