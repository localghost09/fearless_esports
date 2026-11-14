import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

let adminClient: SupabaseClient | null = null;

/** Service-role client. Never import this into a client component. */
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!SUPABASE_URL || !serviceKey) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Verifies the Supabase access token that the browser sends with API calls. */
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const token = bearerToken(request);
  if (!token || !isSupabaseConfigured()) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export async function requireUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Sign in to continue.");
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const admin = getSupabaseAdmin();
  if (!admin) throw new ApiError(503, "NOT_CONFIGURED", "Supabase service role is not configured.");
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || data?.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required.");
  }
  return { user, admin };
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function apiError(cause: unknown) {
  if (cause instanceof ApiError) {
    return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
  }
  const message = cause instanceof Error ? cause.message : "Unexpected server error.";
  console.error("[api]", cause);
  return Response.json({ error: message, code: "INTERNAL" }, { status: 500 });
}
