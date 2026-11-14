import type { BannerTheme, ScrimStatus, ScrimTier } from "./types";

export const SCRIM_STATUSES: ScrimStatus[] = [
  "open",
  "full",
  "live",
  "completed",
  "cancelled",
];

export const SCRIM_TIERS: ScrimTier[] = ["daily", "weekly", "premium", "free"];

export const BANNER_THEMES: BannerTheme[] = ["lime", "ember", "violet", "ice"];

export interface ScrimInput {
  title: string;
  subtitle: string | null;
  description: string | null;
  tier: ScrimTier;
  banner: BannerTheme;
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
  featured: boolean;
  status: ScrimStatus;
}

export type ScrimInputResult =
  | { ok: true; input: ScrimInput }
  | { ok: false; error: string };

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function optional(value: unknown, max: number) {
  const clean = typeof value === "string" ? value.trim().slice(0, max) : "";
  return clean ? clean : null;
}

function integer(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
}

function timestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Lowercase, dash-separated, url-safe. Falls back to a timestamp for emoji-only titles. */
export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base.length >= 2 ? base : `lobby-${Date.now().toString(36)}`;
}

/** Appends -2, -3, … until the slug is free. */
export function uniqueSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Split a prize pool 50/30/20, rounded to ₹10 with the remainder going to 1st. */
export function defaultPrizes(prizePool: number) {
  if (prizePool <= 0) return [];
  const second = Math.round((prizePool * 0.3) / 10) * 10;
  const third = Math.round((prizePool * 0.2) / 10) * 10;
  const first = Math.max(0, prizePool - second - third);
  return [
    { place: "1ST", amount: first },
    { place: "2ND", amount: second },
    { place: "3RD", amount: third },
  ].filter((prize) => prize.amount > 0);
}

/**
 * Validates the full lobby payload used by both `scrim.create` and `scrim.save`.
 * Returns a normalised object (trimmed strings, ISO timestamps, integers) or the
 * first human-readable problem.
 */
export function parseScrimInput(raw: Record<string, unknown>): ScrimInputResult {
  const title = text(raw.title, 80);
  if (title.length < 3) return { ok: false, error: "Give the lobby a title (3–80 characters)." };

  const tier = String(raw.tier ?? "daily") as ScrimTier;
  if (!SCRIM_TIERS.includes(tier)) {
    return { ok: false, error: `Tier must be one of ${SCRIM_TIERS.join(", ")}.` };
  }

  const banner = String(raw.banner ?? "lime") as BannerTheme;
  if (!BANNER_THEMES.includes(banner)) {
    return { ok: false, error: `Banner must be one of ${BANNER_THEMES.join(", ")}.` };
  }

  const status = String(raw.status ?? "open") as ScrimStatus;
  if (!SCRIM_STATUSES.includes(status)) {
    return { ok: false, error: `Status must be one of ${SCRIM_STATUSES.join(", ")}.` };
  }

  const mode = text(raw.mode, 30) || "TPP SQUAD";
  const map = text(raw.map, 60) || "ERANGEL · MIRAMAR";

  const startAt = timestamp(raw.startAt);
  const endAt = timestamp(raw.endAt);
  const registrationClosesAt = timestamp(raw.registrationClosesAt);

  if (!startAt) return { ok: false, error: "Pick a kickoff date and time." };
  if (!endAt) return { ok: false, error: "Pick an end date and time." };
  if (!registrationClosesAt) return { ok: false, error: "Pick when registration closes." };

  if (new Date(endAt) <= new Date(startAt)) {
    return { ok: false, error: "The lobby has to end after it starts." };
  }
  if (new Date(registrationClosesAt) > new Date(startAt)) {
    return { ok: false, error: "Registration must close on or before kickoff." };
  }

  const entryFee = integer(raw.entryFee);
  if (!Number.isFinite(entryFee) || entryFee < 0 || entryFee > 100_000) {
    return { ok: false, error: "Entry fee must be between ₹0 and ₹1,00,000." };
  }

  const prizePool = integer(raw.prizePool);
  if (!Number.isFinite(prizePool) || prizePool < 0 || prizePool > 10_000_000) {
    return { ok: false, error: "Prize pool must be between ₹0 and ₹1,00,00,000." };
  }

  const perKill = integer(raw.perKill ?? 0);
  if (!Number.isFinite(perKill) || perKill < 0 || perKill > 100_000) {
    return { ok: false, error: "Per-kill prize must be a positive number." };
  }

  const totalSlots = integer(raw.totalSlots);
  if (!Number.isFinite(totalSlots) || totalSlots < 2 || totalSlots > 100) {
    return { ok: false, error: "Slots must be between 2 and 100." };
  }

  const matchesCount = integer(raw.matchesCount ?? 1);
  if (!Number.isFinite(matchesCount) || matchesCount < 1 || matchesCount > 10) {
    return { ok: false, error: "Matches must be between 1 and 10." };
  }

  return {
    ok: true,
    input: {
      title,
      subtitle: optional(raw.subtitle, 120),
      description: optional(raw.description, 600),
      tier,
      banner,
      mode,
      map,
      startAt,
      endAt,
      registrationClosesAt,
      entryFee,
      prizePool,
      perKill,
      totalSlots,
      matchesCount,
      featured: raw.featured === true,
      status,
    },
  };
}
