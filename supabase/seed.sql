-- ============================================================================
-- FEARLESS ESPORTS · sample lobbies
-- Run after supabase/schema.sql. Safe to re-run: rows are upserted by slug.
--
-- Only lobbies are seeded. Teams, registrations and results require real auth
-- users, so they are created through the app instead of this file.
-- ============================================================================

insert into public.scrims (
  slug, title, subtitle, description, game, mode, map, tier, banner,
  start_at, end_at, registration_closes_at, entry_fee, prize_pool, per_kill,
  total_slots, status, featured, matches_count, rules, prizes
)
values
  (
    'daily-grind-128',
    'DAILY GRIND #128',
    'The 9-to-11 lobby. Bring your A-game.',
    'Our flagship nightly scrim. Tier-checked squads, three matches, live admin marshals and a flat ₹1,000 pot. This is where the ladder gets real.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'daily', 'lime',
    now() + interval '2 hours',
    now() + interval '4 hours',
    now() + interval '1 hour 40 minutes',
    60, 1000, 10, 18, 'open', true, 3,
    '[]'::jsonb,
    '[{"place":"1ST","amount":500},{"place":"2ND","amount":300},{"place":"3RD","amount":200}]'::jsonb
  ),
  (
    'advance-lobby-44',
    'ADVANCE LOBBY',
    'For squads that already know the drill.',
    'Higher entry, sharper lobbies. Limited to 16 invited and tier-verified teams with three matches on Erangel and Miramar.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'premium', 'violet',
    now() + interval '4 hours',
    now() + interval '6 hours',
    now() + interval '3 hours 40 minutes',
    80, 1200, 12, 16, 'open', false, 3,
    '[]'::jsonb,
    '[{"place":"1ST","amount":600},{"place":"2ND","amount":400},{"place":"3RD","amount":200}]'::jsonb
  ),
  (
    'free-grind-77',
    'FREE GRIND',
    'Zero pressure. Full points.',
    'A low-stakes practice lobby for new squads. Two matches, relaxed pacing, and a small prize on the line. Perfect first scrim.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'free', 'ice',
    now() + interval '1 hour',
    now() + interval '2 hours 40 minutes',
    now() + interval '40 minutes',
    10, 100, 5, 16, 'open', false, 2,
    '[]'::jsonb,
    '[{"place":"1ST","amount":100},{"place":"2ND","amount":0},{"place":"3RD","amount":0}]'::jsonb
  ),
  (
    'weekend-war-5k',
    'WEEKEND WAR 5K',
    'Five matches. One weekend. ₹5,000.',
    'The weekly flagship. Five matches across Erangel, Miramar and Sanhok with the biggest pot on the calendar. Top 18 squads only.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR · SANHOK', 'weekly', 'ember',
    now() + interval '2 days',
    now() + interval '2 days 3 hours 30 minutes',
    now() + interval '2 days' - interval '20 minutes',
    399, 5000, 15, 18, 'open', false, 5,
    '[]'::jsonb,
    '[{"place":"1ST","amount":2500},{"place":"2ND","amount":1500},{"place":"3RD","amount":1000}]'::jsonb
  ),
  (
    'midnight-mayhem-09',
    'MIDNIGHT MAYHEM',
    'When the lobby sleeps, the grind begins.',
    'Late-night custom room for night owls. Two fast matches, no stream, pure scrim. 18 slots, first come first served.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'daily', 'violet',
    now() + interval '6 hours',
    now() + interval '7 hours 30 minutes',
    now() + interval '5 hours 40 minutes',
    50, 800, 8, 18, 'open', false, 2,
    '[]'::jsonb,
    '[{"place":"1ST","amount":400},{"place":"2ND","amount":250},{"place":"3RD","amount":150}]'::jsonb
  ),
  (
    'daily-grind-live',
    'DAILY GRIND — LIVE LOBBY',
    'Match one is underway. Slot list locked.',
    'The lobby is live. Watch the points table update after every match. Registered teams can find room credentials in My Matches.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'daily', 'lime',
    now() - interval '38 minutes',
    now() + interval '82 minutes',
    now() - interval '58 minutes',
    60, 1000, 10, 18, 'live', false, 3,
    '[]'::jsonb,
    '[{"place":"1ST","amount":500},{"place":"2ND","amount":300},{"place":"3RD","amount":200}]'::jsonb
  ),
  (
    'nightfall-finals',
    'NIGHTFALL FINALS',
    'The season closer. 16 squads. One crown.',
    'Three matches decided the Nightfall crown. Full points table, match-wise results and MVP stats are live below.',
    'BGMI', 'TPP SQUAD', 'ERANGEL · MIRAMAR', 'premium', 'ember',
    now() - interval '1 day',
    now() - interval '22 hours',
    now() - interval '1 day 20 minutes',
    149, 10000, 15, 16, 'completed', false, 3,
    '[]'::jsonb,
    '[{"place":"1ST","amount":5000},{"place":"2ND","amount":3000},{"place":"3RD","amount":2000}]'::jsonb
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  game = excluded.game,
  mode = excluded.mode,
  map = excluded.map,
  tier = excluded.tier,
  banner = excluded.banner,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  registration_closes_at = excluded.registration_closes_at,
  entry_fee = excluded.entry_fee,
  prize_pool = excluded.prize_pool,
  per_kill = excluded.per_kill,
  total_slots = excluded.total_slots,
  status = excluded.status,
  featured = excluded.featured,
  matches_count = excluded.matches_count,
  prizes = excluded.prizes;

-- Shared rulebook used by every seeded lobby.
update public.scrims
set rules = jsonb_build_array(
  'Squad must join the custom room 10 minutes before the scheduled start. Late entries forfeit the slot.',
  'Only registered BGMI IDs may play. Impersonation or account sharing means instant disqualification.',
  'No emulators, controllers, teaming, or third-party tools. Screen recording may be requested for verification.',
  'One team per slot. A team may not enter the same scrim twice with a different roster.',
  'POV clips must be kept for 24 hours after the match. Failure to submit on request can void results.',
  'Abusive comms, stream sniping and targeted griefing carry a 1-event ban. Repeat offences are permanent.',
  'Prize payouts go to the registered IGL''s UPI within 24 hours of verified results.',
  'Admin decisions on disputes are final. Submit clips within 30 minutes of match end.'
)
where slug in (
  'daily-grind-128',
  'advance-lobby-44',
  'free-grind-77',
  'weekend-war-5k',
  'midnight-mayhem-09',
  'daily-grind-live',
  'nightfall-finals'
);

-- Room credentials for the example live lobby.
insert into public.scrim_rooms (scrim_id, room_id, room_pass)
select id, '884 219', 'FORGE9'
from public.scrims
where slug = 'daily-grind-live'
on conflict (scrim_id) do update set
  room_id = excluded.room_id,
  room_pass = excluded.room_pass,
  updated_at = now();
