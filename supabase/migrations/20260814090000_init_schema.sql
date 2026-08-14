-- =============================================================================
-- CORE CTF — 01. Schema
-- Tabel inti: teams, profiles, challenges, hints, hint_unlocks, solves,
-- submissions.
--
-- Catatan keamanan penting:
--   * `challenges.flag_hash` menyimpan bcrypt hash (pgcrypto), bukan plaintext.
--   * Kolom tersebut TIDAK pernah di-GRANT ke role `authenticated`
--     (lihat migrasi 03), jadi tidak bisa dibaca lewat PostgREST oleh siapa pun
--     — termasuk admin. Verifikasi flag hanya terjadi di dalam RPC submit_flag().
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.user_role as enum ('admin', 'player');
exception
  when duplicate_object then null;
end
$$;

-- Sinkron dengan warna `category.*` di tailwind.config.ts.
-- Tambah kategori baru: alter type public.challenge_category add value 'ppc';
do $$
begin
  create type public.challenge_category as enum (
    'web', 'pwn', 'crypto', 'forensics', 'reverse', 'osint', 'misc'
  );
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- teams
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 2 and 40),
  join_code   text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  total_score integer not null default 0 check (total_score >= 0),
  -- referensi ke auth.users (bukan profiles) supaya tidak circular dependency
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.teams is 'Tim untuk mode kompetisi beregu. join_code dipakai anggota untuk bergabung.';

-- -----------------------------------------------------------------------------
-- profiles  (1:1 dengan auth.users, diisi otomatis oleh trigger on_auth_user_created)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  avatar_url  text,
  role        public.user_role not null default 'player',
  team_id     uuid references public.teams (id) on delete set null,
  total_score integer not null default 0 check (total_score >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles (team_id);
create index if not exists profiles_score_idx   on public.profiles (total_score desc);

comment on column public.profiles.role is
  'player = read challenge + submit flag + unlock hint. admin = CRUD penuh.';
comment on column public.profiles.total_score is
  'Dikelola otomatis oleh trigger apply_solve_score(). Jangan di-update manual.';

-- -----------------------------------------------------------------------------
-- challenges
-- -----------------------------------------------------------------------------
create table if not exists public.challenges (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(btrim(title)) between 2 and 120),
  category        public.challenge_category not null default 'misc',
  description     text not null default '',
  -- link download attachment (Supabase Storage / URL eksternal), boleh kosong
  file_url        text,
  -- misal: nc ctf.example.com 1337
  connection_info text,
  author          text,
  static_score    integer not null default 100 check (static_score between 0 and 10000),
  -- bcrypt hash dari flag. Nullable supaya admin bisa membuat draft challenge
  -- dulu, lalu men-set flag lewat RPC admin_set_flag().
  flag_hash       text,
  -- petunjuk format untuk UI, contoh: 'CTF{...}'
  flag_format     text not null default 'CTF{...}',
  is_active       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- challenge tidak boleh dipublikasikan tanpa flag
  constraint challenges_active_requires_flag
    check (not is_active or flag_hash is not null)
);

create unique index if not exists challenges_title_key on public.challenges (lower(btrim(title)));
create index if not exists challenges_category_idx     on public.challenges (category) where is_active;

comment on column public.challenges.flag_hash is
  'bcrypt hash (extensions.crypt + gen_salt(''bf'')). Tidak pernah di-GRANT ke authenticated.';

-- -----------------------------------------------------------------------------
-- hints
-- -----------------------------------------------------------------------------
create table if not exists public.hints (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  hint_text    text not null check (char_length(btrim(hint_text)) > 0),
  -- 0 = hint gratis. > 0 = mengurangi poin yang didapat saat solve.
  cost         integer not null default 0 check (cost >= 0),
  order_index  smallint not null default 1 check (order_index > 0),
  created_at   timestamptz not null default now(),

  unique (challenge_id, order_index)
);

create index if not exists hints_challenge_idx on public.hints (challenge_id);

comment on column public.hints.hint_text is
  'Rahasia. Tidak di-GRANT ke authenticated; hanya dikembalikan lewat RPC unlock_hint()/my_hints().';

-- -----------------------------------------------------------------------------
-- hint_unlocks
-- -----------------------------------------------------------------------------
create table if not exists public.hint_unlocks (
  id             uuid primary key default gen_random_uuid(),
  hint_id        uuid not null references public.hints (id) on delete cascade,
  -- denormalisasi supaya perhitungan penalti saat submit flag murah
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  team_id        uuid references public.teams (id) on delete set null,
  -- snapshot biaya saat di-unlock, agar perubahan harga hint tidak retroaktif
  cost_at_unlock integer not null default 0 check (cost_at_unlock >= 0),
  created_at     timestamptz not null default now()
);

-- satu user hanya membayar satu hint sekali
create unique index if not exists hint_unlocks_user_hint_key
  on public.hint_unlocks (hint_id, user_id);

-- dalam mode tim, satu hint hanya dibayar sekali per tim
create unique index if not exists hint_unlocks_team_hint_key
  on public.hint_unlocks (hint_id, team_id) where team_id is not null;

create index if not exists hint_unlocks_lookup_idx
  on public.hint_unlocks (challenge_id, user_id);

-- -----------------------------------------------------------------------------
-- solves
-- -----------------------------------------------------------------------------
create table if not exists public.solves (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  team_id        uuid references public.teams (id) on delete set null,
  -- static_score dikurangi total biaya hint yang sudah di-unlock, minimal 0
  points_awarded integer not null default 0 check (points_awarded >= 0),
  is_first_blood boolean not null default false,
  created_at     timestamptz not null default now()
);

-- satu user tidak bisa solve challenge yang sama dua kali
create unique index if not exists solves_user_challenge_key
  on public.solves (challenge_id, user_id);

-- satu tim hanya mendapat poin sekali per challenge
create unique index if not exists solves_team_challenge_key
  on public.solves (challenge_id, team_id) where team_id is not null;

-- garansi level database: hanya boleh ada SATU first blood per challenge,
-- bahkan kalau dua submit benar datang bersamaan
create unique index if not exists solves_first_blood_key
  on public.solves (challenge_id) where is_first_blood;

create index if not exists solves_created_idx on public.solves (created_at desc);
create index if not exists solves_user_idx    on public.solves (user_id);
create index if not exists solves_team_idx    on public.solves (team_id);

-- -----------------------------------------------------------------------------
-- submissions  (audit trail + bahan rate limiting anti brute-force flag)
-- -----------------------------------------------------------------------------
create table if not exists public.submissions (
  id             bigint generated always as identity primary key,
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  team_id        uuid references public.teams (id) on delete set null,
  submitted_flag text not null,
  is_correct     boolean not null,
  created_at     timestamptz not null default now()
);

create index if not exists submissions_user_recent_idx
  on public.submissions (user_id, created_at desc);
create index if not exists submissions_challenge_idx
  on public.submissions (challenge_id, created_at desc);

comment on table public.submissions is
  'Setiap percobaan submit dicatat (benar maupun salah) untuk audit dan rate limit.';
