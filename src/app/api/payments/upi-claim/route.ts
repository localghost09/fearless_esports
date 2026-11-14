import { NextRequest } from "next/server";
import { ApiError, apiError, getSupabaseAdmin, requireUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new ApiError(503, "NOT_CONFIGURED", "Supabase service role is not configured.");
    }

    const body = (await request.json().catch(() => null)) as {
      orderId?: string;
      utr?: string;
    } | null;
    const orderId = body?.orderId?.trim();
    const utr = body?.utr?.replace(/\D/g, "") ?? "";

    if (!orderId) throw new ApiError(400, "BAD_REQUEST", "orderId is required.");
    if (utr.length !== 12) {
      throw new ApiError(400, "BAD_UTR", "Enter the 12-digit UTR from your UPI app.");
    }

    const { data, error } = await admin
      .from("payments")
      .select("id, registration_id, provider, state, registrations(owner_id, status)")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw error;

    const payment = data as unknown as {
      id: string;
      registration_id: string;
      provider: string;
      state: string;
      registrations:
        | { owner_id: string; status: string }
        | Array<{ owner_id: string; status: string }>
        | null;
    } | null;
    const registration = Array.isArray(payment?.registrations)
      ? payment?.registrations[0]
      : payment?.registrations;

    if (!payment || !registration || registration.owner_id !== user.id) {
      throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    }
    if (payment.provider !== "upi") {
      throw new ApiError(409, "WRONG_PROVIDER", "This order is verified automatically.");
    }
    if (payment.state === "paid") {
      return Response.json({ ok: true, state: "paid" });
    }

    const { data: duplicate } = await admin
      .from("payments")
      .select("id, order_id")
      .eq("utr", utr)
      .neq("order_id", orderId)
      .maybeSingle();
    if (duplicate) {
      throw new ApiError(409, "UTR_ALREADY_USED", "That UTR is already attached to another order.");
    }

    const { error: paymentError } = await admin
      .from("payments")
      .update({ utr, state: "awaiting_verification", last_event: "UTR_SUBMITTED" })
      .eq("id", payment.id);
    if (paymentError) throw paymentError;

    await admin
      .from("registrations")
      .update({ status: "awaiting_verification", payment_status: "processing" })
      .eq("id", payment.registration_id)
      .in("status", ["pending_payment", "awaiting_verification"]);

    return Response.json({ ok: true, state: "awaiting" });
  } catch (cause) {
    return apiError(cause);
  }
}
