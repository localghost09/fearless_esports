import { NextRequest } from "next/server";
import { ApiError, apiError, getSupabaseAdmin, requireUser } from "@/lib/supabase/admin";
import { getYoupiPayment } from "@/lib/payments/youpi";
import { interpretYoupiStatus, toClientState } from "@/lib/payments/reconcile";
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
    const verdict = interpretYoupiStatus(details, Number(payment.amount));
    if (!verdict) return Response.json({ state: "pending" });

    await settlePayment(admin, {
      orderId,
      state: verdict.state,
      event: verdict.event,
      providerPaymentId: payment.provider_payment_id,
      raw: details,
    });

    return Response.json({ state: toClientState(verdict.state) });
  } catch (cause) {
    return apiError(cause);
  }
}
