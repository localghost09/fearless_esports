-- ============================================================================
-- FEARLESS ESPORTS · Supabase schema
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: every object is created with IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  phone text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'player'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Admin helper is needed by several policies, so define it before them.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Users may edit their name / phone, but never their role.
revoke update on public.profiles from authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Teams + roster
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  tag text not null,
  whatsapp text,
  logo_color text default '#C8FF3D',
  created_at timestamptz not null default now()
);

create index if not exists teams_owner_idx on public.teams (owner_id);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  ign text not null,
  uid text not null,
  role text not null default 'Assaulter',
  is_sub boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists team_members_team_idx on public.team_members (team_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select_own" on public.teams;
create policy "teams_select_own" on public.teams
  for select using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own" on public.teams
  for insert with check (auth.uid() = owner_id);

drop policy if exists "teams_update_own" on public.teams;
create policy "teams_update_own" on public.teams
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "teams_delete_own" on public.teams;
create policy "teams_delete_own" on public.teams
  for delete using (auth.uid() = owner_id);

drop policy if exists "members_select_own" on public.team_members;
create policy "members_select_own" on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and (t.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "members_write_own" on public.team_members;
create policy "members_write_own" on public.team_members
  for all using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Scrims (public read, admin write via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.scrims (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  game text not null default 'BGMI',
  mode text not null default 'TPP SQUAD',
  map text not null default 'ERANGEL · MIRAMAR',
  tier text not null default 'daily' check (tier in ('daily', 'weekly', 'premium', 'free')),
  banner text not null default 'lime' check (banner in ('lime', 'ember', 'violet', 'ice')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  registration_closes_at timestamptz not null,
  entry_fee integer not null default 0 check (entry_fee >= 0),
  prize_pool integer not null default 0 check (prize_pool >= 0),
  per_kill integer default 0,
  total_slots integer not null default 18 check (total_slots between 2 and 100),
  status text not null default 'open' check (status in ('open', 'full', 'live', 'completed', 'cancelled')),
  featured boolean not null default false,
  matches_count integer not null default 3,
  rules jsonb not null default '[]'::jsonb,
  prizes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scrims_start_idx on public.scrims (start_at);
create index if not exists scrims_status_idx on public.scrims (status);

alter table public.scrims enable row level security;

drop policy if exists "scrims_public_read" on public.scrims;
create policy "scrims_public_read" on public.scrims for select using (true);

-- Room credentials live in a locked-down table so they can never leak through
-- an anonymous scrims query.
create table if not exists public.scrim_rooms (
  scrim_id uuid primary key references public.scrims (id) on delete cascade,
  room_id text,
  room_pass text,
  updated_at timestamptz not null default now()
);

alter table public.scrim_rooms enable row level security;

drop policy if exists "rooms_for_confirmed_players" on public.scrim_rooms;
create policy "rooms_for_confirmed_players" on public.scrim_rooms
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.registrations r
      where r.scrim_id = scrim_rooms.scrim_id
        and r.owner_id = auth.uid()
        and r.status = 'confirmed'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Registrations + payments
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  scrim_id uuid not null references public.scrims (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete restrict,
  owner_id uuid not null references auth.users (id) on delete cascade,
  slot_no integer,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'awaiting_verification', 'confirmed', 'cancelled', 'waitlist')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'refunded')),
  amount integer not null default 0,
  drop_location text,
  whatsapp text,
  order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slot_no is null or slot_no > 0)
);

create index if not exists registrations_scrim_idx on public.registrations (scrim_id);
create index if not exists registrations_owner_idx on public.registrations (owner_id);
create index if not exists registrations_order_idx on public.registrations (order_id);

-- A slot can only have one live booking per scrim.
create unique index if not exists registrations_live_slot_idx
  on public.registrations (scrim_id, slot_no)
  where status in ('pending_payment', 'awaiting_verification', 'confirmed');

-- A team can only register once per scrim while the booking is live.
create unique index if not exists registrations_live_team_idx
  on public.registrations (scrim_id, team_id)
  where status in ('pending_payment', 'awaiting_verification', 'confirmed');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  provider text not null default 'demo' check (provider in ('demo', 'youpi', 'upi')),
  order_id text not null unique,
  provider_payment_id text,
  amount integer not null,
  state text not null default 'created'
    check (state in ('created', 'pending', 'awaiting_verification', 'paid', 'failed', 'refunded', 'cancelled')),
  utr text,
  last_event text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_registration_idx on public.payments (registration_id);
create unique index if not exists payments_utr_idx
  on public.payments (utr)
  where utr is not null;

alter table public.registrations enable row level security;
alter table public.payments enable row level security;

drop policy if exists "registrations_select_own" on public.registrations;
create policy "registrations_select_own" on public.registrations
  for select using (auth.uid() = owner_id or public.is_admin());

-- No insert/update/delete policies: all writes go through the RPCs below or
-- the service-role admin API. This prevents players from marking themselves
-- as paid/confirmed.

-- ---------------------------------------------------------------------------
-- 5. Matches + results + standings
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  scrim_id uuid not null references public.scrims (id) on delete cascade,
  match_no integer not null,
  map text not null default 'ERANGEL',
  created_at timestamptz not null default now(),
  unique (scrim_id, match_no)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  placement integer not null check (placement between 1 and 100),
  kills integer not null default 0 check (kills >= 0),
  points integer not null default 0,
  unique (match_id, team_id)
);

create index if not exists match_results_team_idx on public.match_results (team_id);

alter table public.matches enable row level security;
alter table public.match_results enable row level security;

drop policy if exists "matches_public_read" on public.matches;
create policy "matches_public_read" on public.matches for select using (true);

drop policy if exists "results_public_read" on public.match_results;
create policy "results_public_read" on public.match_results for select using (true);

-- Only aggregate, already-public data is exposed through this view.
create or replace view public.season_standings as
select
  t.id as team_id,
  t.name,
  t.tag,
  coalesce(t.logo_color, '#C8FF3D') as logo_color,
  count(distinct m.scrim_id)::int as events,
  count(*) filter (where mr.placement = 1)::int as wins,
  coalesce(sum(mr.kills), 0)::int as kills,
  coalesce(sum(mr.points), 0)::int as points
from public.teams t
join public.match_results mr on mr.team_id = t.id
join public.matches m on m.id = mr.match_id
group by t.id, t.name, t.tag, t.logo_color
having count(*) > 0
order by points desc, kills desc;

grant select on public.season_standings to anon, authenticated;

-- Public slot board view: exposes team tag/name/colour only.
create or replace view public.public_slots as
select
  r.id,
  r.scrim_id,
  r.slot_no,
  t.name as team_name,
  t.tag as team_tag,
  coalesce(t.logo_color, '#C8FF3D') as logo_color,
  r.status
from public.registrations r
join public.teams t on t.id = r.team_id
where r.status in ('pending_payment', 'awaiting_verification', 'confirmed')
  and r.slot_no is not null;

revoke all on public.public_slots from anon, authenticated;
grant select on public.public_slots to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.placement_points(p_placement integer)
returns integer
language sql
immutable
as $$
  select case
    when p_placement = 1 then 10
    when p_placement = 2 then 6
    when p_placement = 3 then 5
    when p_placement = 4 then 4
    when p_placement = 5 then 3
    when p_placement = 6 then 2
    when p_placement in (7, 8) then 1
    else 0
  end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registrations_touch on public.registrations;
create trigger registrations_touch
  before update on public.registrations
  for each row execute function public.touch_updated_at();

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch
  before update on public.payments
  for each row execute function public.touch_updated_at();

-- Atomic slot booking. Serialises on the scrim row so two players cannot take
-- the same slot even under concurrent requests.
create or replace function public.book_slot(
  p_scrim_id uuid,
  p_team_id uuid,
  p_slot integer default null,
  p_drop text default null,
  p_whatsapp text default null
)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scrim public.scrims;
  v_team public.teams;
  v_slot integer := p_slot;
  v_reg public.registrations;
  v_status text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Release expired unpaid holds before looking for a free slot. This makes
  -- booking correct even if the cron job has not run recently.
  perform public.release_stale_holds();

  select * into v_scrim from public.scrims where id = p_scrim_id for update;
  if not found then
    raise exception 'SCRIM_NOT_FOUND';
  end if;
  if v_scrim.status not in ('open', 'full') then
    raise exception 'SCRIM_CLOSED';
  end if;
  if v_scrim.registration_closes_at <= now() then
    raise exception 'SCRIM_CLOSED';
  end if;

  select * into v_team from public.teams where id = p_team_id and owner_id = v_uid;
  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.registrations
    where scrim_id = p_scrim_id
      and team_id = p_team_id
      and status in ('pending_payment', 'awaiting_verification', 'confirmed')
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  if v_slot is not null then
    if v_slot < 1 or v_slot > v_scrim.total_slots then
      raise exception 'INVALID_SLOT';
    end if;
    if exists (
      select 1 from public.registrations
      where scrim_id = p_scrim_id
        and slot_no = v_slot
        and status in ('pending_payment', 'awaiting_verification', 'confirmed')
    ) then
      raise exception 'SLOT_TAKEN';
    end if;
  else
    select s into v_slot
    from generate_series(1, v_scrim.total_slots) as s
    where not exists (
      select 1 from public.registrations r
      where r.scrim_id = p_scrim_id
        and r.slot_no = s
        and r.status in ('pending_payment', 'awaiting_verification', 'confirmed')
    )
    order by s
    limit 1;

    if v_slot is null then
      raise exception 'SCRIM_FULL';
    end if;
  end if;

  v_status := case when v_scrim.entry_fee = 0 then 'confirmed' else 'pending_payment' end;

  insert into public.registrations (
    scrim_id, team_id, owner_id, slot_no, status, payment_status,
    amount, drop_location, whatsapp
  )
  values (
    p_scrim_id, p_team_id, v_uid, v_slot, v_status,
    case when v_scrim.entry_fee = 0 then 'paid' else 'unpaid' end,
    v_scrim.entry_fee, p_drop, p_whatsapp
  )
  returning * into v_reg;

  return v_reg;
end;
$$;

grant execute on function public.book_slot(uuid, uuid, integer, text, text) to authenticated;

create or replace function public.cancel_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations;
begin
  select * into v_reg from public.registrations
  where id = p_registration_id and owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if v_reg.status = 'confirmed' then
    raise exception 'CONTACT_SUPPORT_FOR_REFUND';
  end if;

  update public.registrations
  set status = 'cancelled', payment_status = 'failed'
  where id = p_registration_id;

  update public.payments
  set state = 'cancelled'
  where registration_id = p_registration_id and state in ('created', 'pending', 'awaiting_verification');
end;
$$;

grant execute on function public.cancel_registration(uuid) to authenticated;

-- Housekeeping: release unpaid holds after 25 minutes. Call from a cron job
-- (pg_cron or a Vercel cron hitting /api/cron/release-holds).
create or replace function public.release_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with stale as (
    update public.registrations
    set status = 'cancelled', payment_status = 'failed'
    where status = 'pending_payment'
      and created_at < now() - interval '25 minutes'
    returning id
  )
  select count(*) into v_count from stale;

  update public.payments
  set state = 'cancelled'
  where state in ('created', 'pending')
    and created_at < now() - interval '25 minutes';

  return v_count;
end;
$$;

grant execute on function public.release_stale_holds() to service_role;

-- ---------------------------------------------------------------------------
-- 7. Realtime (optional): push slot-board updates to the browser
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.registrations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.scrims;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Make yourself admin after signing up
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where id = '<your-auth-user-id>';
