-- =============================================================================
-- CORE CTF — 09. solve_feed
--
-- Notifikasi Realtime hanya menerima baris `solves` mentah — berisi id, bukan
-- nama. Sebelumnya hanya first blood yang butuh detail, jadi cukup
-- `first_blood_feed`. Sekarang SETIAP solve memunculkan notifikasi, jadi
-- dibutuhkan view yang sama tanpa filter.
--
-- `first_blood_feed` dibiarkan apa adanya untuk halaman riwayat.
-- =============================================================================

create or replace view public.solve_feed
with (security_invoker = true) as
select
  s.id             as solve_id,
  s.created_at,
  s.points_awarded,
  s.is_first_blood,
  c.id             as challenge_id,
  c.title          as challenge_title,
  c.category       as challenge_category,
  p.id             as user_id,
  p.name           as user_name,
  p.avatar_url,
  p.total_score    as user_total_score,
  -- Tim yang ditampilkan adalah keanggotaan SEKARANG, sejalan dengan cara
  -- skor tim dihitung sejak migrasi 06.
  t.id             as team_id,
  t.name           as team_name
from public.solves s
join public.challenges c on c.id = s.challenge_id
join public.profiles p   on p.id = s.user_id
left join public.teams t on t.id = p.team_id
order by s.created_at desc;

revoke all on public.solve_feed from anon, authenticated;
grant select on public.solve_feed to authenticated;
