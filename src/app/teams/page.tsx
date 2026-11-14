import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui";
import { TeamManager } from "@/components/teams/team-manager";

export const metadata: Metadata = {
  title: "Squad hub",
  description: "Manage your BGMI rosters, IGNs and substitute players.",
  robots: { index: false, follow: false },
};

export default function TeamsPage() {
  return (
    <div>
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-7 sm:px-6">
          <Badge tone="violet">
            <Users className="size-3" /> SQUAD HUB
          </Badge>
          <h1 className="display mt-3 text-[clamp(2.4rem,11vw,3.4rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            Your squads<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-muted">
            Build once, book faster. Rosters are ID-checked at room entry, so keep your IGNs and
            UIDs exact.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TeamManager />
      </div>
    </div>
  );
}
