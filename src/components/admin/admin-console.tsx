"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Swords,
  Ticket,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Button, EmptyState, Field, Input, Select, buttonClass } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { DEMO_MATCHES } from "@/lib/demo/data";
import {
  LobbyEditor,
  draftFromScrim,
  draftPayload,
  emptyDraft,
  type LobbyDraft,
} from "@/components/admin/lobby-editor";
import type { MatchTeamResult, Registration, Scrim, ScrimStatus } from "@/lib/types";
import { cn, formatFull, formatINR, placementPoints } from "@/lib/utils";

type View = "overview" | "payments" | "lobbies" | "results";

interface AdminScrim {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  tier: string;
  banner: string;
  mode: string;
  map: string;
  status: ScrimStatus;
  startAt: string;
  endAt: string;
  registrationClosesAt: string;
  totalSlots: number;
  entryFee: number;
  prizePool: number;
  perKill: number;
  featured: boolean;
  matchesCount: number;
  roomId: string | null;
  roomPass: string | null;
}

interface AdminRegistration {
  id: string;
  scrimId: string;
  scrimSlug: string;
  scrimTitle: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  logoColor: string;
  slot: number | null;
  status: Registration["status"];
  paymentStatus: Registration["paymentStatus"];
  amount: number;
  orderId: string | null;
  utr: string | null;
  provider: string | null;
  createdAt: string;
}

interface AdminTeam {
  id: string;
  name: string;
  tag: string;
  logoColor: string;
  slot: number | null;
  status: string;
}

interface AdminMatch {
  matchNo: number;
  map: string;
  results: Array<{ teamId: string; placement: number; kills: number }>;
}

interface Snapshot {
  scrims: AdminScrim[];
  registrations: AdminRegistration[];
  teamsByScrim: Record<string, AdminTeam[]>;
  matchesByScrim: Record<string, AdminMatch[]>;
}

interface ResultRow {
  teamId: string;
  name: string;
  tag: string;
  logoColor: string;
  placement: number;
  kills: number;
}

const ACTIVE = ["confirmed", "pending_payment", "awaiting_verification"];

function buildDemoSnapshot(
  scrims: Scrim[],
  registrations: Registration[],
  overrides: Record<string, MatchTeamResult[]>,
): Snapshot {
  const adminScrims: AdminScrim[] = scrims.map((scrim) => ({
    id: scrim.id,
    slug: scrim.slug,
    title: scrim.title,
    subtitle: scrim.subtitle,
    description: scrim.description,
    tier: scrim.tier,
    banner: scrim.banner,
    mode: scrim.mode,
    map: scrim.map,
    status: scrim.status,
    startAt: scrim.startAt,
    endAt: scrim.endAt,
    registrationClosesAt: scrim.registrationClosesAt,
    totalSlots: scrim.totalSlots,
    entryFee: scrim.entryFee,
    prizePool: scrim.prizePool,
    perKill: scrim.perKill ?? 0,
    featured: scrim.featured,
    matchesCount: scrim.matchesCount,
    roomId: scrim.roomId,
    roomPass: scrim.roomPass,
  }));

  const teamsByScrim: Snapshot["teamsByScrim"] = {};
  for (const scrim of scrims) {
    teamsByScrim[scrim.id] = scrim.slots
      .filter((slot) => slot.teamId)
      .map((slot) => ({
        id: slot.teamId ?? `slot-${scrim.id}-${slot.slot}`,
        name: slot.name,
        tag: slot.tag,
        logoColor: slot.logoColor,
        slot: slot.slot,
        status: "confirmed",
      }));
  }

  for (const reg of registrations) {
    if (!ACTIVE.includes(reg.status)) continue;
    const bucket = teamsByScrim[reg.scrimId] ?? [];
    if (!bucket.some((team) => team.id === reg.teamId)) {
      bucket.push({
        id: reg.teamId,
        name: reg.teamName,
        tag: reg.teamTag,
        logoColor: reg.logoColor,
        slot: reg.slot,
        status: reg.status,
      });
      teamsByScrim[reg.scrimId] = bucket;
    }
  }

  const matchesByScrim: Snapshot["matchesByScrim"] = {
    "scrim-nightfall-finals": DEMO_MATCHES.map((match) => ({
      matchNo: match.matchNo,
      map: match.map,
      results: (overrides[match.id] ?? match.results).map((result) => ({
        teamId: result.teamId,
        placement: result.placement,
        kills: result.kills,
      })),
    })),
  };

  const adminRegistrations: AdminRegistration[] = registrations.map((reg) => ({
    id: reg.id,
    scrimId: reg.scrimId,
    scrimSlug: reg.scrimSlug,
    scrimTitle: reg.scrimTitle,
    teamId: reg.teamId,
    teamName: reg.teamName,
    teamTag: reg.teamTag,
    logoColor: reg.logoColor,
    slot: reg.slot,
    status: reg.status,
    paymentStatus: reg.paymentStatus,
    amount: reg.amount,
    orderId: reg.orderId ?? null,
    utr: null,
    provider: "demo",
    createdAt: reg.createdAt,
  }));

  return {
    scrims: adminScrims,
    registrations: adminRegistrations,
    teamsByScrim,
    matchesByScrim,
  };
}

function statusBadge(status: Registration["status"]) {
  switch (status) {
    case "confirmed":
      return <Badge tone="lime">CONFIRMED</Badge>;
    case "awaiting_verification":
      return <Badge tone="ice">VERIFYING UPI</Badge>;
    case "pending_payment":
      return <Badge tone="orange">UNPAID HOLD</Badge>;
    case "waitlist":
      return <Badge tone="violet">WAITLIST</Badge>;
    default:
      return <Badge tone="outline">CANCELLED</Badge>;
  }
}

function lobbyBadge(status: ScrimStatus) {
  switch (status) {
    case "live":
      return <Badge tone="orange"><Radio className="size-3" /> LIVE</Badge>;
    case "completed":
      return <Badge tone="outline">FINAL</Badge>;
    case "full":
      return <Badge tone="violet">FULL</Badge>;
    case "cancelled":
      return <Badge tone="red">CANCELLED</Badge>;
    default:
      return <Badge tone="lime">OPEN</Badge>;
  }
}

export function AdminConsole({ scrims }: { scrims: Scrim[] }) {
  const {
    mode,
    ready,
    profile,
    isAdmin,
    registrations,
    resultOverrides,
    saveMatchOverride,
    refresh,
  } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "awaiting" | "pending" | "confirmed">("all");
  const [query, setQuery] = useState("");
  const [selectedLobby, setSelectedLobby] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [lobbyForm, setLobbyForm] = useState({
    status: "open" as ScrimStatus,
    featured: false,
    roomId: "",
    roomPass: "",
  });
  const [resultScrimId, setResultScrimId] = useState<string | null>(null);
  const [resultMatchNo, setResultMatchNo] = useState(1);
  const [resultMap, setResultMap] = useState("ERANGEL");
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [editor, setEditor] = useState<{ kind: "create" | "edit"; draft: LobbyDraft } | null>(
    null,
  );
  const [editorError, setEditorError] = useState<string | null>(null);

  const demoSnapshot = useMemo(
    () => buildDemoSnapshot(scrims, registrations, resultOverrides),
    [registrations, resultOverrides, scrims],
  );
  const data = mode === "demo" ? demoSnapshot : snapshot;

  const load = useCallback(async () => {
    if (mode !== "live") return;
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("Sign in again to open the admin console.");
      const response = await fetch("/api/admin", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load the desk.");
      setSnapshot(payload);
    } catch (cause) {
      toast({
        title: "Desk unavailable",
        description: cause instanceof Error ? cause.message : "Try refreshing.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [mode, toast]);

  useEffect(() => {
    if (!ready || mode !== "live" || !isAdmin) return;
    void load();
  }, [ready, mode, isAdmin, load]);

  const adminScrims = useMemo(() => data?.scrims ?? [], [data]);
  const adminRegistrations = useMemo(() => data?.registrations ?? [], [data]);

  const selectedLobbyData = adminScrims.find((scrim) => scrim.id === selectedLobby) ?? null;

  useEffect(() => {
    if (!adminScrims.length) return;
    setSelectedLobby((current) => {
      if (current && adminScrims.some((scrim) => scrim.id === current)) return current;
      const preferred =
        adminScrims.find((scrim) => scrim.status === "live") ??
        adminScrims.find((scrim) => scrim.status === "open" || scrim.status === "full") ??
        adminScrims[0];
      return preferred.id;
    });
  }, [adminScrims]);

  useEffect(() => {
    if (!selectedLobbyData) return;
    setLobbyForm({
      status: selectedLobbyData.status,
      featured: selectedLobbyData.featured,
      roomId: selectedLobbyData.roomId ?? "",
      roomPass: selectedLobbyData.roomPass ?? "",
    });
    setShowPass(false);
  }, [selectedLobbyData]);

  const resultScrims = useMemo(() => {
    const candidates = adminScrims.filter(
      (scrim) => (data?.teamsByScrim[scrim.id]?.length ?? 0) > 0 || scrim.status === "completed",
    );
    // Demo fixtures ship one published match set (Nightfall Finals). Restrict
    // the editor to lobbies that actually have matches so a save always has a
    // standings page to land on.
    if (mode === "demo") {
      return candidates.filter((scrim) => (data?.matchesByScrim[scrim.id]?.length ?? 0) > 0);
    }
    return candidates;
  }, [adminScrims, data, mode]);

  useEffect(() => {
    if (!resultScrims.length) return;
    setResultScrimId((current) => {
      if (current && resultScrims.some((scrim) => scrim.id === current)) return current;
      return (
        resultScrims.find((scrim) => scrim.status === "live")?.id ??
        resultScrims.find((scrim) => scrim.status === "completed")?.id ??
        resultScrims[0].id
      );
    });
  }, [resultScrims]);

  const selectedResultScrim = resultScrims.find((scrim) => scrim.id === resultScrimId) ?? null;

  useEffect(() => {
    if (!selectedResultScrim || !data) {
      setResultRows([]);
      return;
    }
    const existing = data.matchesByScrim[selectedResultScrim.id]?.find(
      (match) => match.matchNo === resultMatchNo,
    );
    const teams = (data.teamsByScrim[selectedResultScrim.id] ?? []).filter(
      (team) => team.status === "confirmed",
    );
    setResultMap(existing?.map ?? "ERANGEL");
    const usedPlacements = new Set(
      existing?.results.map((result) => result.placement) ?? [],
    );
    setResultRows(
      teams.map((team) => {
        const previous = existing?.results.find((result) => result.teamId === team.id);
        let placement = previous?.placement;
        if (!placement) {
          // A squad can be added after results were first saved. Give it the
          // lowest free placement instead of a positional value that could
          // collide with an existing row.
          placement = 1;
          while (usedPlacements.has(placement)) placement += 1;
          usedPlacements.add(placement);
        }
        return {
          teamId: team.id,
          name: team.name,
          tag: team.tag,
          logoColor: team.logoColor,
          placement,
          kills: previous?.kills ?? 0,
        };
      }),
    );
  }, [data, resultMatchNo, selectedResultScrim]);

  const stats = useMemo(() => {
    const confirmed = adminRegistrations.filter((reg) => reg.status === "confirmed");
    const awaiting = adminRegistrations.filter((reg) => reg.status === "awaiting_verification");
    const pending = adminRegistrations.filter((reg) => reg.status === "pending_payment");
    return {
      confirmed,
      awaiting,
      pending,
      revenue: confirmed.reduce((sum, reg) => sum + reg.amount, 0),
      live: adminScrims.filter((scrim) => scrim.status === "live").length,
      open: adminScrims.filter((scrim) => scrim.status === "open" || scrim.status === "full").length,
    };
  }, [adminRegistrations, adminScrims]);

  const filteredRegistrations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return adminRegistrations.filter((reg) => {
      if (filter === "awaiting" && reg.status !== "awaiting_verification") return false;
      if (filter === "pending" && reg.status !== "pending_payment") return false;
      if (filter === "confirmed" && reg.status !== "confirmed") return false;
      if (!needle) return true;
      return [reg.teamName, reg.teamTag, reg.scrimTitle, reg.orderId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [adminRegistrations, filter, query]);

  const seats = useCallback(
    (scrim: AdminScrim) => {
      const active = (data?.teamsByScrim[scrim.id] ?? []).filter((team) =>
        ACTIVE.includes(team.status),
      ).length;
      return Math.max(0, scrim.totalSlots - active);
    },
    [data],
  );

  async function post(action: string, payload: Record<string, unknown> = {}) {
    const supabase = getSupabaseBrowser();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session) throw new Error("Sign in again to use the desk.");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof body.error === "string" ? body.error : "The desk rejected that request.",
      );
    }
    return body;
  }

  async function settle(registration: AdminRegistration, action: "payment.confirm" | "payment.reject") {
    if (mode === "demo") {
      toast({
        title: "Demo console",
        description: "Payment controls activate when Supabase is connected.",
        tone: "info",
      });
      return;
    }
    setBusy(registration.id);
    try {
      await post(action, {
        registrationId: registration.id,
        ...(registration.utr ? { utr: registration.utr } : {}),
      });
      await load();
      await refresh();
      toast({
        title: action === "payment.confirm" ? "Payment confirmed" : "Registration rejected",
        description: `${registration.teamTag} · ${registration.scrimTitle}`,
      });
    } catch (cause) {
      toast({
        title: "Action failed",
        description: cause instanceof Error ? cause.message : "Try again.",
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function saveLobby() {
    if (!selectedLobbyData) return;
    if (mode === "demo") {
      toast({
        title: "Demo console",
        description: "Lobby controls activate when Supabase is connected.",
        tone: "info",
      });
      return;
    }
    setBusy("lobby");
    try {
      await post("scrim.update", {
        scrimId: selectedLobbyData.id,
        status: lobbyForm.status,
        featured: lobbyForm.featured,
        roomId: lobbyForm.roomId,
        roomPass: lobbyForm.roomPass,
      });
      await load();
      toast({
        title: "Lobby updated",
        description: `${selectedLobbyData.title} · ${lobbyForm.status}`,
      });
    } catch (cause) {
      toast({
        title: "Could not update lobby",
        description: cause instanceof Error ? cause.message : "Try again.",
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  function openLobbyCreator() {
    if (mode === "demo") {
      toast({
        title: "Demo console",
        description: "Creating lobbies activates when Supabase is connected.",
        tone: "info",
      });
      return;
    }
    setEditorError(null);
    setEditor({ kind: "create", draft: emptyDraft() });
  }

  function openLobbyEditor(scrim: AdminScrim) {
    if (mode === "demo") {
      toast({
        title: "Demo console",
        description: "Editing lobby details activates when Supabase is connected.",
        tone: "info",
      });
      return;
    }
    setEditorError(null);
    setEditor({ kind: "edit", draft: draftFromScrim(scrim) });
  }

  async function saveLobbyEditor() {
    if (!editor) return;
    setBusy("editor");
    setEditorError(null);
    const payload = draftPayload(editor.draft);
    try {
      if (editor.kind === "create") {
        const created = await post("scrim.create", payload);
        await load();
        router.refresh();
        if (typeof created.scrimId === "string") setSelectedLobby(created.scrimId);
        setEditor(null);
        toast({
          title: "Lobby created",
          description: `${editor.draft.title.trim()} is live on the scrims board.`,
        });
      } else {
        const scrimId = selectedLobbyData?.id;
        if (!scrimId) throw new Error("Pick a lobby first.");
        await post("scrim.save", { ...payload, scrimId });
        await load();
        router.refresh();
        setSelectedLobby(scrimId);
        setEditor(null);
        toast({
          title: "Lobby updated",
          description: `${editor.draft.title.trim()} · ${editor.draft.status}`,
        });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Try again.";
      setEditorError(message);
      toast({ title: "Could not save lobby", description: message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function saveResults() {
    if (!selectedResultScrim) return;
    if (!resultRows.length) {
      toast({ title: "No confirmed squads", description: "Results need a filled lobby.", tone: "error" });
      return;
    }
    const placements = resultRows.map((row) => row.placement);
    if (new Set(placements).size !== placements.length) {
      toast({
        title: "Duplicate placement",
        description: "Every squad needs a unique placement in this match.",
        tone: "error",
      });
      return;
    }

    setBusy("results");
    try {
      if (mode === "demo") {
        const demoMatch = DEMO_MATCHES.find((match) => match.matchNo === resultMatchNo);
        if (!demoMatch) throw new Error("That demo match has not been defined.");
        const results: MatchTeamResult[] = resultRows
          .map((row) => ({
            teamId: row.teamId,
            name: row.name,
            tag: row.tag,
            logoColor: row.logoColor,
            placement: row.placement,
            kills: row.kills,
            points: placementPoints(row.placement) + row.kills,
          }))
          .sort((a, b) => a.placement - b.placement);
        saveMatchOverride(demoMatch.id, results);
        toast({
          title: "Demo results saved",
          description: "Open the standings page to see the updated table.",
        });
        return;
      }

      await post("results.save", {
        scrimId: selectedResultScrim.id,
        matches: [
          {
            matchNo: resultMatchNo,
            map: resultMap,
            results: resultRows.map((row) => ({
              teamId: row.teamId,
              placement: row.placement,
              kills: row.kills,
            })),
          },
        ],
      });
      await load();
      await refresh();
      toast({
        title: "Results published",
        description: `Match ${resultMatchNo} · ${selectedResultScrim.title}`,
      });
    } catch (cause) {
      toast({
        title: "Could not publish results",
        description: cause instanceof Error ? cause.message : "Try again.",
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return <div className="panel h-72 shimmer" />;
  }

  if (mode === "live" && (!profile || !isAdmin)) {
    return (
      <EmptyState
        icon={<Lock className="size-5" />}
        title={profile ? "Admin access required" : "Sign in to the desk"}
        description={
          profile
            ? "This console is limited to league admins. Ask the owner to promote your profile role to admin."
            : "The desk handles payments, room credentials and verified results."
        }
        action={
          <Link href={profile ? "/profile" : "/login?next=/admin"} className={buttonClass("primary", "md")}>
            {profile ? "Back to profile" : "Sign in"}
          </Link>
        }
      />
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-violet" />
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
          Opening the control room…
        </p>
      </div>
    );
  }

  const tabs: Array<{ id: View; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "payments", label: "Payments", icon: Wallet, count: stats.awaiting.length + stats.pending.length },
    { id: "lobbies", label: "Lobbies", icon: Swords, count: stats.open + stats.live },
    { id: "results", label: "Results", icon: Trophy },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet">
            <ShieldCheck className="size-3" /> DESK ACCESS
          </Badge>
          <Badge tone={mode === "demo" ? "ice" : "outline"}>
            {mode === "demo" ? "DEMO PREVIEW" : "LIVE OPERATIONS"}
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || mode === "demo"}
          className={cn(buttonClass("secondary", "sm"), mode === "demo" && "opacity-50")}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {mode === "demo" ? (
        <div className="rounded-xl border border-ice/20 bg-ice/[0.045] px-4 py-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#a8efff]">
            Demo control room
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            Results editing is live for the completed Nightfall Finals lobby and updates this
            browser&apos;s standings. Payment approvals and room controls switch on when Supabase is
            connected.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[8.5px] font-extrabold uppercase tracking-[0.1em] transition sm:px-4",
                active
                  ? "border-violet/40 bg-violet/[0.1] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.14)]"
                  : "border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/15 hover:text-mist",
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {tab.count ? (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] tabular",
                    active ? "bg-violet/20" : "bg-white/[0.06]",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {view === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              icon={<Users className="size-4" />}
              label="Confirmed squads"
              value={String(stats.confirmed.length)}
              detail={formatINR(stats.revenue) + " collected"}
            />
            <StatCard
              icon={<Clock3 className="size-4" />}
              label="Awaiting UPI"
              value={String(stats.awaiting.length)}
              detail="Needs a desk check"
              highlight={stats.awaiting.length > 0}
            />
            <StatCard
              icon={<Ticket className="size-4" />}
              label="Open holds"
              value={String(stats.pending.length)}
              detail="Expire in 25 min"
            />
            <StatCard
              icon={<Radio className="size-4" />}
              label="Live lobbies"
              value={String(stats.live)}
              detail={`${stats.open} open on the board`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">
                  Needs attention
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setView("payments");
                    setFilter("awaiting");
                  }}
                  className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime hover:underline"
                >
                  Open queue
                </button>
              </div>
              {stats.awaiting.length ? (
                stats.awaiting.slice(0, 5).map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-[7px] font-extrabold text-ink"
                      style={{ background: reg.logoColor }}
                    >
                      {reg.teamTag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-mist">{reg.teamName}</p>
                      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {reg.scrimTitle} · {reg.utr ? `UTR ${reg.utr}` : "no UTR"}
                      </p>
                    </div>
                    <span className="font-display text-base text-lime">{formatINR(reg.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-[10px] text-muted">
                  Nothing waiting. The queue is clear.
                </p>
              )}
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Lobby board</h2>
                <button
                  type="button"
                  onClick={() => setView("lobbies")}
                  className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime hover:underline"
                >
                  Manage
                </button>
              </div>
              {adminScrims.slice(0, 5).map((scrim) => (
                <div
                  key={scrim.id}
                  className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-mist">{scrim.title}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {formatFull(scrim.startAt)} · {seats(scrim)} seats left
                    </p>
                  </div>
                  {lobbyBadge(scrim.status)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === "payments" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {(
                [
                  ["all", `All ${adminRegistrations.length}`],
                  ["awaiting", `Verify ${stats.awaiting.length}`],
                  ["pending", `Holds ${stats.pending.length}`],
                  ["confirmed", `Confirmed ${stats.confirmed.length}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={cn(
                    "h-8 shrink-0 rounded-lg border px-3 text-[8px] font-extrabold uppercase tracking-[0.1em] transition",
                    filter === id
                      ? "border-violet/40 bg-violet/10 text-violet"
                      : "border-white/[0.07] text-muted hover:text-mist",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team, lobby or order"
                className="h-9 w-full rounded-lg border border-line bg-ink/70 pl-9 pr-3 text-[11px] text-mist placeholder:text-muted/45 focus:border-violet/50 focus:outline-none"
              />
            </div>
          </div>

          {filteredRegistrations.length ? (
            <div className="panel overflow-hidden">
              <div className="hidden grid-cols-[1.4fr_1fr_90px_100px_150px] gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[8px] font-bold uppercase tracking-[0.12em] text-muted/70 lg:grid">
                <span>Squad / lobby</span>
                <span>Order</span>
                <span className="text-right">Amount</span>
                <span>Status</span>
                <span className="text-right">Desk</span>
              </div>
              {filteredRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="grid gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 lg:grid-cols-[1.4fr_1fr_90px_100px_150px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-[7px] font-extrabold text-ink"
                      style={{ background: reg.logoColor }}
                    >
                      {reg.teamTag}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-mist">{reg.teamName}</p>
                      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {reg.scrimTitle} · slot {reg.slot ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[9px] text-mist/70">
                      {reg.orderId ?? "—"}
                    </p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {reg.utr ? `UTR ${reg.utr}` : reg.provider ? reg.provider.toUpperCase() : "NO PAYMENT"}
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold text-lime lg:text-right">
                    {formatINR(reg.amount)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">{statusBadge(reg.status)}</div>
                  <div className="flex gap-1.5 lg:justify-end">
                    {reg.status === "confirmed" ? (
                      <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted/50">
                        Settled
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void settle(reg, "payment.confirm")}
                          disabled={busy === reg.id || mode === "demo"}
                          title={mode === "demo" ? "Connect Supabase to operate payments" : undefined}
                          className={cn(buttonClass("primary", "sm"), "h-8 px-2.5")}
                        >
                          {busy === reg.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" strokeWidth={3} />
                          )}
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => void settle(reg, "payment.reject")}
                          disabled={busy === reg.id || mode === "demo"}
                          title={mode === "demo" ? "Connect Supabase to operate payments" : undefined}
                          className={cn(buttonClass("ghost", "sm"), "h-8 px-2 text-[#ff8b70]")}
                        >
                          <X className="size-3" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wallet className="size-5" />}
              title="No bookings in this view"
              description="New holds and UPI submissions appear here in real time. Try clearing the filter."
            />
          )}
        </div>
      ) : null}

      {view === "lobbies" ? (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">
            <button
              type="button"
              onClick={openLobbyCreator}
              className={cn(buttonClass("primary", "md"), "w-full")}
            >
              <Plus className="size-4" strokeWidth={2.6} />
              New event
            </button>
            {adminScrims.length ? null : (
              <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[9px] leading-relaxed text-muted">
                No lobbies yet — create the first one.
              </p>
            )}
            {adminScrims.map((scrim) => (
              <button
                key={scrim.id}
                type="button"
                onClick={() => setSelectedLobby(scrim.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedLobby === scrim.id
                    ? "border-violet/40 bg-violet/[0.05]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.03em] text-mist">
                    {scrim.title}
                  </span>
                  {lobbyBadge(scrim.status)}
                </div>
                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {formatFull(scrim.startAt)} · {seats(scrim)} / {scrim.totalSlots} open
                </p>
              </button>
            ))}
          </div>

          {selectedLobbyData ? (
            <div className="space-y-4">
              <div className="panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3.5">
                  <div>
                    <h2 className="font-display text-[21px] font-bold uppercase tracking-[-0.03em] text-mist">
                      {selectedLobbyData.title}
                    </h2>
                    <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
                      {formatFull(selectedLobbyData.startAt)} · {selectedLobbyData.totalSlots} slots
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLobbyEditor(selectedLobbyData)}
                      disabled={mode === "demo"}
                      title={mode === "demo" ? "Connect Supabase to edit lobbies" : undefined}
                      className={cn(
                        buttonClass("secondary", "sm"),
                        mode === "demo" && "opacity-50",
                      )}
                    >
                      <Pencil className="size-3" /> Edit details
                    </button>
                    <Link
                      href={`/scrims/${selectedLobbyData.slug}`}
                      className={cn(buttonClass("ghost", "sm"))}
                    >
                      View page <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <Field label="Lobby status">
                    <Select
                      value={lobbyForm.status}
                      onChange={(event) =>
                        setLobbyForm((form) => ({
                          ...form,
                          status: event.target.value as ScrimStatus,
                        }))
                      }
                      disabled={mode === "demo"}
                    >
                      {["open", "full", "live", "completed", "cancelled"].map((status) => (
                        <option key={status} value={status}>
                          {status.toUpperCase()}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Feature on home">
                    <button
                      type="button"
                      onClick={() =>
                        setLobbyForm((form) => ({ ...form, featured: !form.featured }))
                      }
                      disabled={mode === "demo"}
                      className={cn(
                        "flex h-12 w-full items-center justify-between rounded-xl border px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] transition",
                        lobbyForm.featured
                          ? "border-violet/40 bg-violet/[0.07] text-violet"
                          : "border-line bg-ink/70 text-muted",
                      )}
                    >
                      {lobbyForm.featured ? "Featured lobby" : "Standard lobby"}
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md border",
                          lobbyForm.featured ? "border-violet/40 bg-violet text-ink" : "border-white/15",
                        )}
                      >
                        {lobbyForm.featured ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  </Field>

                  <Field label="Room ID" hint="Players only">
                    <Input
                      value={lobbyForm.roomId}
                      onChange={(event) =>
                        setLobbyForm((form) => ({ ...form, roomId: event.target.value }))
                      }
                      placeholder="884 219"
                      disabled={mode === "demo"}
                      className="font-mono tracking-[0.08em]"
                    />
                  </Field>

                  <Field label="Room password">
                    <div className="relative">
                      <Input
                        value={lobbyForm.roomPass}
                        onChange={(event) =>
                          setLobbyForm((form) => ({ ...form, roomPass: event.target.value }))
                        }
                        placeholder="FORGE9"
                        type={showPass ? "text" : "password"}
                        disabled={mode === "demo"}
                        className="pr-10 font-mono tracking-[0.08em]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((value) => !value)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-mist"
                      >
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-4 py-3 sm:px-5">
                  <Button onClick={() => void saveLobby()} disabled={busy === "lobby" || mode === "demo"}>
                    {busy === "lobby" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save lobby
                  </Button>
                  <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-muted/50">
                    <Lock className="size-3 text-violet/60" /> Credentials unlock 15 min before start
                  </span>
                </div>
              </div>

              <div className="panel overflow-hidden">
                <div className="border-b border-white/[0.07] px-4 py-3">
                  <h3 className="font-display text-lg font-bold uppercase text-mist">
                    Booked squads
                  </h3>
                </div>
                {(data.teamsByScrim[selectedLobbyData.id] ?? []).length ? (
                  data.teamsByScrim[selectedLobbyData.id]
                    .slice()
                    .sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99))
                    .map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-2.5 last:border-0"
                      >
                        <span className="w-7 font-display text-base font-bold text-lime">
                          {team.slot ? String(team.slot).padStart(2, "0") : "—"}
                        </span>
                        <span
                          className="flex size-7 items-center justify-center rounded text-[7px] font-extrabold text-ink"
                          style={{ background: team.logoColor }}
                        >
                          {team.tag}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-mist/85">
                          {team.name}
                        </span>
                        {statusBadge(team.status as Registration["status"])}
                      </div>
                    ))
                ) : (
                  <p className="px-4 py-6 text-center text-[10px] text-muted">
                    No squads booked yet. Share the lobby link.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {view === "results" ? (
        <div className="space-y-4">
          <div className="panel p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Lobby">
                <Select
                  value={resultScrimId ?? ""}
                  onChange={(event) => {
                    setResultScrimId(event.target.value);
                    setResultMatchNo(1);
                  }}
                >
                  {resultScrims.map((scrim) => (
                    <option key={scrim.id} value={scrim.id}>
                      {scrim.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Match">
                <Select
                  value={resultMatchNo}
                  onChange={(event) => setResultMatchNo(Number(event.target.value))}
                >
                  {Array.from(
                    { length: selectedResultScrim?.matchesCount ?? 3 },
                    (_, index) => index + 1,
                  ).map((matchNo) => (
                    <option key={matchNo} value={matchNo}>
                      Match {matchNo}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Map">
                <Select value={resultMap} onChange={(event) => setResultMap(event.target.value)}>
                  {["ERANGEL", "MIRAMAR", "SANHOK", "Rondo", "TAEGO"].map((map) => (
                    <option key={map} value={map.toUpperCase()}>
                      {map.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                <Trophy className="size-3 text-violet" />
                {resultRows.length} confirmed squads · placement + kills
              </p>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted/50">
                Publishing marks the lobby completed
              </p>
            </div>
          </div>

          {resultRows.length ? (
            <>
              <div className="panel overflow-hidden">
                <div className="grid grid-cols-[52px_1fr_70px_70px] gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[8px] font-bold uppercase tracking-[0.1em] text-muted/70 sm:grid-cols-[64px_1fr_100px_100px] sm:px-4">
                  <span>Place</span>
                  <span>Squad</span>
                  <span>Kills</span>
                  <span className="text-right">Points</span>
                </div>
                {resultRows.map((row, index) => (
                  <div
                    key={row.teamId}
                    className="grid grid-cols-[52px_1fr_70px_70px] items-center gap-2 border-b border-white/[0.05] px-3.5 py-2.5 last:border-0 sm:grid-cols-[64px_1fr_100px_100px] sm:px-4"
                  >
                    <input
                      value={row.placement}
                      onChange={(event) => {
                        const placement = Math.max(1, Number(event.target.value) || 1);
                        setResultRows((rows) =>
                          rows.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, placement } : item,
                          ),
                        );
                      }}
                      inputMode="numeric"
                      aria-label={`${row.name} placement`}
                      className="h-9 w-12 rounded-lg border border-line bg-ink px-2 font-display text-base font-bold text-mist focus:border-violet/50 focus:outline-none"
                    />
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded text-[7px] font-extrabold text-ink"
                        style={{ background: row.logoColor }}
                      >
                        {row.tag}
                      </span>
                      <span className="truncate text-[10px] font-bold text-mist/85">{row.name}</span>
                    </span>
                    <input
                      value={row.kills}
                      onChange={(event) => {
                        const kills = Math.max(0, Number(event.target.value) || 0);
                        setResultRows((rows) =>
                          rows.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, kills } : item,
                          ),
                        );
                      }}
                      inputMode="numeric"
                      aria-label={`${row.name} kills`}
                      className="h-9 w-14 rounded-lg border border-line bg-ink px-2 text-[12px] font-semibold tabular text-mist focus:border-violet/50 focus:outline-none"
                    />
                    <span className="text-right font-display text-lg font-bold tabular text-lime">
                      {placementPoints(row.placement) + row.kills}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void saveResults()} disabled={busy === "results"}>
                  {busy === "results" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {mode === "demo" ? "Save demo table" : "Publish results"}
                </Button>
                {selectedResultScrim ? (
                  <Link
                    href={`/scrims/${selectedResultScrim.slug}/standings`}
                    className={cn(buttonClass("secondary", "md"))}
                  >
                    Preview table <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Trophy className="size-5" />}
              title="No confirmed squads"
              description="Results can only be published for squads that have confirmed slots in this lobby."
            />
          )}
        </div>
      ) : null}

      <LobbyEditor
        open={Boolean(editor)}
        kind={editor?.kind ?? "create"}
        draft={editor?.draft ?? emptyDraft()}
        busy={busy === "editor"}
        error={editorError}
        onChange={(patch) =>
          setEditor((current) =>
            current ? { ...current, draft: { ...current.draft, ...patch } } : current,
          )
        }
        onClose={() => {
          setEditor(null);
          setEditorError(null);
        }}
        onSave={() => void saveLobbyEditor()}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="panel p-3.5">
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
      <p className="mt-1.5 truncate text-[7.5px] font-semibold uppercase tracking-[0.08em] text-muted/55">
        {detail}
      </p>
    </div>
  );
}
