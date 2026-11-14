"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config";
import { DEMO_TEAM } from "@/lib/demo/data";
import { buildSlotMap } from "@/lib/slots";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type {
  MatchTeamResult,
  Profile,
  Registration,
  RegistrationDraft,
  Team,
  TeamMember,
} from "@/lib/types";

const STORAGE_KEY = "fearless-esports:v1";
const LEGACY_STORAGE_KEY = "scrimforge:v1";

const DEMO_PROFILE: Profile = {
  id: "demo-captain",
  name: "Aarav",
  email: "aarav@fearlessesports.gg",
  phone: "+919876543210",
  role: "admin",
};

interface LocalState {
  profile: Profile | null;
  teams: Team[];
  registrations: Registration[];
  resultOverrides: Record<string, MatchTeamResult[]>;
}

const seedState: LocalState = {
  profile: DEMO_PROFILE,
  teams: [DEMO_TEAM],
  registrations: [],
  resultOverrides: {},
};

function readState(): LocalState {
  if (typeof window === "undefined") return seedState;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    return {
      profile: parsed.profile ?? DEMO_PROFILE,
      teams: parsed.teams?.length ? parsed.teams : [DEMO_TEAM],
      registrations: parsed.registrations ?? [],
      resultOverrides: parsed.resultOverrides ?? {},
    };
  } catch {
    return seedState;
  }
}

function writeState(state: LocalState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage full / private mode — the in-memory session still works.
  }
}

interface AppContextValue {
  mode: "demo" | "live";
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  teams: Team[];
  registrations: Registration[];
  resultOverrides: Record<string, MatchTeamResult[]>;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  saveTeam: (team: Team) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<void>;
  createRegistration: (draft: RegistrationDraft) => Promise<Registration>;
  confirmRegistration: (registrationId: string, orderId?: string) => Promise<void>;
  awaitVerification: (registrationId: string, orderId?: string) => Promise<void>;
  cancelRegistration: (registrationId: string) => Promise<void>;
  saveMatchOverride: (matchId: string, results: MatchTeamResult[]) => void;
  resetDemo: () => void;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface TeamRow {
  id: string;
  name: string;
  tag: string;
  whatsapp: string | null;
  logo_color: string | null;
  created_at: string;
  team_members: Array<{
    id: string;
    ign: string;
    uid: string;
    role: string;
    is_sub: boolean | null;
  }>;
}

interface RegistrationRow {
  id: string;
  slot_no: number | null;
  status: Registration["status"];
  payment_status: Registration["paymentStatus"];
  amount: number;
  drop_location: string | null;
  whatsapp: string | null;
  created_at: string;
  scrim_id: string;
  team_id: string;
  teams: {
    name: string;
    tag: string;
    logo_color: string | null;
    team_members:
      | Array<{ ign: string; uid: string; role: string; is_sub: boolean | null }>
      | null;
  } | null;
  scrims: {
    slug: string;
    title: string;
    start_at: string;
    status: Registration["scrimStatus"];
    scrim_rooms:
      | { room_id: string | null; room_pass: string | null }
      | Array<{ room_id: string | null; room_pass: string | null }>
      | null;
  } | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const live = isSupabaseConfigured();
  const [state, setState] = useState<LocalState>(seedState);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const hydrated = useRef(false);

  const commit = useCallback((next: LocalState) => {
    setState(next);
    writeState(next);
  }, []);

  const loadRemote = useCallback(async (activeUser: User) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const [{ data: profileRow }, { data: teamRows }, { data: regRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", activeUser.id).maybeSingle(),
      supabase
        .from("teams")
        .select(
          "id, name, tag, whatsapp, logo_color, created_at, team_members(id, ign, uid, role, is_sub)",
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("registrations")
        .select(
          "id, slot_no, status, payment_status, amount, drop_location, whatsapp, created_at, scrim_id, team_id, teams(name, tag, logo_color, team_members(ign, uid, role, is_sub)), scrims(slug, title, start_at, status, scrim_rooms(room_id, room_pass))",
        )
        .order("created_at", { ascending: false }),
    ]);

    const profile: Profile | null = profileRow
      ? {
          id: profileRow.id,
          name: profileRow.display_name ?? "Player",
          email: activeUser.email ?? null,
          phone: profileRow.phone ?? null,
          role: profileRow.role === "admin" ? "admin" : "player",
          createdAt: profileRow.created_at,
        }
      : {
          id: activeUser.id,
          name:
            (activeUser.user_metadata?.display_name as string | undefined) ??
            activeUser.email?.split("@")[0] ??
            "Player",
          email: activeUser.email ?? null,
          phone: null,
          role: "player",
        };

    const teams: Team[] = ((teamRows as TeamRow[] | null) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      whatsapp: row.whatsapp,
      logoColor: row.logo_color ?? "#C8FF3D",
      createdAt: row.created_at,
      members: (row.team_members ?? []).map((member) => ({
        id: member.id,
        ign: member.ign,
        uid: member.uid,
        role: member.role as TeamMember["role"],
        isSub: member.is_sub ?? false,
      })),
    }));

    const registrations: Registration[] = ((regRows as unknown as RegistrationRow[] | null) ?? [])
      .flatMap((row): Registration[] => {
        const scrim = firstRelation(row.scrims);
        const team = firstRelation(row.teams);
        if (!scrim || !team) return [];
        const room = firstRelation(scrim.scrim_rooms);
        return [
          {
            id: row.id,
            scrimId: row.scrim_id,
            scrimSlug: scrim.slug,
            scrimTitle: scrim.title,
            scrimStartAt: scrim.start_at,
            scrimStatus: scrim.status,
            teamId: row.team_id,
            teamName: team.name,
            teamTag: team.tag,
            logoColor: team.logo_color ?? "#C8FF3D",
            slot: row.slot_no,
            status: row.status,
            paymentStatus: row.payment_status,
            amount: row.amount,
            dropLocation: row.drop_location ?? "",
            whatsapp: row.whatsapp ?? "",
            roster: (team.team_members ?? []).map((member) => ({
              ign: member.ign,
              uid: member.uid,
              role: member.role as TeamMember["role"],
              isSub: member.is_sub ?? false,
            })),
            roomId: room?.room_id ?? null,
            roomPass: room?.room_pass ?? null,
            createdAt: row.created_at,
          },
        ];
      });

    setState((current) => ({ ...current, profile, teams, registrations }));
  }, []);

  useEffect(() => {
    if (!live) {
      const loaded = readState();
      hydrated.current = true;
      setState(loaded);
      setReady(true);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const activeUser = data.session?.user ?? null;
      setUser(activeUser);
      if (activeUser) await loadRemote(activeUser);
      if (!cancelled) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        void loadRemote(activeUser);
      } else if (event === "SIGNED_OUT") {
        setState((current) => ({ ...current, profile: null, teams: [], registrations: [] }));
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [live, loadRemote]);

  const refresh = useCallback(async () => {
    if (live) {
      const supabase = getSupabaseBrowser();
      const activeUser = (await supabase?.auth.getUser())?.data.user;
      if (activeUser) await loadRemote(activeUser);
      return;
    }
    const loaded = readState();
    setState(loaded);
  }, [live, loadRemote]);

  const updateProfile = useCallback(
    async (profile: Profile) => {
      if (!live) {
        commit({ ...state, profile });
        return;
      }
      const supabase = getSupabaseBrowser();
      if (!supabase) return;
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        display_name: profile.name,
        phone: profile.phone,
      });
      if (error) throw error;
      setState((current) => ({ ...current, profile }));
    },
    [commit, live, state],
  );

  const saveTeam = useCallback(
    async (team: Team): Promise<Team> => {
      if (!live) {
        const exists = state.teams.some((item) => item.id === team.id);
        const teams = exists
          ? state.teams.map((item) => (item.id === team.id ? team : item))
          : [...state.teams, team];
        commit({ ...state, teams });
        return team;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data: activeUser } = await supabase.auth.getUser();
      if (!activeUser.user) throw new Error("AUTH_REQUIRED");

      const { error: teamError } = await supabase.from("teams").upsert(
        {
          id: team.id,
          owner_id: activeUser.user.id,
          name: team.name,
          tag: team.tag,
          whatsapp: team.whatsapp ?? null,
          logo_color: team.logoColor,
        },
        { onConflict: "id" },
      );
      if (teamError) throw teamError;

      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team.id);
      if (deleteError) throw deleteError;

      if (team.members.length) {
        const { error: memberError } = await supabase.from("team_members").insert(
          team.members.map((member) => ({
            team_id: team.id,
            ign: member.ign,
            uid: member.uid,
            role: member.role,
            is_sub: Boolean(member.isSub),
          })),
        );
        if (memberError) throw memberError;
      }

      await loadRemote(activeUser.user);
      return team;
    },
    [commit, live, loadRemote, state],
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      if (!live) {
        commit({ ...state, teams: state.teams.filter((team) => team.id !== teamId) });
        return;
      }
      const supabase = getSupabaseBrowser();
      if (!supabase) return;
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
      await refresh();
    },
    [commit, live, refresh, state],
  );

  const createRegistration = useCallback(
    async (draft: RegistrationDraft): Promise<Registration> => {
      const activeReg = state.registrations.find(
        (reg) =>
          reg.scrimId === draft.scrim.id &&
          reg.teamId === draft.team.id &&
          (reg.status === "confirmed" ||
            reg.status === "pending_payment" ||
            reg.status === "awaiting_verification"),
      );
      if (activeReg) return activeReg;

      if (!live) {
        const cells = buildSlotMap(draft.scrim, state.registrations);
        const preferred = draft.preferredSlot
          ? cells.find((cell) => cell.slot === draft.preferredSlot && !cell.team)
          : null;
        const open = preferred ?? cells.find((cell) => !cell.team);
        if (!open) throw new Error("SCRIM_FULL");

        const now = new Date().toISOString();
        const paid = draft.scrim.entryFee === 0;
        const registration: Registration = {
          id: `reg-${crypto.randomUUID()}`,
          scrimId: draft.scrim.id,
          scrimSlug: draft.scrim.slug,
          scrimTitle: draft.scrim.title,
          scrimStartAt: draft.scrim.startAt,
          scrimStatus: draft.scrim.status,
          teamId: draft.team.id,
          teamName: draft.team.name,
          teamTag: draft.team.tag,
          logoColor: draft.team.logoColor,
          slot: open.slot,
          status: paid ? "confirmed" : "pending_payment",
          paymentStatus: paid ? "paid" : "unpaid",
          amount: draft.scrim.entryFee,
          dropLocation: draft.dropLocation,
          whatsapp: draft.whatsapp,
          roster: draft.team.members,
          createdAt: now,
          roomId: draft.scrim.roomId,
          roomPass: draft.scrim.roomPass,
        };
        commit({ ...state, registrations: [registration, ...state.registrations] });
        return registration;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data: activeUser } = await supabase.auth.getUser();
      if (!activeUser.user) throw new Error("AUTH_REQUIRED");

      const { data, error } = await supabase.rpc("book_slot", {
        p_scrim_id: draft.scrim.id,
        p_team_id: draft.team.id,
        p_slot: draft.preferredSlot ?? null,
        p_drop: draft.dropLocation,
        p_whatsapp: draft.whatsapp,
      });
      if (error) throw new Error(error.message);

      const row = (Array.isArray(data) ? data[0] : data) as {
        id: string;
        slot_no: number | null;
        status: Registration["status"];
        payment_status: Registration["paymentStatus"];
      };

      await loadRemote(activeUser.user);

      return {
        id: row.id,
        scrimId: draft.scrim.id,
        scrimSlug: draft.scrim.slug,
        scrimTitle: draft.scrim.title,
        scrimStartAt: draft.scrim.startAt,
        scrimStatus: draft.scrim.status,
        teamId: draft.team.id,
        teamName: draft.team.name,
        teamTag: draft.team.tag,
        logoColor: draft.team.logoColor,
        slot: row.slot_no,
        status: row.status,
        paymentStatus: row.payment_status,
        amount: draft.scrim.entryFee,
        dropLocation: draft.dropLocation,
        whatsapp: draft.whatsapp,
        roster: draft.team.members,
        createdAt: new Date().toISOString(),
        roomId: draft.scrim.roomId,
        roomPass: draft.scrim.roomPass,
      };
    },
    [commit, live, loadRemote, state],
  );

  const updateLocalRegistration = useCallback(
    (registrationId: string, patch: Partial<Registration>) => {
      commit({
        ...state,
        registrations: state.registrations.map((reg) =>
          reg.id === registrationId ? { ...reg, ...patch } : reg,
        ),
      });
    },
    [commit, state],
  );

  const confirmRegistration = useCallback(
    async (registrationId: string, orderId?: string) => {
      if (!live) {
        updateLocalRegistration(registrationId, {
          status: "confirmed",
          paymentStatus: "paid",
          orderId,
        });
        return;
      }
      await refresh();
    },
    [live, refresh, updateLocalRegistration],
  );

  const awaitVerification = useCallback(
    async (registrationId: string, orderId?: string) => {
      if (!live) {
        updateLocalRegistration(registrationId, {
          status: "awaiting_verification",
          paymentStatus: "processing",
          orderId,
        });
        return;
      }
      await refresh();
    },
    [live, refresh, updateLocalRegistration],
  );

  const cancelRegistration = useCallback(
    async (registrationId: string) => {
      if (!live) {
        updateLocalRegistration(registrationId, {
          status: "cancelled",
          paymentStatus: "failed",
        });
        return;
      }
      const supabase = getSupabaseBrowser();
      if (!supabase) return;
      const { error } = await supabase.rpc("cancel_registration", {
        p_registration_id: registrationId,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [live, refresh, updateLocalRegistration],
  );

  const saveMatchOverride = useCallback(
    (matchId: string, results: MatchTeamResult[]) => {
      commit({
        ...state,
        resultOverrides: { ...state.resultOverrides, [matchId]: results },
      });
    },
    [commit, state],
  );

  const resetDemo = useCallback(() => {
    const fresh: LocalState = {
      profile: DEMO_PROFILE,
      teams: [DEMO_TEAM],
      registrations: [],
      resultOverrides: {},
    };
    commit(fresh);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [commit]);

  const signInDemo = useCallback(() => {
    commit({
      ...state,
      profile: state.profile ?? DEMO_PROFILE,
      teams: state.teams.length ? state.teams : [DEMO_TEAM],
    });
  }, [commit, state]);

  const signOut = useCallback(async () => {
    if (live) {
      const supabase = getSupabaseBrowser();
      await supabase?.auth.signOut();
      setUser(null);
      setState((current) => ({ ...current, profile: null, teams: [], registrations: [] }));
      return;
    }
    setState((current) => ({ ...current, profile: null }));
  }, [live]);

  const isAdmin = state.profile?.role === "admin";

  const value = useMemo<AppContextValue>(
    () => ({
      mode: live ? "live" : "demo",
      ready,
      user,
      profile: state.profile,
      teams: state.teams,
      registrations: state.registrations,
      resultOverrides: state.resultOverrides,
      isAdmin,
      refresh,
      updateProfile,
      saveTeam,
      deleteTeam,
      createRegistration,
      confirmRegistration,
      awaitVerification,
      cancelRegistration,
      saveMatchOverride,
      resetDemo,
      signInDemo,
      signOut,
    }),
    [
      live,
      ready,
      user,
      state.profile,
      state.teams,
      state.registrations,
      state.resultOverrides,
      isAdmin,
      refresh,
      updateProfile,
      saveTeam,
      deleteTeam,
      createRegistration,
      confirmRegistration,
      awaitVerification,
      cancelRegistration,
      saveMatchOverride,
      resetDemo,
      signInDemo,
      signOut,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
