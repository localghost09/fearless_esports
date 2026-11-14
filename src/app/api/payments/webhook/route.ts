import { NextRequest } from "next/server";
import { ApiError, apiError, getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyYoupiSignature } from "@/lib/payments/youpi";
import { settlePayment } from "@/lib/payments/settle";
import { YOUPI_REQUIRE_RECONCILED, YOUPI_WEBHOOK_SECRET } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!YOUPI_WEBHOOK_SECRET) {
      throw new ApiError(503, "NOT_CONFIGURED", "YOUPI_WEBHOOK_SECRET is not set.");
    }

    const raw = await request.text();
    const signature = request.headers.get("x-gateway-signature");
    if (!verifyYoupiSignature(raw, signature)) {
      throw new ApiError(401, "BAD_SIGNATURE", "Invalid webhook signature.");
    }

    let payload: {
      event?: string;
      paymentId?: string;
      orderId?: string;
      amountPaise?: number | string;
      amount?: string | number;
      method?: string;
      utr?: string;
      settlementState?: string;
    };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw new ApiError(400, "BAD_JSON", "Webhook body is not valid JSON.");
    }

    const headerEvent = request.headers.get("x-gateway-event");
    const event = String(headerEvent ?? payload.event ?? "").toUpperCase();
    const orderId = payload.orderId;
    if (!orderId || !event) {
      throw new ApiError(400, "BAD_REQUEST", "orderId and event are required.");
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new ApiError(503, "NOT_CONFIGURED", "Supabase service role is not configured.");
    }

    const { data: payment } = await admin
      .from("payments")
      .select("id, amount, state, provider")
      .eq("order_id", orderId)
      .maybeSingle();

    // Always ACK unknown orders so the gateway does not retry forever.
    if (!payment) {
      console.warn("[webhook] unknown order", orderId);
      return Response.json({ ok: true, ignored: true });
    }

    const expectedPaise = Number(payment.amount) * 100;
    const receivedPaise = payload.amountPaise ? Number(payload.amountPaise) : null;
    const amountMatches = receivedPaise === null || Math.abs(receivedPaise - expectedPaise) < 1;

    if (payment.state === "paid" && !["REFUNDED", "FAILED"].includes(event)) {
      return Response.json({ ok: true, duplicate: true });
    }

    let state: "paid" | "awaiting_verification" | "failed" | null = null;

    switch (event) {
      case "RECONCILED":
        state = amountMatches ? "paid" : "awaiting_verification";
        break;
      case "OBSERVED_SUCCESS":
      case "SUCCESS":
        if (!amountMatches) {
          state = "awaiting_verification";
        } else {
          state = YOUPI_REQUIRE_RECONCILED ? "awaiting_verification" : "paid";
        }
        break;
      case "MANUAL_REVIEW":
        state = "awaiting_verification";
        break;
      case "FAILED":
      case "EXPIRED":
      case "CANCELLED":
        state = "failed";
        break;
      default:
        return Response.json({ ok: true, ignored: true, event });
    }

    await settlePayment(admin, {
      orderId,
      state,
      event,
      providerPaymentId: payload.paymentId ?? null,
      utr: payload.utr ?? null,
      raw: payload,
    });

    return Response.json({ ok: true, state });
  } catch (cause) {
    return apiError(cause);
  }
}
