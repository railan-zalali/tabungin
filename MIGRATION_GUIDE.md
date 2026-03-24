# Panduan Migrasi Supabase untuk Tabungin

## 🔴 Masalah yang Terjadi

Saat menjalankan migrasi SQL secara manual di Supabase Dashboard, muncul error:
```
ERROR: 42883: operator does not exist: text = uuid
```

## 🎯 Cara yang Benar

### Opsi 1: Gunakan Supabase CLI (REKOMENDASI) ✅

Ini adalah cara terbaik untuk menjalankan migrasi karena:
- Mengelola semua migrasi secara otomatis
- Menangani koneksi dan error secara profesional
- Tracking history migrasi
- Bisa diintegrasikan dengan CI/CD

#### Langkah-langkah:

1. **Instalasi Supabase CLI**
   ```bash
   npm install -g supabase
   # atau
   brew install supabase/tap/supabase
   ```

2. **Login ke Supabase**
   ```bash
   supabase login
   ```

3. **Link ke project**
   ```bash
   cd "C:\Railan\New folder\tabungin"
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Jalankan semua migrasi**
   ```bash
   # Jalankan semua migrasi secara otomatis
   supabase db push
   ```

5. **Verifikasi**
   ```bash
   # Cek status migrasi
   supabase migration list
   ```

### Opsi 2: Gunakan Supabase Dashboard dengan SQL Editor (Alternatif)

Jika tetap ingin menjalankan secara manual:

#### Perbaiki File Migrasi:

**Catatan penting**: Masalah sebelumnya kemungkinan karena kesalahan pengetikan/manual copy-paste. File migrasi sudah diperbaiki dengan menghapus casting eksplisit yang tidak diperlukan.

#### Langkah Manual:

1. **Buka Supabase Dashboard**
   - Pergi ke: https://supabase.com/dashboard
   - Pilih project Tabungin
   - Klik "SQL Editor" di sidebar kiri

2. **Jalankan Migrasi 1-4 Satu per Satu**

Jalankan setiap migrasi berikut secara berurutan:

**Migrasi 1: Notifications Table**
```sql
-- Copy seluruh isi file:
supabase/migrations/20260320_notifications.sql
```
- Paste di SQL Editor
- Klik "Run" (atau tekan Ctrl+Enter)
- Tunggu sampai berhasil
- Verifikasi dengan query:
  ```sql
  SELECT * FROM notifications LIMIT 5;
  ```

**Migrasi 2: Wallet Goals Sharing**
```sql
-- Copy seluruh isi file:
supabase/migrations/20260320_wallet_goals_sharing.sql
```
- Paste di SQL Editor
- Klik "Run"
- Tunggu sampai berhasil
- Verifikasi dengan query:
  ```sql
  SELECT * FROM wallet_goals_shared LIMIT 5;
  ```

**Migrasi 3: Recurring Transactions**
```sql
-- Copy seluruh isi file:
supabase/migrations/20260320_recurring_transactions.sql
```
- Paste di SQL Editor
- Klik "Run"
- Tunggu sampai berhasil
- Verifikasi dengan query:
  ```sql
  SELECT * FROM recurring_transactions LIMIT 5;
  ```

**Migrasi 4: Transaction Categories**
```sql
-- Copy seluruh isi file:
supabase/migrations/20260320_transaction_categories.sql
```
- Paste di SQL Editor
- Klik "Run"
- Tunggu sampai berhasil
- Verifikasi dengan query:
  ```sql
  SELECT * FROM transaction_categories LIMIT 5;
  ```

3. **Verifikasi Keberhasilan**

Setelah semua migrasi dijalankan, jalankan query verifikasi:

```sql
-- Cek semua tabel yang dibuat
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'notifications',
    'wallet_goals_shared',
    'recurring_transactions',
    'transaction_categories'
  );

-- Cek fungsi RPC yang dibuat
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'auto_share_wallet_goals';
```

4. **Verifikasi RLS Policies**

Pastikan RLS (Row Level Security) aktif dan bekerja:

```sql
-- Cek RLS untuk notifications
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notifications';

-- Cek RLS untuk wallet_goals_shared
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'wallet_goals_shared';

-- Cek RLS untuk recurring_transactions
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'recurring_transactions';

-- Cek RLS untuk transaction_categories
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'transaction_categories';
```

5. **Verifikasi Index**

Pastikan semua index dibuat:

```sql
-- Cek index untuk notifications
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'notifications';

-- Cek index untuk wallet_goals_shared
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'wallet_goals_shared';

-- Cek index untuk recurring_transactions
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'recurring_transactions';

-- Cek index untuk transaction_categories
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'transaction_categories';
```

---

## ⚠️ Troubleshooting

### Error: "operator does not exist"

Jika error ini masih muncul:

1. **Cek Copy-Paste**
   - Pastikan tidak ada karakter tambahan
   - Jangan copy-paste dari editor yang menambahkan karakter tersembunyi

2. **Gunakan Format yang Bersih**
   - Copy langsung dari file
   - Jangan edit di SQL Editor
   - Paste tanpa perubahan

3. **Cek Versi PostgreSQL**
   - Supabase menggunakan PostgreSQL 14+
   - Pastikan sintaks SQL kompatibel

### Error: "relation does not exist"

Jika error ini muncul:

1. **Jalankan Migrasi secara Berurutan**
   - Jangan skip migrasi
   - Jalankan dari 1 sampai 4 secara berurutan
   - Setiap migrasi mungkin bergantung ke yang sebelumnya

2. **Cek Ketergantungan**
   - Migrasi 3 (`wallet_goals_sharing`) mungkin membutuhkan migrasi 1 (`notifications`)
   - Tapi migrasi 4 (`transaction_categories`) tidak bergantung ke migrasi 3

### Error: "function already exists"

Jika fungsi sudah ada:

1. **Drop fungsi lama terlebih dahulu**
   ```sql
   DROP FUNCTION IF EXISTS auto_share_wallet_goals;
   ```
2. **Kemudian jalankan migrasi ulang**

### Error: "permission denied"

Jika error permission muncul:

1. **Cek Role User**
   - Pastikan user login dengan role yang cukup (minimal editor)
   - Owner role diperlukan untuk INSERT pada tabel tertentu
   - Hubungi admin jika perlu role lebih tinggi

---

## ✅ Sukses Setelah Migrasi

Setelah semua migrasi berhasil dijalankan:

1. **Verifikasi di Supabase Dashboard**
   - Buka Table Editor
   - Jalankan query verifikasi di atas
   - Pastikan semua data muncul

2. **Test di Aplikasi**
   - Buka aplikasi Tabungin
   - Pastikan fitur-fitur baru berfungsi:
     - ✅ Notifikasi muncul
     - ✅ Share goals otomatis
     - ✅ Transaksi berulang bisa ditambahkan
     - ✅ Kategori kustom bisa dibuat
     - ✅ Export data bisa dilakukan

3. **Perbaiki Masalah jika Ada**
   - Jika ada error, catat pesan lengkap
   - Cek log di Supabase Dashboard
   - Jangan modifikasi migrasi yang sudah jalan
   - Jika perlu, buat migrasi baru dengan nama berbeda

---

## 📝 Catatan Penting

### Struktur Database
- Semua migrasi dibuat dengan format yang konsisten
- RLS (Row Level Security) diaktifkan untuk keamanan
- Index ditambahkan untuk performa query

### Urutan Eksekusi
Pastikan migrasi dijalankan dalam urutan yang benar:
1. **Notifications** - tidak bergantung ke yang lain
2. **Wallet Goals Sharing** - tidak bergantung ke yang lain
3. **Recurring Transactions** - tidak bergantung ke yang lain
4. **Transaction Categories** - tidak bergantung ke yang lain

### Fungsi RPC
- Fungsi `auto_share_wallet_goals` sudah diperbaiki
- Menghapus casting eksplisit yang tidak diperlukan
- Menggunakan `gen_random_uuid()` tanpa casting

---

## 🚀 Rekomendasi

### Gunakan Supabase CLI (Paling Aman)
Ini adalah cara terbaik karena:
- Menghindari error manual
- Otomatis tracking version
- Bisa di-rollback jika ada masalah
- Professional dan terkontrol

### Alternatif: Migrasi Manual
Jika CLI tidak tersedia atau tidak ingin menggunakannya:
1. Buka SQL Editor di Supabase Dashboard
2. Jalankan migrasi 1-4 secara berurutan
3. Verifikasi setiap migrasi
4. Lanjutkan ke migrasi berikutnya hanya setelah yang sebelumnya sukses

### Jangan
- ❌ Copy-paste dari editor lain (risk karakter tersembunyi)
- ❌ Edit di SQL Editor (risk kesalahan)
- ❌ Skip migrasi (risk struktur database tidak lengkap)
- ❌ Modifikasi migrasi yang sedang berjalan (risk data corruption)

---

## 📱 Setelah Migrasi Berhasil

Pastikan untuk:
1. **Test semua fitur baru** di aplikasi
2. **Verifikasi data** di Supabase dashboard
3. **Perbaiki bug** jika ditemukan
4. **Kumpulkan feedback** dari pengguna

---

**Need Help?**
Jika masih mengalami masalah:
1. Check file migrasi yang sudah diperbaiki: `20260320_wallet_goals_sharing.sql`
2. Pastikan menggunakan Supabase CLI: `supabase db push`
3. Atau jalankan manual di SQL Editor dengan urutan yang benar

---

*Dokumentasi ini dibuat untuk membantu menjalankan migrasi dengan benar*
*Last Updated: 2026-03-20*
