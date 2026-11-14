import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  Mail,
  MessageCircle,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Badge, buttonClass } from "@/components/ui";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

type Section = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

type LegalDoc = {
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof FileText;
  updated: string;
  sections: Section[];
};

const DOCS: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of play",
    eyebrow: "The rulebook",
    description:
      "The agreement between you, your squad and Fearless Esports. Short version: play fair, show up on time, and keep your roster honest.",
    icon: Scale,
    updated: "November 2026",
    sections: [
      {
        heading: "1. Who can play",
        body: [
          "Fearless Esports lobbies are open to players aged 18 and over. By creating an account or booking a slot you confirm that you meet this requirement and that the details on your account are accurate.",
          "One account per player. Accounts may not be shared, sold or transferred. The registered captain (IGL) is responsible for the conduct of every player on the roster.",
        ],
      },
      {
        heading: "2. Slots and entry",
        body: [
          "A slot is held when you start checkout and is confirmed only after the full entry fee is verified. Holds expire automatically after 25 minutes so the lobby does not stall.",
          "Entry fees are per squad, not per player. Your slot number is assigned by the booking system and can be changed by the desk only to resolve a collision or dispute.",
        ],
      },
      {
        heading: "3. Match rules",
        bullets: [
          "Join the custom room at least 10 minutes before kickoff. Late squads forfeit the slot without a refund.",
          "Only the registered BGMI IGNs and UIDs may play. Substitutes must be declared in the roster before kickoff.",
          "Emulators, controllers, teaming, stream sniping, account sharing and third-party tools are prohibited.",
          "Keep POV recordings for 24 hours after the final match. Refusing a reasonable clip request can void results.",
          "The marshal's decision on room settings, disputes and results is final.",
        ],
      },
      {
        heading: "4. Payments and payouts",
        body: [
          "Entries are collected through the payment method shown at checkout. Direct UPI payments are verified against the submitted UTR. Gateway payments are confirmed by signed webhook or verified status polling.",
          "Prize money is paid to the registered IGL's UPI within 24 hours of results being verified. Prize amounts, per-kill bonuses and payout places are shown on the lobby page before you book.",
        ],
      },
      {
        heading: "5. Fair play and sanctions",
        body: [
          "Cheating, collusion or harassment can result in immediate disqualification, forfeiture of prizes and a temporary or permanent ban. We may withhold a payout while an investigation is open.",
          "Where a result is voided because of a rules breach, the remaining standings are recalculated from verified match data. Entry fees are not refunded for sanctions.",
        ],
      },
      {
        heading: "6. Changes and liability",
        body: [
          "We may reschedule or cancel a lobby because of server outages, insufficient entries or circumstances outside our control. If we cancel, affected squads receive a full refund or a credit, at their choice.",
          "Fearless Esports is not affiliated with Krafton, Garena or the publishers of the games we host. Game downtime, bans or client updates are outside our control.",
          "These terms are governed by the laws of India. Disputes are subject to the jurisdiction of the courts at our registered business location.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund policy",
    eyebrow: "Money, plainly",
    description:
      "If the lobby does not happen, you get your entry back. If you change your mind after the slot locks, the rules below apply.",
    icon: Wallet,
    updated: "November 2026",
    sections: [
      {
        heading: "Full refunds",
        bullets: [
          "Fearless Esports cancels or reschedules a lobby and you cannot make the new time.",
          "A payment is captured twice for the same registration.",
          "You are charged but the slot could not be confirmed because the lobby filled before settlement.",
          "A verified technical failure on our side prevents you from joining a lobby you paid for.",
        ],
      },
      {
        heading: "No refunds",
        bullets: [
          "You miss the room, arrive late, or fail the ID check at kickoff.",
          "Your squad is disqualified or penalised for a rules breach.",
          "You voluntarily leave after the room is opened or after the first match begins.",
          "A player cannot attend and you have not requested a substitute before the cutoff.",
        ],
      },
      {
        heading: "Before the room opens",
        body: [
          "You can release an unpaid hold instantly from My Matches. A paid entry can be transferred to another squad or a later lobby once, if you contact the desk at least 60 minutes before kickoff and the lobby is not full.",
          "After the room opens, entries are committed to the prize pool and cannot be withdrawn.",
        ],
      },
      {
        heading: "How to raise a refund",
        bullets: [
          "Message the desk from your registered WhatsApp number or email with your team tag and order ID.",
          "Include the UTR for direct UPI payments so we can trace the credit.",
          "We reply within one business day (10:00–02:00 IST). Approved refunds reach the source UPI account in 3–7 working days.",
        ],
      },
      {
        heading: "Chargebacks",
        body: [
          "Please contact us before raising a chargeback. A chargeback without a support ticket may pause your account while the payment is investigated. We cooperate fully with valid disputes and keep gateway evidence for every order.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    eyebrow: "Your data",
    description:
      "We collect only what we need to run a fair lobby, pay the right squad and keep the platform secure.",
    icon: ShieldCheck,
    updated: "November 2026",
    sections: [
      {
        heading: "What we collect",
        bullets: [
          "Account details: display name, email, phone number and authentication identifiers.",
          "Squad details: team name, tag, IGNs, BGMI UIDs and WhatsApp contact for match-day coordination.",
          "Booking details: scrim, slot, drop location, payment status, order reference and UTR when supplied.",
          "Technical data: IP address, device/browser information and security logs needed to prevent abuse.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To hold slots, verify payments, run custom rooms, publish results, pay prizes and provide support. We also use aggregated, non-identifying data to improve lobby scheduling and the website.",
          "We do not sell your data. We do not share your phone number or email with other squads. Public pages show only your team name, tag and colour.",
        ],
      },
      {
        heading: "Room credentials",
        body: [
          "Custom-room IDs and passwords are stored separately from public lobby data. They are visible only to confirmed registrations in My Matches and unlock shortly before kickoff. Sharing credentials with unregistered squads can void your entry.",
        ],
      },
      {
        heading: "Processors",
        body: [
          "We use Supabase for authentication and database hosting, Vercel for application hosting, and YouPI or a UPI payment provider for checkout. Each processor receives only the data required for its function. Payment credentials and gateway secrets stay on the server.",
        ],
      },
      {
        heading: "Retention and your rights",
        body: [
          "Match, payment and payout records are kept for accounting and dispute resolution. You can request a copy or deletion of your account data by emailing the desk. Some records may be retained where required by law or to resolve an active dispute.",
          `To make a request, email ${BRAND.supportEmail} from your registered address. We respond within 30 days.`,
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use local storage for your session and, in demo mode, to keep sample bookings in your browser. We do not use advertising cookies. Clearing your browser storage signs you out of a demo build.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact the desk",
    eyebrow: "Human support",
    description:
      "Payment stuck, roster issue or a result dispute? Send the team tag and order ID — a real person replies.",
    icon: MessageCircle,
    updated: "Support hours 10:00–02:00 IST, daily",
    sections: [
      {
        heading: "Fastest routes",
        bullets: [
          `WhatsApp: ${BRAND.supportWhatsapp ? `+${BRAND.supportWhatsapp.replace(/\D/g, "")}` : "available from your profile once configured"}. Include your team tag, lobby and order ID.`,
          `Email: ${BRAND.supportEmail}. Best for refunds, privacy requests and documents.`,
          "In-app: open My Matches and use the support link from the affected booking.",
        ],
      },
      {
        heading: "What to include",
        bullets: [
          "Team name and tag, plus the captain's registered WhatsApp number.",
          "Scrim title and start time (or the order ID from checkout).",
          "UTR and amount for direct UPI payments.",
          "Screenshots or POV clips for result disputes — send links rather than large attachments.",
        ],
      },
      {
        heading: "Response times",
        body: [
          "During lobby hours we aim to reply within 15 minutes on WhatsApp. Refund and privacy requests are answered within one business day. Result disputes must be raised within 30 minutes of the final match.",
        ],
      },
    ],
  },
};

const ORDER = ["terms", "refund", "privacy", "contact"];

export function generateStaticParams() {
  return ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return { title: "Legal" };
  return {
    title: doc.title,
    description: doc.description,
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();
  const Icon = doc.icon;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-8 sm:px-6">
          <Badge tone="violet">
            <Icon className="size-3" /> {doc.eyebrow}
          </Badge>
          <h1 className="display mt-3 text-[clamp(2.5rem,11vw,3.7rem)] leading-[0.9] tracking-[-0.045em] text-mist">
            {doc.title}
            <span className="text-violet">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted sm:text-xs">{doc.description}</p>
          <p className="mt-4 flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em] text-muted/50">
            <span className="h-px w-4 bg-violet/40" />
            Last updated · {doc.updated}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-[8px] font-extrabold uppercase tracking-[0.18em] text-muted/60">
            The fine print
          </p>
          <nav className="grid grid-cols-2 gap-1.5 lg:flex lg:flex-col">
            {ORDER.map((item) => {
              const entry = DOCS[item];
              const active = item === slug;
              return (
                <Link
                  key={item}
                  href={`/legal/${item}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-full border px-3 py-2.5 text-[8.5px] font-bold uppercase tracking-[0.06em] transition lg:px-3.5 lg:text-[9px] lg:tracking-[0.08em]",
                    active
                      ? "border-violet/45 bg-violet/[0.12] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.14)]"
                      : "border-white/[0.07] bg-white/[0.02] text-muted hover:border-white/15 hover:text-mist",
                  )}
                >
                  {entry.title}
                  <ArrowUpRight className="size-3 opacity-50" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 lg:block">
            <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-violet">
              <Mail className="size-3" /> Need a human?
            </p>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="mt-2 block break-all text-[9px] leading-relaxed text-muted hover:text-mist"
            >
              {BRAND.supportEmail}
            </a>
            {BRAND.supportWhatsapp ? (
              <a
                href={`https://wa.me/${BRAND.supportWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonClass("secondary", "sm"), "mt-3 w-full")}
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            ) : (
              <Link href="/legal/contact" className={cn(buttonClass("secondary", "sm"), "mt-3 w-full")}>
                Contact the desk
              </Link>
            )}
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          {doc.sections.map((section, index) => (
            <section
              key={section.heading}
              className={cn(index > 0 && "border-t border-white/[0.06] pt-7")}
            >
              <p className="mb-2 text-[7.5px] font-extrabold uppercase tracking-[0.2em] text-violet/80">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="font-display text-[20px] font-bold uppercase leading-tight tracking-[-0.025em] text-mist">
                {section.heading.replace(/^\d+\.\s*/, "")}
              </h2>
              {section.body?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-[12px] leading-[1.85] text-muted/90"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3.5 space-y-2.5">
                  {section.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[12px] leading-[1.8] text-muted/90"
                    >
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-violet/70 shadow-[0_0_8px_rgba(183,166,255,0.45)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet">
              <FileText className="size-3.5" /> Still unsure?
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              These pages are a plain-language summary, not legal advice. If a dispute reaches a
              formal stage, the signed agreement and payment records control. Talk to the desk first —
              almost everything is easier to fix before kickoff.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/legal/contact" className={cn(buttonClass("secondary", "sm"))}>
                Contact support
              </Link>
              <Link href="/scrims" className={cn(buttonClass("ghost", "sm"))}>
                Back to lobbies <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
