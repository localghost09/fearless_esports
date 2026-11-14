import type { Metadata } from "next";
import { PaymentReturnClient } from "@/components/payment/payment-return-client";
import { Badge } from "@/components/ui";
import { ReceiptText } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const { orderId } = await searchParams;

  return (
    <div>
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-7 sm:px-6">
          <Badge tone="violet">
            <ReceiptText className="size-3" /> PAYMENT RETURN
          </Badge>
          <h1 className="display mt-3 text-[42px] text-mist sm:text-[52px]">
            Almost in<span className="text-violet">.</span>
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            We&apos;re checking the gateway for your credit. Keep this page open — your slot stays
            held while it settles.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        <PaymentReturnClient orderId={first(orderId)} />
      </div>
    </div>
  );
}
