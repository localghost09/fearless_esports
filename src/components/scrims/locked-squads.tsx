"use client";

import { Badge } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";
import { buildSlotMap } from "@/lib/slots";
import type { Scrim } from "@/lib/types";

export function LockedSquads({ scrim }: { scrim: Scrim }) {
  const { registrations } = useApp();
  const squads = buildSlotMap(scrim, registrations).flatMap((cell) =>
    cell.team ? [cell.team] : [],
  );

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div>
          <p className="eyebrow mb-1.5 text-lime/80">Confirmed</p>
          <h2 className="font-display text-[21px] leading-none font-bold uppercase tracking-[-0.03em] text-mist">
            Locked squads
          </h2>
        </div>
        <Badge tone="outline">{squads.length} squads</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5">
        {squads.length ? (
          squads.map((slot) => (
            <div
              key={slot.slot}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-[7px] font-extrabold text-ink"
                style={{ background: slot.logoColor }}
              >
                {slot.tag}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.04em] text-mist/80">
                  {slot.name}
                </p>
                <p className="text-[7px] font-semibold uppercase tracking-[0.1em] text-muted/60">
                  Slot {slot.slot}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full py-4 text-center text-[11px] text-muted">
            No squads locked yet. Be the first team in the lobby.
          </p>
        )}
      </div>
    </section>
  );
}
