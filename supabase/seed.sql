-- =============================================================================
-- CORE CTF — seed data (DEVELOPMENT ONLY)
--
-- Dijalankan otomatis oleh `supabase db reset` pada environment lokal.
-- JANGAN dipakai di production: flag di bawah ini plaintext di dalam file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Contoh challenge. Flag di-hash bcrypt lewat pgcrypto, sama seperti yang
-- dilakukan RPC admin_set_flag().
-- -----------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.challenges) then
    raise notice 'Tabel challenges sudah berisi data, seed dilewati.';
    return;
  end if;

  -- 1) Web ------------------------------------------------------------------
  insert into public.challenges
    (title, category, description, static_score, flag_format, is_active, author, flag_hash)
  values (
    'Cookie Monster',
    'web',
    E'Halaman admin ini memeriksa cookie `role`. Sepertinya mereka lupa menandatanganinya.\n\nTarget: https://example.ctf/cookie-monster',
    100,
    'CTF{...}',
    true,
    'admin',
    extensions.crypt('CTF{c00k13_t4mp3r1ng_1s_fun}', extensions.gen_salt('bf', 10))
  )
  returning id into v_id;

  insert into public.hints (challenge_id, hint_text, cost, order_index) values
    (v_id, 'Buka DevTools > Application > Cookies.', 0,  1),
    (v_id, 'Ubah nilai cookie `role` dari `guest` menjadi `admin`.', 20, 2);

  -- 2) Crypto ---------------------------------------------------------------
  insert into public.challenges
    (title, category, description, static_score, flag_format, is_active, author, file_url, flag_hash)
  values (
    'Rotten XIII',
    'crypto',
    E'Kami menemukan pesan ini di server lama. Isinya terlihat seperti bahasa alien.\n\n`PGS{ebg13_arire_qvrf}`',
    50,
    'CTF{...}',
    true,
    'admin',
    null,
    extensions.crypt('CTF{rot13_never_dies}', extensions.gen_salt('bf', 10))
  )
  returning id into v_id;

  insert into public.hints (challenge_id, hint_text, cost, order_index) values
    (v_id, 'Namanya sudah memberi tahu jumlah pergeserannya.', 0, 1);

  -- 3) Forensics ------------------------------------------------------------
  insert into public.challenges
    (title, category, description, static_score, flag_format, is_active, author, file_url, flag_hash)
  values (
    'Hidden In Plain Sight',
    'forensics',
    'Gambar ini terlihat biasa saja, tapi ukurannya mencurigakan besar. Periksa metadata dan data setelah penanda akhir file.',
    150,
    'CTF{...}',
    true,
    'admin',
    'https://example.ctf/files/hidden.png',
    extensions.crypt('CTF{str1ngs_4nd_b1nw4lk}', extensions.gen_salt('bf', 10))
  )
  returning id into v_id;

  insert into public.hints (challenge_id, hint_text, cost, order_index) values
    (v_id, 'Coba `strings` dulu sebelum tool yang lebih rumit.', 0,  1),
    (v_id, '`binwalk -e` akan mengekstrak arsip yang ditempel di belakang PNG.', 30, 2);

  -- 4) Pwn (draft, belum aktif) ---------------------------------------------
  insert into public.challenges
    (title, category, description, static_score, is_active, author, connection_info, flag_hash)
  values (
    'Stack Warmup',
    'pwn',
    'Buffer overflow klasik tanpa proteksi. Belum dipublikasikan.',
    200,
    false,
    'admin',
    'nc pwn.example.ctf 1337',
    extensions.crypt('CTF{sm4sh1ng_th3_st4ck}', extensions.gen_salt('bf', 10))
  );
end
$$;

-- =============================================================================
-- Menjadikan akun pertama sebagai admin.
--
-- Signup dulu lewat UI (email/password atau Google), baru jalankan query ini
-- di SQL Editor Supabase — ganti alamat emailnya:
--
--   update public.profiles
--      set role = 'admin'
--    where id = (select id from auth.users where email = 'kamu@example.com');
--
-- Verifikasi:
--   select p.name, p.role, u.email
--     from public.profiles p join auth.users u on u.id = p.id;
-- =============================================================================
