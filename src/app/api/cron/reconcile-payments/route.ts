import { NextRequest } from "next/server";
import { CRON_SECRET } from "@/lib/config";
import { isYoupiConfigured, getYoupiPayment } from "@/lib/payments/youpi";
import { interpretYoupiStatus } from "@/lib/payments/reconcile";
import { settlePayment } from "@/lib/payments/settle";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safety net for the YouPI flow.
 *
 * The webhook in /api/payments/webhook is the primary settlement path, and the
 * checkout sheet polls /api/payments/status while it is open. Both go quiet if
 * the gateway cannot reach Vercel (or the player closes the tab), which used to
 * leave a paid slot sitting at "pending" until an admin clicked something.
 *
 * This endpoint asks the gateway directly for every order that is still open
 * and settles it with the same rules, so no human has to touch the desk.
 */

const LOOKBACK_DAYS = 3;
const MAX_ORDERS = 40;
const CONCURRENCY = 5;

function authorised(request: NextRequest) {
  // Local runs without a secret are allowed so the route can be tested.
  if (!CRON_SECRET) return process.env.NODE_ENV !== "production";

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-cron-secret")?.trim();
  return bearer === CRON_SECRET || header === CRON_SECRET;
}

interface OpenPayment {
  id: string;
  order_id: string;
  provider_payment_id: string | null;
  amount: number;
}

async function run(request: NextRequest) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json(
      { error: "Supabase service role is not configured." },
      { status: 503 },
    );
  }

  if (!isYoupiConfigured()) {
    return Response.json(
      { error: "YouPI is not configured; nothing to reconcile." },
      { status: 503 },
    );
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("payments")
    .select("id, order_id, provider_payment_id, amount")
    .eq("provider", "youpi")
    .in("state", ["created", "pending"])
    .not("provider_payment_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(MAX_ORDERS);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const open = (data ?? []) as OpenPayment[];

  const result = {
    checked: open.length,
    paid: 0,
    awaiting: 0,
    failed: 0,
    pending: 0,
    errors: [] as Array<{ orderId: string; error: string }>,
  };

  for (let i = 0; i < open.length; i += CONCURRENCY) {
    const batch = open.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (payment) => {
        try {
          const details = await getYoupiPayment(String(payment.provider_payment_id));
          const verdict = interpretYoupiStatus(details, Number(payment.amount));
          if (!verdict) {
            result.pending += 1;
            return;
          }

          await settlePayment(admin, {
            orderId: payment.order_id,
            state: verdict.state,
            event: verdict.event,
            providerPaymentId: payment.provider_payment_id,
            raw: details,
          });

          if (verdict.state === "paid") result.paid += 1;
          else if (verdict.state === "failed") result.failed += 1;
          else result.awaiting += 1;
        } catch (cause) {
          result.errors.push({
            orderId: payment.order_id,
            error: cause instanceof Error ? cause.message : "unknown error",
          });
        }
      }),
    );
  }

  return Response.json({ ok: true, ...result, truncated: open.length === MAX_ORDERS });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
