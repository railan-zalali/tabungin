# Rencana Perbaikan: Error Join Wallet & UI/UX

## Ringkasan Masalah
1.  **Build Error:** Typo pada perintah gradle (`assembleRealease` vs `assembleRelease`).
2.  **RLS Error (Join Wallet):** Pengguna tidak bisa melihat info dompet sebelum bergabung karena kebijakan RLS (Row Level Security) membatasi `SELECT` hanya untuk anggota.
3.  **RLS Error (Insert Member):** Gagal menambahkan member baru, kemungkinan karena kebijakan `INSERT` yang terlalu ketat atau konflik data.
4.  **UI/UX:** Tampilan error membingungkan dan perlu peningkatan visual.

## Langkah 1: Perbaikan Build (Terminal)
- **Masalah:** User mengetik `./gradlew assembleRealease` (typo "Realease").
- **Solusi:** Gunakan perintah yang benar: `./gradlew assembleRelease`.

## Langkah 2: Perbaikan Database (Supabase SQL)
Kita perlu membuat fungsi RPC (Remote Procedure Call) untuk mengambil info dompet secara aman tanpa mengekspos seluruh data, karena user belum jadi member.

### SQL yang Akan Diterapkan (via SQL Editor Supabase):
1.  **Fungsi `get_wallet_preview`:** Mengembalikan info dasar (nama, tipe, owner) tanpa cek membership ketat, hanya butuh ID.
2.  **Perbaikan Policy `wallet_members`:** Pastikan user bisa meng-insert dirinya sendiri saat join.

## Langkah 3: Perbaikan Kode Frontend (`JoinWalletScreen.tsx`)
- **Refactor `fetchWalletInfo`:**
    - Jangan langsung `select('*')` dari tabel `wallets` jika belum join.
    - Panggil RPC `get_wallet_preview` untuk menampilkan nama dompet di layar konfirmasi.
- **Refactor `handleJoin`:**
    - Pastikan data yang dikirim ke `wallet_members` sesuai skema.
    - Handle error duplikat jika user sudah member.

## Langkah 4: Peningkatan UI/UX
- **Loading State:** Tambahkan indikator loading yang lebih jelas saat fetch data.
- **Error Feedback:** Ubah pesan error teknis (`PGRST116`) menjadi pesan ramah user ("Dompet tidak ditemukan atau tautan kadaluarsa").
- **Visual:** Perbaiki layout kartu undangan agar lebih menarik (menggunakan komponen Card/Gradient).

## Verifikasi
1.  Jalankan aplikasi.
2.  Coba link undangan dengan akun berbeda.
3.  Pastikan nama dompet muncul SEBELUM klik "Join".
4.  Pastikan sukses bergabung dan data tersinkronisasi.
