import type { PaymentProvider } from "./types";

export const BRAND = {
  name: "FEARLESS ESPORTS",
  short: "FE",
  tagline: "Forged in the lobby.",
  description:
    "Daily BGMI scrims with real slots, transparent points, and instant prize payouts.",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@fearlessesports.gg",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const YOUPI_BASE_URL =
  process.env.NEXT_PUBLIC_YOUPI_BASE_URL ?? process.env.YOUPI_BASE_URL ?? "";
export const YOUPI_MERCHANT_ID = process.env.NEXT_PUBLIC_YOUPI_MERCHANT_ID ?? "";
export const YOUPI_WEBHOOK_SECRET = process.env.YOUPI_WEBHOOK_SECRET ?? "";
export const YOUPI_API_KEY = process.env.YOUPI_API_KEY ?? "";
export const YOUPI_REQUIRE_RECONCILED =
  (process.env.YOUPI_REQUIRE_RECONCILED ?? "false").toLowerCase() === "true";

export const UPI_VPA = process.env.NEXT_PUBLIC_UPI_VPA ?? "";
export const UPI_PAYEE_NAME = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "Fearless Esports";

export const CRON_SECRET = process.env.CRON_SECRET ?? "";

export function getPaymentProvider(): PaymentProvider {
  if (YOUPI_BASE_URL && YOUPI_MERCHANT_ID) return "youpi";
  if (UPI_VPA) return "upi";
  return "demo";
}

export function isDemoMode() {
  return !isSupabaseConfigured();
}

export const DEMO_UPI_VPA = "demo.fearlessesports@upi";

export const POINTS_SYSTEM = [
  { place: "1ST", points: 10 },
  { place: "2ND", points: 6 },
  { place: "3RD", points: 5 },
  { place: "4TH", points: 4 },
  { place: "5TH", points: 3 },
  { place: "6TH", points: 2 },
  { place: "7TH–8TH", points: 1 },
  { place: "9TH–16TH", points: 0 },
] as const;

export const DROP_LOCATIONS: Record<string, string[]> = {
  Erangel: ["Pochinki", "School", "Rozhok", "Georgopol", "Mylta", "Yasnaya"],
  Miramar: ["Pecado", "Los Leones", "El Pozo", "San Martin", "Hacienda"],
  Sanhok: ["Bootcamp", "Paradise", "Pai Nan", "Camp Alpha", "Ruins"],
  Rondo: ["Danqing", "Gongga", "Longmen", "Xuanmen", "Yu Lin"],
};
