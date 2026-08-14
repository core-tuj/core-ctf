-- =============================================================================
-- CORE CTF — 07. Admin membaca hint
--
-- `hints.hint_text` tidak di-GRANT SELECT ke role `authenticated` — termasuk
-- untuk admin, karena semua user login memakai role Postgres yang sama.
-- Aturan itu benar untuk pemain, tapi membuat admin tidak bisa MENYUNTING hint
-- yang sudah ada: form-nya tidak punya cara mengisi nilai awal.
--
-- RPC ini membuka satu celah sempit: hanya admin, hanya untuk satu challenge,
-- dan hanya untuk hint (flag tetap tidak pernah bisa dibaca siapa pun).
-- =============================================================================

create or replace function public.admin_list_hints(p_challenge_id uuid)
returns table (
  id          uuid,
  hint_text   text,
  cost        integer,
  order_index smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.hint_text, h.cost, h.order_index
    from public.hints h
   where h.challenge_id = p_challenge_id
     and public.is_admin()
   order by h.order_index;
$$;

revoke all on function public.admin_list_hints(uuid) from public;
grant execute on function public.admin_list_hints(uuid) to authenticated;

-- =============================================================================
-- `has_flag` pada challenges_board
--
-- Form admin perlu tahu apakah sebuah challenge sudah punya flag, supaya bisa
-- menampilkan "kosongkan bila tidak diganti" vs "wajib diisi". Hash-nya sendiri
-- tetap tidak boleh keluar, jadi yang diekspos hanya boolean-nya.
--
-- PENTING: `has_flag` harus berada di URUTAN TERAKHIR.
-- `create or replace view` hanya boleh MENAMBAH kolom di akhir; menyisipkan
-- kolom di tengah dibaca Postgres sebagai upaya mengganti nama kolom yang
-- sudah ada dan ditolak dengan "cannot change name of view column"
-- (SQLSTATE 42P16). Urutan kolom lain harus sama persis dengan migrasi 06.
-- =============================================================================
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
  -- kolom baru, wajib paling akhir (lihat catatan di atas)
  (c.flag_hash is not null) as has_flag
from public.challenges c;

-- View dibuat ulang, jadi hak aksesnya harus diberikan ulang.
revoke all on public.challenges_board from anon, authenticated;
grant select on public.challenges_board to authenticated;
