# Deployment & payments runbook

Everything below is already provisioned for this repository. Use it as the map
for re-deploying from scratch or for rotating keys.

| Piece | Where it lives |
| --- | --- |
| Frontend | Vercel project `fearless-esports` (team `singhbabumanshu-9592`, Hobby) |
| Production URL | https://fearless-esports-plum.vercel.app |
| Git source | GitHub `localghost09/fearless_esports`, production branch `main` |
| Database + Auth | Supabase project `fe-esports` (`ocucxbahmyirjdyadnjg`, `ap-southeast-2`) |
| Cron | `vercel.json` → `/api/cron/release-holds` daily at 00:00 UTC |

---

## 1. Supabase (database, auth, storage of truth)

### 1.1 Apply the schema

`schema.sql` is idempotent (every object is `if not exists` / `or replace`), so it
is safe to re-run.

```bash
# Option A — SQL editor
#   Dashboard → SQL Editor → paste supabase/schema.sql → Run
#   (then paste supabase/seed.sql → Run)
#
# Option B — CLI
npx supabase link --project-ref ocucxbahmyirjdyadnjg
npx supabase db push
```

What you get:

| Object | Purpose |
| --- | --- |
| `profiles` | One row per `auth.users` row, created by the `on_auth_user_created` trigger. `role` is `player` or `admin`. |
| `teams`, `team_members` | Roster owned by the signed-in user (RLS: owner + admin only). |
| `scrims` | Publicly readable lobbies. |
| `scrim_rooms` | Room ID / password, readable only by admins and **confirmed** players. |
| `registrations` | A team's slot in a lobby: `pending_payment → awaiting_verification → confirmed` (or `cancelled`). |
| `payments` | One row per checkout attempt: `provider`, `order_id`, `state`, `utr`, `raw` gateway payload. |
| `matches`, `match_results` | Public results that feed `season_standings`. |
| `public_slots` view | Public slot board with team tag/colour only. |
| `book_slot()`, `cancel_registration()`, `release_stale_holds()` | RPCs. `book_slot` takes a row lock on the scrim so two players can never grab the same slot. |

`release_stale_holds()` cancels unpaid holds older than 25 minutes. It runs
inside `book_slot()` too, so slot inventory stays correct even if the cron job
has not fired.

### 1.2 Auth settings that matter

Dashboard → Authentication:

- **Site URL** `https://fearless-esports-plum.vercel.app`
- **Redirect URLs** `https://fearless-esports-plum.vercel.app/**` and
  `http://localhost:3000/**` (the app exchanges the PKCE code at
  `/auth/callback`, so `.../auth/callback` must be allowed).
- Email signup is enabled; **Confirm email is currently off** so trial signups
  work immediately on the free tier's shared SMTP. Turn it back on
  (Authentication → Providers → Email → *Confirm email*) once you attach your
  own SMTP/Resend credentials.
- Google sign-in is **not** configured yet. The login page asks
  `GET /auth/v1/settings` which providers are live and hides the Google button
  while it is off (it also translates GoTrue's raw
  `Unsupported provider: provider is not enabled` into a readable message), so
  the deployment degrades cleanly instead of showing a 400.

### 1.3 Google sign-in (optional)

Enabling it is a Dashboard-only change — no secret ever goes in this repo or in
Vercel.

1. **Google Cloud Console** → *APIs & Services* → *Credentials* →
   **Create credentials → OAuth client ID** → *Web application*.
   - Authorised JavaScript origin: `https://fearless-esports-plum.vercel.app`
   - Authorised redirect URI (**Supabase's** callback, not your domain):
     `https://ocucxbahmyirjdyadnjg.supabase.co/auth/v1/callback`
2. Copy the **Client ID** and **Client secret**.
3. **Supabase** → *Authentication → Sign In / Providers → Google* → paste both,
   toggle **Enable**, save.
4. Confirm *Authentication → URL Configuration* still lists
   `https://fearless-esports-plum.vercel.app/**` (it does — see §1.2).
5. Reload `/login`: the "Continue with Google" button appears on its own, and
   `/auth/callback` exchanges the PKCE code for a session.

Scopes needed: `openid`, `email`, `profile` only.

### 1.4 Resetting a password

There is no in-app password form yet. Two supported paths today:

```sql
-- set a new password directly (bcrypt, same hash GoTrue uses)
update auth.users
set encrypted_password = extensions.crypt('<new-password>', extensions.gen_salt('bf')),
    updated_at = now()
where email = '<user@example.com>';
```

…or Supabase → *Authentication → Users* → *Send recovery email*. The recovery
link lands on `/auth/callback` (PKCE) and signs the user in, after which an
in-app "change password" form could call
`supabase.auth.updateUser({ password })`.

### 1.5 Keys

Project Settings → API:

| Key | Goes to | Exposure |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | public |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, RLS applies |
| `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` | **server only** — bypasses RLS |

The browser never sees the service key; only `/api/*` routes read it
(`src/lib/supabase/admin.ts`).

### 1.6 Make yourself an admin

Sign up on the site, then:

```sql
update public.profiles set role = 'admin' where id = '<your-auth-user-id>';
```

The `/admin` control room (verify UPI claims, publish results, set room
credentials) checks `profiles.role` server-side on every request.

---

## 2. Vercel (frontend)

### 2.1 First deploy

1. **Add New → Project → Import Git Repository** `localghost09/fearless_esports`.
2. Framework preset: **Next.js** (nothing else to configure; `vercel.json` only
   declares the cron).
3. Add the environment variables from section 4, then **Deploy**.
4. Every push to `main` ships to production; other branches get preview URLs.

### 2.2 Environment variables

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | all | `https://fearless-esports-plum.vercel.app` — used for metadata, payment return URLs, auth redirects. |
| `NEXT_PUBLIC_SUPABASE_URL` | all | `https://ocucxbahmyirjdyadnjg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | all | sensitive; server routes only |
| `NEXT_PUBLIC_UPI_VPA` | all | direct-UPI mode, see §3.2 |
| `NEXT_PUBLIC_UPI_PAYEE_NAME` | all | shown in the UPI app |
| `NEXT_PUBLIC_YOUPI_BASE_URL` | all | YouPI mode, see §3.1 |
| `NEXT_PUBLIC_YOUPI_MERCHANT_ID` | all | YouPI mode |
| `YOUPI_API_KEY` | all | server only |
| `YOUPI_WEBHOOK_SECRET` | all | server only (HMAC-SHA256 key) |
| `YOUPI_REQUIRE_RECONCILED` | all | `true` in production |
| `CRON_SECRET` | all | Vercel Cron sends `Authorization: Bearer $CRON_SECRET` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_WHATSAPP` | all | support links |

`NEXT_PUBLIC_*` values are baked into the client bundle at build time — **any
change needs a new deployment**, not just a save.

### 2.3 Cron

`vercel.json` schedules two jobs:

| Path | Schedule | Purpose |
| --- | --- | --- |
| `GET /api/cron/release-holds` | `0 0 * * *` | Release slots held by unpaid registrations |
| `GET /api/cron/reconcile-payments` | `30 0 * * *` | Re-ask YouPI about orders still open and settle them (missed-webhook safety net) |

On Hobby, cron jobs may only run **once per day**, so these run at midnight and
00:30 IST respectively. If you want the payment sweep every few minutes, keep
the Vercel job as the daily backstop and additionally call it from
Supabase `pg_cron` + `pg_net`, or from any free scheduler:

```sql
select cron.schedule('reconcile-payments', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://fearless-esports-plum.vercel.app/api/cron/reconcile-payments',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

Both routes refuse to run without `Authorization: Bearer $CRON_SECRET` in
production, and both also accept `POST` plus an `x-cron-secret` header.

### 2.4 Custom domain

Project → Settings → Domains → add `fearlessesports.gg`, point the apex at
Vercel (`A 76.76.21.21`) and `www` at `cname.vercel-dns.com`. Then update
`NEXT_PUBLIC_SITE_URL` **and** the Supabase Site URL / redirect list to the new
domain, and redeploy.

---

## 3. Payments

The provider is chosen at runtime by `getPaymentProvider()` in
`src/lib/config.ts`:

```
YouPI base URL + merchant ID set  → "youpi"
else NEXT_PUBLIC_UPI_VPA set      → "upi"
else                              → "demo"  (real checkout returns 503)
```

### 3.0 Does direct UPI generate a QR code?

Yes. In both `upi` and `demo` modes the checkout sheet renders a real,
scannable UPI QR:

1. `/api/payments/create` builds an NPCI UPI intent URI and stores it on the
   payment row (`raw.upiUri`):

   ```
   upi://pay?pa=<NEXT_PUBLIC_UPI_VPA>&pn=<payee>&am=60.00&cu=INR&tn=<lobby>&tr=FE-XXXX
   ```

   `tr` (transaction reference) is the app's own `order_id`, which is how a
   manual reconciliation later maps a bank credit back to the right slot.
2. The sheet embeds `/api/qr?data=<uri>` — a server route in
   `src/app/api/qr/route.ts` that renders a 512 px PNG with the `qrcode`
   package (dark `#06070A`, white background, error correction M). It is cached
   for an hour and refuses payloads over 512 chars.
3. The same URI backs the **Open UPI app** button (`upi://` deep link), so
   desktop users scan and mobile users tap — same order, same reference.
4. After paying, the player pastes the 12-digit **UTR** from their UPI app. That
   hits `/api/payments/upi-claim`, which rejects duplicates
   (`payments_utr_idx`) and moves the slot to `awaiting_verification`.
5. An admin confirms or rejects the claim in `/admin`
   (`action: "payment.confirm" | "payment.reject"`), which flips `payments.state`
   to `paid`/`failed` and `registrations.status` to `confirmed`/`cancelled`.

In demo mode the app uses `DEMO_UPI_VPA` (`demo.fearlessesports@upi`) and swaps
the UTR form for a **Simulate payment** button, so the same UI can be shown
before keys exist.

### 3.1 YouPI PG (automatic, self-hosted)

YouPI is an open-source UPI payment gateway
(<https://github.com/youpi-pg/YouPI-PG>). You run it yourself (VPS, Railway,
Fly, a spare box) and point the app at it.

1. **Deploy the gateway** following its README; it gives you a base URL such as
   `https://pay.fearlessesports.gg`, a merchant ID, an API key and a webhook
   signing secret.
2. **Set the env vars**

   ```
   NEXT_PUBLIC_YOUPI_BASE_URL=https://pay.fearlessesports.gg
   NEXT_PUBLIC_YOUPI_MERCHANT_ID=fe_live_001
   YOUPI_API_KEY=...            # server only
   YOUPI_WEBHOOK_SECRET=...     # HMAC-SHA256 key
   YOUPI_REQUIRE_RECONCILED=true
   ```

   Leave `NEXT_PUBLIC_UPI_VPA` empty — YouPI wins the provider check.
3. **Register the webhook** in the gateway:

   ```
   POST https://fearless-esports-plum.vercel.app/api/payments/webhook
   Events: RECONCILED, OBSERVED_SUCCESS, MANUAL_REVIEW, FAILED, EXPIRED, CANCELLED
   Header: X-Gateway-Signature: hex(HMAC_SHA256(YOUPI_WEBHOOK_SECRET, rawBody))
   ```

   The route verifies the signature over the **raw** body before parsing, so do
   not let a proxy re-encode the JSON.
4. **Order flow**

   | Step | Code | Gateway |
   | --- | --- | --- |
   | Create order | `POST /api/payments/create` → `createYoupiSession()` | `POST /api/v1/payments` |
   | Client sees `checkoutUrl` | `PaymentSheet` | hosted UPI page |
   | Browser polls | `GET /api/payments/status?orderId=` → `getYoupiPayment()` | `GET /api/v1/payments/:id` |
   | Gateway calls back | `POST /api/payments/webhook` → `settlePayment()` | — |

5. **State mapping** (`src/app/api/payments/webhook/route.ts`)

   | Gateway event | Result |
   | --- | --- |
   | `RECONCILED` | `paid` if the amount matches to the paisa, else `awaiting_verification` |
   | `OBSERVED_SUCCESS` / `SUCCESS` | `paid` when `YOUPI_REQUIRE_RECONCILED=false`; otherwise held for the desk |
   | `MANUAL_REVIEW`, or any amount mismatch | `awaiting_verification` |
   | `FAILED` / `EXPIRED` / `CANCELLED` | `failed` → slot released |

   Unknown `orderId`s are ACKed with `200 {ignored:true}` so the gateway does not
   retry forever, and a webhook for an already-paid order returns
   `{duplicate:true}` (idempotent).

Keep `YOUPI_REQUIRE_RECONCILED=true` for money: UPI success observed by the
gateway is not proof the money settled. With `false`, slots confirm on observed
success, which is faster at check-in but shifts chargeback risk onto you.

### 3.1.1 Hands-off checklist (no admin approval at all)

Direct-UPI mode always needs a human: a player pays a VPA, types a UTR and an
admin confirms it against the bank statement. YouPI removes that by proving the
credit itself and pushing a signed webhook. To end up with **zero manual
steps**, all of the following have to be true:

1. **Gateway running on a public HTTPS URL** (e.g. `https://pay.fearlessesports.gg`)
   with a merchant ID, an API key and a webhook secret created for this site.
2. **Bank observer online** — YouPI confirms UPI credits from the merchant
   account's bank SMS / alert emails (Android observer APK or Gmail ingestion).
   The phone or mailbox must stay reachable and the account must be the one
   behind your VPA; if the observer goes dark, nothing can auto-confirm.
3. **Webhook registered** at
   `https://fearless-esports-plum.vercel.app/api/payments/webhook` for
   `SUCCESS`, `RECONCILED`, `MANUAL_REVIEW`, `FAILED`, `EXPIRED`, `CANCELLED`,
   signing with `X-Gateway-Signature: sha256=<hex HMAC-SHA256(secret, rawBody)>`.
4. **Env vars in Vercel** (all environments, then redeploy — `NEXT_PUBLIC_*` is
   baked into the bundle):

   ```
   NEXT_PUBLIC_YOUPI_BASE_URL=https://pay.fearlessesports.gg
   NEXT_PUBLIC_YOUPI_MERCHANT_ID=fe_live_001
   YOUPI_API_KEY=...
   YOUPI_WEBHOOK_SECRET=...
   YOUPI_REQUIRE_RECONCILED=false   # true only if you want bank-statement proof
   ```

   Leave `NEXT_PUBLIC_UPI_VPA` **empty**, otherwise the direct-UPI path stays
   selected and every payment still needs an admin click.
5. **Sweep scheduled** — `/api/cron/reconcile-payments` (see §2.3). Webhooks get
   lost; the sweep re-queries the gateway for open orders and settles them
   without anyone opening `/admin`.
6. **Smoke-test it** with a ₹1 lobby: sign in, register, pay from a UPI app,
   then wait for the confirmation screen *without* touching `/admin`. Check
   `/admin → Payments` — nothing should be sitting in **Awaiting**.

What can still land in `awaiting_verification`, by design:

- the paid amount differs from the entry fee by one paisa or more,
- the gateway flags `MANUAL_REVIEW`,
- `YOUPI_REQUIRE_RECONCILED=true` and the credit has not appeared on the bank
  statement yet (it settles itself once `RECONCILED` arrives, and the sweep
  picks it up in the meantime).

Refunds and disputes stay manual — `admin → Payments → Reject` is the only path
that releases a slot after money moved.

### 3.2 Direct UPI (manual, zero fees)

Simplest path — no gateway, no extra service. You need a real VPA you control
(Paytm/PhonePe/GPay/bank UPI ID).

```
NEXT_PUBLIC_UPI_VPA=fearlessesports@ybl
NEXT_PUBLIC_UPI_PAYEE_NAME=Fearless Esports
```

Leave the YouPI vars empty. Checkout then shows the QR + deep link described in
§3.0, and **every payment needs one human step**: open `/admin` → *Payment
claims* → match the UTR/amount against your bank or UPI app statement →
**Confirm**.

Operational rules that keep this honest:

- The slot is only `confirmed` after an admin confirms. `pending_payment` holds
  expire after 25 minutes (`release_stale_holds`), so ghosts do not camp slots.
- Duplicate UTRs are rejected at the database level, so the same screenshot
  cannot pay for two orders.
- Payouts for prizes go back to the IGL's UPI; keep the player's `phone` /
  `whatsapp` from `profiles` / `registrations` as your audit trail.

### 3.3 Which should you use?

| | YouPI PG | Direct UPI |
| --- | --- | --- |
| Setup | deploy a service, configure webhooks | one env var |
| Confirmation | automatic (webhook + polling) | manual, per payment |
| Fees | gateway hosting; UPI itself is free | zero |
| Risk | webhook signing must be correct | someone must watch `awaiting_verification` |
| Best for | 50+ paid slots a day, 24/7 ops | launch week, low volume, testing |

You can start on direct UPI and switch to YouPI later by adding the four YouPI
env vars and redeploying — no code changes, existing rows keep
`provider = 'upi'`.

---

## 4. Go-live checklist

- [ ] `supabase/schema.sql` + `supabase/seed.sql` applied to the project.
- [ ] Supabase Auth Site URL + redirect allow list point at the live domain.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set **only** in Vercel (never `NEXT_PUBLIC_`).
- [ ] At least one of `NEXT_PUBLIC_UPI_VPA` / YouPI vars set, otherwise checkout
      returns `503 PAYMENTS_NOT_CONFIGURED`.
- [ ] `CRON_SECRET` set so `/api/cron/release-holds` is enforced.
- [ ] Your account promoted to `admin` in `profiles`.
- [ ] One live smoke test: book a slot → pay ₹10 lobby → confirm in `/admin` →
      room credentials appear in **My Matches**.
- [ ] Change the `service_role` key and redeploy if it was ever pasted anywhere
      public.
