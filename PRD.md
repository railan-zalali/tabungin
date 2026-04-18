# Product Requirement Document (PRD) - Tabungin

**Versi:** 1.0
**Tanggal:** 13 Maret 2026
**Status:** Final Draft
**Penulis:** Tim Pengembang Tabungin

---

## 1. Pendahuluan

### 1.1 Latar Belakang
Tabungin adalah aplikasi manajemen keuangan pribadi yang dirancang untuk membantu pengguna melacak pemasukan, pengeluaran, dan target tabungan mereka. Dengan pendekatan *Local-First*, aplikasi ini menjamin aksesibilitas data tanpa ketergantungan internet, namun tetap menyediakan opsi sinkronisasi cloud untuk keamanan data.

### 1.2 Tujuan Produk
*   Memberikan visibilitas penuh terhadap kondisi keuangan pengguna.
*   Mempermudah pencapaian target finansial melalui fitur *Saving Goals*.
*   Menyediakan pengalaman pengguna yang cepat, responsif, dan dapat diandalkan dalam kondisi offline.

### 1.3 Target Pengguna (User Personas)
1.  **The Budgeter (Budi)**: Pengguna yang disiplin, mencatat setiap pengeluaran, dan sangat peduli dengan batas anggaran bulanan.
2.  **The Dreamer (Sari)**: Pengguna yang fokus pada menabung untuk tujuan tertentu (misal: liburan, beli gadget) dan butuh visualisasi progres.
3.  **The Casual Tracker (Dian)**: Pengguna yang hanya ingin tahu sisa uang di dompet tanpa pencatatan yang terlalu rumit.

---

## 2. Spesifikasi Fungsional

### 2.1 Fitur Utama

#### A. Manajemen Transaksi
*   **User Story**: Sebagai pengguna, saya ingin mencatat pemasukan dan pengeluaran harian agar saya tahu kemana uang saya pergi.
*   **Requirements**:
    *   Input nominal, kategori, catatan, dan tanggal.
    *   Pilihan dompet sumber dana (Cash, Bank, E-Wallet).
    *   Dukungan untuk mengedit dan menghapus transaksi.
    *   Filter berdasarkan periode (Harian, Mingguan, Bulanan) dan tipe (Masuk/Keluar).

#### B. Multi-Wallet (Dompet)
*   **User Story**: Sebagai pengguna, saya ingin memisahkan saldo tunai dan rekening bank saya.
*   **Requirements**:
    *   Membuat dompet baru dengan tipe, nama, dan warna kustom.
    *   Menetapkan satu dompet sebagai *Default*.
    *   Melihat total saldo gabungan dan saldo per dompet.

#### C. Saving Goals (Target Tabungan)
*   **User Story**: Sebagai pengguna, saya ingin menyisihkan uang untuk membeli laptop baru dan melihat seberapa dekat saya dengan target tersebut.
*   **Requirements**:
    *   Membuat target dengan nama, nominal target, dan tenggat waktu.
    *   Menambah tabungan ke target tertentu (mengurangi saldo dompet terkait).
    *   Visualisasi *progress bar* dan estimasi ketercapaian.
    *   Status "Active" dan "Completed".

#### D. Budgeting (Anggaran)
*   **User Story**: Sebagai pengguna, saya ingin dibatasi agar tidak belanja kopi berlebihan bulan ini.
*   **Requirements**:
    *   Menetapkan batas anggaran per kategori pengeluaran.
    *   Indikator visual (warna merah) jika pengeluaran mendekati atau melebihi budget.
    *   Ringkasan total budget vs total pengeluaran bulan ini.

#### E. Autentikasi & Sinkronisasi
*   **User Story**: Sebagai pengguna, saya ingin data saya aman dan bisa diakses jika saya ganti HP.
*   **Requirements**:
    *   Login/Register menggunakan Email (via Supabase).
    *   Mode *Guest/Offline* untuk penggunaan tanpa akun.
    *   Sinkronisasi data otomatis saat online.
    *   Fitur Backup Data (Ekspor JSON).

---

## 3. Spesifikasi Teknis & Arsitektur

### 3.1 Tech Stack
*   **Frontend**: React Native (Expo SDK 55)
*   **Language**: TypeScript
*   **State Management**: Zustand
*   **Database Lokal**: Expo SQLite
*   **Backend / Sync**: Supabase (PostgreSQL)
*   **Styling**: NativeWind (Tailwind CSS)

### 3.2 Data Flow Diagram (Sync)
1.  **Write**: User Simpan Transaksi -> Update Zustand -> Insert SQLite (Status: `pending_create`) -> Trigger Sync.
2.  **Sync (Push)**: Cek `pending_*` -> Upload ke Supabase -> Update Status SQLite jadi `synced`.
3.  **Sync (Pull)**: Cek `updated_at` terakhir -> Fetch data baru dari Supabase -> Insert/Replace SQLite.

---

## 4. UI/UX Requirements

### 4.1 Desain Sistem
*   **Warna**: Menggunakan palet `Colors` terpusat.
    *   Primary: Hijau (`#1DB954`) - Kesan finansial, tumbuh.
    *   Danger: Merah - Pengeluaran, Hapus.
    *   Background: Adaptif (Light/Dark Mode).
*   **Tipografi**: Menggunakan font family yang konsisten untuk Heading dan Body text.

### 4.2 Aksesibilitas (Accessibility)
*   Setiap tombol interaktif harus memiliki `accessibilityLabel` dan `accessibilityRole`.
*   Dukungan *Dynamic Type* (Ukuran teks yang dapat diatur pengguna: Normal, Large, X-Large).
*   Feedback Haptic pada interaksi penting (Simpan, Hapus, Error).

### 4.3 State Handling
*   **Loading**: Gunakan *Skeleton Loader* untuk konten list, bukan sekadar spinner.
*   **Empty**: Tampilkan ilustrasi dan tombol CTA (*Call to Action*) saat data kosong.
*   **Error**: Tampilkan pesan error yang manusiawi (bukan kode error teknis).

---

## 5. Roadmap & Timeline

### Fase 1: Optimasi & Stabilisasi (Minggu 1-2)
*   [Critical] Implementasi `React.memo` pada list transaksi.
*   [High] Perbaikan logika sinkronisasi untuk menangani konflik data.
*   [Medium] Migrasi `SectionList` ke `FlashList`.

### Fase 2: Peningkatan Fitur (Minggu 3-4)
*   Implementasi fitur *Restore Data* dari file JSON.
*   Penambahan grafik analisis tren pengeluaran.
*   Lokalisasi (Bahasa Inggris & Indonesia).

### Fase 3: Ekspansi (Bulan 2)
*   Fitur *Shared Wallet* (Dompet Bersama) untuk pasangan/keluarga.
*   Integrasi notifikasi pengingat menabung.

---

## 6. Metrik Kesuksesan (KPI)

1.  **Crash Free Rate**: > 99.5%
2.  **Sync Success Rate**: > 98% (Data terkirim tanpa konflik).
3.  **App Start Time**: < 2 detik (Cold start).
4.  **User Retention**: 40% pengguna kembali membuka aplikasi di hari ke-30.

---

## 7. Penilaian Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| **Data Loss** saat Sync | Tinggi | Implementasi backup JSON manual sebelum logout; perbaiki logika konflik sync. |
| **Performa Lambat** (Data Besar) | Sedang | Implementasi `FlashList` dan *Pagination* pada database query. |
| **Isu Privasi** | Tinggi | Enkripsi data sensitif lokal; Hapus data lokal saat logout (`clearAllData`). |
