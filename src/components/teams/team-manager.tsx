"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge, Button, EmptyState, Field, Input, buttonClass } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import type { MemberRole, Team, TeamMember } from "@/lib/types";
import { cn, normalisePhone } from "@/lib/utils";

const COLORS = ["#D3FF55", "#A99CFF", "#8FE8FF", "#FF6A45", "#FF4D8D", "#FFB03A", "#7AF2B0", "#E8ECF1"];
const ROLES: MemberRole[] = ["IGL", "Assaulter", "Support", "Sniper"];

function emptyMember(role: MemberRole, isSub = false): TeamMember {
  return { id: crypto.randomUUID(), ign: "", uid: "", role: isSub ? "Substitute" : role, isSub };
}

function newTeam(): Team {
  return {
    id: crypto.randomUUID(),
    name: "",
    tag: "",
    logoColor: "#C8FF3D",
    whatsapp: "",
    members: [
      emptyMember("IGL"),
      emptyMember("Assaulter"),
      emptyMember("Support"),
      emptyMember("Sniper"),
      emptyMember("Substitute", true),
    ],
  };
}

function clone(team: Team): Team {
  return {
    ...team,
    members: team.members.map((member) => ({ ...member })),
  };
}

function normaliseRoster(team: Team): Team {
  const members = ROLES.map(
    (role) =>
      team.members.find((member) => member.role === role && !member.isSub) ?? emptyMember(role),
  );
  const sub = team.members.find((member) => member.isSub || member.role === "Substitute");
  return {
    ...team,
    members: [...members, sub ?? emptyMember("Substitute", true)],
  };
}

export function TeamManager() {
  const { ready, mode, profile, teams, saveTeam, deleteTeam } = useApp();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Team | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing && teams.length && ready) setEditing(normaliseRoster(clone(teams[0])));
  }, [editing, ready, teams]);

  if (!ready) return <div className="panel h-64 shimmer" />;

  if (mode === "live" && !profile) {
    return (
      <EmptyState
        icon={<Lock className="size-5" />}
        title="Sign in to manage squads"
        description="Your roster, IGNs and BGMI UIDs are private to your account."
        action={
          <Link href="/login?next=/teams" className={buttonClass("primary", "md")}>
            Sign in
          </Link>
        }
      />
    );
  }

  function startNew() {
    setEditing(newTeam());
    setErrors({});
  }

  function select(team: Team) {
    setEditing(normaliseRoster(clone(team)));
    setErrors({});
  }

  function updateMember(index: number, patch: Partial<TeamMember>) {
    if (!editing) return;
    setEditing({
      ...editing,
      members: editing.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member,
      ),
    });
  }

  function validate() {
    if (!editing) return false;
    const next: Record<string, string> = {};
    if (editing.name.trim().length < 3) next.name = "Team name needs at least 3 characters.";
    if (!/^[A-Za-z0-9]{2,5}$/.test(editing.tag.trim())) next.tag = "2–5 letters or numbers.";
    if (!/^\d{10}$/.test((editing.whatsapp ?? "").replace(/\D/g, "").slice(-10))) {
      next.whatsapp = "Enter a valid 10-digit WhatsApp number.";
    }
    editing.members.slice(0, 4).forEach((member, index) => {
      if (member.ign.trim().length < 3) next[`ign-${index}`] = "IGN required (3+ chars).";
      if (!/^\d{8,12}$/.test(member.uid.trim())) next[`uid-${index}`] = "8–12 digit BGMI UID.";
    });
    const sub = editing.members[4];
    if (sub && (sub.ign.trim() || sub.uid.trim())) {
      if (sub.ign.trim().length < 3) next["ign-4"] = "Sub IGN required.";
      if (!/^\d{8,12}$/.test(sub.uid.trim())) next["uid-4"] = "Sub UID must be 8–12 digits.";
    }
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function handleSave() {
    if (!editing || !validate()) {
      toast({ title: "Check the roster", description: "Some player details need fixing.", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const cleaned: Team = {
        ...editing,
        name: editing.name.trim().toUpperCase(),
        tag: editing.tag.trim().toUpperCase(),
        whatsapp: normalisePhone(editing.whatsapp ?? ""),
        members: editing.members
          .filter((member) => (member.isSub ? member.ign.trim() && member.uid.trim() : true))
          .map((member) => ({ ...member, ign: member.ign.trim(), uid: member.uid.trim() })),
      };
      const saved = await saveTeam(cleaned);
      setEditing(normaliseRoster(clone(saved)));
      toast({ title: "Squad saved", description: `${saved.name} is ready for the next lobby.` });
    } catch (cause) {
      toast({
        title: "Could not save squad",
        description: cause instanceof Error ? cause.message : "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: Team) {
    if (!window.confirm(`Delete ${team.name}? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      setEditing(null);
      toast({ title: "Squad deleted", description: `${team.name} was removed.` });
    } catch (cause) {
      toast({
        title: "Could not delete squad",
        description: cause instanceof Error ? cause.message : "Try again.",
        tone: "error",
      });
    }
  }

  const isExisting = editing ? teams.some((team) => team.id === editing.id) : false;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <button
          type="button"
          onClick={startNew}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet/35 bg-violet/[0.05] p-3.5 text-left transition hover:border-violet/60 hover:bg-violet/[0.08]"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-violet text-ink">
            <Plus className="size-4" strokeWidth={3} />
          </span>
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-mist">
              Create a squad
            </span>
            <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
              Build a fresh roster
            </span>
          </span>
        </button>

        {teams.map((team) => {
          const selected = editing?.id === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => select(team)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                selected
                  ? "border-violet/45 bg-violet/[0.08]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
              )}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold text-ink"
                style={{ background: team.logoColor }}
              >
                {team.tag || "FE"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold uppercase tracking-[0.03em] text-mist">
                  {team.name || "Untitled squad"}
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {team.members.filter((member) => !member.isSub).length} players · {team.tag || "NO TAG"}
                </span>
              </span>
              {selected ? <Check className="size-4 text-violet" strokeWidth={3} /> : null}
            </button>
          );
        })}

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
          <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-violet">
            <ShieldCheck className="size-3" /> Roster rules
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted">
            Four starters + one optional substitute. Every BGMI UID is checked against the in-game
            lobby. Mismatches can void the slot.
          </p>
        </div>
      </aside>

      {editing ? (
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <div>
                <h2 className="font-display text-[20px] font-bold uppercase tracking-[-0.03em] text-mist">
                  {isExisting ? "Edit squad" : "New squad"}
                </h2>
                <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Saved rosters appear at checkout
                </p>
              </div>
              <Badge tone="outline">{isExisting ? "SAVED" : "DRAFT"}</Badge>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl font-display text-xl font-extrabold text-ink"
                  style={{ background: editing.logoColor }}
                >
                  {editing.tag || "FE"}
                </span>
                <div className="min-w-0 flex-1">
                  <Field label="Team name" error={errors.name}>
                    <Input
                      value={editing.name}
                      onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                      placeholder="RIFT ESPORTS"
                      maxLength={28}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Team tag" hint="2–5 chars" error={errors.tag}>
                  <Input
                    value={editing.tag}
                    onChange={(event) =>
                      setEditing({ ...editing, tag: event.target.value.toUpperCase().slice(0, 5) })
                    }
                    placeholder="RFT"
                    maxLength={5}
                    className="uppercase"
                  />
                </Field>
                <Field label="WhatsApp number" hint="+91" error={errors.whatsapp}>
                  <Input
                    value={editing.whatsapp ?? ""}
                    onChange={(event) => setEditing({ ...editing, whatsapp: event.target.value })}
                    placeholder="98765 43210"
                    inputMode="tel"
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
                      onClick={() => setEditing({ ...editing, logoColor: color })}
                      aria-label={`Choose colour ${color}`}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border-2 transition",
                        editing.logoColor === color
                          ? "scale-110 border-mist"
                          : "border-transparent opacity-75 hover:opacity-100",
                      )}
                      style={{ background: color }}
                    >
                      {editing.logoColor === color ? (
                        <Check className="size-3.5 text-ink" strokeWidth={3.5} />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <h2 className="font-display text-[19px] font-bold uppercase tracking-[-0.03em] text-mist">Roster</h2>
              <Badge tone="lime">4 + 1 SUB</Badge>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {editing.members.map((member, index) => (
                <div
                  key={member.id ?? index}
                  className={cn(
                    "rounded-xl border p-3",
                    member.isSub
                      ? "border-dashed border-white/10"
                      : "border-white/[0.07] bg-white/[0.015]",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.14em] text-muted">
                      <span className="flex size-4 items-center justify-center rounded bg-white/[0.05] text-[7px] text-violet">
                        {index + 1}
                      </span>
                      {member.isSub ? "Substitute · optional" : member.role}
                    </span>
                    {index === 0 ? (
                      <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-violet">
                        Shot caller
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="In-game name" error={errors[`ign-${index}`]}>
                      <Input
                        value={member.ign}
                        onChange={(event) => updateMember(index, { ign: event.target.value })}
                        placeholder={member.isSub ? "Substitute IGN" : "Rift•Viper"}
                        maxLength={20}
                        className="h-11"
                      />
                    </Field>
                    <Field label="BGMI UID" error={errors[`uid-${index}`]}>
                      <Input
                        value={member.uid}
                        onChange={(event) =>
                          updateMember(index, {
                            uid: event.target.value.replace(/\D/g, "").slice(0, 12),
                          })
                        }
                        placeholder="5123456789"
                        inputMode="numeric"
                        className="h-11 font-mono tracking-[0.05em]"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void handleSave()} disabled={saving} size="md">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isExisting ? "Save changes" : "Create squad"}
            </Button>
            {isExisting ? (
              <button
                type="button"
                onClick={() => void handleDelete(editing)}
                className={cn(buttonClass("ghost", "md"), "text-[#ff8b70] hover:bg-[#FF5A36]/10")}
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={cn(buttonClass("ghost", "md"))}
              >
                Cancel
              </button>
            )}
            <span className="ml-auto hidden items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/60 sm:flex">
              <UserRound className="size-3" /> Private to your account
            </span>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No squad selected"
          description="Create a roster to book slots faster. You can keep multiple squads for different lobbies."
          action={
            <Button onClick={startNew} size="md">
              <Plus className="size-3.5" /> Create a squad
            </Button>
          }
        />
      )}
    </div>
  );
}
