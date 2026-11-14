"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Swords } from "lucide-react";
import { ScrimCard } from "@/components/scrims/scrim-card";
import { EmptyState } from "@/components/ui";
import type { Scrim } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "live", label: "Live" },
  { id: "completed", label: "Finals" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function ScrimBrowser({
  scrims,
  initialQuery = "",
}: {
  scrims: Scrim[];
  initialQuery?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState(initialQuery);

  const counts = useMemo(
    () => ({
      all: scrims.length,
      open: scrims.filter((scrim) => scrim.status === "open" || scrim.status === "full").length,
      live: scrims.filter((scrim) => scrim.status === "live").length,
      completed: scrims.filter((scrim) => scrim.status === "completed").length,
    }),
    [scrims],
  );

  const filtered = useMemo(() => {
    const rows = scrims.filter((scrim) => {
      if (filter === "open") return scrim.status === "open" || scrim.status === "full";
      if (filter === "live") return scrim.status === "live";
      if (filter === "completed") return scrim.status === "completed";
      return true;
    });
    const term = query.trim().toLowerCase();
    const searched = term
      ? rows.filter(
          (scrim) =>
            scrim.title.toLowerCase().includes(term) ||
            scrim.tier.toLowerCase().includes(term) ||
            scrim.slug.toLowerCase().includes(term),
        )
      : rows;
    return searched.sort((a, b) => {
      const order = { live: 0, open: 1, full: 2, cancelled: 3, completed: 4 };
      const delta = order[a.status] - order[b.status];
      if (delta !== 0) return delta;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  }, [filter, query, scrims]);

  return (
    <div>
      <div className="sticky top-16 z-30 border-y border-white/[0.06] bg-ink/92 px-4 py-3 backdrop-blur-xl sm:px-6 md:top-[104px]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[8.5px] font-extrabold uppercase tracking-[0.1em] transition",
                    active
                      ? "border-violet/45 bg-violet/[0.12] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.14)]"
                      : "border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/15 hover:text-mist",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "hidden h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7.5px] tabular min-[360px]:flex",
                      active ? "bg-violet/20 text-violet" : "bg-white/[0.06] text-muted",
                    )}
                  >
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/60" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lobbies (daily, advance, weekend...)"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-9 pr-9 text-[11px] text-mist placeholder:text-muted/45 transition focus:border-violet/45 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-violet/10"
            />
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((scrim, index) => (
              <ScrimCard key={scrim.id} scrim={scrim} eager={index === 0} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Swords className="size-5" />}
            title="No lobbies here"
            description="Nothing matches that filter yet. Clear the search or check the full schedule — new lobbies drop every day."
          />
        )}
      </div>
    </div>
  );
}
