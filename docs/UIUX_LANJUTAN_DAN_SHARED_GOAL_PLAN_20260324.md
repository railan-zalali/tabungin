# Rencana Lanjutan UI/UX dan Audit Shared Goal

Tanggal: 24 Maret 2026
Produk: Tabungin

## Ringkasan Diagnosa

Sistem saat ini sudah punya fondasi fitur yang cukup luas: multi-wallet, multi-profile, transaksi, target tabungan, budget, notifikasi, recurring transaction, dan wallet sharing. Namun pengalaman pengguna masih terasa belum menyatu karena:

1. Bahasa visual belum konsisten antara dashboard, laporan, pengaturan, wallet, dan saving.
2. Beberapa fitur inti ada di level data, tetapi belum selesai di level flow UX.
3. Arsitektur theme dan screen style masih campur antara static token dan dynamic theme.
4. Fitur shared wallet sudah lebih matang dibanding shared saving goal.

## Progress Implementasi

Update implementasi yang sudah masuk setelah rencana ini dibuat:

1. Form target tabungan sekarang mendukung pemilihan dompet saat create.
2. Daftar target mulai menampilkan konteks wallet dan label shared pada item yang relevan.
3. Saving list dan add goal flow sudah dipoles dengan animasi masuk bertahap.
4. Visual saving module mulai mengarah ke glassmorphism ringan dengan gradient, border transparan, dan layer highlight.
5. Dashboard, laporan, dan detail target mulai memakai bahasa visual yang sama agar perpindahan screen terasa lebih mulus.

## Temuan Produk

### 1. Area UI/UX yang paling perlu dibenahi

- Hierarki visual antar screen belum konsisten.
- CTA penting belum selalu ditempatkan di area yang mudah dipindai.
- Beberapa form belum mendukung mode edit secara utuh.
- State empty, loading, dan success masih terasa generik.
- Navigasi lintas domain masih membingungkan untuk fitur yang saling terkait.

### 2. Temuan teknis yang mempengaruhi UX

- `ReportScreen` sempat crash karena style dinamis didefinisikan di scope statis.
- Ada beberapa navigasi lintas stack yang belum tertata rapi secara typing.
- Theme system masih terbagi antara token statis dan hook dinamis.
- Shared goal sudah punya tabel dan RPC backend, tetapi konsumsi datanya di app belum end-to-end.

### 3. Status fitur edit catatan transaksi

Sudah diaktifkan melalui flow edit transaksi. Pengguna sekarang bisa membuka transaksi yang sudah tersimpan lalu menyimpan perubahan, termasuk catatan. Perubahan juga sudah memperhitungkan perubahan nominal/tipe/dompet agar saldo wallet tetap konsisten.

## Audit Shared Goal Saat Sharing Wallet

### Kondisi saat ini

Yang sudah ada:

- Tabel `wallet_goals_shared`.
- RPC `auto_share_wallet_goals`.
- Hydration shared wallet dari server juga menarik `saving_goals` dan `saving_logs`.
- UI anggota dompet sudah menampilkan badge jumlah goal yang dishare.

Yang belum lengkap:

- Daftar target tabungan sebelumnya belum secara eksplisit membaca goal dari wallet yang user akses.
- Pembuatan target baru belum memberi pilihan dompet, jadi goal baru belum jelas melekat ke wallet mana.
- Flow permission shared goal masih implisit, belum terlihat jelas di UI.
- Belum ada pembeda visual antara target pribadi, target dompet bersama, dan target hasil share.

### Kesimpulan

Secara backend dan data model, shared goal sudah mulai dibangun. Secara pengalaman produk, fitur ini belum bisa dianggap selesai 100 persen. Setelah patch hari ini, pembacaan goal untuk wallet yang bisa diakses user sudah diperluas, tetapi flow pembuatan, ownership, dan tampilan shared goal masih perlu dituntaskan.

## Arah Desain UI/UX Berikutnya

### Fase 1: Rapikan fondasi

- Satukan design token warna, spacing, radius, elevation, dan state.
- Standarkan header, card, list row, chip, dan modal.
- Rapikan empty state, loading state, dan success feedback.
- Selesaikan semua mode edit untuk transaksi, target, wallet, dan recurring item.

### Fase 2: Perjelas model mental produk

- Tampilkan konteks aktif di seluruh app: profil aktif, dompet aktif, ruang personal vs shared.
- Tambahkan label visual untuk data pribadi vs data bersama.
- Buat entry point cepat untuk `Tambah Transaksi`, `Tambah Target`, dan `Pindah Dompet`.

### Fase 3: Upgrade saving experience

- Tambahkan wallet picker saat membuat/edit target.
- Tambahkan badge `Pribadi`, `Shared`, `Team Goal`, atau `Shared to You`.
- Buat tab filter target: `Semua`, `Pribadi`, `Dompet Bersama`, `Selesai`.
- Tambahkan timeline kontribusi anggota untuk goal bersama.

### Fase 4: Upgrade report dan insight

- Pecah laporan menjadi snapshot, tren, kategori, dan actionable insight.
- Tambahkan perbandingan per wallet dan per profile.
- Tambahkan insight otomatis seperti over-budget, saving pace, dan recurring anomaly.

### Fase 5: Social and collaboration layer

- Sharing wallet dengan preview data yang ikut dibagikan.
- Pengaturan granular: share transaksi saja, share target juga, atau read-only.
- Activity log untuk perubahan anggota, target, dan transaksi penting.

## Backlog Prioritas Tinggi

1. Wallet picker untuk create/edit saving goal.
2. Label dan filter untuk personal/shared goal.
3. Detail shared goal dengan daftar member dan kontribusi.
4. Konsolidasi theme system menjadi satu sumber kebenaran.
5. Refactor navigation lintas stack agar CTA dari Settings tidak bergantung pada route hack.

## Definisi Selesai untuk Shared Goal

Fitur shared goal baru dianggap selesai jika:

1. User bisa memilih goal ini milik dompet mana saat create/edit.
2. Goal otomatis muncul ke member yang memang punya akses.
3. UI memberi label jelas apakah goal personal atau shared.
4. Detail goal menampilkan konteks ownership dan member yang ikut melihat.
5. Permission dan perilaku sync konsisten di lokal maupun Supabase.
