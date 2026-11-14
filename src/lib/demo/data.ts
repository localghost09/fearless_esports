import type {
  BannerTheme,
  Match,
  Prize,
  Scrim,
  ScrimTier,
  SeasonStanding,
  SlotTeam,
  StandingSeedTeam,
  StandingsData,
  Team,
} from "@/lib/types";
import { atIST, computeStandings, nextIST } from "@/lib/utils";

export const DEMO_TEAM_SEEDS: StandingSeedTeam[] = [
  { id: "team-phantom", name: "PHANTOM", tag: "PHM", logoColor: "#C8FF3D" },
  { id: "team-nova", name: "NOVA", tag: "NVA", logoColor: "#8B7CFF" },
  { id: "team-rift", name: "RIFT ESPORTS", tag: "RFT", logoColor: "#C8FF3D" },
  { id: "team-vyper", name: "VYPER", tag: "VYP", logoColor: "#FF6B3D" },
  { id: "team-titan", name: "TITAN", tag: "TTN", logoColor: "#56E1FF" },
  { id: "team-echo", name: "ECHO", tag: "ECH", logoColor: "#FF4D8D" },
  { id: "team-blaze", name: "BLAZE", tag: "BLZ", logoColor: "#FFB03A" },
  { id: "team-omen", name: "OMEN", tag: "OMN", logoColor: "#B7F26D" },
  { id: "team-havoc", name: "HAVOC", tag: "HVC", logoColor: "#FF7A00" },
  { id: "team-zero", name: "ZERO", tag: "ZRO", logoColor: "#E8ECF1" },
  { id: "team-axiom", name: "AXIOM", tag: "AXM", logoColor: "#6C8CFF" },
  { id: "team-fury", name: "FURY", tag: "FRY", logoColor: "#FF3D3D" },
  { id: "team-lynx", name: "LYNX", tag: "LNX", logoColor: "#7AF2B0" },
  { id: "team-orbit", name: "ORBIT", tag: "ORB", logoColor: "#C4A7FF" },
  { id: "team-klash", name: "KLASH", tag: "KLS", logoColor: "#FFD166" },
  { id: "team-spectre", name: "SPECTRE", tag: "SPC", logoColor: "#9BA8B8" },
  { id: "team-cipher", name: "CIPHER", tag: "CPH", logoColor: "#5EEAD4" },
  { id: "team-ronin", name: "RONIN", tag: "RNN", logoColor: "#F472B6" },
];

export const DEMO_TEAM: Team = {
  id: "team-rift",
  name: "RIFT ESPORTS",
  tag: "RFT",
  logoColor: "#C8FF3D",
  whatsapp: "+919876543210",
  members: [
    { id: "m1", ign: "Rift•Viper", uid: "5123456789", role: "IGL" },
    { id: "m2", ign: "Rift•Ace", uid: "5123456790", role: "Assaulter" },
    { id: "m3", ign: "Rift•Nyx", uid: "5123456791", role: "Support" },
    { id: "m4", ign: "Rift•Zed", uid: "5123456792", role: "Sniper" },
    { id: "m5", ign: "Rift•Echo", uid: "5123456793", role: "Substitute", isSub: true },
  ],
};

const RULES = [
  "Squad must join the custom room 10 minutes before the scheduled start. Late entries forfeit the slot.",
  "Only registered BGMI IDs may play. Impersonation or account sharing means instant disqualification.",
  "No emulators, controllers, teaming, or third-party tools. Screen recording may be requested for verification.",
  "One team per slot. A team may not enter the same scrim twice with a different roster.",
  "POV clips must be kept for 24 hours after the match. Failure to submit on request can void results.",
  "Abusive comms, stream sniping and targeted griefing carry a 1-event ban. Repeat offences are permanent.",
  "Prize payouts go to the registered IGL's UPI within 24 hours of verified results.",
  "Admin decisions on disputes are final. Submit clips within 30 minutes of match end.",
];

function slotSet(filled: number, total: number, offset: number) {
  const slots: number[] = [];
  for (let i = 0; i < total * 2 && slots.length < filled; i += 1) {
    const slot = ((i * 7 + offset) % total) + 1;
    if (!slots.includes(slot)) slots.push(slot);
  }
  return slots.sort((a, b) => a - b);
}

function buildSlots(
  filled: number,
  total: number,
  offset: number,
  includeCaptain = true,
): SlotTeam[] {
  // Open lobbies must not pre-seed the demo captain: the signed-in squad would
  // otherwise look registered in a lobby it can still book, producing a
  // duplicate team on the slot board. Live and completed lobbies keep it for
  // a realistic board and matching results.
  const pool = includeCaptain
    ? DEMO_TEAM_SEEDS
    : DEMO_TEAM_SEEDS.filter((team) => team.id !== DEMO_TEAM.id);

  return slotSet(filled, total, offset).map((slot, index) => {
    const team = pool[(offset + index) % pool.length];
    return {
      slot,
      teamId: team.id,
      name: team.name,
      tag: team.tag,
      logoColor: team.logoColor,
      status: "confirmed" as const,
    };
  });
}

function prizes(first: number, second: number, third: number): Prize[] {
  return [
    { place: "1ST", amount: first },
    { place: "2ND", amount: second },
    { place: "3RD", amount: third },
  ];
}

interface ScrimSeed {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tier: ScrimTier;
  banner: BannerTheme;
  startAt: string;
  endAt: string;
  entryFee: number;
  prizePool: number;
  totalSlots: number;
  filled: number;
  matchesCount: number;
  featured?: boolean;
  live?: boolean;
  completed?: boolean;
  roomId?: string;
  roomPass?: string;
  prizes: Prize[];
  perKill?: number;
}

function buildScrim(seed: ScrimSeed): Scrim {
  const start = new Date(seed.startAt);
  const filledSlots = seed.filled;
  const status = seed.completed
    ? "completed"
    : seed.live
      ? "live"
      : filledSlots >= seed.totalSlots
        ? "full"
        : "open";

  return {
    id: `scrim-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    subtitle: seed.subtitle,
    description: seed.description,
    game: "BGMI",
    mode: "TPP SQUAD",
    map: seed.slug.includes("weekend") ? "ERANGEL · MIRAMAR · SANHOK" : "ERANGEL · MIRAMAR",
    tier: seed.tier,
    banner: seed.banner,
    startAt: seed.startAt,
    endAt: seed.endAt,
    registrationClosesAt: new Date(start.getTime() - 20 * 60_000).toISOString(),
    entryFee: seed.entryFee,
    prizePool: seed.prizePool,
    perKill: seed.perKill ?? 10,
    totalSlots: seed.totalSlots,
    filledSlots,
    status,
    featured: seed.featured ?? false,
    matchesCount: seed.matchesCount,
    roomId: seed.roomId ?? null,
    roomPass: seed.roomPass ?? null,
    rules: RULES,
    prizes: seed.prizes,
    slots: seed.live
      ? buildSlots(seed.totalSlots, seed.totalSlots, 2, true)
      : // Completed lobbies have published results, so seed the first N teams
        // from the same pool the results use. A rotated offset would field
        // squads with no result rows and leave result-only squads out.
        buildSlots(
          filledSlots,
          seed.totalSlots,
          seed.completed ? 0 : seed.slug.length,
          Boolean(seed.completed),
        ),
  };
}

const liveStart = new Date(Date.now() - 38 * 60_000);
const liveEnd = new Date(Date.now() + 82 * 60_000);

const featuredStart = nextIST(21, 0);
const featuredEnd = new Date(new Date(featuredStart).getTime() + 2 * 3_600_000).toISOString();
const advanceStart = nextIST(22, 0);
const advanceEnd = new Date(new Date(advanceStart).getTime() + 2 * 3_600_000).toISOString();
const freeStart = nextIST(19, 0);
const freeEnd = new Date(new Date(freeStart).getTime() + 100 * 60_000).toISOString();
const midnightStart = nextIST(23, 30);
const midnightEnd = new Date(new Date(midnightStart).getTime() + 90 * 60_000).toISOString();
const weeklyStart = atIST(3, 20, 0);
const weeklyEnd = new Date(new Date(weeklyStart).getTime() + 3.5 * 3_600_000).toISOString();
const finalsStart = atIST(-1, 21, 0);
const finalsEnd = new Date(new Date(finalsStart).getTime() + 2 * 3_600_000).toISOString();

export const DEMO_SCRIMS: Scrim[] = [
  buildScrim({
    slug: "daily-grind-128",
    title: "DAILY GRIND #128",
    subtitle: "The 9-to-11 lobby. Bring your A-game.",
    description:
      "Our flagship nightly scrim. Tier-checked squads, three matches, live admin marshals and a flat ₹1,000 pot. This is where the ladder gets real.",
    tier: "daily",
    banner: "lime",
    startAt: featuredStart,
    endAt: featuredEnd,
    entryFee: 60,
    prizePool: 1000,
    totalSlots: 18,
    filled: 14,
    matchesCount: 3,
    featured: true,
    prizes: prizes(500, 300, 200),
    perKill: 10,
  }),
  buildScrim({
    slug: "advance-lobby-44",
    title: "ADVANCE LOBBY",
    subtitle: "For squads that already know the drill.",
    description:
      "Higher entry, sharper lobbies. Limited to 16 invited and tier-verified teams with three matches on Erangel and Miramar.",
    tier: "premium",
    banner: "violet",
    startAt: advanceStart,
    endAt: advanceEnd,
    entryFee: 80,
    prizePool: 1200,
    totalSlots: 16,
    filled: 11,
    matchesCount: 3,
    prizes: prizes(600, 400, 200),
    perKill: 12,
  }),
  buildScrim({
    slug: "free-grind-77",
    title: "FREE GRIND",
    subtitle: "Zero pressure. Full points.",
    description:
      "A low-stakes practice lobby for new squads. Two matches, relaxed pacing, and a small prize on the line. Perfect first scrim.",
    tier: "free",
    banner: "ice",
    startAt: freeStart,
    endAt: freeEnd,
    entryFee: 10,
    prizePool: 100,
    totalSlots: 16,
    filled: 13,
    matchesCount: 2,
    prizes: prizes(100, 0, 0),
    perKill: 5,
  }),
  buildScrim({
    slug: "weekend-war-5k",
    title: "WEEKEND WAR 5K",
    subtitle: "Five matches. One weekend. ₹5,000.",
    description:
      "The weekly flagship. Five matches across Erangel, Miramar and Sanhok with the biggest pot on the calendar. Top 18 squads only.",
    tier: "weekly",
    banner: "ember",
    startAt: weeklyStart,
    endAt: weeklyEnd,
    entryFee: 399,
    prizePool: 5000,
    totalSlots: 18,
    filled: 6,
    matchesCount: 5,
    prizes: prizes(2500, 1500, 1000),
    perKill: 15,
  }),
  buildScrim({
    slug: "midnight-mayhem-09",
    title: "MIDNIGHT MAYHEM",
    subtitle: "When the lobby sleeps, the grind begins.",
    description:
      "Late-night custom room for night owls. Two fast matches, no stream, pure scrim. 18 slots, first come first served.",
    tier: "daily",
    banner: "violet",
    startAt: midnightStart,
    endAt: midnightEnd,
    entryFee: 50,
    prizePool: 800,
    totalSlots: 18,
    filled: 9,
    matchesCount: 2,
    prizes: prizes(400, 250, 150),
    perKill: 8,
  }),
  buildScrim({
    slug: "daily-grind-live",
    title: "DAILY GRIND — LIVE LOBBY",
    subtitle: "Match one is underway. Slot list locked.",
    description:
      "The lobby is live. Watch the points table update after every match. Registered teams can find room credentials in My Matches.",
    tier: "daily",
    banner: "lime",
    startAt: liveStart.toISOString(),
    endAt: liveEnd.toISOString(),
    entryFee: 60,
    prizePool: 1000,
    totalSlots: 18,
    filled: 18,
    matchesCount: 3,
    live: true,
    roomId: "884 219",
    roomPass: "FORGE9",
    prizes: prizes(500, 300, 200),
    perKill: 10,
  }),
  buildScrim({
    slug: "nightfall-finals",
    title: "NIGHTFALL FINALS",
    subtitle: "The season closer. 16 squads. One crown.",
    description:
      "Three matches decided the Nightfall crown. Full points table, match-wise results and MVP stats are live below.",
    tier: "premium",
    banner: "ember",
    startAt: finalsStart,
    endAt: finalsEnd,
    entryFee: 149,
    prizePool: 10000,
    totalSlots: 16,
    filled: 16,
    matchesCount: 3,
    completed: true,
    prizes: prizes(5000, 3000, 2000),
    perKill: 15,
  }),
];

const ORDERS = [
  [
    "team-phantom",
    "team-rift",
    "team-nova",
    "team-vyper",
    "team-titan",
    "team-echo",
    "team-blaze",
    "team-omen",
    "team-havoc",
    "team-zero",
    "team-axiom",
    "team-fury",
    "team-lynx",
    "team-orbit",
    "team-klash",
    "team-spectre",
  ],
  [
    "team-nova",
    "team-vyper",
    "team-phantom",
    "team-titan",
    "team-echo",
    "team-blaze",
    "team-rift",
    "team-omen",
    "team-zero",
    "team-havoc",
    "team-axiom",
    "team-fury",
    "team-orbit",
    "team-lynx",
    "team-spectre",
    "team-klash",
  ],
  [
    "team-rift",
    "team-phantom",
    "team-havoc",
    "team-nova",
    "team-vyper",
    "team-titan",
    "team-echo",
    "team-blaze",
    "team-omen",
    "team-zero",
    "team-axiom",
    "team-fury",
    "team-lynx",
    "team-orbit",
    "team-klash",
    "team-spectre",
  ],
];

const KILLS = [
  [7, 5, 6, 4, 3, 4, 2, 3, 5, 2, 3, 1, 2, 1, 1, 0],
  [4, 3, 4, 6, 3, 2, 3, 2, 2, 4, 1, 2, 0, 1, 0, 1],
  [5, 8, 3, 3, 2, 4, 3, 2, 4, 1, 2, 1, 1, 1, 0, 0],
];

const teamMap = new Map(DEMO_TEAM_SEEDS.map((team) => [team.id, team]));

export const DEMO_MATCHES: Match[] = ORDERS.map((order, matchIndex) => ({
  id: `match-final-${matchIndex + 1}`,
  matchNo: matchIndex + 1,
  map: ["ERANGEL", "MIRAMAR", "SANHOK"][matchIndex],
  results: order.map((teamId, index) => {
    const team = teamMap.get(teamId)!;
    return {
      teamId,
      name: team.name,
      tag: team.tag,
      logoColor: team.logoColor,
      placement: index + 1,
      kills: KILLS[matchIndex][index],
      points: 0,
    };
  }),
})).map((match) => ({
  ...match,
  results: match.results.map((result) => ({
    ...result,
    points:
      result.kills +
      [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0][result.placement - 1],
  })),
}));

export const DEMO_FINALS = DEMO_SCRIMS.find((scrim) => scrim.slug === "nightfall-finals")!;

export const DEMO_STANDINGS: StandingsData = {
  scrim: DEMO_FINALS,
  matches: DEMO_MATCHES,
  standings: computeStandings(DEMO_MATCHES),
};

const seasonSeed: Array<[string, number, number, number, number]> = [
  ["team-phantom", 8, 3, 118, 186],
  ["team-nova", 8, 2, 105, 172],
  ["team-rift", 7, 2, 96, 161],
  ["team-vyper", 8, 1, 92, 148],
  ["team-titan", 7, 1, 84, 139],
  ["team-echo", 6, 1, 75, 127],
  ["team-havoc", 7, 0, 71, 118],
  ["team-blaze", 6, 0, 62, 104],
  ["team-omen", 5, 1, 55, 96],
  ["team-zero", 5, 0, 51, 88],
  ["team-axiom", 4, 0, 42, 75],
  ["team-spectre", 4, 0, 33, 61],
];

export const DEMO_LEAGUE: SeasonStanding[] = seasonSeed.map(
  ([teamId, events, wins, kills, points], index) => {
    const team = teamMap.get(teamId)!;
    return {
      rank: index + 1,
      teamId,
      name: team.name,
      tag: team.tag,
      logoColor: team.logoColor,
      events,
      wins,
      kills,
      points,
    };
  },
);

export function getDemoScrim(slug: string) {
  return DEMO_SCRIMS.find((scrim) => scrim.slug === slug) ?? null;
}

export const DEMO_STATS = {
  teams: 3893,
  matches: 15572,
  prize: 497910,
  players: 32616,
  slotsBookedToday: 187,
  activeLobbies: 4,
};
