"use client";

import { Users } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { activeSlotCount } from "@/lib/slots";
import type { Scrim } from "@/lib/types";

export function SlotCountStat({ scrim }: { scrim: Scrim }) {
  const { registrations } = useApp();
  const filled = activeSlotCount(scrim, registrations);
  const open = Math.max(0, scrim.totalSlots - filled);

  return (
    <div className="panel relative overflow-hidden px-3.5 py-3.5 sm:px-4">
      <p className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.13em] text-muted/75">
        <span className="text-lime/70">
          <Users className="size-4" />
        </span>
        Slot board
      </p>
      <p className="mt-2 truncate font-display text-[22px] leading-none font-bold tracking-[-0.04em] tabular text-mist sm:text-[25px]">
        {filled}/{scrim.totalSlots}
      </p>
      <p className="mt-1 truncate text-[7px] font-semibold uppercase tracking-[0.1em] text-muted/55">
        {open} open
      </p>
    </div>
  );
}
