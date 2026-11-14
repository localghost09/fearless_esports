import { NextRequest } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "";
  if (!data || data.length > 512) {
    return new Response("Invalid QR payload", { status: 400 });
  }

  const buffer = await QRCode.toBuffer(data, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#06070AFF", light: "#FFFFFFFF" },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
