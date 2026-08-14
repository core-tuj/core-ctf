-- =============================================================================
-- CORE CTF — 08. Perbaikan: has_flag membuat challenges_board tertolak
--
-- MASALAH
--   Migrasi 07 menambahkan `(c.flag_hash is not null) as has_flag` ke
--   challenges_board. View itu memakai `security_invoker = true`, jadi
--   pemeriksaan hak akses memakai hak PEMANGGIL — dan `flag_hash` adalah satu-
--   satunya kolom yang sengaja tidak pernah di-GRANT ke `authenticated`.
--
--   Akibatnya seluruh view gagal dibaca dengan
--   "permission denied for table challenges" (SQLSTATE 42501), bukan hanya
--   kolom itu. Halaman /challenges ikut mati untuk semua orang.
--
-- PERBAIKAN
--   `has_flag` dihitung lewat fungsi SECURITY DEFINER. Fungsi berjalan dengan
--   hak pemiliknya, membaca flag_hash di dalam, dan hanya mengembalikan
--   boolean. View tidak lagi menyentuh kolom itu, jadi tidak butuh GRANT —
--   dan hash-nya tetap tidak pernah keluar.
-- =============================================================================

create or replace function public.challenge_has_flag(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select c.flag_hash is not null
    from public.challenges c
   where c.id = p_challenge_id;
$$;

comment on function public.challenge_has_flag(uuid) is
  'Mengembalikan apakah challenge sudah punya flag. Hanya boolean — hash tidak pernah dikembalikan.';

revoke all on function public.challenge_has_flag(uuid) from public;
grant execute on function public.challenge_has_flag(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- View dibuat ulang. Nama, tipe, dan URUTAN kolom harus identik dengan
-- migrasi 07 (has_flag tetap paling akhir) — `create or replace view` menolak
-- perubahan nama atau posisi kolom. Yang berubah hanya isi ekspresinya.
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
  (select count(*) from public.solves s where s.challenge_id = c.id) as solve_count,
  (select count(*) from public.hints h where h.challenge_id = c.id) as hint_count,
  exists (
    select 1
      from public.solves s
     where s.challenge_id = c.id
       and (
         s.user_id = (select auth.uid())
         or exists (
           select 1
             from public.profiles p
            where p.id = s.user_id
              and p.team_id is not null
              and p.team_id = public.current_team_id()
         )
       )
  ) as solved_by_me,
  (
    select pr.name
      from public.solves s
      join public.profiles pr on pr.id = s.user_id
     where s.challenge_id = c.id
       and s.is_first_blood
     limit 1
  ) as first_blood_by,
  -- lewat fungsi, bukan `c.flag_hash is not null` (lihat catatan di atas)
  public.challenge_has_flag(c.id) as has_flag
from public.challenges c;

revoke all on public.challenges_board from anon, authenticated;
grant select on public.challenges_board to authenticated;
