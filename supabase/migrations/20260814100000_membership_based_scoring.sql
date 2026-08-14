-- =============================================================================
-- CORE CTF — 06. Skor tim berbasis keanggotaan
--
-- Menggantikan aturan lama "tidak boleh ganti tim setelah punya solve".
-- Pemain sekarang boleh bergabung kapan pun, dan solve lamanya ikut menyumbang.
--
-- ATURAN BARU
--   Skor tim = untuk setiap challenge yang pernah diselesaikan minimal satu
--   anggota SAAT INI, ambil poin dari solve yang PALING AWAL.
--
--   Jadi "yang solve duluan yang menyumbang", dan satu challenge tidak pernah
--   dihitung dua kali walau beberapa anggota menyelesaikannya sebelum
--   bergabung. Poin yang diambil adalah poin solve tersebut apa adanya —
--   termasuk potongan hint yang berlaku untuk pemain itu.
--
-- KONSEKUENSI
--   Atribusi memakai `profiles.team_id` (keanggotaan sekarang), bukan
--   `solves.team_id` (keanggotaan saat solve). Kolom `solves.team_id` menjadi
--   catatan historis saja dan tidak lagi dipakai untuk menghitung skor.
--   Efek sampingnya: keluar dari tim juga menarik kembali kontribusinya.
--
--   Skor individu tidak berubah — tetap total poin solve sendiri.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Index unik lama harus dilepas.
--
-- `(challenge_id, team_id) where team_id is not null` dulu menjamin satu tim
-- hanya dapat poin sekali per challenge. Sekarang jaminan itu datang dari
-- DISTINCT ON di recalc_team_score(), sementara index-nya justru menimbulkan
-- konflik palsu: kalau anggota yang dulu solve sudah keluar dari tim, barisnya
-- masih membawa team_id lama dan memblokir anggota lain yang mengerjakan
-- challenge yang sama.
-- -----------------------------------------------------------------------------
drop index if exists public.solves_team_challenge_key;

comment on column public.solves.team_id is
  'Historis: tim pemain saat solve terjadi. Tidak dipakai untuk menghitung skor — lihat recalc_team_score().';

-- -----------------------------------------------------------------------------
-- Perhitungan ulang skor
--
-- Dibuat sebagai recompute penuh, bukan increment. Dengan aturan "yang solve
-- duluan yang menyumbang", satu perubahan keanggotaan bisa mengubah siapa
-- kontributor untuk banyak challenge sekaligus — delta tidak bisa dihitung
-- lokal tanpa mudah melenceng.
-- -----------------------------------------------------------------------------
create or replace function public.recalc_user_score(p_user_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles p
     set total_score = coalesce((
       select sum(s.points_awarded)
         from public.solves s
        where s.user_id = p_user_id
     ), 0)
   where p.id = p_user_id;
$$;

create or replace function public.recalc_team_score(p_team_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.teams t
     set total_score = coalesce((
       select sum(x.points_awarded)
         from (
           -- satu baris per challenge: solve paling awal dari anggota saat ini
           select distinct on (s.challenge_id) s.points_awarded
             from public.solves s
             join public.profiles p on p.id = s.user_id
            where p.team_id = p_team_id
            order by s.challenge_id, s.created_at asc, s.id asc
         ) x
     ), 0)
   where t.id = p_team_id;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: solve masuk / dianulir
-- -----------------------------------------------------------------------------
create or replace function public.apply_solve_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_team uuid;
begin
  if tg_op = 'DELETE' then
    v_user := old.user_id;
  else
    v_user := new.user_id;
  end if;

  perform public.recalc_user_score(v_user);

  select p.team_id into v_team
    from public.profiles p
   where p.id = v_user;

  -- recalc_team_score() tidak melakukan apa-apa kalau v_team null
  perform public.recalc_team_score(v_team);

  return null; -- AFTER trigger: nilai balik diabaikan
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: pindah / masuk / keluar tim
--
-- `after update of team_id` hanya menyala kalau kolom itu disebut dalam
-- statement UPDATE, jadi recalc_user_score() (yang hanya menyentuh
-- total_score) tidak akan memicu rekursi.
-- -----------------------------------------------------------------------------
create or replace function public.apply_team_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.team_id is distinct from new.team_id then
    perform public.recalc_team_score(old.team_id); -- tim lama kehilangan
    perform public.recalc_team_score(new.team_id); -- tim baru mendapat
  end if;

  return null;
end;
$$;

drop trigger if exists profiles_team_membership_change on public.profiles;
create trigger profiles_team_membership_change
  after update of team_id on public.profiles
  for each row
  execute function public.apply_team_membership_change();

-- -----------------------------------------------------------------------------
-- submit_flag(): pengecekan "sudah solve" dan penalti hint kini berbasis
-- keanggotaan sekarang, bukan solves.team_id / hint_unlocks.team_id.
--
-- Tanpa perubahan ini, solve rekan setim yang terjadi SEBELUM ia bergabung
-- (team_id-nya null) tidak akan terdeteksi, dan challenge yang sama bisa
-- dikerjakan ulang oleh anggota lain.
-- -----------------------------------------------------------------------------
create or replace function public.submit_flag(
  p_challenge_id uuid,
  p_flag         text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_rate_limit  constant integer := 10;
  c_rate_window constant interval := interval '1 minute';

  v_user        uuid := auth.uid();
  v_team        uuid;
  v_score       integer;
  v_flag_hash   text;
  v_recent      integer;
  v_correct     boolean;
  v_penalty     integer;
  v_points      integer;
  v_first_blood boolean;
  v_total       integer;
begin
  if v_user is null then
    raise exception 'Harus login untuk submit flag' using errcode = '42501';
  end if;

  select p.team_id into v_team
    from public.profiles p
   where p.id = v_user;

  select c.static_score, c.flag_hash
    into v_score, v_flag_hash
    from public.challenges c
   where c.id = p_challenge_id
     and c.is_active;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'message', 'Challenge tidak ditemukan atau belum aktif.'
    );
  end if;

  select count(*) into v_recent
    from public.submissions s
   where s.user_id = v_user
     and s.created_at > now() - c_rate_window;

  if v_recent >= c_rate_limit then
    return jsonb_build_object(
      'status', 'rate_limited',
      'message', 'Terlalu banyak percobaan. Coba lagi sebentar lagi.'
    );
  end if;

  if exists (
    select 1
      from public.solves s
     where s.challenge_id = p_challenge_id
       and s.user_id = v_user
  ) or (
    v_team is not null and exists (
      select 1
        from public.solves s
        join public.profiles p on p.id = s.user_id
       where s.challenge_id = p_challenge_id
         and p.team_id = v_team
    )
  ) then
    return jsonb_build_object(
      'status', 'already_solved',
      'message', 'Challenge ini sudah diselesaikan.'
    );
  end if;

  v_correct := v_flag_hash is not null
           and extensions.crypt(btrim(p_flag), v_flag_hash) = v_flag_hash;

  insert into public.submissions
    (challenge_id, user_id, team_id, submitted_flag, is_correct)
  values
    (p_challenge_id, v_user, v_team, left(btrim(coalesce(p_flag, '')), 255), v_correct);

  if not v_correct then
    return jsonb_build_object('status', 'wrong', 'message', 'Flag salah.');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_challenge_id::text, 0::bigint)
  );

  v_first_blood := not exists (
    select 1 from public.solves s where s.challenge_id = p_challenge_id
  );

  select coalesce(sum(u.cost_at_unlock), 0)
    into v_penalty
    from (
      select distinct on (hu.hint_id) hu.hint_id, hu.cost_at_unlock
        from public.hint_unlocks hu
       where hu.challenge_id = p_challenge_id
         and (
           hu.user_id = v_user
           or (
             v_team is not null and exists (
               select 1
                 from public.profiles p
                where p.id = hu.user_id
                  and p.team_id = v_team
             )
           )
         )
       order by hu.hint_id, hu.cost_at_unlock desc
    ) u;

  v_points := greatest(v_score - v_penalty, 0);

  begin
    insert into public.solves
      (challenge_id, user_id, team_id, points_awarded, is_first_blood)
    values
      (p_challenge_id, v_user, v_team, v_points, v_first_blood);
  exception
    when unique_violation then
      return jsonb_build_object(
        'status', 'already_solved',
        'message', 'Challenge ini sudah diselesaikan.'
      );
  end;

  -- Trigger sudah menghitung ulang skor sebelum baris ini dieksekusi
  select p.total_score into v_total
    from public.profiles p
   where p.id = v_user;

  return jsonb_build_object(
    'status',      'correct',
    'points',      v_points,
    'penalty',     v_penalty,
    'first_blood', v_first_blood,
    'total_score', v_total
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Hint: kepemilikan unlock juga berbasis keanggotaan sekarang
-- -----------------------------------------------------------------------------
create or replace function public.unlock_hint(p_hint_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_team    uuid;
  v_hint    record;
  v_already boolean;
begin
  if v_user is null then
    raise exception 'Harus login untuk membuka hint' using errcode = '42501';
  end if;

  select p.team_id into v_team
    from public.profiles p
   where p.id = v_user;

  select h.id, h.challenge_id, h.hint_text, h.cost
    into v_hint
    from public.hints h
    join public.challenges c on c.id = h.challenge_id
   where h.id = p_hint_id
     and (c.is_active or public.is_admin());

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'message', 'Hint tidak ditemukan.'
    );
  end if;

  select exists (
    select 1
      from public.hint_unlocks hu
     where hu.hint_id = p_hint_id
       and (
         hu.user_id = v_user
         or (
           v_team is not null and exists (
             select 1
               from public.profiles p
              where p.id = hu.user_id
                and p.team_id = v_team
           )
         )
       )
  ) into v_already;

  if not v_already then
    insert into public.hint_unlocks
      (hint_id, challenge_id, user_id, team_id, cost_at_unlock)
    values
      (p_hint_id, v_hint.challenge_id, v_user, v_team, v_hint.cost)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'status',    case when v_already then 'already_unlocked' else 'unlocked' end,
    'hint_id',   v_hint.id,
    'hint_text', v_hint.hint_text,
    'cost',      v_hint.cost,
    'charged',   (not v_already) and v_hint.cost > 0
  );
end;
$$;

create or replace function public.my_hints(p_challenge_id uuid)
returns table (
  hint_id     uuid,
  order_index smallint,
  cost        integer,
  unlocked    boolean,
  hint_text   text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid, public.current_team_id() as team_id
  )
  select
    h.id,
    h.order_index,
    h.cost,
    u.unlocked,
    case when u.unlocked then h.hint_text end
  from public.hints h
  cross join me
  join public.challenges c
    on c.id = h.challenge_id
   and (c.is_active or public.is_admin())
  cross join lateral (
    select exists (
      select 1
        from public.hint_unlocks hu
       where hu.hint_id = h.id
         and (
           hu.user_id = me.uid
           or (
             me.team_id is not null and exists (
               select 1
                 from public.profiles p
                where p.id = hu.user_id
                  and p.team_id = me.team_id
             )
           )
         )
    ) as unlocked
  ) u
  where h.challenge_id = p_challenge_id
  order by h.order_index;
$$;

-- -----------------------------------------------------------------------------
-- RPC tim: batasan lama dicabut
-- -----------------------------------------------------------------------------
create or replace function public.create_team(p_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team public.teams%rowtype;
begin
  if v_user is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('status', 'error', 'message', 'Nama tim minimal 2 karakter.');
  end if;

  if public.current_team_id() is not null then
    return jsonb_build_object('status', 'error', 'message', 'Kamu sudah tergabung dalam tim.');
  end if;

  begin
    insert into public.teams (name, join_code, created_by)
    values (btrim(p_name), public.generate_join_code(), v_user)
    returning * into v_team;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'error', 'message', 'Nama tim sudah dipakai.');
  end;

  -- Trigger profiles_team_membership_change menarik solve lama ke tim baru
  update public.profiles set team_id = v_team.id where id = v_user;

  return jsonb_build_object(
    'status',    'ok',
    'team_id',   v_team.id,
    'name',      v_team.name,
    'join_code', v_team.join_code
  );
end;
$$;

create or replace function public.join_team(p_join_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team public.teams%rowtype;
begin
  if v_user is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  if public.current_team_id() is not null then
    return jsonb_build_object('status', 'error', 'message', 'Kamu sudah tergabung dalam tim.');
  end if;

  select * into v_team
    from public.teams t
   where t.join_code = upper(btrim(coalesce(p_join_code, '')));

  if not found then
    return jsonb_build_object('status', 'error', 'message', 'Join code tidak valid.');
  end if;

  update public.profiles set team_id = v_team.id where id = v_user;

  return jsonb_build_object(
    'status',  'ok',
    'team_id', v_team.id,
    'name',    v_team.name
  );
end;
$$;

create or replace function public.leave_team()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  update public.profiles set team_id = null where id = v_user;

  return jsonb_build_object('status', 'ok');
end;
$$;

drop function if exists public.assert_can_change_team(uuid);

-- -----------------------------------------------------------------------------
-- View ikut memakai keanggotaan sekarang
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
  ) as first_blood_by
from public.challenges c;

-- solve_count / first_blood_count tim dihitung per challenge unik dari anggota
-- sekarang, sejalan dengan cara total_score dihitung.
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
    count(*)                                  as solve_count,
    count(*) filter (where x.is_first_blood)  as first_blood_count,
    max(x.created_at)                         as last_solve_at
  from (
    select distinct on (s.challenge_id)
           s.challenge_id, s.is_first_blood, s.created_at
      from public.solves s
      join public.profiles p on p.id = s.user_id
     where p.team_id = t.id
     order by s.challenge_id, s.created_at asc, s.id asc
  ) x
) agg
cross join lateral (
  select count(*) as member_count
  from public.profiles m
  where m.team_id = t.id
) mem;

grant select on public.challenges_board  to authenticated;
grant select on public.leaderboard_teams to authenticated;

-- -----------------------------------------------------------------------------
-- RLS hint_unlocks mengikuti aturan yang sama
-- -----------------------------------------------------------------------------
drop policy if exists "hint_unlocks: read own or team" on public.hint_unlocks;
create policy "hint_unlocks: read own or team"
  on public.hint_unlocks for select
  to authenticated
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1
        from public.profiles p
       where p.id = hint_unlocks.user_id
         and p.team_id is not null
         and p.team_id = public.current_team_id()
    )
  );

-- -----------------------------------------------------------------------------
-- Hak eksekusi
-- -----------------------------------------------------------------------------
revoke all on function public.recalc_user_score(uuid) from public;
revoke all on function public.recalc_team_score(uuid) from public;

-- -----------------------------------------------------------------------------
-- Backfill: samakan seluruh skor yang sudah ada dengan aturan baru
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.recalc_user_score(r.id);
  end loop;

  for r in select id from public.teams loop
    perform public.recalc_team_score(r.id);
  end loop;
end
$$;
