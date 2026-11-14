import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/config";
import { DEMO_LEAGUE, DEMO_SCRIMS, DEMO_STANDINGS, DEMO_STATS, getDemoScrim } from "@/lib/demo/data";
import type {
  Match,
  Prize,
  Scrim,
  ScrimStatus,
  SeasonStanding,
  SlotTeam,
  StandingsData,
} from "@/lib/types";
import { computeStandings } from "@/lib/utils";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServer() {
  if (!isSupabaseConfigured()) return null;
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}

interface SlotRow {
  slot_no: number;
  team_name: string;
  team_tag: string;
  logo_color: string | null;
  status: string;
}

interface ScrimRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  game: string;
  mode: string;
  map: string;
  tier: Scrim["tier"];
  banner: Scrim["banner"];
  start_at: string;
  end_at: string;
  registration_closes_at: string;
  entry_fee: number;
  prize_pool: number;
  per_kill: number | null;
  total_slots: number;
  status: ScrimStatus;
  featured: boolean;
  matches_count: number;
  rules: string[] | null;
  prizes: Prize[] | string | null;
}

function parsePrizes(value: ScrimRow["prizes"]): Prize[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Prize[];
    } catch {
      return [];
    }
  }
  return value;
}

function mapScrim(row: ScrimRow, slotRows: SlotRow[] = []): Scrim {
  const slots: SlotTeam[] = slotRows
    .map((slot) => ({
      slot: slot.slot_no,
      name: slot.team_name,
      tag: slot.team_tag,
      logoColor: slot.logo_color ?? "#C8FF3D",
      status: "confirmed" as const,
    }))
    .sort((a, b) => a.slot - b.slot);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    game: row.game,
    mode: row.mode,
    map: row.map,
    tier: row.tier,
    banner: row.banner,
    startAt: row.start_at,
    endAt: row.end_at,
    registrationClosesAt: row.registration_closes_at,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
    perKill: row.per_kill,
    totalSlots: row.total_slots,
    filledSlots: slots.length,
    status: row.status,
    featured: row.featured,
    matchesCount: row.matches_count,
    roomId: null,
    roomPass: null,
    rules: row.rules ?? [],
    prizes: parsePrizes(row.prizes),
    slots,
  };
}

const SCRIM_COLUMNS =
  "id, slug, title, subtitle, description, game, mode, map, tier, banner, start_at, end_at, registration_closes_at, entry_fee, prize_pool, per_kill, total_slots, status, featured, matches_count, rules, prizes";

const SLOT_COLUMNS = "scrim_id, slot_no, team_name, team_tag, logo_color";

type SlotWithScrim = SlotRow & { scrim_id: string };

async function attachSlots(
  supabase: SupabaseClient,
  rows: ScrimRow[],
): Promise<Map<string, SlotRow[]>> {
  const grouped = new Map<string, SlotRow[]>();
  if (!rows.length) return grouped;
  const { data, error } = await supabase
    .from("public_slots")
    .select(SLOT_COLUMNS)
    .in(
      "scrim_id",
      rows.map((row) => row.id),
    );
  if (error) {
    console.error("[slots] could not load slot board:", error.message);
    return grouped;
  }
  for (const slot of (data as unknown as SlotWithScrim[] | null) ?? []) {
    const bucket = grouped.get(slot.scrim_id) ?? [];
    bucket.push(slot);
    grouped.set(slot.scrim_id, bucket);
  }
  return grouped;
}

export async function getScrims(): Promise<Scrim[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return DEMO_SCRIMS;

  const { data, error } = await supabase
    .from("scrims")
    .select(SCRIM_COLUMNS)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("[scrims] falling back to demo data:", error.message);
    return DEMO_SCRIMS;
  }
  if (!data?.length) return DEMO_SCRIMS;

  const rows = data as unknown as ScrimRow[];
  const slots = await attachSlots(supabase, rows);
  return rows.map((row) => mapScrim(row, slots.get(row.id) ?? []));
}

export async function getScrimBySlug(slug: string): Promise<Scrim | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return getDemoScrim(slug);

  const { data, error } = await supabase
    .from("scrims")
    .select(SCRIM_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[scrim] falling back to demo data:", error.message);
    return getDemoScrim(slug);
  }
  if (!data) return null;
  const row = data as unknown as ScrimRow;
  const slots = await attachSlots(supabase, [row]);
  return mapScrim(row, slots.get(row.id) ?? []);
}

interface ResultRow {
  team_id: string;
  placement: number;
  kills: number;
  points: number;
  teams: { name: string; tag: string; logo_color: string | null } | null;
}

interface MatchRow {
  id: string;
  match_no: number;
  map: string;
  match_results: ResultRow[] | null;
}

export async function getStandings(slug: string): Promise<StandingsData | null> {
  const scrim = await getScrimBySlug(slug);
  if (!scrim) return null;

  const supabase = getSupabaseServer();
  if (!supabase) {
    if (DEMO_STANDINGS.scrim.slug === slug) return DEMO_STANDINGS;
    return { scrim, matches: [], standings: [] };
  }

  const { data, error } = await supabase
    .from("matches")
    .select("id, match_no, map, match_results(team_id, placement, kills, points, teams(name, tag, logo_color))")
    .eq("scrim_id", scrim.id)
    .order("match_no", { ascending: true });

  if (error) {
    console.error("[standings] falling back to demo data:", error.message);
    if (DEMO_STANDINGS.scrim.slug === slug) return DEMO_STANDINGS;
    return { scrim, matches: [], standings: [] };
  }

  const matches: Match[] = ((data as unknown as MatchRow[] | null) ?? []).map((row) => ({
    id: row.id,
    matchNo: row.match_no,
    map: row.map,
    results: (row.match_results ?? [])
      .map((result) => ({
        teamId: result.team_id,
        name: result.teams?.name ?? "Unknown",
        tag: result.teams?.tag ?? "FE",
        logoColor: result.teams?.logo_color ?? "#8B939E",
        placement: result.placement,
        kills: result.kills,
        points: result.points,
      }))
      .sort((a, b) => a.placement - b.placement),
  }));

  return { scrim, matches, standings: computeStandings(matches) };
}

export async function getLeague(): Promise<SeasonStanding[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return DEMO_LEAGUE;

  const { data, error } = await supabase
    .from("season_standings")
    .select("team_id, name, tag, logo_color, events, wins, kills, points")
    .order("points", { ascending: false })
    .limit(50);

  if (error || !data?.length) return DEMO_LEAGUE;

  return (
    data as unknown as Array<{
      team_id: string;
      name: string;
      tag: string;
      logo_color: string | null;
      events: number;
      wins: number;
      kills: number;
      points: number;
    }>
  ).map((row, index) => ({
    rank: index + 1,
    teamId: row.team_id,
    name: row.name,
    tag: row.tag,
    logoColor: row.logo_color ?? "#C8FF3D",
    events: Number(row.events ?? 0),
    wins: Number(row.wins ?? 0),
    kills: Number(row.kills ?? 0),
    points: Number(row.points ?? 0),
  }));
}

export async function getPlatformStats() {
  const supabase = getSupabaseServer();
  if (!supabase) return DEMO_STATS;

  const [teams, players, matches, payouts] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("registrations").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("scrims").select("prize_pool").eq("status", "completed"),
  ]);

  if (teams.error || players.error || matches.error || payouts.error) {
    return DEMO_STATS;
  }

  return {
    teams: teams.count ?? 0,
    matches: matches.count ?? 0,
    prize: (payouts.data ?? []).reduce(
      (sum: number, row: { prize_pool: number }) => sum + Number(row.prize_pool ?? 0),
      0,
    ),
    players: (players.count ?? 0) * 4,
    slotsBookedToday: players.count ?? 0,
    activeLobbies: 1,
  };
}
