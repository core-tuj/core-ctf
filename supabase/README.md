# Database — CORE CTF

## Urutan migrasi

Harus dijalankan berurutan; file berikutnya bergantung pada objek di file sebelumnya.

| File | Isi |
|---|---|
| `20260814090000_init_schema.sql` | extension, enum, 7 tabel, index & constraint |
| `20260814090100_helpers_triggers.sql` | `is_admin()`, `current_team_id()`, auto-create profile, trigger skor |
| `20260814090200_rls_grants.sql` | RLS policy + GRANT level kolom |
| `20260814090300_rpc.sql` | `submit_flag()`, `unlock_hint()`, `my_hints()`, tim, `admin_set_flag()` |
| `20260814090400_views_realtime.sql` | view leaderboard/board + publication Realtime |
| `20260814100000_membership_based_scoring.sql` | skor tim berbasis keanggotaan, batasan ganti tim dicabut |
| `20260814110000_admin_hint_read.sql` | `admin_list_hints()` + kolom `has_flag` di `challenges_board` |
| `seed.sql` | data contoh (dev only) |

## Cara apply

**Supabase CLI** (disarankan):

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

**Tanpa CLI**: buka Dashboard → SQL Editor, jalankan isi tiap file secara berurutan.

Setelah itu, jadikan akun Anda admin (signup dulu lewat UI):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'kamu@example.com');
```

## Model data

```
auth.users ──1:1──> profiles ──N:1──> teams
                       │                │
                       ├────────────────┤
                       ▼                ▼
                     solves ──N:1──> challenges ──1:N──> hints
                                          │                │
                                    submissions      hint_unlocks
```

## Keputusan desain

**Flag tidak pernah keluar dari Postgres.** `challenges.flag_hash` menyimpan bcrypt
(`gen_salt('bf', 10)`, salt per baris). Verifikasi hanya terjadi di dalam
`submit_flag()`. Kolom `flag_hash` tidak di-`GRANT SELECT` ke role `authenticated`
sama sekali — termasuk untuk admin. Admin mengganti flag lewat `admin_set_flag()`
dengan mengirim plaintext, database yang menghash.

> Konsekuensi: `.select('*')` pada tabel `challenges` akan ditolak database.
> Gunakan view `challenges_board`, atau sebutkan kolomnya satu per satu.

Hal yang sama berlaku untuk `hints.hint_text` — hanya keluar lewat `unlock_hint()`
dan `my_hints()`. Metadata (`cost`, `order_index`) tetap terbaca supaya UI bisa
menampilkan harga hint sebelum dibuka.

**Player tidak punya GRANT INSERT ke `solves` maupun `hint_unlocks`.** Satu-satunya
jalur adalah RPC `SECURITY DEFINER`, sehingga poin tidak bisa dipalsukan.

**Escalation privilege ditutup lewat GRANT kolom**, bukan trigger: role
`authenticated` hanya boleh `UPDATE (name, avatar_url)` pada `profiles`, jadi
`role` dan `total_score` tidak bisa diubah sendiri meski RLS mengizinkan baris itu.

**First blood dijamin unik oleh database**, bukan oleh logika aplikasi:

```sql
create unique index solves_first_blood_key
  on public.solves (challenge_id) where is_first_blood;
```

`submit_flag()` juga mengambil `pg_advisory_xact_lock` per challenge, sehingga dua
submit benar yang datang bersamaan diproses berurutan.

**Skor individu** = total `points_awarded` dari solve sendiri.

**Skor tim berbasis keanggotaan sekarang** (migrasi 06). Untuk setiap challenge
yang pernah diselesaikan minimal satu anggota saat ini, diambil poin dari solve
yang **paling awal** — "yang solve duluan yang menyumbang". Konsekuensinya:

- bergabung tim membawa serta seluruh solve lama;
- keluar dari tim menarik kembali kontribusinya;
- satu challenge tidak pernah dihitung dua kali walau beberapa anggota
  menyelesaikannya sebelum bergabung.

Atribusi memakai `profiles.team_id`, bukan `solves.team_id` — kolom itu kini
sekadar catatan historis. Karena delta tidak bisa dihitung lokal (satu
perpindahan anggota bisa mengubah kontributor banyak challenge sekaligus),
`recalc_team_score()` melakukan recompute penuh, dipicu trigger pada
`solves` (insert/delete) dan pada `profiles.team_id` (update).

Index unik `(challenge_id, team_id)` **dilepas** di migrasi 06: penjaminan
pindah ke `DISTINCT ON`, dan index itu justru menimbulkan konflik palsu ketika
anggota yang dulu solve sudah keluar dari tim.

**Penalti hint** dihitung saat solve, bukan saat unlock:
`points_awarded = max(static_score - Σ cost hint yang dibuka, 0)`. Biaya disimpan
sebagai snapshot (`cost_at_unlock`) supaya perubahan harga hint tidak retroaktif.
Set `cost = 0` kalau ingin hint gratis.

**Rate limit** 10 submit/menit/user di dalam `submit_flag()`, memakai tabel
`submissions` yang juga berfungsi sebagai audit trail.

## Realtime

Publication `supabase_realtime` hanya berisi `solves`, `profiles`, dan `teams`.

`challenges` dan `hints` sengaja **tidak** dipublikasikan: payload Realtime
mengirim seluruh kolom baris, jadi `flag_hash` / `hint_text` akan bocor ke semua
subscriber meski GRANT kolom sudah dibatasi.

Pola pemakaian di client:

- **First blood** → subscribe `INSERT` pada `solves` dengan filter
  `is_first_blood=eq.true`.
- **Leaderboard** → subscribe `INSERT` pada `solves`, lalu re-fetch
  `leaderboard_players` / `leaderboard_teams` (view tidak bisa di-subscribe
  langsung).

## RPC

| Fungsi | Dipakai oleh | Return |
|---|---|---|
| `submit_flag(challenge_id, flag)` | player | `{status, points, penalty, first_blood, total_score}` |
| `unlock_hint(hint_id)` | player | `{status, hint_text, cost, charged}` |
| `my_hints(challenge_id)` | player | set of `(hint_id, order_index, cost, unlocked, hint_text)` |
| `create_team(name)` | player | `{status, team_id, name, join_code}` |
| `join_team(join_code)` | player | `{status, team_id, name}` |
| `leave_team()` | player | `{status}` |
| `admin_set_flag(challenge_id, flag)` | admin | `{status}` |

`submit_flag` mengembalikan status sebagai data (`wrong`, `already_solved`,
`rate_limited`, `not_found`), bukan exception — supaya UI bisa membedakan
"flag salah" dari error jaringan.

## Generate TypeScript types

Setelah migrasi ter-apply:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```
