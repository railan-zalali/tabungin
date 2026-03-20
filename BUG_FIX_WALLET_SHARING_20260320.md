# Perbaikan Bug Wallet Sharing - 20 Maret 2026

## Ringkasan

Bug yang diperbaiki:
1. **Error PGRST204**: `Could not find the 'user_id' column of 'wallets'`
2. **Error 42501**: `new row violates row-level security policy for table "wallet_members"`

---

## 🔧 Perbaikan yang Dilakukan

### 1. Perbaikan sync.ts (src/database/sync.ts)

**Masalah:**
- Kode menambahkan `user_id` ke SEMUA payload saat sync
- Tapi tabel `wallets` di Supabase TIDAK memiliki kolom `user_id`
- Schema menggunakan `profile_id` bukan `user_id`

**Solusi:**
- Menghapus baris `payload.user_id = user.id` yang memaksa menambahkan user_id ke semua tabel
- Tambahkan komentar dokumentasi untuk mencegah regression

**File:** `src/database/sync.ts:154-158`

```typescript
// NOTE: user_id should NOT be added here!
// - Tabel wallets menggunakan profile_id, BUKAN user_id
// - Schema Supabase tidak memiliki kolom user_id di wallets
// - Menambahkan user_id akan menyebabkan error PGRST204
```

---

### 2. SQL Migration untuk RLS Policies (supabase/migrations/20260320_fix_wallet_sharing_rls.sql)

**Masalah:**
- RLS policies terlalu ketat untuk wallet sharing
- User yang invite tidak bisa insert ke wallet_members
- Kebijakan lama tidak mendukung self-invite dan member invitation

**Solusi:**
Buat RLS policies baru yang lebih permisif:

#### Fungsi Helper Baru:
1. `is_wallet_member_exists(p_wallet_id)` - Cek apakah user adalah member aktif
2. `is_wallet_owner_profile(p_wallet_id)` - Cek apakah user adalah owner via profile

#### Policies untuk wallets:
- **SELECT**: Owner ATAU member bisa lihat
- **INSERT**: User dengan profile valid bisa buat
- **UPDATE**: Owner ATAU member bisa update
- **DELETE**: Hanya owner

#### Policies untuk wallet_members:
- **SELECT**: Owner ATAU member bisa lihat
- **INSERT**: 
  - Owner bisa invite
  - Member aktif (role owner/editor) bisa invite
  - Self-invite (email sama dengan user yang invite)
- **UPDATE**: Owner bisa update, ATAU user bisa update membership sendiri
- **DELETE**: Hanya owner

#### Policies untuk transactions:
- **SELECT**: Owner ATAU member bisa lihat
- **INSERT**: Owner ATAU member bisa insert
- **UPDATE**: Owner ATAU member bisa update
- **DELETE**: Owner ATAU member bisa delete

---

## 📋 Langkah-Langkah Deployment

### 1. Deploy Client Fix
```bash
# Pastikan sync.ts sudah ter-deploy
# File: src/database/sync.ts (sudah diperbaiki)
```

### 2. Jalankan SQL Migration di Supabase

**Opsi A: Via Supabase Dashboard**
1. Buka Supabase Dashboard
2. SQL Editor
3. Copy-paste isi file `supabase/migrations/20260320_fix_wallet_sharing_rls.sql`
4. Execute

**Opsi B: Via Supabase CLI**
```bash
supabase db push
```

**Opsi C: Via MCP Automation** (jika menggunakan Claude)
- Jalankan SQL melalui tools automation

---

## ✅ Verifikasi

### Test Manual:

1. **Test Device 1 (Akun A)**
   ```bash
   npx expo start
   ```
   - Buat wallet baru
   - Invite member dengan email Akun B
   - Generate QR code
   - Verifikasi wallet sync ke Supabase

2. **Test Device 2 (Akun B)**
   ```bash
   npx expo start
   ```
   - Scan QR code dari Akun A
   - Join wallet
   - Verifikasi bisa lihat dan edit transaksi di wallet bersama

3. **Test Sync**
   - Device 1: Tambah transaksi
   - Device 2: Verifikasi transaksi muncul
   - Device 2: Tambah transaksi
   - Device 1: Verifikasi transaksi muncul

### Expected Results:
- ✅ Tidak ada error `PGRST204`
- ✅ Tidak ada error `42501`
- ✅ Wallet sync tanpa masalah
- ✅ Wallet sharing berfungsi antar device
- ✅ Transaksi sync realtime

---

## 🔄 Rollback Plan

Jika terjadi masalah:

1. **Client Rollback:**
   - Revert perubahan di `sync.ts`
   - Kembalikan baris `payload.user_id = user.id`

2. **Database Rollback:**
   - Jalankan SQL untuk drop policies baru
   - Recreate policies lama dari `supabase_complete_reset_v3.sql`

---

## 📝 Catatan Penting

1. **Backward Compatibility:**
   - Perbaikan ini TIDAK breaking change
   - Data lama tetap kompatibel
   - Tidak perlu reset database

2. **Security:**
   - Policies baru lebih permisif tapi tetap aman
   - Self-invite dibatasi hanya untuk email user sendiri
   - Owner tetap kontrol penuh

3. **Performance:**
   - Fungsi helper menggunakan index yang sudah ada
   - Tidak ada query tambahan yang berat
   - Policy check menggunakan EXISTS (early exit)

---

## 📞 Support

Jika masih ada error setelah deployment:
1. Check Supabase Dashboard untuk error logs
2. Verifikasi RLS policies sudah ter-create dengan benar
3. Check client console untuk error details
4. Hubungi developer untuk bantuan

---

*Dokumentasi ini dibuat: 20 Maret 2026*
*Perbaikan oleh: Claude Code AI Assistant*
