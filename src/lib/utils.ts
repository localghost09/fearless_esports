import type { Match, StandingRow, TeamMember } from "./types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(value: number) {
  return inr.format(Math.round(value));
}

export function formatAmount(value: number) {
  return inrPrecise.format(value);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
});

const weekdayFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const fullFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

export function formatWeekday(iso: string) {
  return weekdayFmt.format(new Date(iso));
}

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso)).toUpperCase().replace(/\s/g, " ");
}

export function formatFull(iso: string) {
  return fullFmt.format(new Date(iso));
}

export function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const ist = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  if (ist(date) === ist(now)) return "TODAY";
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (ist(date) === ist(tomorrow)) return "TOMORROW";
  return `${formatWeekday(iso).toUpperCase()} ${formatDate(iso).toUpperCase()}`;
}

export function timeUntil(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  return { diff, days, hours, minutes, seconds: Math.floor((abs % 60_000) / 1000) };
}

export function shortCountdown(iso: string, now = Date.now()) {
  const { diff, days, hours, minutes } = timeUntil(iso, now);
  if (diff <= 0) return "LIVE";
  if (days > 0) return `IN ${days}D ${hours}H`;
  if (hours > 0) return `IN ${hours}H ${minutes}M`;
  return `IN ${minutes}M`;
}

export function istDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/** Builds an ISO timestamp for a specific IST wall-clock time, relative to today. */
export function atIST(dayOffset: number, hour: number, minute = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 5, minute - 30)).toISOString();
}

/** Next future occurrence of an IST wall-clock time (today or tomorrow). */
export function nextIST(hour: number, minute = 0, leadMinutes = 75) {
  const today = new Date(atIST(0, hour, minute));
  if (today.getTime() - leadMinutes * 60_000 < Date.now()) {
    return atIST(1, hour, minute);
  }
  return today.toISOString();
}

export function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function placementPoints(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 5;
  if (placement === 4) return 4;
  if (placement === 5) return 3;
  if (placement === 6) return 2;
  if (placement === 7 || placement === 8) return 1;
  return 0;
}

export function computeStandings(matches: Match[]): StandingRow[] {
  const table = new Map<
    string,
    Omit<StandingRow, "rank"> & { order: number }
  >();
  let order = 0;

  for (const match of matches) {
    for (const result of match.results) {
      const row =
        table.get(result.teamId) ??
        ({
          teamId: result.teamId,
          name: result.name,
          tag: result.tag,
          logoColor: result.logoColor,
          played: 0,
          wins: 0,
          kills: 0,
          placementPoints: 0,
          total: 0,
          order: order++,
        } satisfies Omit<StandingRow, "rank"> & { order: number });
      row.played += 1;
      row.wins += result.placement === 1 ? 1 : 0;
      row.kills += result.kills;
      row.placementPoints += placementPoints(result.placement);
      row.total += placementPoints(result.placement) + result.kills;
      table.set(result.teamId, row);
    }
  }

  return Array.from(table.values())
    .sort((a, b) => b.total - a.total || b.kills - a.kills || a.order - b.order)
    .map((row, index) => ({
      teamId: row.teamId,
      name: row.name,
      tag: row.tag,
      logoColor: row.logoColor,
      played: row.played,
      wins: row.wins,
      kills: row.kills,
      placementPoints: row.placementPoints,
      total: row.total,
      rank: index + 1,
    }));
}

export function memberLabel(member: TeamMember) {
  return member.isSub ? "SUB" : member.role;
}

export function normalisePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return value;
}

export function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}TH`;
  if (value % 10 === 1) return `${value}ST`;
  if (value % 10 === 2) return `${value}ND`;
  if (value % 10 === 3) return `${value}RD`;
  return `${value}TH`;
}
