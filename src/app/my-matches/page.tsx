import type { Metadata } from "next";
import { MyMatchesClient } from "@/components/matches/my-matches-client";
import { Badge } from "@/components/ui";
import { Ticket } from "lucide-react";

export const metadata: Metadata = {
  title: "My matches",
  description: "Your booked scrims, room credentials and match passes.",
  robots: { index: false, follow: false },
};

export default function MyMatchesPage() {
  return (
    <div>
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-7 sm:px-6">
          <Badge tone="violet">
            <Ticket className="size-3" /> MATCH DESK
          </Badge>
          <h1 className="display mt-3 text-[clamp(2.4rem,11vw,3.4rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            My matches<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-muted">
            Every slot you&apos;ve locked, with room credentials, drop calls and final standings in
            one place.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <MyMatchesClient />
      </div>
    </div>
  );
}
