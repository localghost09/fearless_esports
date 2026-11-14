import { YOUPI_REQUIRE_RECONCILED } from "@/lib/config";
import type { SettleState } from "@/lib/payments/settle";

export interface YoupiStatusLike {
  status?: string | null;
  amount?: string | number | null;
  amountPaise?: number | string | null;
  utr?: string | null;
  paymentId?: string | null;
}

export interface YoupiVerdict {
  state: SettleState;
  event: string;
}

function amountInRupees(details: YoupiStatusLike) {
  const paise = details.amountPaise;
  if (paise !== null && paise !== undefined && paise !== "") {
    const value = Number(paise);
    if (Number.isFinite(value)) return value / 100;
  }
  const rupees = Number(details.amount ?? 0);
  return Number.isFinite(rupees) ? rupees : 0;
}

/**
 * Single source of truth for "what does this gateway status mean for us".
 * Used by the checkout poll (`/api/payments/status`) and by the background
 * sweep (`/api/cron/reconcile-payments`) so both settle identically.
 *
 * Returns `null` when the payment is still in flight and nothing should change.
 */
export function interpretYoupiStatus(
  details: YoupiStatusLike,
  expectedRupees: number,
): YoupiVerdict | null {
  const status = String(details.status ?? "").toUpperCase();
  const amountMatches = Math.abs(amountInRupees(details) - expectedRupees) < 0.01;

  if (status === "RECONCILED" || status === "RECONCILED_SUCCESS") {
    return { state: "paid", event: status };
  }

  if (status === "SUCCESS" || status === "OBSERVED_SUCCESS" || status === "COMPLETED") {
    if (!amountMatches) return { state: "awaiting_verification", event: "AMOUNT_MISMATCH" };
    if (YOUPI_REQUIRE_RECONCILED) {
      return { state: "awaiting_verification", event: "SUCCESS_AWAITING_RECONCILIATION" };
    }
    return { state: "paid", event: status };
  }

  if (status === "MANUAL_REVIEW") {
    return { state: "awaiting_verification", event: status };
  }

  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") {
    return { state: "failed", event: status };
  }

  return null;
}

/** `/api/payments/status` speaks in short words to the sheet, not raw states. */
export function toClientState(state: SettleState) {
  if (state === "paid") return "paid" as const;
  if (state === "failed") return "failed" as const;
  return "awaiting" as const;
}
