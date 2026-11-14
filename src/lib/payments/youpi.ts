import { createHmac, timingSafeEqual } from "node:crypto";
import { YOUPI_API_KEY, YOUPI_BASE_URL, YOUPI_MERCHANT_ID, YOUPI_WEBHOOK_SECRET } from "@/lib/config";

export interface YoupiSession {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise?: string;
  status: string;
  checkoutUrl: string;
}

export interface YoupiPaymentDetails {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise?: string;
  status: string;
  method?: string;
  verificationLevel?: number;
  completedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface YoupiWebhookPayload {
  event: string;
  paymentId: string;
  orderId: string;
  amount?: string;
  amountPaise?: number;
  currency?: string;
  method?: string;
  utr?: string;
  completedAt?: string;
  settlementState?: string;
  metadata?: Record<string, unknown>;
}

export function isYoupiConfigured() {
  return Boolean(YOUPI_BASE_URL && YOUPI_MERCHANT_ID);
}

function headers(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "X-Merchant-Id": YOUPI_MERCHANT_ID,
    ...(YOUPI_API_KEY ? { Authorization: `Bearer ${YOUPI_API_KEY}` } : {}),
    ...extra,
  };
}

async function youpiFetch(path: string, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${YOUPI_BASE_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `YouPI request failed (${response.status}).`;
      throw new Error(message);
    }
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createYoupiSession(input: {
  orderId: string;
  amount: number;
  description: string;
  returnUrl: string;
  customer?: { name?: string; phoneNumber?: string; email?: string };
  metadata?: Record<string, unknown>;
}): Promise<YoupiSession> {
  const payload = await youpiFetch("/api/v1/payments", {
    method: "POST",
    headers: headers({ "Idempotency-Key": input.orderId }),
    body: JSON.stringify({
      orderId: input.orderId,
      amount: input.amount.toFixed(2),
      currency: "INR",
      description: input.description,
      returnUrl: input.returnUrl,
      customer: input.customer,
      metadata: input.metadata,
    }),
  });

  const checkoutUrl = String(payload.checkoutUrl ?? "");
  const paymentId = String(payload.paymentId ?? "");
  if (!checkoutUrl || !paymentId) {
    throw new Error("YouPI did not return a checkout URL.");
  }

  return {
    paymentId,
    orderId: String(payload.orderId ?? input.orderId),
    amount: String(payload.amount ?? input.amount.toFixed(2)),
    amountPaise: payload.amountPaise ? String(payload.amountPaise) : undefined,
    status: String(payload.status ?? "INITIATED"),
    checkoutUrl,
  };
}

export async function getYoupiPayment(paymentId: string): Promise<YoupiPaymentDetails> {
  const payload = await youpiFetch(`/api/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: headers(),
  });
  return payload as unknown as YoupiPaymentDetails;
}

export function verifyYoupiSignature(rawBody: string, header: string | null) {
  if (!YOUPI_WEBHOOK_SECRET || !header) return false;
  const received = header.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", YOUPI_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
