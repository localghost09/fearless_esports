# FEARLESS ESPORTS

**Own the lobby.** Daily BGMI scrims and tournaments with real slots, UPI checkout and verified points tables.

Mobile-first, serverless, and free-tier friendly: Next.js on Vercel, Postgres/Auth on Supabase, and the open-source [YouPI PG](https://github.com/youpi-pg/YouPI-PG) gateway for UPI.

**Live:** <https://fearless-esports-plum.vercel.app> — the production deployment of this repo. The full ops runbook (project IDs, env vars, payment wiring) is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## What's inside

- **Lobby browser** — open, live and completed scrims with fill counts, filters and search.
- **Slot board** — pick an open slot, build or reuse a squad, declare a drop location.
- **UPI checkout** — YouPI checkout, direct VPA + UTR claim, or a simulated demo payment.
- **My Matches** — match pass, room credentials (only for confirmed squads), payment status and support links.
- **Standings** — per-match results, placement points, kills, MVP and season leaderboard.
- **Control room** — verify UPI claims, publish results, manage room credentials and feature lobbies.
- **Demo mode** — every screen works with no accounts and no credentials.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, Barlow Condensed + Manrope |
| Data / Auth | Supabase (Postgres, Auth, RLS) |
| Payments | YouPI PG self-hosted, or direct UPI, or demo |
| Hosting | Vercel Hobby + Supabase Free |

---

## Run the demo (no keys)

```bash
git clone <your-repo> fearless-esports
cd fearless-esports
npm install
npm run dev
```

Open <http://localhost:3000>.

With no environment variables the app starts in **demo mode**:

- You are signed in as **Aarav / RIFT ESPORTS** with the admin role.
- Bookings, teams and results persist in `localStorage` under `fearless-esports:v1`.
- Checkout is simulated end to end: book a slot → choose demo payment → see it in **My Matches**.
- The admin desk can edit demo results and standings. Payment and room controls are read-only until Supabase is connected.
- Reset everything from **Profile → Reset demo**.

## Environment modes

| Supabase configured | Payment provider configured | Behaviour |
| --- | --- | --- |
| No | — | Full demo with bundled data and local persistence |
| Yes | No | Live data/auth, checkout blocked with a setup message |
| Yes | YouPI or UPI | Full production flow |

Copy `.env.example` to `.env.local` for live mode.

> `NEXT_PUBLIC_*` values are compiled into the client bundle. Restart `next dev` (and redeploy on Vercel) after changing them.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). This creates profiles, teams, scrims, locked room credentials, registrations, payments, matches, RLS policies, views and the booking RPCs.
3. Run [`supabase/seed.sql`](supabase/seed.sql) to add seven sample lobbies. Re-run it any time to refresh their start times.
4. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)
5. In **Authentication → URL Configuration** set:
   - Site URL: `http://localhost:3000` (and your production URL)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://your-domain.com/auth/callback`
6. **Google sign-in (recommended)** — open **Authentication → Providers → Google**:
   - Create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → *Create credentials* → *OAuth client ID* → **Web application**.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase's callback, not your domain).
   - Paste the client ID and client secret into the Supabase provider settings. The secret stays in Supabase — this app never reads or ships it.
   - Keep the OAuth consent screen scopes to `openid`, `email` and `profile`. No Google API scopes are needed.
   - Enable the provider, then confirm `/auth/callback` is in the redirect allow list from step 5.
7. Create an account in the app, then promote it to admin:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'you@example.com'
);
```

8. Restart the dev server.

The app supports Google sign-in, email + password sign-up/sign-in and magic links. Email confirmation is on by default in Supabase; disable it only for local testing.

**Auth security model**

- Google and email flows use the **PKCE** flow: the verifier stays in the browser and the one-time code is exchanged on `/auth/callback`.
- The Google client secret lives only in Supabase. No provider secret is stored in this repo or sent to the browser.
- `next` redirects are sanitised to same-origin paths (no `//`, `\`, protocol or auth-loop targets), so the callback cannot be used as an open redirect.
- The service-role key is server-only; every admin API re-checks the bearer token and `profiles.role = 'admin'`.
- Production responses send `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy and a locked-down permissions policy.

### What lives where

| Data | Access |
| --- | --- |
| Lobbies, matches, results | Public read |
| Slot board (`public_slots` view) | Public read — team name/tag/colour only |
| Profiles, squads, registrations, payments | Owner or admin, via RLS |
| Room ID/password (`scrim_rooms`) | Confirmed squads and admins only |
| Booking, cancellation, hold release | `security definer` RPCs |
| Payment confirmation, results, room updates | Admin API with service role |

Players cannot insert or update registrations/payments directly. The browser never receives the service-role key.

---

## Payments

### Option A — YouPI PG (recommended)

[YouPI PG](https://github.com/youpi-pg/YouPI-PG) is an open-source, self-hosted UPI payment gateway. Deploy it on any Node host that gives you HTTPS, then create a merchant.

```env
NEXT_PUBLIC_YOUPI_BASE_URL=https://pay.your-domain.com
NEXT_PUBLIC_YOUPI_MERCHANT_ID=your-merchant-id
YOUPI_API_KEY=your-api-key
YOUPI_WEBHOOK_SECRET=your-webhook-secret
YOUPI_REQUIRE_RECONCILED=true
```

- Checkout calls `POST /api/v1/payments` server-side with `X-Merchant-Id` and an idempotency key.
- Set the YouPI webhook URL to `https://your-domain.com/api/payments/webhook`.
- Webhooks are verified as `sha256=<HMAC-SHA256(rawBody, secret)>` from `X-Gateway-Signature`.
- Supported events: `OBSERVED_SUCCESS`, `RECONCILED`, `MANUAL_REVIEW`, `SUCCESS`, `FAILED`, `EXPIRED`, `CANCELLED`.

**Reconciliation warning:** YouPI documents that only `RECONCILED` means the money is statement-verified. Set `YOUPI_REQUIRE_RECONCILED=true` in production so `OBSERVED_SUCCESS`/`SUCCESS` moves the booking to *awaiting verification* instead of confirming it. The default `false` exists for fast demo deployments.

The payment return page polls `/api/payments/status` (which also checks YouPI directly) so a missed webhook does not strand a paid player.

### Option B — direct UPI

No gateway required. Provide a VPA:

```env
NEXT_PUBLIC_UPI_VPA=yourbrand@upi
NEXT_PUBLIC_UPI_PAYEE_NAME=Your Brand
```

The checkout shows a UPI QR/deep link. The QR is generated server-side by `/api/qr` from the `upi://pay?pa=…&am=…&tr=<order_id>` intent, so the scanned transaction carries the order reference needed for reconciliation. After paying, the player submits the UTR. The booking moves to **awaiting verification**; an admin confirms or rejects it in **/admin → Payments**. A unique index on `payments.utr` stops the same reference being claimed twice.

This mode is manual by design — reconcile the UTR against your bank/UPI statement before confirming.

### Option C — demo

With no payment env vars, checkout is simulated. Live deployments with Supabase but no provider show a setup message instead of accepting money.

### Slot holds

A booking holds its slot for 25 minutes while payment is pending. Expired holds are released by:

- `book_slot()` before every new booking, and
- `release_stale_holds()`, exposed at `GET /api/cron/release-holds`.

`vercel.json` schedules that route daily (Vercel Hobby allows daily crons). For tighter cleanup on Supabase Free, enable **pg_cron** and run every 10 minutes:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'fearless-esports-release-holds',
  '*/10 * * * *',
  $$select public.release_stale_holds();$$
);
```

Set `CRON_SECRET` in Vercel so the route requires `Authorization: Bearer <CRON_SECRET>`.

---

## Deploy to Vercel

Short version — the step-by-step runbook with the actual project IDs lives in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

1. Push the repo to GitHub.
2. Import it in Vercel (framework auto-detected: Next.js).
3. Add the environment variables from `.env.example`. At minimum for live mode:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus one payment provider.
4. Deploy.
5. Add the production domain to **Supabase → Authentication → URL Configuration**.
6. Point the YouPI webhook at the production `/api/payments/webhook` URL.
7. Add `CRON_SECRET` and redeploy so the cron route accepts Vercel's bearer token.

Free-tier notes:

- Supabase Free projects pause after a period of inactivity; the first request after a pause may be slow.
- Vercel Hobby includes the daily cron above. Use pg_cron for 10-minute hold cleanup.
- YouPI is self-hosted. A free Node host or a tunnel is fine for trials; direct UPI mode needs no extra service.

---

## Project layout

```text
src/
  app/
    page.tsx                     landing page
    scrims/                      browser, detail, registration, standings
    my-matches/                  match passes + room credentials
    teams/                       squad + roster manager
    leaderboard/, standings/     season tables
    admin/                       ops desk
    login/, auth/callback/       Supabase auth
    payment/return/              gateway return + polling
    api/payments/                create, status, webhook, UPI claim, QR
    api/admin/                   admin snapshot + mutations
    api/cron/release-holds/      stale hold cleanup
  components/                    UI, shell, lobby, payment, admin
  lib/
    config.ts                    env flags + provider selection
    data.ts                      live/demo data access
    demo/data.ts                 bundled demo lobbies and results
    payments/                    YouPI client + settlement
    supabase/                    browser/admin clients
supabase/
  schema.sql                     tables, RLS, views, RPCs
  seed.sql                       seven sample lobbies
```

## Scripts

```bash
npm run dev      # local dev server
npm run lint     # ESLint
npm run build    # production build
npm start        # serve the production build
```

Requires Node.js 20.9 or newer.

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `YOUPI_API_KEY` and `YOUPI_WEBHOOK_SECRET` server-side. Never prefix them with `NEXT_PUBLIC_`.
- Payment amounts are loaded from the database, not trusted from the client.
- Webhook signatures are compared in constant time against the raw request body.
- Room credentials are isolated in `scrim_rooms`; anonymous scrim queries cannot see them.
- Admin routes verify the Supabase bearer token and `profiles.role = 'admin'` on every request.
- The legal pages under `/legal` are practical templates, not legal advice. Have them reviewed before taking real money.

## Troubleshooting

**Checkout says payments are not configured.** Live mode is active but neither YouPI nor a UPI VPA is set. Add one and restart/redeploy. `NEXT_PUBLIC_*` changes need a rebuild.

**The app still shows demo data.** `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, or the dev server was not restarted.

**Magic link returns to the wrong page.** Add the exact `/auth/callback` URL to Supabase redirect URLs and set `NEXT_PUBLIC_SITE_URL`.

**Webhook returns 401.** `YOUPI_WEBHOOK_SECRET` does not match the gateway, or a proxy changed the raw body.

**Payment succeeded but the slot is unconfirmed.** Check `/api/payments/status?orderId=...`, the webhook delivery log, and `YOUPI_REQUIRE_RECONCILED`. With reconciliation required, confirm the payment in **/admin → Payments** after the gateway marks it `RECONCILED`.

**A completed lobby has no table.** Results have not been published. Open **/admin → Results**, enter placements and kills, then publish.
