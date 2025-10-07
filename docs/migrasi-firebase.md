# Migrasi Firebase → Supabase (TypeScript)

Prasyarat
- Node.js 18+ dan pnpm/npm/yarn.
- Project Supabase siap (URL, anon key, service role).
- Supabase CLI (opsional, untuk Edge Functions).
- Service account Firebase (JSON) atau env setara.

Instal dependensi
- npm i -E @supabase/supabase-js firebase-admin
- (opsional) npm i -D -E tsx dotenv

Konfigurasi env
- Salin .env.example → .env dan isi semua nilai Supabase & Firebase.

Client Supabase
- Browser/SSR: src/lib/supabaseClient.ts
- Server/admin: src/lib/supabaseAdmin.ts

Auth Context (opsional, pengganti bertahap)
- Provider baru: src/contexts/supabase-auth-context.tsx
- Ganti pemakaian useAuth menjadi useSupabaseAuth setelah tabel & data siap.

Schema SQL
- Buka Supabase Dashboard → SQL Editor, jalankan isi supabase/schema.sql.
- Buat bucket storage `avatars` via Storage → Create bucket (Public: sesuai kebutuhan).
 - Lalu jalankan supabase/schema.app.sql untuk tabel-tabel aplikasi (stores, products, customers, tables, transactions, redemption_options, challenge_periods, top_up_requests, applied_strategies, pending_orders, app_settings) dan RLS-nya.

Migrasi Auth
- Ekspor pengguna dari Firebase Auth (Identity Toolkit) lalu impor via Supabase Dashboard → Auth → Users → Import.
- Jika hash password tidak kompatibel, lakukan reset password flow (supaya user set password baru).

Migrasi Data (Firestore)
1) Duplikasi file scripts/migration/config.example.ts → config.ts dan sesuaikan `collections`.
2) Jalankan dengan env terpasang:
   - npx tsx scripts/migration/firebase-to-supabase.ts
   - Atau: node -r dotenv/config -r ts-node/register scripts/migration/firebase-to-supabase.ts
3) Validasi sampel data di tabel target.

Migrasi Storage
- Unduh objek dari Firebase Storage (gsutil / script) lalu unggah ke bucket Supabase (via Dashboard atau API).
- Simpan path objek menggunakan pola `userId/filename` agar policy RLS berlaku.

Edge Functions
- Contoh: supabase/functions/hello/index.ts
- Deploy: supabase functions deploy hello
- Invoke: supabase functions invoke hello --no-verify-jwt -d '{ "name": "world" }'

Penggantian Kode Aplikasi
- Hapus import: firebase/app, firebase/auth, firebase/firestore, firebase/storage.
- Gunakan supabase client untuk auth & CRUD data.
- Cek semua akses data agar sesuai dengan skema SQL baru.
 - Untuk auth context: ganti AuthProvider dengan SupabaseAuthProvider dan hook useAuth dengan useSupabaseAuth.
 - Saat ini AuthProvider sudah dimigrasikan ke Supabase. DashboardContext sudah diubah untuk mengambil data dari Supabase. Views yang sudah di-port: products (update/delete), promotions (CRUD), receipt/point earning settings. Endpoint karyawan sudah menggunakan Supabase.

API Tambahan
- /api/store/deduct-tokens: sesuaikan saldo token toko (mendukung +/−). Menggunakan `SUPABASE_SERVICE_ROLE_KEY` untuk operasi aman di server.

Uji & Hardening
- Uji sign up/in/out, sesi, dan refresh token.
- Uji CRUD posts/profiles dan upload avatar.
- Audit RLS: pastikan role anonymous vs authenticated sesuai kebutuhan.

Catatan
- Subcollection/nested dokumen perlu mapping khusus. Tambahkan entri baru di `collections` atau migrasikan bertahap.
- Tipe Timestamp Firestore dikonversi menjadi ISO (timestamptz) oleh skrip migrasi.
