import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError, apiError, requireAdmin } from "@/lib/supabase/admin";
import { placementPoints } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResultInput = { teamId: string; placement: number; kills: number };
type MatchInput = { matchNo: number; map?: string; results: ResultInput[] };

interface RelationTeam {
  name: string;
  tag: string;
  logo_color: string | null;
}

interface RelationScrim {
  slug: string;
  title: string;
}

interface RegistrationSnapshotRow {
  id: string;
  scrim_id: string;
  slot_no: number | null;
  status: string;
  payment_status: string;
  amount: number;
  order_id: string | null;
  created_at: string;
  team_id: string;
  teams: RelationTeam | RelationTeam[] | null;
  scrims: RelationScrim | RelationScrim[] | null;
  payments:
    | Array<{
        utr: string | null;
        state: string;
        provider: string;
        order_id: string;
        created_at: string;
      }>
    | null;
}

interface SnapshotMatchRow {
  scrim_id: string;
  match_no: number;
  map: string;
  match_results:
    | Array<{ team_id: string; placement: number; kills: number }>
    | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function errorFrom(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request);

    const [scrimsResult, registrationsResult, matchesResult] = await Promise.all([
      admin
        .from("scrims")
        .select(
          "id, slug, title, status, start_at, end_at, total_slots, entry_fee, prize_pool, featured, matches_count, scrim_rooms(room_id, room_pass)",
        )
        .order("start_at", { ascending: false }),
      admin
        .from("registrations")
        .select(
          "id, scrim_id, slot_no, status, payment_status, amount, order_id, created_at, team_id, teams(name, tag, logo_color), scrims(slug, title), payments(utr, state, provider, order_id, created_at)",
        )
        .order("created_at", { ascending: false })
        .limit(300),
      admin
        .from("matches")
        .select("scrim_id, match_no, map, match_results(team_id, placement, kills)")
        .order("match_no", { ascending: true }),
    ]);

    errorFrom(scrimsResult);
    errorFrom(registrationsResult);
    errorFrom(matchesResult);

    const scrims = ((scrimsResult.data as unknown as Array<{
      id: string;
      slug: string;
      title: string;
      status: string;
      start_at: string;
      end_at: string;
      total_slots: number;
      entry_fee: number;
      prize_pool: number;
      featured: boolean;
      matches_count: number;
      scrim_rooms:
        | { room_id: string | null; room_pass: string | null }
        | Array<{ room_id: string | null; room_pass: string | null }>
        | null;
    }>) ?? []).map((row) => {
      const room = one(row.scrim_rooms);
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        startAt: row.start_at,
        endAt: row.end_at,
        totalSlots: row.total_slots,
        entryFee: row.entry_fee,
        prizePool: row.prize_pool,
        featured: row.featured,
        matchesCount: row.matches_count,
        roomId: room?.room_id ?? null,
        roomPass: room?.room_pass ?? null,
      };
    });

    const teamsByScrim: Record<
      string,
      Array<{
        id: string;
        name: string;
        tag: string;
        logoColor: string;
        slot: number | null;
        status: string;
      }>
    > = {};

    const registrations = ((registrationsResult.data as unknown as RegistrationSnapshotRow[]) ?? [])
      .map((row) => {
        const team = one(row.teams);
        const scrim = one(row.scrims);
        if (!team || !scrim) return null;
        const payment = [...(row.payments ?? [])].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        )[0];
        const bucket = teamsByScrim[row.scrim_id] ?? [];
        if (!bucket.some((entry) => entry.id === row.team_id)) {
          bucket.push({
            id: row.team_id,
            name: team.name,
            tag: team.tag,
            logoColor: team.logo_color ?? "#C8FF3D",
            slot: row.slot_no,
            status: row.status,
          });
        }
        teamsByScrim[row.scrim_id] = bucket;
        return {
          id: row.id,
          scrimId: row.scrim_id,
          scrimSlug: scrim.slug,
          scrimTitle: scrim.title,
          teamId: row.team_id,
          teamName: team.name,
          teamTag: team.tag,
          logoColor: team.logo_color ?? "#C8FF3D",
          slot: row.slot_no,
          status: row.status,
          paymentStatus: row.payment_status,
          amount: row.amount,
          orderId: row.order_id ?? payment?.order_id ?? null,
          utr: payment?.utr ?? null,
          provider: payment?.provider ?? null,
          createdAt: row.created_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const matchesByScrim: Record<
      string,
      Array<{
        matchNo: number;
        map: string;
        results: Array<{ teamId: string; placement: number; kills: number }>;
      }>
    > = {};
    for (const row of (matchesResult.data as unknown as SnapshotMatchRow[]) ?? []) {
      const bucket = matchesByScrim[row.scrim_id] ?? [];
      bucket.push({
        matchNo: row.match_no,
        map: row.map,
        results: (row.match_results ?? [])
          .map((result) => ({
            teamId: result.team_id,
            placement: result.placement,
            kills: result.kills,
          }))
          .sort((a, b) => a.placement - b.placement),
      });
      matchesByScrim[row.scrim_id] = bucket.sort((a, b) => a.matchNo - b.matchNo);
    }

    return Response.json({ scrims, registrations, teamsByScrim, matchesByScrim });
  } catch (cause) {
    return apiError(cause);
  }
}

async function currentSlug(scrimId: string, admin: Awaited<ReturnType<typeof requireAdmin>>["admin"]) {
  const { data } = await admin.from("scrims").select("slug").eq("id", scrimId).maybeSingle();
  return data?.slug ?? null;
}

function revalidateScrim(slug: string | null) {
  revalidatePath("/");
  revalidatePath("/scrims");
  revalidatePath("/leaderboard");
  revalidatePath("/standings");
  if (slug) {
    revalidatePath(`/scrims/${slug}`);
    revalidatePath(`/scrims/${slug}/standings`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== "string") {
      throw new ApiError(400, "BAD_REQUEST", "action is required.");
    }

    switch (body.action) {
      case "payment.confirm": {
        const registrationId = String(body.registrationId ?? "");
        if (!registrationId) throw new ApiError(400, "BAD_REQUEST", "registrationId is required.");

        const { data: registration } = await admin
          .from("registrations")
          .select("id, scrim_id")
          .eq("id", registrationId)
          .maybeSingle();
        if (!registration) throw new ApiError(404, "NOT_FOUND", "Registration not found.");

        const utr = typeof body.utr === "string" ? body.utr.replace(/\D/g, "").slice(0, 12) : null;
        await admin
          .from("registrations")
          .update({ status: "confirmed", payment_status: "paid" })
          .eq("id", registrationId);
        await admin
          .from("payments")
          .update({
            state: "paid",
            last_event: "ADMIN_CONFIRMED",
            ...(utr ? { utr } : {}),
          })
          .eq("registration_id", registrationId);

        revalidateScrim(await currentSlug(registration.scrim_id, admin));
        return Response.json({ ok: true });
      }

      case "payment.reject": {
        const registrationId = String(body.registrationId ?? "");
        if (!registrationId) throw new ApiError(400, "BAD_REQUEST", "registrationId is required.");
        const { data: registration } = await admin
          .from("registrations")
          .select("id, scrim_id")
          .eq("id", registrationId)
          .maybeSingle();
        if (!registration) throw new ApiError(404, "NOT_FOUND", "Registration not found.");

        await admin
          .from("registrations")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", registrationId);
        await admin
          .from("payments")
          .update({ state: "cancelled", last_event: "ADMIN_REJECTED" })
          .eq("registration_id", registrationId);

        revalidateScrim(await currentSlug(registration.scrim_id, admin));
        return Response.json({ ok: true });
      }

      case "scrim.update": {
        const scrimId = String(body.scrimId ?? "");
        if (!scrimId) throw new ApiError(400, "BAD_REQUEST", "scrimId is required.");
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") patch.status = body.status;
        if (typeof body.featured === "boolean") patch.featured = body.featured;
        if (Object.keys(patch).length) {
          const { error } = await admin.from("scrims").update(patch).eq("id", scrimId);
          if (error) throw error;
        }

        const roomId = typeof body.roomId === "string" ? body.roomId.trim() : null;
        const roomPass = typeof body.roomPass === "string" ? body.roomPass.trim() : null;
        if (roomId !== null || roomPass !== null) {
          const { error } = await admin.from("scrim_rooms").upsert({
            scrim_id: scrimId,
            room_id: roomId,
            room_pass: roomPass,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        }

        revalidateScrim(await currentSlug(scrimId, admin));
        return Response.json({ ok: true });
      }

      case "results.save": {
        const scrimId = String(body.scrimId ?? "");
        const matches = Array.isArray(body.matches) ? (body.matches as MatchInput[]) : [];
        if (!scrimId) throw new ApiError(400, "BAD_REQUEST", "scrimId is required.");
        if (!matches.length) throw new ApiError(400, "BAD_REQUEST", "At least one match is required.");

        for (const match of matches) {
          if (!match || !Number.isInteger(match.matchNo) || !Array.isArray(match.results)) {
            throw new ApiError(400, "BAD_MATCH", "Each match needs matchNo and results.");
          }

          const { data: row, error: upsertError } = await admin
            .from("matches")
            .upsert(
              {
                scrim_id: scrimId,
                match_no: match.matchNo,
                map: (match.map ?? "ERANGEL").toUpperCase(),
              },
              { onConflict: "scrim_id,match_no" },
            )
            .select("id")
            .single();
          if (upsertError) throw upsertError;

          await admin.from("match_results").delete().eq("match_id", row.id);

          const results = match.results
            .filter((result) => result && result.teamId)
            .map((result) => {
              const placement = Math.max(1, Math.min(100, Number(result.placement) || 1));
              const kills = Math.max(0, Number(result.kills) || 0);
              return {
                match_id: row.id,
                team_id: result.teamId,
                placement,
                kills,
                points: placementPoints(placement) + kills,
              };
            });

          if (results.length) {
            const { error: insertError } = await admin.from("match_results").insert(results);
            if (insertError) throw insertError;
          }
        }

        await admin.from("scrims").update({ status: "completed" }).eq("id", scrimId);
        revalidateScrim(await currentSlug(scrimId, admin));
        return Response.json({ ok: true });
      }

      default:
        throw new ApiError(400, "UNKNOWN_ACTION", `Unknown action: ${body.action}`);
    }
  } catch (cause) {
    return apiError(cause);
  }
}
