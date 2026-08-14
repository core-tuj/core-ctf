# Deploy CORE CTF

Urutannya penting: **Supabase dulu**, baru Vercel. Vercel butuh kredensial
Supabase saat build, dan Supabase butuh domain Vercel untuk redirect OAuth —
jadi ada satu langkah balik di akhir.

---

## 1. Supabase

### 1.1 Buat project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.

- **Region**: pilih `Southeast Asia (Singapore)` kalau pemainnya di Indonesia —
  latensi tiap submit flag lewat region ini.
- **Database password**: simpan baik-baik, dipakai kalau connect lewat CLI.

### 1.2 Ambil kredensial

**Project Settings → API**:

| Nilai | Dipakai sebagai |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> `service_role` melewati **seluruh** RLS. Jangan pernah diberi prefix
> `NEXT_PUBLIC_`, jangan pernah masuk ke client component.

### 1.3 Apply migrasi

**Cara A — Supabase CLI (disarankan):**

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

`<project-ref>` adalah bagian subdomain dari Project URL
(`https://abcdefgh.supabase.co` → `abcdefgh`).

**Cara B — tanpa CLI:** buka **SQL Editor**, jalankan isi tiap file secara
berurutan:

1. `supabase/migrations/20260814090000_init_schema.sql`
2. `supabase/migrations/20260814090100_helpers_triggers.sql`
3. `supabase/migrations/20260814090200_rls_grants.sql`
4. `supabase/migrations/20260814090300_rpc.sql`
5. `supabase/migrations/20260814090400_views_realtime.sql`

Urutan wajib — tiap file bergantung pada objek di file sebelumnya.

### 1.4 Google OAuth

**Di Google Cloud Console** → APIs & Services → Credentials → **Create OAuth
client ID** → *Web application*. Isi Authorized redirect URI:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Perhatikan: yang didaftarkan di Google adalah domain **Supabase**, bukan domain
Vercel. Ini kesalahan paling umum saat setup.

**Di Supabase** → Authentication → Providers → **Google** → enable, tempel
Client ID dan Client Secret.

### 1.5 URL Configuration

Authentication → **URL Configuration**:

- **Site URL**: `https://<domain-produksi-kamu>`
- **Redirect URLs** (tambahkan semuanya):

```
http://localhost:3000/auth/callback
https://<domain-produksi-kamu>/auth/callback
https://*-<nama-tim>.vercel.app/**
```

Baris ketiga menangani URL preview Vercel, yang berubah tiap deploy. Tanpa itu,
login lewat deployment preview akan ditolak.

Langkah ini baru bisa diselesaikan setelah tahu domain Vercel-nya — lihat
bagian 2.4.

---

## 2. Vercel

### 2.1 Push ke GitHub

Folder ini belum jadi repo git:

```bash
git init && git add -A && git commit -m "CORE CTF"
```

```bash
git remote add origin https://github.com/<user>/<repo>.git && git branch -M main && git push -u origin main
```

`.gitignore` sudah menutup `.env*.local`, `node_modules`, dan folder tooling
agent (`.agents/`, `claude-skills/`). Pastikan `.env.local` **tidak** ikut
ter-commit.

### 2.2 Import ke Vercel

[vercel.com/new](https://vercel.com/new) → pilih repo-nya. Next.js terdeteksi
otomatis; build command dan output directory tidak perlu diubah.

### 2.3 Environment Variables

Isi sebelum deploy pertama (Settings → Environment Variables, centang
Production + Preview + Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_SITE_URL=https://<domain-produksi-kamu>
```

`NEXT_PUBLIC_SITE_URL` dipakai untuk menyusun redirect callback OAuth. Kalau
dikosongkan, aplikasi jatuh ke `VERCEL_URL` — dan itu URL unik per-deployment,
yang membuat redirect OAuth gampang meleset. Isi eksplisit dengan domain
produksi.

Ini yang menyebabkan urutan bolak-balik: kalau belum tahu domainnya, deploy
dulu, catat domain yang diberikan Vercel, isi variabel ini, lalu **redeploy**.
Perubahan environment variable tidak berlaku sampai ada deploy baru.

### 2.4 Balik ke Supabase

Setelah domain produksi diketahui, isi **Site URL** dan **Redirect URLs** di
Supabase (bagian 1.5) dengan domain itu.

---

## 3. Jadi admin

Belum ada UI untuk ini — dan itu memang disengaja: kalau ada tombol "jadikan
saya admin", siapa pun bisa menekannya.

**Langkah 1.** Signup lewat aplikasi seperti pemain biasa (email/password atau
Google). Trigger `on_auth_user_created` otomatis membuat baris di `profiles`
dengan role `player`.

**Langkah 2.** Di Supabase → **SQL Editor**, ganti emailnya:

```sql
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'kamu@example.com');
```

**Langkah 3.** Verifikasi:

```sql
select p.name, p.role, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role;
```

**Langkah 4.** Logout lalu login lagi di aplikasi. Menu **Panel Admin** akan
muncul di sidebar.

---

## 4. Menambahkan soal

**Cara biasa: lewat Panel Admin di aplikasi.** Masuk sebagai admin →
**Panel Admin** → **Challenge baru**. Di sana `admin_set_flag()` bekerja normal
karena dipanggil dengan sesi admin yang valid.

Untuk berkas soal, unggah ke Google Drive Anda, set aksesnya ke *"siapa saja
yang memiliki link"*, lalu tempel link-nya ke kolom **Link berkas**.

Sisa bagian ini hanya diperlukan kalau Anda ingin menambahkan soal langsung
lewat SQL Editor — misalnya untuk impor massal.

### 4.1 Jebakan yang perlu diketahui lebih dulu

RPC `admin_set_flag()` **tidak bisa dipanggil dari SQL Editor**. Fungsi itu
memeriksa `is_admin()`, yang membaca `auth.uid()` — di SQL Editor tidak ada JWT,
jadi `auth.uid()` bernilai NULL dan fungsinya melempar
`Hanya admin yang boleh mengubah flag`.

Dari SQL Editor, hash flag di-set langsung dengan pgcrypto. Itu aman karena SQL
Editor berjalan sebagai role `postgres`, yang memang melewati RLS dan pembatasan
kolom.

### 4.2 Satu soal + hint sekaligus

```sql
do $$
declare
  v_id uuid;
begin
  insert into public.challenges
    (title, category, description, static_score, author,
     file_url, connection_info, is_active, flag_hash)
  values (
    'Judul Soal',
    'web',                                  -- web|pwn|crypto|forensics|reverse|osint|misc
    E'Deskripsi soal.\n\nBaris baru pakai \\n dan awali string dengan E.',
    100,                                    -- poin
    'nama-author',
    null,                                   -- file_url, isi kalau ada attachment
    null,                                   -- connection_info, mis. 'nc host 1337'
    true,                                   -- langsung publish
    extensions.crypt('CTF{flag_yang_benar}', extensions.gen_salt('bf', 10))
  )
  returning id into v_id;

  insert into public.hints (challenge_id, hint_text, cost, order_index) values
    (v_id, 'Hint gratis.',            0,  1),
    (v_id, 'Hint yang memotong poin.', 25, 2);
end
$$;
```

Catatan:

- **Flag disimpan sebagai bcrypt**, tidak bisa dibaca kembali. Simpan
  plaintext-nya sendiri di tempat aman.
- **`cost = 0`** berarti hint gratis. Biaya hint dipotong dari poin saat pemain
  submit flag, bukan dari skor yang sudah dimiliki.
- **`is_active = false`** membuat soal jadi draft yang tidak terlihat pemain.
  Ada constraint yang menolak `is_active = true` tanpa flag.

### 4.3 Mengganti flag soal yang sudah ada

```sql
update public.challenges
   set flag_hash = extensions.crypt('CTF{flag_baru}', extensions.gen_salt('bf', 10))
 where title = 'Judul Soal';
```

### 4.4 Publish / unpublish

```sql
update public.challenges set is_active = true  where title = 'Judul Soal';
```

```sql
update public.challenges set is_active = false where title = 'Judul Soal';
```

### 4.5 File attachment

Supabase → **Storage** → New bucket, misal `challenge-files`, set **Public**.
Upload filenya, salin public URL-nya, lalu:

```sql
update public.challenges
   set file_url = 'https://<project-ref>.supabase.co/storage/v1/object/public/challenge-files/soal.zip'
 where title = 'Judul Soal';
```

### 4.6 Data contoh

`supabase/seed.sql` berisi 4 soal contoh beserta hint-nya. Jalankan isinya di
SQL Editor kalau ingin langsung punya bahan uji. **Jangan dipakai di
produksi** — flag-nya tertulis plaintext di dalam file itu.

---

## 5. Uji end to end

1. Buka domain produksi → **Daftar** → cek email konfirmasi kalau diminta
2. Jadikan diri admin (bagian 3), logout, login lagi
3. Tambahkan satu soal (bagian 4)
4. Buka **Challenges** → soal muncul
5. Buka soalnya → **Buka** salah satu hint → teksnya keluar
6. Submit flag yang benar → alert **FIRST BLOOD** merah, poin bertambah
7. Buka **Leaderboard** → indikator `live` menyala, namamu ada di peringkat

Kalau langkah 7 tetap `menyambung…`, cek Database → **Publications** →
`supabase_realtime` harus memuat `solves`, `profiles`, dan `teams`.

---

## Troubleshooting

| Gejala | Penyebab yang paling sering |
|---|---|
| `redirect_uri_mismatch` saat login Google | URI di Google Cloud harus domain **Supabase** (`https://<ref>.supabase.co/auth/v1/callback`), bukan domain Vercel |
| Login berhasil tapi balik ke `/login` | `NEXT_PUBLIC_SITE_URL` salah, atau `/auth/callback` belum masuk Redirect URLs di Supabase |
| "Profil tidak ditemukan" setelah login | Migrasi `20260814090100` belum di-apply, jadi trigger `on_auth_user_created` tidak ada |
| Daftar challenge kosong padahal sudah insert | `is_active` masih `false` |
| Leaderboard tidak pernah `live` | Tabel belum masuk publication `supabase_realtime` |
| `Hanya admin yang boleh mengubah flag` di SQL Editor | Pakai `extensions.crypt(...)` langsung, bukan `admin_set_flag()` — lihat 4.1 |
| Build Vercel gagal: `Environment variable ... belum di-set` | Variabel belum diisi, atau diisi setelah deploy tanpa redeploy |
