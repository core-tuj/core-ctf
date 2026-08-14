-- =============================================================================
-- CORE CTF — 05. Views + Realtime
--
-- Semua view memakai `security_invoker = true` sehingga RLS tabel di bawahnya
-- tetap berlaku (view TIDAK menjadi celah bypass).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- challenges_board — read path utama untuk player.
--
-- Pakai view ini, bukan tabel `challenges`, karena `select('*')` pada tabel
-- akan ditolak (kolom flag_hash tidak di-GRANT). View ini juga sudah membawa
-- solve_count / solved_by_me / hint_count supaya dashboard cukup 1 query.
-- -----------------------------------------------------------------------------
create or replace view public.challenges_board
with (security_invoker = true) as
select
  c.id,
  c.title,
  c.category,
  c.description,
  c.file_url,
  c.connection_info,
  c.author,
  c.static_score,
  c.flag_format,
  c.is_active,
  c.created_at,
  (
    select count(*)
      from public.solves s
     where s.challenge_id = c.id
  ) as solve_count,
  (
    select count(*)
      from public.hints h
     where h.challenge_id = c.id
  ) as hint_count,
  exists (
    select 1
      from public.solves s
     where s.challenge_id = c.id
       and (
         s.user_id = (select auth.uid())
         or (s.team_id is not null and s.team_id = public.current_team_id())
       )
  ) as solved_by_me,
  (
    select pr.name
      from public.solves s
      join public.profiles pr on pr.id = s.user_id
     where s.challenge_id = c.id
       and s.is_first_blood
     limit 1
  ) as first_blood_by
from public.challenges c;

-- -----------------------------------------------------------------------------
-- leaderboard_players — ranking individu.
-- Tie-break: skor sama -> yang lebih dulu mencapainya menang.
-- -----------------------------------------------------------------------------
-- Agregat dihitung lewat LATERAL, bukan LEFT JOIN + GROUP BY. Dengan join biasa
-- setiap baris solve akan dikalikan jumlah anggota tim sehingga solve_count
-- membengkak.
create or replace view public.leaderboard_players
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.avatar_url,
  p.team_id,
  t.name as team_name,
  p.total_score,
  agg.solve_count,
  agg.first_blood_count,
  agg.last_solve_at,
  rank() over (
    order by p.total_score desc, agg.last_solve_at asc nulls last
  ) as rank
from public.profiles p
left join public.teams t on t.id = p.team_id
cross join lateral (
  select
    count(*)                                as solve_count,
    count(*) filter (where s.is_first_blood) as first_blood_count,
    max(s.created_at)                       as last_solve_at
  from public.solves s
  where s.user_id = p.id
) agg;

-- -----------------------------------------------------------------------------
-- leaderboard_teams — ranking tim.
-- -----------------------------------------------------------------------------
create or replace view public.leaderboard_teams
with (security_invoker = true) as
select
  t.id,
  t.name,
  t.total_score,
  mem.member_count,
  agg.solve_count,
  agg.first_blood_count,
  agg.last_solve_at,
  rank() over (
    order by t.total_score desc, agg.last_solve_at asc nulls last
  ) as rank
from public.teams t
cross join lateral (
  select
    count(*)                                as solve_count,
    count(*) filter (where s.is_first_blood) as first_blood_count,
    max(s.created_at)                       as last_solve_at
  from public.solves s
  where s.team_id = t.id
) agg
cross join lateral (
  select count(*) as member_count
  from public.profiles m
  where m.team_id = t.id
) mem;

-- -----------------------------------------------------------------------------
-- first_blood_feed — riwayat first blood (untuk halaman activity / toast awal).
-- -----------------------------------------------------------------------------
create or replace view public.first_blood_feed
with (security_invoker = true) as
select
  s.id           as solve_id,
  s.created_at,
  s.points_awarded,
  c.id           as challenge_id,
  c.title        as challenge_title,
  c.category     as challenge_category,
  p.id           as user_id,
  p.name         as user_name,
  p.avatar_url,
  t.id           as team_id,
  t.name         as team_name
from public.solves s
join public.challenges c on c.id = s.challenge_id
join public.profiles p   on p.id = s.user_id
left join public.teams t on t.id = s.team_id
where s.is_first_blood
order by s.created_at desc;

-- View dibuat setelah `revoke all ... from anon, authenticated` di migrasi 03,
-- jadi hak default Supabase berlaku lagi untuk objek baru — cabut ulang.
revoke all on public.challenges_board    from anon, authenticated;
revoke all on public.leaderboard_players from anon, authenticated;
revoke all on public.leaderboard_teams   from anon, authenticated;
revoke all on public.first_blood_feed    from anon, authenticated;

grant select on public.challenges_board    to authenticated;
grant select on public.leaderboard_players to authenticated;
grant select on public.leaderboard_teams   to authenticated;
grant select on public.first_blood_feed    to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
--
-- Yang dipublikasikan hanya tabel tanpa rahasia:
--   solves   -> trigger notifikasi first blood + refresh leaderboard
--   profiles -> perubahan total_score individu
--   teams    -> perubahan total_score tim
--
-- `challenges` dan `hints` SENGAJA tidak dipublikasikan: payload Realtime
-- mengirim seluruh kolom baris, jadi flag_hash / hint_text akan bocor ke
-- semua subscriber meski GRANT kolom sudah dibatasi.
-- -----------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array['solves', 'profiles', 'teams'] loop
    begin
      execute format(
        'alter publication supabase_realtime add table public.%I', v_table
      );
    exception
      when duplicate_object then null;  -- sudah terdaftar
      when undefined_object then
        raise notice 'Publication supabase_realtime belum ada, lewati %', v_table;
    end;
  end loop;
end
$$;
