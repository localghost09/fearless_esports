import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
import { getScrims } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control room",
  description: "League operations: payments, lobby credentials and verified results.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const scrims = await getScrims();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-7 sm:px-6">
          <h1 className="display text-[clamp(2.4rem,11vw,3.6rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            Control room<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-muted">
            Verify payments, open custom rooms and publish match results. Every action is audit
            logged against your admin account.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdminConsole scrims={scrims} />
      </div>
    </div>
  );
}
