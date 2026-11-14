import type { Scrim } from "./types";

export function statusMeta(status: Scrim["status"]) {
  switch (status) {
    case "live":
      return { label: "LIVE NOW", tone: "orange" as const };
    case "full":
      return { label: "LOBBY FULL", tone: "neutral" as const };
    case "completed":
      return { label: "FINAL", tone: "outline" as const };
    case "cancelled":
      return { label: "CANCELLED", tone: "red" as const };
    default:
      return { label: "SLOTS OPEN", tone: "lime" as const };
  }
}

export function tierLabel(tier: Scrim["tier"]) {
  return tier === "free" ? "OPEN GRIND" : `${tier.toUpperCase()} SERIES`;
}
