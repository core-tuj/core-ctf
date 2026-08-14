-- =============================================================================
-- CORE CTF — 02. Helper functions & triggers
--
-- Semua fungsi SECURITY DEFINER memakai `set search_path = ''` dan nama objek
-- yang fully-qualified. Ini wajib: tanpa itu, penyerang bisa membuat objek
-- bernama sama di schema lain dan membajak eksekusi fungsi.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin() — dipakai di hampir semua RLS policy.
--
-- Harus SECURITY DEFINER: policy di tabel profiles perlu membaca profiles,
-- dan kalau fungsinya SECURITY INVOKER akan terjadi rekursi RLS tanpa henti.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_uid
      and p.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- current_team_id() — team_id user yang sedang login (null = mode individu)
-- -----------------------------------------------------------------------------
create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.team_id
  from public.profiles p
  where p.id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- handle_new_user() — bikin baris profiles otomatis setiap ada signup.
--
-- Google OAuth mengisi raw_user_meta_data->>'full_name'/'name'/'avatar_url';
-- signup email/password biasanya kosong, jadi fallback ke bagian lokal email.
-- Fallback terakhir memakai id supaya signup TIDAK PERNAH gagal karena
-- constraint nama.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
        'player_' || substr(new.id::text, 1, 8)
      ),
      40
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- touch_updated_at()
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

drop trigger if exists challenges_touch_updated_at on public.challenges;
create trigger challenges_touch_updated_at
  before update on public.challenges
  for each row
  execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- apply_solve_score() — satu-satunya tempat total_score berubah.
--
-- INSERT solve  -> tambah skor ke individu, dan ke tim kalau user punya team_id
--                  ("skor masuk ke tim DAN individu").
-- DELETE solve  -> kembalikan skor (dipakai kalau admin menganulir solve).
-- -----------------------------------------------------------------------------
create or replace function public.apply_solve_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
       set total_score = total_score + new.points_awarded
     where id = new.user_id;

    if new.team_id is not null then
      update public.teams
         set total_score = total_score + new.points_awarded
       where id = new.team_id;
    end if;

    return new;
  end if;

  -- DELETE: greatest(...) menjaga constraint total_score >= 0 tetap aman
  update public.profiles
     set total_score = greatest(total_score - old.points_awarded, 0)
   where id = old.user_id;

  if old.team_id is not null then
    update public.teams
       set total_score = greatest(total_score - old.points_awarded, 0)
     where id = old.team_id;
  end if;

  return old;
end;
$$;

drop trigger if exists solves_apply_score on public.solves;
create trigger solves_apply_score
  after insert or delete on public.solves
  for each row
  execute function public.apply_solve_score();

-- -----------------------------------------------------------------------------
-- generate_join_code() — kode 6 karakter A-Z0-9 yang belum dipakai
-- -----------------------------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- tanpa I/O/0/1
  v_code     text;
  v_attempt  integer := 0;
begin
  loop
    v_code := '';
    for _ in 1 .. 6 loop
      v_code := v_code || substr(
        v_alphabet,
        1 + floor(random() * char_length(v_alphabet))::int,
        1
      );
    end loop;

    exit when not exists (
      select 1 from public.teams t where t.join_code = v_code
    );

    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Gagal membuat join code unik setelah 50 percobaan';
    end if;
  end loop;

  return v_code;
end;
$$;
