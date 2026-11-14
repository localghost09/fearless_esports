import { NextRequest } from "next/server";
import { ApiError, apiError, getSupabaseAdmin, requireUser } from "@/lib/supabase/admin";
import { YOUPI_REQUIRE_RECONCILED } from "@/lib/config";
import { getYoupiPayment } from "@/lib/payments/youpi";
import { settlePayment } from "@/lib/payments/settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PaymentRow {
  id: string;
  registration_id: string;
  provider: string;
  order_id: string;
  provider_payment_id: string | null;
  amount: number;
  state: string;
  registrations:
    | { owner_id: string; status: string }
    | Array<{ owner_id: string; status: string }>
    | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new ApiError(503, "NOT_CONFIGURED", "Supabase service role is not configured.");
    }

    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) throw new ApiError(400, "BAD_REQUEST", "orderId is required.");

    const { data, error } = await admin
      .from("payments")
      .select("id, registration_id, provider, order_id, provider_payment_id, amount, state, registrations(owner_id, status)")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw error;

    const payment = data as unknown as PaymentRow | null;
    const registration = one(payment?.registrations);
    if (!payment || !registration || registration.owner_id !== user.id) {
      throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    }

    if (payment.state === "paid") return Response.json({ state: "paid" });
    if (payment.state === "awaiting_verification") return Response.json({ state: "awaiting" });
    if (["failed", "cancelled", "refunded"].includes(payment.state)) {
      return Response.json({ state: "failed" });
    }

    if (payment.provider === "upi") {
      return Response.json({ state: "pending" });
    }

    if (payment.provider !== "youpi" || !payment.provider_payment_id) {
      return Response.json({ state: "pending" });
    }

    const details = await getYoupiPayment(payment.provider_payment_id);
    const status = String(details.status ?? "").toUpperCase();
    const paidAmount = Number(details.amount ?? 0);
    const amountMatches = Math.abs(paidAmount - Number(payment.amount)) < 0.01;

    const settle = async (
      state: "paid" | "awaiting_verification" | "failed",
      event: string,
    ) => {
      await settlePayment(admin, {
        orderId,
        state,
        event,
        providerPaymentId: payment.provider_payment_id,
        raw: details,
      });
      return state === "paid" ? "paid" : state === "failed" ? "failed" : "awaiting";
    };

    if (["RECONCILED", "RECONCILED_SUCCESS"].includes(status)) {
      return Response.json({ state: await settle("paid", status) });
    }

    if (["SUCCESS", "OBSERVED_SUCCESS", "COMPLETED"].includes(status)) {
      if (!amountMatches) {
        return Response.json({ state: await settle("awaiting_verification", "AMOUNT_MISMATCH") });
      }
      if (YOUPI_REQUIRE_RECONCILED) {
        return Response.json({
          state: await settle("awaiting_verification", "SUCCESS_AWAITING_RECONCILIATION"),
        });
      }
      return Response.json({ state: await settle("paid", status) });
    }

    if (status === "MANUAL_REVIEW") {
      return Response.json({ state: await settle("awaiting_verification", status) });
    }

    if (["FAILED", "EXPIRED", "CANCELLED"].includes(status)) {
      return Response.json({ state: await settle("failed", status) });
    }

    return Response.json({ state: "pending" });
  } catch (cause) {
    return apiError(cause);
  }
}
