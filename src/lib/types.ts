export type ScrimStatus = "open" | "full" | "live" | "completed" | "cancelled";
export type ScrimTier = "daily" | "weekly" | "premium" | "free";
export type BannerTheme = "lime" | "ember" | "violet" | "ice";

export type MemberRole = "IGL" | "Assaulter" | "Support" | "Sniper" | "Substitute";

export interface TeamMember {
  id?: string;
  ign: string;
  uid: string;
  role: MemberRole;
  isSub?: boolean;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  ownerId?: string | null;
  whatsapp?: string | null;
  logoColor: string;
  members: TeamMember[];
  createdAt?: string;
}

export interface SlotTeam {
  slot: number;
  teamId?: string | null;
  name: string;
  tag: string;
  logoColor: string;
  status?: RegistrationStatus;
  isMine?: boolean;
}

export interface Prize {
  place: string;
  amount: number;
}

export interface Scrim {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  game: string;
  mode: string;
  map: string;
  tier: ScrimTier;
  banner: BannerTheme;
  startAt: string;
  endAt: string;
  registrationClosesAt: string;
  entryFee: number;
  prizePool: number;
  perKill: number | null;
  totalSlots: number;
  filledSlots: number;
  status: ScrimStatus;
  featured: boolean;
  matchesCount: number;
  roomId: string | null;
  roomPass: string | null;
  rules: string[];
  prizes: Prize[];
  slots: SlotTeam[];
}

export type RegistrationStatus =
  | "pending_payment"
  | "awaiting_verification"
  | "confirmed"
  | "cancelled"
  | "waitlist";

export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "refunded";

export interface Registration {
  id: string;
  scrimId: string;
  scrimSlug: string;
  scrimTitle: string;
  scrimStartAt: string;
  scrimStatus: ScrimStatus;
  teamId: string;
  teamName: string;
  teamTag: string;
  logoColor: string;
  slot: number | null;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  dropLocation: string;
  whatsapp: string;
  roster: TeamMember[];
  orderId?: string | null;
  roomId?: string | null;
  roomPass?: string | null;
  createdAt: string;
}

export interface MatchTeamResult {
  teamId: string;
  name: string;
  tag: string;
  logoColor: string;
  placement: number;
  kills: number;
  points: number;
}

export interface Match {
  id: string;
  matchNo: number;
  map: string;
  results: MatchTeamResult[];
}

export interface StandingRow {
  rank: number;
  teamId: string;
  name: string;
  tag: string;
  logoColor: string;
  played: number;
  wins: number;
  kills: number;
  placementPoints: number;
  total: number;
}

export interface StandingsData {
  scrim: Scrim;
  matches: Match[];
  standings: StandingRow[];
}

export interface SeasonStanding {
  rank: number;
  teamId: string;
  name: string;
  tag: string;
  logoColor: string;
  events: number;
  wins: number;
  kills: number;
  points: number;
}

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: "player" | "admin";
  createdAt?: string;
}

export interface RegistrationDraft {
  scrim: Scrim;
  team: Team;
  dropLocation: string;
  whatsapp: string;
  preferredSlot?: number | null;
}

export type PaymentProvider = "demo" | "youpi" | "upi";

export interface StandingSeedTeam {
  id: string;
  name: string;
  tag: string;
  logoColor: string;
}
