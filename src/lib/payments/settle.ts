import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SettleState = "paid" | "awaiting_verification" | "failed";

export interface SettleInput {
  orderId: string;
  state: SettleState;
  event: string;
  providerPaymentId?: string | null;
  utr?: string | null;
  raw?: unknown;
}

export async function settlePayment(admin: SupabaseClient, input: SettleInput) {
  const { data: payment, error } = await admin
    .from("payments")
    .select("id, registration_id, amount, state, provider")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (error) throw error;
  if (!payment) {
    console.warn("[payments] webhook for unknown order", input.orderId);
    return { found: false as const };
  }

  if (payment.state === "paid") {
    return { found: true as const, alreadyPaid: true, registrationId: payment.registration_id };
  }

  await admin
    .from("payments")
    .update({
      state: input.state,
      last_event: input.event,
      ...(input.providerPaymentId ? { provider_payment_id: input.providerPaymentId } : {}),
      ...(input.utr ? { utr: input.utr } : {}),
      ...(input.raw ? { raw: input.raw as Record<string, unknown> } : {}),
    })
    .eq("id", payment.id);

  if (input.state === "paid") {
    await admin
      .from("registrations")
      .update({ status: "confirmed", payment_status: "paid" })
      .eq("id", payment.registration_id);
  } else if (input.state === "awaiting_verification") {
    await admin
      .from("registrations")
      .update({ status: "awaiting_verification", payment_status: "processing" })
      .eq("id", payment.registration_id)
      .in("status", ["pending_payment", "awaiting_verification"]);
  } else {
    await admin
      .from("registrations")
      .update({ status: "cancelled", payment_status: "failed" })
      .eq("id", payment.registration_id)
      .in("status", ["pending_payment", "awaiting_verification"]);
  }

  const { data: registration } = await admin
    .from("registrations")
    .select("scrim_id, scrims(slug)")
    .eq("id", payment.registration_id)
    .maybeSingle();

  const scrimRelation = registration?.scrims as
    | { slug: string }
    | Array<{ slug: string }>
    | null
    | undefined;
  const slug = Array.isArray(scrimRelation) ? scrimRelation[0]?.slug : scrimRelation?.slug;
  if (slug) {
    revalidatePath("/");
    revalidatePath("/scrims");
    revalidatePath(`/scrims/${slug}`);
    revalidatePath("/my-matches");
  }

  return { found: true as const, alreadyPaid: false, registrationId: payment.registration_id };
}
