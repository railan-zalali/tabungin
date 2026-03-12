# Rencana Pengembangan: Multi-Profile & Shared Wallet (Team)

Dokumen ini merincikan rencana implementasi untuk perbaikan UX input transaksi, serta fitur besar Multi-profile dan Shared Wallet (Team).

## 1. Perbaikan UX: Auto-clear Input Transaksi
**Masalah**: Saat pengguna mengubah tipe transaksi (misal: Pemasukan ke Pengeluaran), nominal yang sudah diketik tidak kembali ke 0.
**Solusi**: Reset state `amountInput` saat tombol tipe transaksi ditekan.

### Langkah Implementasi
- **File**: `src/screens/transaction/AddTransactionScreen.tsx`
- **Action**:
  - Pada fungsi `onPress` di komponen toggle tipe (`typeBtn`), tambahkan pemanggilan `setAmountInput('')` dan `setAmountError(null)`.

---

## 2. Fitur Multi-Profile (Netflix Style)
**Konsep**: Satu akun pengguna (login sama) dapat memiliki beberapa profil (misal: "Pribadi", "Bisnis", "Keluarga"). Setiap profil memiliki data terpisah (Dompet, Transaksi, Budget, Target).

### A. Perubahan Database (Schema v6)
Menambahkan tabel `profiles` dan kolom `profile_id` ke tabel utama.

1. **Tabel Baru: `profiles`**
   - `id` (PK, UUID)
   - `user_id` (FK ke users/auth)
   - `name` (TEXT)
   - `icon` / `color`
   - `created_at`

2. **Modifikasi Tabel Eksisting**
   - Tambahkan kolom `profile_id` pada:
     - `wallets`
     - `transactions`
     - `budgets`
     - `saving_goals`
   - *Migrasi Data*: Semua data yang ada saat ini akan di-assign ke "Profil Default" yang dibuat otomatis saat migrasi.

### B. State Management
- **`useProfileStore`**:
  - `profiles`: Daftar profil yang dimiliki user.
  - `activeProfileId`: ID profil yang sedang aktif.
  - `switchProfile(id)`: Mengganti profil aktif dan memicu reload data di store lain (TransactionStore, WalletStore, dll).

### C. UI/UX
- **Profile Switcher**:
  - Di halaman Settings atau Header Dashboard.
  - Modal/Bottom Sheet untuk memilih profil.
- **Create Profile**:
  - Form sederhana (Nama Profil, Warna/Ikon).

---

## 3. Fitur Team / Shared Wallet
**Konsep**: Pengguna dapat mengundang teman untuk mengakses dompet tertentu.

### A. Perubahan Database (Schema v7)
1. **Tabel Baru: `wallet_members`**
   - `id` (PK)
   - `wallet_id` (FK ke wallets)
   - `user_email` (Email user yang diundang)
   - `role` ('owner', 'editor', 'viewer')
   - `status` ('pending', 'active')

### B. Logika Sinkronisasi (Supabase)
- **RLS (Row Level Security)**:
  - User hanya bisa melihat wallet jika:
    - Dia adalah `owner` (cek `profile_id` -> `user_id`), ATAU
    - Dia ada di tabel `wallet_members` dengan status `active`.
- **Sync Logic**:
  - Tabel `wallet_members` perlu disinkronisasi agar member lain tahu mereka punya akses.

### C. UI/UX
- **Wallet Settings**:
  - Tambahkan menu "Anggota Dompet" (Wallet Members).
  - List anggota dengan status & role.
  - Tombol "Undang Anggota" (Input email).
- **Notifikasi/Undangan**:
  - Saat user A mengundang email user B, user B (jika sudah punya akun) akan melihat dompet tersebut muncul di daftar dompetnya (mungkin di bawah grup "Shared with Me").

---

## 4. Urutan Pengerjaan
1. **Implementasi Fix UX Input** (Segera).
2. **Implementasi Multi-Profile** (Prioritas Menengah).
   - Migrasi DB.
   - Profile Store.
   - UI Switcher.
3. **Implementasi Shared Wallet** (Prioritas Lanjut).
   - Migrasi DB.
   - UI Invite Member.
   - Integrasi Sync & RLS Supabase.

---

## Verifikasi
- **UX**: Coba ketik nominal di Pemasukan -> Ganti ke Pengeluaran -> Nominal harus kosong.
- **Profile**: Buat profil baru -> Switch -> Pastikan dashboard kosong/baru -> Switch balik -> Data lama muncul.
- **Shared**: Invite email teman -> Cek di akun teman apakah dompet muncul (membutuhkan setup backend Supabase yang sesuai).
