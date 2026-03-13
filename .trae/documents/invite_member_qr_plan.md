# Rencana Implementasi Fitur Invite Member & QR Scan

## Ringkasan
Implementasi fitur undangan anggota dompet menggunakan Share Link (Deep Link) dan QR Code Scanner. Fitur ini memungkinkan pengguna untuk mengundang orang lain bergabung ke dompet bersama melalui link yang dapat dibagikan (via email/WA/dll) atau dengan memindai QR Code langsung.

## Analisis Saat Ini
- **Struktur Proyek**: Expo (React Native) + TypeScript + Supabase.
- **Deep Linking**: Sudah dikonfigurasi (`tabungin://`), namun mapping untuk invite belum optimal (`wallet/:walletId` diarahkan ke `AddWallet` yang merupakan form edit).
- **Fitur Existing**:
  - `WalletMemberList.tsx`: Menampilkan QR dan tombol Share, namun link yang dihasilkan (`/wallet/:id`) belum memiliki handler yang tepat untuk *join*.
  - `QRScannerScreen.tsx`: Sudah ada, tapi validasi URL perlu disesuaikan dengan format baru.
  - `walletQueries.ts`: Fungsi `addWalletMember` hanya melakukan insert lokal, belum mendukung flow "Join" dari sisi invitee.
- **Kebutuhan User**: Invite via sharelink email & scan QR. Site URL & Redirect URL sudah diupdate ke `tabungin://auth/callback`.

## Perubahan yang Diusulkan

### 1. Navigasi & Deep Linking
- **Buat Screen Baru**: `JoinWalletScreen` untuk menangani user yang membuka link undangan. Screen ini akan menampilkan detail dompet dan tombol konfirmasi "Gabung".
- **Update Mapping Link**: Ubah/tambah konfigurasi deep link untuk menangani path `invite/:walletId` yang mengarah ke `JoinWalletScreen`.
- **Update Type**: Menambahkan `JoinWallet` ke `WalletStackParamList`.

### 2. UI/UX (Join Flow)
- **JoinWalletScreen**:
  - Mengambil `walletId` dari parameter navigasi.
  - Fetch data dompet dari Supabase (menggunakan RPC atau query langsung jika RLS mengizinkan).
  - Menampilkan info dompet (Nama, Pemilik).
  - Tombol "Gabung Dompet" -> Memanggil fungsi untuk menambahkan user ke `wallet_members`.
  - Redirect ke `WalletDetail` atau `WalletList` setelah sukses.

### 3. Logic Invite (Owner Side)
- **Update WalletMemberList**:
  - Mengubah format link yang digenerate menjadi `tabungin://invite/<wallet_id>`.
  - QR Code juga menggunakan format link yang sama.
  - Tombol "Share" akan memicu native share sheet (bisa pilih Email, WhatsApp, dll).

### 4. Logic Scan (Invitee Side)
- **Update QRScannerScreen**:
  - Menyesuaikan validasi agar menerima link dengan format `invite/`.
  - Mengarahkan hasil scan ke `JoinWalletScreen` alih-alih membuka URL secara generik jika dalam aplikasi.

### 5. Backend (Supabase)
- **Catatan**: Implementasi ini berasumsi user sudah login. Jika belum login, deep link handling idealnya mengarahkan ke Login dulu lalu me-restore state, namun untuk iterasi ini kita fokus pada flow saat user sudah memiliki akun/login.
- **Data Fetching**: Pastikan user bisa melihat info dasar dompet yang akan di-join (mungkin perlu penyesuaian RLS atau function khusus, tapi kita akan coba query standar dulu).

## Langkah Implementasi

1.  **Definisi Tipe Navigasi**: Tambahkan `JoinWallet` ke `src/types/navigation.ts`.
2.  **Buat Screen**: `src/screens/wallet/JoinWalletScreen.tsx`.
3.  **Registrasi Screen**: Tambahkan ke `src/navigation/WalletStackNavigator.tsx`.
4.  **Konfigurasi Link**: Update `src/navigation/LinkingConfiguration.ts` untuk memetakan `invite/:walletId`.
5.  **Update Komponen Invite**: Modifikasi `src/components/wallet/WalletMemberList.tsx` untuk generate link baru.
6.  **Update Scanner**: Modifikasi `src/screens/wallet/QRScannerScreen.tsx`.

## Verifikasi
- Generate link invite dari satu device/simulator.
- Buka link tersebut (atau scan QR) di device/simulator lain.
- Pastikan masuk ke halaman `JoinWalletScreen`.
- Klik "Gabung" dan pastikan user bertambah di list anggota.
