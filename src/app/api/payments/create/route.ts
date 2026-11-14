import { NextRequest } from "next/server";
import { ApiError, apiError, getSupabaseAdmin, requireUser } from "@/lib/supabase/admin";
import { getPaymentProvider, UPI_PAYEE_NAME, UPI_VPA, YOUPI_REQUIRE_RECONCILED } from "@/lib/config";
import { createYoupiSession } from "@/lib/payments/youpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegistrationRow {
  id: string;
  owner_id: string;
  status: string;
  payment_status: string;
  amount: number;
  order_id: string | null;
  slot_no: number | null;
  scrim_id: string;
  teams: { name: string; tag: string } | Array<{ name: string; tag: string }> | null;
  scrims:
    | { title: string; slug: string; entry_fee: number; start_at: string }
    | Array<{ title: string; slug: string; entry_fee: number; start_at: string }>
    | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function newOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `FE-${stamp}-${suffix}`;
}

function buildUpiUri(amount: number, note: string, orderId: string) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE_NAME.slice(0, 40),
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.slice(0, 50),
    tr: orderId.slice(0, 35),
  });
  return `upi://pay?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new ApiError(503, "NOT_CONFIGURED", "Supabase service role is not configured.");
    }

    const body = (await request.json().catch(() => null)) as { registrationId?: string } | null;
    const registrationId = body?.registrationId;
    if (!registrationId) {
      throw new ApiError(400, "BAD_REQUEST", "registrationId is required.");
    }

    const { data, error } = await admin
      .from("registrations")
      .select(
        "id, owner_id, status, payment_status, amount, order_id, slot_no, scrim_id, teams(name, tag), scrims(title, slug, entry_fee, start_at)",
      )
      .eq("id", registrationId)
      .maybeSingle();

    if (error) throw error;
    const registration = data as unknown as RegistrationRow | null;
    if (!registration || registration.owner_id !== user.id) {
      throw new ApiError(404, "NOT_FOUND", "Registration not found.");
    }
    if (registration.status === "confirmed") {
      throw new ApiError(409, "ALREADY_PAID", "This slot is already confirmed.");
    }
    if (!["pending_payment", "awaiting_verification"].includes(registration.status)) {
      throw new ApiError(409, "REGISTRATION_CLOSED", "This registration can no longer be paid.");
    }

    const scrim = one(registration.scrims);
    const team = one(registration.teams);
    if (!scrim || !team) {
      throw new ApiError(409, "INVALID_REGISTRATION", "Lobby details are missing.");
    }

    const amount = Math.max(0, Number(registration.amount || scrim.entry_fee));
    if (amount <= 0) {
      throw new ApiError(400, "FREE_ENTRY", "This lobby does not require payment.");
    }

    const provider = getPaymentProvider();
    if (provider === "demo") {
      throw new ApiError(
        503,
        "PAYMENTS_NOT_CONFIGURED",
        "No payment provider is configured. Add YouPI or a UPI VPA.",
      );
    }

    // Re-use a live checkout session for the same registration.
    const { data: existing } = await admin
      .from("payments")
      .select("*")
      .eq("registration_id", registration.id)
      .in("state", ["created", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && registration.order_id) {
      const raw = (existing.raw ?? {}) as { checkoutUrl?: string; upiUri?: string };
      if (raw.checkoutUrl || raw.upiUri) {
        return Response.json({
          orderId: existing.order_id,
          provider: existing.provider,
          amount: existing.amount,
          checkoutUrl: raw.checkoutUrl,
          upiUri: raw.upiUri,
          requireReconciled: YOUPI_REQUIRE_RECONCILED,
        });
      }
    }

    const origin = new URL(request.url).origin;
    const orderId = newOrderId();

    if (provider === "youpi") {
      const session = await createYoupiSession({
        orderId,
        amount,
        description: `${scrim.title} · slot ${registration.slot_no ?? "auto"}`.slice(0, 120),
        returnUrl: `${origin}/payment/return?orderId=${encodeURIComponent(orderId)}`,
        customer: { name: team.name },
        metadata: {
          registrationId: registration.id,
          scrimId: registration.scrim_id,
          teamTag: team.tag,
          slot: registration.slot_no,
        },
      });

      const { error: insertError } = await admin.from("payments").insert({
        registration_id: registration.id,
        provider: "youpi",
        order_id: orderId,
        provider_payment_id: session.paymentId,
        amount,
        state: "pending",
        raw: session as unknown as Record<string, unknown>,
      });
      if (insertError) throw insertError;

      await admin.from("registrations").update({ order_id: orderId }).eq("id", registration.id);

      return Response.json({
        orderId,
        provider: "youpi",
        amount,
        checkoutUrl: session.checkoutUrl,
        requireReconciled: YOUPI_REQUIRE_RECONCILED,
      });
    }

    const upiUri = buildUpiUri(amount, `Fearless Esports ${scrim.title}`, orderId);
    const { error: insertError } = await admin.from("payments").insert({
      registration_id: registration.id,
      provider: "upi",
      order_id: orderId,
      amount,
      state: "pending",
      raw: { upiUri },
    });
    if (insertError) throw insertError;

    await admin.from("registrations").update({ order_id: orderId }).eq("id", registration.id);

    return Response.json({ orderId, provider: "upi", amount, upiUri });
  } catch (cause) {
    return apiError(cause);
  }
}
