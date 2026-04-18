# Dokumen Rencana Revisi Fitur & UI/UX

## 1. Tujuan

- Memperbaiki stabilitas (tidak ada force close saat membuka Dompet).
- Menyusun sistem desain konsisten agar UI rapi, mudah dipahami, dan aksesibel.
- Menyederhanakan arsitektur navigasi dan state management.
- Menambah kejelasan informasi finansial (saldo, pemasukan, pengeluaran).

## 2. Prinsip Desain

- **Konsistensi**: token warna, tipografi, spacing.
- **Kejelasan**: satu aksi primer per layar, label eksplisit.
- **Aksesibilitas**: kontras min 4.5:1, target sentuh ≥48x48dp.
- **Kinerja**: skeleton/loading non-blocking; 60fps.
- **Empty/error/loading states** lengkap.

## 3. Sistem Desain (Token Ringkas)

- **Warna**:
  - Primary: Green 600 #16A34A; Primary 700 #15803D; Primary 100 #DCFCE7.
  - Neutral: N900 #111827; N700 #374151; N500 #6B7280; N300 #9CA3AF; N100 #E5E7EB.
  - Success: #16A34A; Warning: #F59E0B; Danger: #DC2626; Info: #2563EB.
- **Tipografi**:
  - Display L: 28/36 Bold; H1: 22/28 Semibold; H2: 18/24 Semibold; Body: 14/20 Regular; Caption: 12/16 Regular.
- **Spacing**:
  - Screen padding: 16dp; Section gap: 16–20dp; Card padding: 16dp; List item height: min 64dp.
- **Komponen**:
  - **AppBar**: tinggi 56dp, safe-area aware; judul + aksi kanan.
  - **Card**: radius 16dp; shadow lembut; konten left-aligned grid 8dp.
  - **Button**: Primer Filled (Green 600, teks putih), Sekunder Outline (Green 600), Tersier Text.
  - **Links**: warna Primary 700; ukuran Body Semibold.
  - **Bottom Nav**: 5 tab, semua berlabel; ikon 24dp; aktif: Primary 600; inaktif: N500.

## 4. Revisi Per Layar

### 4.1 Home/Dashboard

- **Safe Area**: Tambah paddingTop sesuai WindowInsets; header tidak boleh tertimpa status bar.
- **AppBar**: “Halo, [Nama]” sebagai H1; subjudul tanggal sebagai Caption; ikon notifikasi kanan.
- **Kartu Saldo**:
  - Judul “Total Saldo Keseluruhan”.
  - Nilai besar (Display L).
  - Subinfo grid 2 kolom: Pemasukan bulan ini | Pengeluaran bulan ini.
  - CTA sekunder: “Lihat Rincian” → ke Laporan.
- **Quick Actions**:
  - 3 tombol besar: + Pemasukan, − Pengeluaran, + Target Tabungan. Label jelas; area sentuh 72x72dp.
- **Target Tabungan**:
  - Jika kosong: tambah tombol “Jelajahi Template Target” dan “Impor dari Dompet”.
  - Jika ada: tampilkan progress ring + 1–2 target teratas.
- **Transaksi Terbaru**:
  - Tiga item terakhir; ikon kategori; amount kanan hijau/merah; subteks tanggal & dompet.
  - “Lihat Semua” → halaman Transaksi.
- **Konsistensi**: Margin kiri-kanan sejajar.

### 4.2 Dompet (Wallet) – Memperbaiki Crash dan UX

- **Stabilitas**:
  - Defensive null-check pada data wallet; default non-null model.
  - Lazy load balances; gunakan coroutine/worker; no I/O di main thread.
  - Navigation guard: jika belum ada dompet → tampilkan EmptyState dengan CTA “Buat Dompet”.
- **UI**:
  - Daftar dompet: nama, saldo, ikon bank/kas; badge default.
  - CTA primer: “Tambah Dompet”.
  - Aksi per item: Edit, Arsip, Atur sebagai default.
  - Filter/sort: by saldo, alfabetis.
- **Detail Dompet**:
  - Saldo, mutasi terbaru, tombol Tambah Transaksi, Transfer antar dompet.
  - Grafik mini arus kas 7/30 hari.

### 4.3 Pemasukan/Pengeluaran (Form)

- Satu layar form dinamis dengan toggle Tipe: Pemasukan/Pengeluaran.
- Field: Jumlah (Rp), Kategori, Dompet, Tanggal, Catatan, Bukti (opsional).
- Validasi real-time; keypad numeric; format RP otomatis.
- Shortcut “Simpan & Tambah Lagi”.

### 4.4 Tabungan (Goals)

- Daftar target dengan progress; support auto-debit dari dompet.
- Empty state edukatif + contoh template (Dana Darurat, Liburan, Pendidikan).
- Detail target: target nominal, tenggat, progress bar, riwayat setoran.

### 4.5 Laporan

- Ringkasan bulan: total pemasukan, pengeluaran, net, pie chart kategori.
- Toggle periode (bulan/kuartal/tahun); ekspor PDF.

### 4.6 Pengaturan

- Profil, Mata uang, Kategori, Dompet, Cadangan/Restore, Keamanan (PIN/biometrik), Tema (Light/Dark).

## 5. Navigasi & IA

- **Bottom Nav (5)**: Home, Transaksi, Dompet, Laporan, Pengaturan.
- Semua tab berlabel; deep-link aman.
- Back-stack terkelola; prevent multiple instance.

## 6. Empty/Error/Loading States

- **Empty Home**: “Mulai dengan menambahkan transaksi pertama Anda.” CTA + Pemasukan.
- **Error global**: Snackbar merah dengan aksi Coba Lagi.
- **Loading**: Skeleton untuk kartu saldo, list transaksi.

## 7. Aksesibilitas

- **Kontras minimum**: teks hijau pada putih → gunakan Green 700; link underline opsional.
- **Ukuran teks scalable** (Dynamic Type).
- **Hit target** ≥48dp; fokus indikator untuk keyboard/TV.

## 8. Kinerja

- Pagination transaksi; diffing list (ListAdapter).
- Memoize grafik; image caching.
- Cold start < 1.5s; jank < 1%.

## 9. Copy & Terminologi

- Konsisten: “Dompet”, “Transaksi”, “Target Tabungan”, “Laporan”.
- Hindari ambiguitas “Bulan ini” vs “Keseluruhan”.

## 10. QA & Pengujian

- Unit test: WalletRepository null-safe; default currency.
- UI test: buka tab Dompet dari berbagai entry; rotate; dark mode.
- Crash monitor: Firebase Crashlytics + breadcrumbs.
- Checklist:
  - Tidak ada overlap status bar.
  - Semua nav item berlabel.
  - Kontras teks link ≥4.5:1.
  - Form validasi dan format Rp.
  - Dompet kosong tidak crash; menampilkan EmptyState.

## 11. Telemetri

- Event: add_income, add_expense, open_wallet, create_wallet, create_goal, export_report.
- Funnel: onboarding → transaksi pertama → retensi D7.

## 12. Roadmap Implementasi (2 Sprint)

- **Sprint 1 (UI Foundation + Stabilitas Dompet)**:
  - Implementasi sistem desain (tokens, components).
  - Refactor AppBar + insets.
  - Bottom nav berlabel.
  - Refactor Wallet module: guard state, DI scope, async load, empty state.
  - QA + Crashlytics.
- **Sprint 2 (Perbaikan halaman & laporan)**:
  - Redesign Home (kartu saldo, quick actions, transaksi terbaru).
  - Form transaksi unified.
  - Tabungan list/detail + empty education.
  - Laporan ringkas + filter.
  - A11y pass, perf tuning.
- **Release**: Staged rollout 10% → 50% → 100% dengan monitoring crash <0.2%.

## 13. Acceptance Criteria (Contoh Kunci)

- Membuka tab Dompet tidak menimbulkan crash pada akun baru maupun lama.
- Tidak ada konten yang tertutup status bar pada semua layar.
- Semua item bottom nav memiliki label dan ikon konsisten.
- Kontras teks minimal sesuai WCAG AA.
- Menambah pemasukan/pengeluaran memformat Rp otomatis dan muncul di “Transaksi Terbaru”.
- Home menampilkan saldo total dan ringkasan Pemasukan/Pengeluaran bulan ini dengan benar.

## Langkah Teknis Perbaikan Crash “Dompet”

- **Tambah try/catch dan default state**:
  - `WalletState(emptyList(), isLoading=true, error=null)`.
- **Inisialisasi repository**: Pastikan load data aman.
- **Cek navigasi**:
  - Pastikan route “wallet” ada di NavGraph.
- **Data null-safe**:
  - `currencySymbol ?: "Rp"`, `name ?: "Dompet Utama"`, `balance` default `0`.
- **Empty DB**:
  - Jika 0 dompet → tampilkan EmptyState + CTA “Tambah Dompet”.
