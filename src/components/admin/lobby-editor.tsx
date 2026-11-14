"use client";

import type { ReactNode } from "react";
import { CalendarClock, Loader2, Save, X } from "lucide-react";
import { Badge, Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import type { BannerTheme, ScrimStatus, ScrimTier } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface LobbyDraft {
  title: string;
  subtitle: string;
  description: string;
  tier: ScrimTier;
  banner: BannerTheme;
  mode: string;
  map: string;
  /** `datetime-local` values (local time, no timezone suffix). */
  start: string;
  end: string;
  closes: string;
  entryFee: string;
  prizePool: string;
  perKill: string;
  totalSlots: string;
  matchesCount: string;
  status: ScrimStatus;
  featured: boolean;
}

/** The subset of the admin scrim snapshot the editor needs. */
export interface EditableScrim {
  title: string;
  subtitle: string | null;
  description: string | null;
  tier: string;
  banner: string;
  mode: string;
  map: string;
  startAt: string;
  endAt: string;
  registrationClosesAt: string;
  entryFee: number;
  prizePool: number;
  perKill: number;
  totalSlots: number;
  matchesCount: number;
  status: ScrimStatus;
  featured: boolean;
}

const TIERS: ScrimTier[] = ["daily", "weekly", "premium", "free"];
const BANNERS: BannerTheme[] = ["lime", "ember", "violet", "ice"];
const STATUSES: ScrimStatus[] = ["open", "full", "live", "completed", "cancelled"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** ISO timestamp → `datetime-local` string in the operator's timezone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` string → ISO timestamp (null when empty/invalid). */
export function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function shift(hours: number) {
  return toLocalInput(new Date(Date.now() + hours * 60 * 60 * 1000).toISOString());
}

export function emptyDraft(): LobbyDraft {
  return {
    title: "",
    subtitle: "",
    description: "",
    tier: "daily",
    banner: "lime",
    mode: "TPP SQUAD",
    map: "ERANGEL · MIRAMAR",
    start: shift(2),
    end: shift(4),
    closes: shift(1.5),
    entryFee: "60",
    prizePool: "1000",
    perKill: "10",
    totalSlots: "18",
    matchesCount: "3",
    status: "open",
    featured: false,
  };
}

export function draftFromScrim(scrim: EditableScrim): LobbyDraft {
  return {
    title: scrim.title,
    subtitle: scrim.subtitle ?? "",
    description: scrim.description ?? "",
    tier: TIERS.includes(scrim.tier as ScrimTier) ? (scrim.tier as ScrimTier) : "daily",
    banner: BANNERS.includes(scrim.banner as BannerTheme)
      ? (scrim.banner as BannerTheme)
      : "lime",
    mode: scrim.mode,
    map: scrim.map,
    start: toLocalInput(scrim.startAt),
    end: toLocalInput(scrim.endAt),
    closes: toLocalInput(scrim.registrationClosesAt),
    entryFee: String(scrim.entryFee),
    prizePool: String(scrim.prizePool),
    perKill: String(scrim.perKill ?? 0),
    totalSlots: String(scrim.totalSlots),
    matchesCount: String(scrim.matchesCount),
    status: scrim.status,
    featured: scrim.featured,
  };
}

/** Draft → the JSON body `scrim.create` / `scrim.save` expect. */
export function draftPayload(draft: LobbyDraft) {
  return {
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    description: draft.description.trim(),
    tier: draft.tier,
    banner: draft.banner,
    mode: draft.mode.trim(),
    map: draft.map.trim(),
    startAt: fromLocalInput(draft.start),
    endAt: fromLocalInput(draft.end),
    registrationClosesAt: fromLocalInput(draft.closes),
    entryFee: Number(draft.entryFee || 0),
    prizePool: Number(draft.prizePool || 0),
    perKill: Number(draft.perKill || 0),
    totalSlots: Number(draft.totalSlots || 0),
    matchesCount: Number(draft.matchesCount || 1),
    featured: draft.featured,
    status: draft.status,
  };
}

/** First problem the operator can see locally; the API re-checks everything. */
export function draftProblem(draft: LobbyDraft) {
  if (draft.title.trim().length < 3) return "Give the lobby a title of at least 3 characters.";
  const start = fromLocalInput(draft.start);
  const end = fromLocalInput(draft.end);
  const closes = fromLocalInput(draft.closes);
  if (!start) return "Pick a kickoff date and time.";
  if (!end) return "Pick an end date and time.";
  if (!closes) return "Pick when registration closes.";
  if (new Date(end) <= new Date(start)) return "The lobby has to end after it starts.";
  if (new Date(closes) > new Date(start)) return "Registration must close on or before kickoff.";
  const slots = Number(draft.totalSlots);
  if (!Number.isFinite(slots) || slots < 2 || slots > 100) return "Slots must be between 2 and 100.";
  return null;
}

export function LobbyEditor({
  open,
  kind,
  draft,
  busy,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  kind: "create" | "edit";
  draft: LobbyDraft;
  busy: boolean;
  error: string | null;
  onChange: (patch: Partial<LobbyDraft>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const problem = draftProblem(draft);
  const saving = kind === "create" ? "Creating…" : "Saving…";

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close lobby editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kind === "create" ? "Create lobby" : "Edit lobby"}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-white/[0.1] bg-[#0a0c0e] shadow-[0_-20px_80px_rgba(0,0,0,0.8)] sm:max-w-3xl sm:rounded-[22px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <div>
            <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.16em] text-violet">
              <CalendarClock className="size-3" />
              {kind === "create" ? "New event" : "Edit event"}
            </p>
            <h2 className="font-display mt-1 text-[22px] font-bold uppercase leading-none tracking-[-0.03em] text-mist">
              {kind === "create" ? "Create lobby" : draft.title || "Lobby"}
            </h2>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
              {kind === "create"
                ? "Goes live on the scrims board as soon as you save"
                : "Changes publish immediately — players see them on refresh"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-muted transition hover:border-white/25 hover:text-mist"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          <section className="space-y-3">
            <SectionLabel>Basics</SectionLabel>
            <Field label="Title">
              <Input
                value={draft.title}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="DAILY GRIND #129"
                maxLength={80}
              />
            </Field>
            <Field label="Tagline" hint="One line under the title">
              <Input
                value={draft.subtitle}
                onChange={(event) => onChange({ subtitle: event.target.value })}
                placeholder="The 9-to-11 lobby. Bring your A-game."
                maxLength={120}
              />
            </Field>
            <Field label="Description" hint="Shown in The lobby section">
              <Textarea
                value={draft.description}
                onChange={(event) => onChange({ description: event.target.value })}
                placeholder="Three matches, tier-checked squads, live marshals…"
                maxLength={600}
                rows={3}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Series">
                <Select
                  value={draft.tier}
                  onChange={(event) => onChange({ tier: event.target.value as ScrimTier })}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Banner">
                <Select
                  value={draft.banner}
                  onChange={(event) => onChange({ banner: event.target.value as BannerTheme })}
                >
                  {BANNERS.map((banner) => (
                    <option key={banner} value={banner}>
                      {banner.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(event) => onChange({ status: event.target.value as ScrimStatus })}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mode">
                <Input
                  value={draft.mode}
                  onChange={(event) => onChange({ mode: event.target.value })}
                  placeholder="TPP SQUAD"
                  maxLength={30}
                />
              </Field>
              <Field label="Maps">
                <Input
                  value={draft.map}
                  onChange={(event) => onChange({ map: event.target.value })}
                  placeholder="ERANGEL · MIRAMAR"
                  maxLength={60}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel>Schedule · your local time</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Kickoff">
                <Input
                  type="datetime-local"
                  value={draft.start}
                  onChange={(event) => onChange({ start: event.target.value })}
                />
              </Field>
              <Field label="Ends">
                <Input
                  type="datetime-local"
                  value={draft.end}
                  onChange={(event) => onChange({ end: event.target.value })}
                />
              </Field>
              <Field label="Registration closes">
                <Input
                  type="datetime-local"
                  value={draft.closes}
                  onChange={(event) => onChange({ closes: event.target.value })}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel>Money</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Entry fee ₹" hint="Per squad">
                <Input
                  type="number"
                  min={0}
                  value={draft.entryFee}
                  onChange={(event) => onChange({ entryFee: event.target.value })}
                />
              </Field>
              <Field label="Prize pool ₹">
                <Input
                  type="number"
                  min={0}
                  value={draft.prizePool}
                  onChange={(event) => onChange({ prizePool: event.target.value })}
                />
              </Field>
              <Field label="Per kill ₹">
                <Input
                  type="number"
                  min={0}
                  value={draft.perKill}
                  onChange={(event) => onChange({ perKill: event.target.value })}
                />
              </Field>
            </div>
            {kind === "create" ? (
              <p className="text-[9px] leading-relaxed text-muted/60">
                Prize split is generated automatically: 50% / 30% / 20% to the top three, rounded to
                ₹10. Fine-tune it later from the database if the lobby has a custom structure.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <SectionLabel>Capacity</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Slots">
                <Input
                  type="number"
                  min={2}
                  max={100}
                  value={draft.totalSlots}
                  onChange={(event) => onChange({ totalSlots: event.target.value })}
                />
              </Field>
              <Field label="Matches">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={draft.matchesCount}
                  onChange={(event) => onChange({ matchesCount: event.target.value })}
                />
              </Field>
              <Field label="Home carousel">
                <button
                  type="button"
                  onClick={() => onChange({ featured: !draft.featured })}
                  className={cn(
                    "flex h-12 w-full items-center justify-between rounded-xl border px-3.5 text-[10px] font-bold uppercase tracking-[0.08em] transition",
                    draft.featured
                      ? "border-violet/40 bg-violet/[0.07] text-violet"
                      : "border-line bg-ink/70 text-muted",
                  )}
                >
                  {draft.featured ? "Featured" : "Standard"}
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md border text-[9px]",
                      draft.featured
                        ? "border-violet/40 bg-violet text-ink"
                        : "border-white/15",
                    )}
                  >
                    {draft.featured ? "★" : ""}
                  </span>
                </button>
              </Field>
            </div>
          </section>

          {problem || error ? (
            <p className="rounded-xl border border-orange/25 bg-orange/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-[#ffaf9b]">
              {error ?? problem}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-black/20 px-4 py-3 sm:px-5">
          <Badge tone="outline" className="hidden sm:inline-flex">
            IST · prices in ₹
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className={buttonClass("ghost", "md")}>
              Cancel
            </button>
            <Button onClick={onSave} disabled={busy || Boolean(problem)}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {busy ? saving : kind === "create" ? "Create lobby" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.16em] text-muted/60">
      <span className="h-px w-3 bg-white/20" />
      {children}
    </p>
  );
}
