import type { Registration, Scrim, SlotTeam } from "./types";

const ACTIVE: Registration["status"][] = [
  "confirmed",
  "pending_payment",
  "awaiting_verification",
];

export interface SlotCell {
  slot: number;
  team: SlotTeam | null;
}

export function buildSlotMap(scrim: Scrim, registrations: Registration[] = []): SlotCell[] {
  const active = registrations.filter(
    (reg) =>
      reg.scrimId === scrim.id &&
      ACTIVE.includes(reg.status) &&
      typeof reg.slot === "number",
  );
  const registeredTeams = new Set(active.map((reg) => reg.teamId));

  const occupied = new Map<number, SlotTeam>();
  for (const slot of scrim.slots) {
    // An active registration is authoritative. If a seeded or cached board
    // still lists the same squad in another slot, drop the stale entry so a
    // team never appears twice in the same lobby.
    if (slot.teamId && registeredTeams.has(slot.teamId)) continue;
    occupied.set(slot.slot, slot);
  }

  for (const reg of active) {
    if (typeof reg.slot !== "number") continue;
    occupied.set(reg.slot, {
      slot: reg.slot,
      teamId: reg.teamId,
      name: reg.teamName,
      tag: reg.teamTag,
      logoColor: reg.logoColor,
      status: reg.status,
      isMine: true,
    });
  }

  return Array.from({ length: scrim.totalSlots }, (_, index) => ({
    slot: index + 1,
    team: occupied.get(index + 1) ?? null,
  }));
}

export function activeSlotCount(scrim: Scrim, registrations: Registration[] = []) {
  return buildSlotMap(scrim, registrations).filter((cell) => cell.team).length;
}

export function myRegistrationForScrim(scrim: Scrim, registrations: Registration[]) {
  return (
    registrations.find(
      (reg) => reg.scrimId === scrim.id && ACTIVE.includes(reg.status),
    ) ?? null
  );
}

export function availableSlots(scrim: Scrim, registrations: Registration[] = []) {
  return buildSlotMap(scrim, registrations)
    .filter((cell) => !cell.team)
    .map((cell) => cell.slot);
}
