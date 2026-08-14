-- =============================================================================
-- CORE CTF — 04. RPC (API database)
--
-- Semua aksi yang mengubah skor / membuka rahasia lewat fungsi SECURITY
-- DEFINER, bukan lewat INSERT langsung dari client. Alasannya:
--   * plaintext flag tidak pernah dibandingkan di client;
--   * perhitungan poin, penalti hint, dan first blood atomik dalam 1 transaksi;
--   * player tidak butuh GRANT INSERT ke solves / hint_unlocks sama sekali.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- admin_set_flag() — satu-satunya cara mengisi/mengganti flag.
-- Admin mengirim plaintext, database yang menghash (bcrypt, cost 10).
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_flag(
  p_challenge_id uuid,
  p_flag         text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengubah flag'
      using errcode = '42501';
  end if;

  if btrim(coalesce(p_flag, '')) = '' then
    raise exception 'Flag tidak boleh kosong' using errcode = '22023';
  end if;

  update public.challenges
     set flag_hash = extensions.crypt(btrim(p_flag), extensions.gen_salt('bf', 10))
   where id = p_challenge_id;

  if not found then
    raise exception 'Challenge tidak ditemukan' using errcode = 'P0002';
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- -----------------------------------------------------------------------------
-- submit_flag() — inti dari platform.
--
-- Alur: auth -> challenge aktif? -> rate limit -> sudah solve? -> cek hash
--       -> catat submission -> (kalau benar) advisory lock -> hitung penalti
--       -> tentukan first blood -> insert solve (trigger menambah skor).
--
-- Return jsonb:
--   { status: 'correct',        points, first_blood, total_score }
--   { status: 'wrong'         , message }
--   { status: 'already_solved', message }
--   { status: 'rate_limited'  , message }
--   { status: 'not_found'     , message }
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
  c_rate_limit  constant integer := 10;   -- percobaan
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

  -- Rate limit anti brute-force flag
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

  -- Sudah pernah solve? (cek individu DAN tim)
  if exists (
    select 1
      from public.solves s
     where s.challenge_id = p_challenge_id
       and (
         s.user_id = v_user
         or (v_team is not null and s.team_id = v_team)
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

  -- Serialisasi per-challenge: dua submit benar yang datang bersamaan tidak
  -- boleh sama-sama mengklaim first blood.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_challenge_id::text, 0::bigint)
  );

  v_first_blood := not exists (
    select 1 from public.solves s where s.challenge_id = p_challenge_id
  );

  -- Penalti = total biaya hint yang sudah dibuka untuk challenge ini oleh
  -- user atau timnya. DISTINCT ON hint_id supaya satu hint tidak dihitung dua
  -- kali (mis. user pernah unlock solo lalu bergabung ke tim).
  select coalesce(sum(u.cost_at_unlock), 0)
    into v_penalty
    from (
      select distinct on (hu.hint_id) hu.hint_id, hu.cost_at_unlock
        from public.hint_unlocks hu
       where hu.challenge_id = p_challenge_id
         and (
           hu.user_id = v_user
           or (v_team is not null and hu.team_id = v_team)
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
      -- kalah balapan di detik terakhir
      return jsonb_build_object(
        'status', 'already_solved',
        'message', 'Challenge ini sudah diselesaikan.'
      );
  end;

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
-- unlock_hint() — membuka hint dan mengembalikan teksnya.
--
-- Idempoten: memanggil ulang tidak menambah penalti. Kalau hint sudah dibuka
-- rekan setim, user langsung dapat teksnya tanpa biaya tambahan.
-- Biaya baru terasa saat submit flag (mengurangi points_awarded).
-- -----------------------------------------------------------------------------
create or replace function public.unlock_hint(p_hint_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_team      uuid;
  v_hint      record;
  v_already   boolean;
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
         or (v_team is not null and hu.team_id = v_team)
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
    'status',       case when v_already then 'already_unlocked' else 'unlocked' end,
    'hint_id',      v_hint.id,
    'hint_text',    v_hint.hint_text,
    'cost',         v_hint.cost,
    'charged',      (not v_already) and v_hint.cost > 0
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- my_hints() — state panel hint untuk satu challenge.
-- Hint yang belum dibuka mengembalikan hint_text = null.
-- -----------------------------------------------------------------------------
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
           or (me.team_id is not null and hu.team_id = me.team_id)
         )
    ) as unlocked
  ) u
  where h.challenge_id = p_challenge_id
  order by h.order_index;
$$;

-- -----------------------------------------------------------------------------
-- Manajemen tim
--
-- Aturan yang disengaja: pindah/masuk/keluar tim hanya boleh saat user belum
-- punya solve sama sekali. Tanpa aturan ini, skor individu dan skor tim jadi
-- tidak konsisten (solve lama tidak pernah masuk ke tim baru, dan memindahkan
-- poin akan double-count kalau dua anggota pernah solve challenge yang sama).
-- -----------------------------------------------------------------------------
create or replace function public.assert_can_change_team(p_user uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.solves s where s.user_id = p_user) then
    raise exception 'Tidak bisa ganti tim setelah punya solve. Hubungi admin.'
      using errcode = 'P0001';
  end if;
end;
$$;

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

  perform public.assert_can_change_team(v_user);

  begin
    insert into public.teams (name, join_code, created_by)
    values (btrim(p_name), public.generate_join_code(), v_user)
    returning * into v_team;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'error', 'message', 'Nama tim sudah dipakai.');
  end;

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

  perform public.assert_can_change_team(v_user);

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

  perform public.assert_can_change_team(v_user);

  update public.profiles set team_id = null where id = v_user;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- -----------------------------------------------------------------------------
-- GRANT EXECUTE
-- -----------------------------------------------------------------------------
revoke all on function public.admin_set_flag(uuid, text)   from public;
revoke all on function public.submit_flag(uuid, text)      from public;
revoke all on function public.unlock_hint(uuid)            from public;
revoke all on function public.my_hints(uuid)               from public;
revoke all on function public.assert_can_change_team(uuid) from public;
revoke all on function public.create_team(text)            from public;
revoke all on function public.join_team(text)              from public;
revoke all on function public.leave_team()                 from public;

grant execute on function public.admin_set_flag(uuid, text) to authenticated;
grant execute on function public.submit_flag(uuid, text)    to authenticated;
grant execute on function public.unlock_hint(uuid)          to authenticated;
grant execute on function public.my_hints(uuid)             to authenticated;
grant execute on function public.create_team(text)          to authenticated;
grant execute on function public.join_team(text)            to authenticated;
grant execute on function public.leave_team()               to authenticated;
