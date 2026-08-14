-- =============================================================================
-- CORE CTF — 03. Row Level Security + GRANT
--
-- Dua lapis proteksi:
--   1. GRANT level kolom  -> menentukan KOLOM mana yang boleh disentuh role
--                            `authenticated`. Ini yang menyembunyikan
--                            `challenges.flag_hash` dan `hints.hint_text`.
--   2. RLS policy         -> menentukan BARIS mana yang boleh dilihat/diubah,
--                            dan memisahkan hak admin vs player.
--
-- Role `service_role` punya BYPASSRLS — jangan pernah memakai service role key
-- di client. Simpan hanya di server (API route / server action).
-- =============================================================================

-- Mulai dari nol: Supabase memberi hak penuh ke anon/authenticated secara default.
revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.challenges    enable row level security;
alter table public.hints         enable row level security;
alter table public.hint_unlocks  enable row level security;
alter table public.solves        enable row level security;
alter table public.submissions   enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- Semua user login bisa melihat profil orang lain (dibutuhkan leaderboard).
-- User hanya bisa mengubah profilnya sendiri, dan GRANT membatasi ke kolom
-- name + avatar_url — jadi `role` dan `total_score` tidak bisa dinaikkan sendiri.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles: read for authenticated" on public.profiles;
create policy "profiles: read for authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles: update own row" on public.profiles;
create policy "profiles: update own row"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

grant select on public.profiles to authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;
grant delete on public.profiles to authenticated; -- dibatasi policy admin

-- -----------------------------------------------------------------------------
-- teams
-- Dibuat / dimasuki hanya lewat RPC (create_team, join_team), jadi tidak ada
-- GRANT INSERT untuk authenticated.
-- -----------------------------------------------------------------------------
drop policy if exists "teams: read for authenticated" on public.teams;
create policy "teams: read for authenticated"
  on public.teams for select
  to authenticated
  using (true);

drop policy if exists "teams: admin write" on public.teams;
create policy "teams: admin write"
  on public.teams for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "teams: admin delete" on public.teams;
create policy "teams: admin delete"
  on public.teams for delete
  to authenticated
  using (public.is_admin());

grant select on public.teams to authenticated;
grant update (name) on public.teams to authenticated;
grant delete on public.teams to authenticated;

-- -----------------------------------------------------------------------------
-- challenges
-- Player hanya melihat challenge aktif. Admin melihat semua (termasuk draft).
--
-- flag_hash sengaja TIDAK ada di daftar GRANT SELECT. Konsekuensinya:
-- `.select('*')` pada tabel ini akan ditolak database. Pakai view
-- `challenges_board` (migrasi 05) atau sebutkan kolomnya secara eksplisit.
-- -----------------------------------------------------------------------------
drop policy if exists "challenges: read active" on public.challenges;
create policy "challenges: read active"
  on public.challenges for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists "challenges: admin insert" on public.challenges;
create policy "challenges: admin insert"
  on public.challenges for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "challenges: admin update" on public.challenges;
create policy "challenges: admin update"
  on public.challenges for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "challenges: admin delete" on public.challenges;
create policy "challenges: admin delete"
  on public.challenges for delete
  to authenticated
  using (public.is_admin());

grant select (
  id, title, category, description, file_url, connection_info, author,
  static_score, flag_format, is_active, created_at, updated_at
) on public.challenges to authenticated;

grant insert (
  title, category, description, file_url, connection_info, author,
  static_score, flag_format, is_active
) on public.challenges to authenticated;

grant update (
  title, category, description, file_url, connection_info, author,
  static_score, flag_format, is_active
) on public.challenges to authenticated;

grant delete on public.challenges to authenticated;

-- -----------------------------------------------------------------------------
-- hints
-- Metadata hint (biaya, urutan) boleh dilihat semua orang supaya tombol
-- "Unlock Hint" bisa menampilkan harganya. `hint_text` tidak di-GRANT SELECT,
-- jadi isinya hanya bisa keluar lewat RPC unlock_hint() / my_hints().
-- -----------------------------------------------------------------------------
drop policy if exists "hints: read metadata of active challenges" on public.hints;
create policy "hints: read metadata of active challenges"
  on public.hints for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.challenges c
      where c.id = hints.challenge_id
        and c.is_active
    )
  );

drop policy if exists "hints: admin insert" on public.hints;
create policy "hints: admin insert"
  on public.hints for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "hints: admin update" on public.hints;
create policy "hints: admin update"
  on public.hints for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "hints: admin delete" on public.hints;
create policy "hints: admin delete"
  on public.hints for delete
  to authenticated
  using (public.is_admin());

grant select (id, challenge_id, cost, order_index, created_at)
  on public.hints to authenticated;
-- hint_text boleh ditulis (RLS membatasi ke admin) tapi tidak boleh dibaca
grant insert (challenge_id, hint_text, cost, order_index) on public.hints to authenticated;
grant update (challenge_id, hint_text, cost, order_index) on public.hints to authenticated;
grant delete on public.hints to authenticated;

-- -----------------------------------------------------------------------------
-- hint_unlocks
-- Hanya bisa dibuat lewat RPC unlock_hint().
-- -----------------------------------------------------------------------------
drop policy if exists "hint_unlocks: read own or team" on public.hint_unlocks;
create policy "hint_unlocks: read own or team"
  on public.hint_unlocks for select
  to authenticated
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or (team_id is not null and team_id = public.current_team_id())
  );

drop policy if exists "hint_unlocks: admin delete" on public.hint_unlocks;
create policy "hint_unlocks: admin delete"
  on public.hint_unlocks for delete
  to authenticated
  using (public.is_admin());

grant select on public.hint_unlocks to authenticated;
grant delete on public.hint_unlocks to authenticated;

-- -----------------------------------------------------------------------------
-- solves
-- Terbuka untuk semua user login: dibutuhkan leaderboard, statistik solve
-- per challenge, dan notifikasi first blood via Realtime.
-- INSERT hanya lewat RPC submit_flag().
-- -----------------------------------------------------------------------------
drop policy if exists "solves: read for authenticated" on public.solves;
create policy "solves: read for authenticated"
  on public.solves for select
  to authenticated
  using (true);

drop policy if exists "solves: admin delete" on public.solves;
create policy "solves: admin delete"
  on public.solves for delete
  to authenticated
  using (public.is_admin());

grant select on public.solves to authenticated;
grant delete on public.solves to authenticated;

-- -----------------------------------------------------------------------------
-- submissions
-- User hanya melihat riwayat submit-nya sendiri; admin melihat semuanya.
-- -----------------------------------------------------------------------------
drop policy if exists "submissions: read own" on public.submissions;
create policy "submissions: read own"
  on public.submissions for select
  to authenticated
  using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists "submissions: admin delete" on public.submissions;
create policy "submissions: admin delete"
  on public.submissions for delete
  to authenticated
  using (public.is_admin());

grant select on public.submissions to authenticated;
grant delete on public.submissions to authenticated;

-- -----------------------------------------------------------------------------
-- Hak eksekusi fungsi helper.
-- Postgres memberi EXECUTE ke PUBLIC secara default; dicabut lalu diberikan
-- eksplisit. is_admin() & current_team_id() dipakai di dalam policy sehingga
-- role `authenticated` wajib punya EXECUTE.
-- -----------------------------------------------------------------------------
revoke all on function public.is_admin(uuid)        from public;
revoke all on function public.current_team_id()     from public;
revoke all on function public.generate_join_code()  from public;

grant execute on function public.is_admin(uuid)    to authenticated;
grant execute on function public.current_team_id() to authenticated;
