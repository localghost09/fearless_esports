import { NextRequest } from "next/server";
import { CRON_SECRET } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: NextRequest) {
  // Local runs without a secret are allowed so the route can be tested.
  if (!CRON_SECRET) return process.env.NODE_ENV !== "production";

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-cron-secret")?.trim();
  return bearer === CRON_SECRET || header === CRON_SECRET;
}

export async function GET(request: NextRequest) {
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

  const { data, error } = await admin.rpc("release_stale_holds");
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ released: data ?? 0 });
}
