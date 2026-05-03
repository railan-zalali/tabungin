# Rencana Redesign UI/UX Neubrutalism Tabungin

Tanggal audit: 2026-05-03
Peran audit: Senior Engineer + UI/UX Designer
Scope: React Native Expo app, navigasi, desain sistem, layar utama, aksesibilitas, stabilitas build/test, local-first sync.

## 1. Ringkasan Eksekutif

Tabungin sudah memiliki fondasi produk yang kuat: arsitektur local-first, SQLite sebagai sumber data lokal, Supabase untuk sync, Zustand untuk state, React Navigation untuk alur, dan komponen UI reusable. Aplikasi juga sudah memiliki beberapa elemen desain sistem seperti token warna, spacing, typography, card, button, shell, empty state, filter, dan header.

Masalah utamanya adalah arah visual belum punya identitas yang tegas. UI saat ini cenderung "premium calm finance": hijau lembut, glass surface, shadow halus, radius besar, gradient hero, dan aura background. Ini cukup aman, tetapi belum sesuai permintaan neubrutalism. Redesign perlu mengubah bahasa visual ke bentuk yang lebih keras, lebih berani, dan lebih mudah dipindai tanpa membuat aplikasi keuangan terasa main-main.

Secara teknis, audit menemukan TypeScript gagal, Jest gagal start, potensi mismatch deep link reset password, dokumentasi/teks yang mengalami encoding mojibake, beberapa pola aksesibilitas yang perlu dibersihkan, dan risiko performa pada list/report bila data membesar.

## 2. Peta Sistem Saat Ini

Stack utama:

- Framework: React Native + Expo SDK 55.
- Bahasa: TypeScript strict.
- State: Zustand.
- Local database: Expo SQLite.
- Backend/sync: Supabase.
- Navigasi: React Navigation bottom tabs + native stack.
- UI: komponen custom, NativeWind tersedia tetapi mayoritas style memakai StyleSheet.
- Visual: expo-linear-gradient, @expo/vector-icons, Reanimated, Victory Native, Skia.

Struktur penting:

- Entry: `App.tsx`.
- Root navigation: `src/navigation/RootNavigator.tsx`.
- Tab navigation: `src/navigation/TabNavigator.tsx`.
- Design tokens: `src/constants/colors.ts`, `src/constants/theme.ts`, `src/constants/typography.ts`.
- Common components: `src/components/common/*`.
- Screens utama: dashboard, transaksi, dompet, saving, laporan, settings.
- Sync: `src/database/sync.ts`, `src/database/schema.ts`.

## 3. Temuan Validasi Teknis

Perintah yang dijalankan:

- `npx tsc --noEmit`: gagal.
- `npx jest --runInBand`: gagal start.
- `npx expo-doctor`: lolos 18/18.
- `npm ls expo-modules-core --depth=0`: tidak ada dependency langsung, tetapi ada nested di dalam `expo`.
- `npm ls @expo/vector-icons --depth=0`: tidak ada dependency langsung, tetapi ada di lockfile/transitive.

### 3.1 Critical: TypeScript Gagal

Lokasi:

- `src/utils/notificationService.ts:31`
- `src/utils/notificationService.ts:33`

Error:

```text
Property 'status' does not exist on type 'NotificationPermissionsStatus'.
```

Dampak:

- Build TypeScript tidak bersih.
- CI yang menjalankan typecheck akan gagal.
- Area notifikasi reminder tabungan dan budget warning berisiko tidak terverifikasi setelah upgrade Expo Notifications.

Rekomendasi:

- Hindari import internal seperti `expo-notifications/build/...`.
- Gunakan public API `import * as Notifications from 'expo-notifications'`.
- Gunakan properti `granted` sebagai jalur utama, atau pastikan tipe permission berasal dari package public API yang benar.

### 3.2 High: Jest Gagal Start

Lokasi:

- `jest.config.js`
- `node_modules/jest-expo/src/preset/setup.js`

Error:

```text
Cannot find module 'expo-modules-core' from 'node_modules/jest-expo/src/preset/setup.js'
```

Dampak:

- Test suite tidak berjalan sama sekali.
- Test database sync yang sudah ada tidak memberi sinyal regresi.

Rekomendasi:

- Tambahkan `expo-modules-core` sebagai dependency/devDependency langsung yang kompatibel dengan Expo SDK 55, atau tambahkan resolver/moduleNameMapper yang stabil.
- Setelah itu jalankan ulang `npx jest --runInBand`.

### 3.3 High: Deep Link Reset Password Tidak Punya Screen

Lokasi:

- `src/store/useAuthStore.ts:258` memakai `tabungin://reset-password`.
- `src/navigation/LinkingConfiguration.ts` tidak mendefinisikan route `reset-password`.
- `src/types/navigation.ts:13` mendefinisikan `AuthCallback`, tetapi `RootNavigator` tidak memasang screen itu.
- `src/navigation/LinkingConfiguration.ts:54` mendefinisikan `NotFound`, tetapi tidak ada di `RootStackParamList` dan `RootNavigator`.

Dampak:

- Link reset password dari Supabase berpotensi tidak membuka layar yang benar.
- Pengguna yang lupa password bisa mentok setelah klik email.

Rekomendasi:

- Buat screen reset password/auth callback atau sesuaikan `redirectTo` ke route yang benar.
- Sinkronkan `RootStackParamList`, `RootNavigator`, dan `LinkingConfiguration`.

### 3.4 Medium: Encoding Mojibake Pada Teks dan Dokumentasi

Contoh:

- `README.md` menampilkan karakter seperti `ðŸ·`, `âœ¨`, `â”œ`.
- `App.tsx` loading logo menampilkan karakter rusak.
- Komentar di beberapa file juga terkena mojibake.

Dampak:

- Brand terlihat tidak rapi.
- Teks push notification berpotensi tampil rusak.
- Dokumentasi sulit dibaca.

Rekomendasi:

- Normalisasi encoding file ke UTF-8.
- Untuk UI produksi, pakai icon component/asset, bukan emoji raw jika encoding pipeline belum pasti.

### 3.5 Medium: Dynamic Type dan Text Truncation

Contoh:

- `App.tsx` beberapa teks memakai `allowFontScaling={false}`.
- `HeroSummaryCard` membatasi value ke `numberOfLines={1}`.
- Banyak chip/button/list item memakai `numberOfLines={1}`.

Dampak:

- Pengguna dengan text size besar bisa kehilangan informasi penting.
- Nominal panjang dapat terpotong.

Rekomendasi:

- Untuk nominal kritikal, izinkan 2 baris atau pakai adaptive layout.
- Gunakan `adjustsFontSizeToFit` secara hati-hati untuk angka besar.
- Pastikan target sentuh minimal 48dp tetap stabil.

### 3.6 Medium: Dependency Langsung Untuk Import UI

Kode banyak mengimpor `@expo/vector-icons`, tetapi `package.json` tidak mencatatnya sebagai dependency langsung. Lockfile memiliki paket itu secara transitive.

Dampak:

- Instalasi dengan package manager berbeda atau pruning dependency dapat membuat import rapuh.

Rekomendasi:

- Jika package diimpor langsung oleh source app, deklarasikan sebagai dependency langsung.

### 3.7 Medium: Script Developer Minimal

`package.json` hanya punya script `testsprite:mcp`.

Dampak:

- Developer baru tidak punya entry jelas untuk `start`, `android`, `ios`, `typecheck`, `test`.
- CI lebih sulit distandarisasi.

Rekomendasi:

- Tambahkan script standar: `start`, `android`, `ios`, `web`, `typecheck`, `test`.

## 4. Audit UI/UX Saat Ini

Kekuatan:

- Informasi utama dashboard sudah jelas: saldo, pemasukan, pengeluaran, target, transaksi terbaru.
- Empty state tersedia di banyak layar.
- Header dan shell sudah reusable.
- Bottom nav custom punya label dan icon.
- Tema light/dark dan text size sudah mulai dipikirkan.

Masalah:

- Visual language terlalu lembut untuk neubrutalism.
- Banyak radius besar, glassmorphism, gradient, glow/aura, dan shadow blur yang bertentangan dengan neubrutalism.
- Komponen finance penting seperti saldo, budget, transaksi, dan target belum memakai hirarki brutal yang kuat: border tebal, shadow offset keras, color blocks, label padat.
- Dashboard copy cenderung panjang, membuat layar operasional terasa editorial.
- Quick action masih berupa kartu lembut, belum seperti control panel yang tegas.
- Laporan dan transaksi perlu scanning density lebih tinggi.

## 5. Arah Konsep: Financial Neubrutalism

Nama konsep: "Ledger Brutal"

Karakter:

- Berani, tegas, tactile, dan cepat dipindai.
- Tetap dipercaya sebagai aplikasi keuangan, bukan gimmick.
- Menggunakan hard border, shadow offset, warna blok, dan layout modular.
- Menghindari glassmorphism, glow, blur, dan gradient dekoratif.
- Tone copy lebih singkat, langsung, dan utilitarian.

Prinsip:

- Border sebagai struktur, bukan dekorasi.
- Shadow keras sebagai affordance interaksi.
- Warna aksen untuk status finansial, bukan ornamen.
- Angka keuangan selalu menjadi titik fokus.
- Komponen terasa seperti panel kontrol yang bisa ditekan.

## 6. Design Tokens Neubrutalism

### 6.1 Warna

Token inti:

```text
ink:        #111111
paper:      #FFF8E7
paperAlt:   #F4E8C8
white:      #FFFFFF
green:      #00A86B
lime:       #B6FF3B
yellow:     #FFD84D
red:        #FF4D4D
blue:       #3B82F6
pink:       #FF7AB6
purple:     #8B5CF6
gray:       #D9D9D9
```

Pemakaian:

- Income: green/lime.
- Expense/danger: red.
- Warning/budget: yellow.
- Info/shared: blue.
- Saving goal: pink/purple sebagai aksen, bukan dominasi.
- Background utama: paper atau white, bukan gradient.
- Dark mode: tetap brutal dengan ink background, paper card, dan border terang terbatas.

### 6.2 Shape

- Radius global: 8dp.
- Radius mini/chip: 999dp hanya untuk badge status kecil.
- Border: 2dp normal, 3dp untuk hero/action utama.
- Shadow: offset keras, tanpa blur.

Contoh:

```text
shadowOffset: { width: 5, height: 5 }
shadowOpacity: 1
shadowRadius: 0
elevation: 6
```

### 6.3 Typography

Font saat ini bisa dipertahankan:

- Heading: Plus Jakarta Sans Bold/SemiBold.
- Body: DM Sans.

Rekomendasi:

- Hapus letter spacing negatif untuk gaya brutal yang lebih stabil.
- Display angka: 30-36dp, bold, lineHeight rapat tapi tidak clip.
- Label: uppercase pendek untuk metadata, letterSpacing 0.4 maksimal.

### 6.4 Motion

- Tekan tombol: translate 3dp ke kanan bawah, shadow mengecil.
- Hindari spring/glow terlalu lembut.
- Transisi layar tetap halus, tetapi micro interaction harus terasa tactile.

## 7. Komponen Foundation Yang Perlu Diubah

Urutan refactor:

1. `colors.ts`: tambah token brutal dan mapping semantic.
2. `theme.ts`: tambah border width, hard shadow, brutal radius.
3. `Button.tsx`: ubah primary/secondary/danger menjadi bordered hard-shadow button.
4. `Card.tsx`: ganti glass/elevated blur menjadi solid panel.
5. `ScreenShell.tsx`: hapus aura background, gunakan paper background atau pattern garis halus.
6. `HeroSummaryCard.tsx`: hilangkan gradient/glow, ubah menjadi ledger panel dengan angka besar.
7. `AppScreenHeader.tsx`: jadikan header seperti strip kontrol, sticky jika perlu.
8. `TabNavigator.tsx`: bottom nav menjadi dock brutal dengan border hitam dan active block.
9. `Input.tsx`: border tebal, focus ring offset, error panel merah.
10. `FilterBar.tsx` dan `SegmentedControl.tsx`: ubah menjadi segmented blocks yang jelas.

## 8. Redesign Per Layar

### 8.1 Onboarding/Auth

Tujuan:

- Memberi rasa percaya, bukan onboarding panjang.
- Visual harus langsung menunjukan Tabungin sebagai alat finansial.

Rancangan:

- Background paper.
- Logo/brand di panel putih dengan border hitam.
- Form login/register dalam single panel.
- CTA utama lime/green dengan hard shadow.
- Error inline merah, bukan Alert saja.
- Link lupa password harus jelas dan route reset harus benar.

### 8.2 Dashboard

Masalah saat ini:

- Hero gradient dan aura terlalu soft.
- Copy terlalu panjang.
- Aksi cepat kurang tactile.

Rancangan:

- Header: "Halo, [nama]" + tanggal + profile switcher compact.
- Saldo panel: border 3dp, background yellow/paper, angka besar hitam.
- Strip finansial: pemasukan, pengeluaran, net dalam 3 blok warna.
- Quick action: tiga tombol besar seperti keypad: Pemasukan, Pengeluaran, Target.
- Insight: lebih pendek, berbasis status: "Cashflow positif", "Budget mendekati limit", "Target aktif".
- Transaksi terbaru: list padat dengan icon block, amount kanan, category badge.

Acceptance:

- Dalam 5 detik pengguna tahu saldo, cashflow, dan aksi berikutnya.
- Tidak ada teks penting terpotong pada text size xlarge.

### 8.3 Transaksi

Masalah saat ini:

- Filter sudah bagus tetapi masih terasa card lembut.
- Section header bisa lebih padat.

Rancangan:

- Top summary: count, net, filter aktif dalam ledger strip.
- Filter: segmented control tebal, search input bordered.
- List: row putih dengan border bawah hitam tipis, icon kategori dalam square block.
- Swipe/long press actions harus punya feedback brutal.
- Empty state harus langsung memberi CTA.

Acceptance:

- Search dan filter tetap debounced.
- List tidak jank untuk data besar.
- Pertimbangkan FlashList bila transaksi > 500 item.

### 8.4 Dompet

Masalah saat ini:

- Wallet card masih premium-soft.
- Delete hanya muncul jika bukan default, tetapi affordance aksi lain belum lengkap.

Rancangan:

- Wallet sebagai "account tile": strip warna di kiri, saldo besar, badge default/shared.
- Header total saldo sebagai panel brutal.
- Aksi per wallet: edit, set default, share, delete dalam icon buttons.
- Empty state: "Buat dompet pertama" dengan tombol solid.
- Shared wallet diberi block biru yang jelas.

Acceptance:

- Dompet kosong tidak crash.
- Wallet default tidak bisa dihapus dan alasannya jelas.
- Shared wallet mudah dibedakan dari wallet personal.

### 8.5 Saving Goals

Rancangan:

- Goal card seperti progress ticket.
- Progress bar tebal dengan border hitam.
- CTA tambah setoran berupa tombol hijau keras.
- Shared goal punya badge biru.
- Goal completed menjadi panel lime/green, bukan sekadar badge kecil.

Acceptance:

- Progress dan sisa target terbaca tanpa membuka detail.
- Setoran tidak boleh membuat balance negatif tanpa konfirmasi.

### 8.6 Budget

Rancangan:

- Budget tiap kategori sebagai meter horizontal tebal.
- Warning 80%: kuning.
- Over budget: merah dengan label kuat.
- Form budget dibuat sebagai bottom sheet/panel, bukan layar yang terasa berat.

Acceptance:

- Pengguna tahu kategori mana yang bahaya tanpa membaca semua angka.

### 8.7 Report

Rancangan:

- Kurangi dekorasi, naikkan kepadatan insight.
- Chart diberi frame hitam, legend dalam chip blok.
- Toggle periode berupa segmented block.
- Export PDF/CSV sebagai icon action dengan label pendek.

Acceptance:

- Insight utama bulan ini muncul sebelum chart detail.
- Chart tetap accessible dengan summary teks.

### 8.8 Settings

Rancangan:

- Settings sebagai menu ledger: akun, dompet, kategori, backup, keamanan, tampilan.
- Tema dan text size sebagai segmented blocks.
- Danger zone dipisah dengan panel merah.

Acceptance:

- Logout/delete account selalu butuh konfirmasi jelas.
- Backup/restore mudah ditemukan.

## 9. Accessibility Checklist

Wajib:

- Hit target minimal 48dp.
- Semua icon button punya accessibilityLabel.
- Nominal tidak boleh hanya dibedakan dengan warna.
- Text size xlarge tidak merusak layout.
- Fokus/error form harus eksplisit.
- Hindari `allowFontScaling={false}` kecuali untuk logo dekoratif.
- Semua alert penting punya alternatif inline bila error terjadi di form.

## 10. Performance Checklist

Wajib:

- Memoize row list transaksi, wallet, goal.
- Hindari re-render global saat theme/profile berubah kecuali perlu.
- Gunakan pagination atau FlashList untuk list panjang.
- Chart dirender hanya saat data/period berubah.
- Jangan memanggil sync berat pada setiap refresh UI jika tidak perlu.
- Audit realtime channel agar tidak double subscribe.

## 11. Security & Data Integrity Checklist

Wajib:

- Reset password deep link harus valid.
- Logout membersihkan data lokal sesuai kebutuhan multi-user device.
- Sync harus tahan konflik local pending update vs realtime delete.
- Supabase env anon key boleh public, tetapi service role tidak boleh ada di client.
- Export data perlu konfirmasi dan nama file yang aman.
- Restore data harus punya dry-run/preview sebelum overwrite.

## 12. Roadmap Implementasi

### Sprint 0: Stabilitas Sebelum Redesign

- Fix TypeScript notification permission.
- Fix Jest dependency/resolver.
- Tambah scripts developer standar.
- Rapikan deep link reset password/auth callback.
- Normalisasi encoding file UI dan docs yang terlihat ke user.

Output:

- `npx tsc --noEmit` pass.
- `npx jest --runInBand` minimal bisa start dan menjalankan test yang ada.
- Reset password flow bisa dibuka dari link.

### Sprint 1: Design Foundation Neubrutalism

- Tambah brutal tokens.
- Refactor Button, Card, Input, Badge, Header, ScreenShell.
- Ubah hard shadow dan border sebagai primitive.
- Buat style guide mini di docs atau story screen internal.

Output:

- Semua komponen reusable memakai visual baru.
- Tidak ada aura/glass/gradient default.

### Sprint 2: Core Flow

- Redesign Dashboard.
- Redesign Transaksi list + Add/Edit form.
- Redesign Wallet list + Add/Edit wallet.
- Redesign Saving list/detail.

Output:

- Flow catat transaksi, kelola dompet, dan tambah target sudah terasa konsisten.

### Sprint 3: Reporting, Budget, Settings

- Redesign report dan chart frames.
- Redesign budget screen.
- Redesign settings dan export.
- A11y pass.

Output:

- Semua tab utama konsisten.

### Sprint 4: QA, Polish, Release

- Snapshot visual manual light/dark.
- Test Dynamic Type normal/large/xlarge.
- Test akun baru, guest/offline, login, logout, sync.
- Staged release.

## 13. Acceptance Criteria Global

- TypeScript pass tanpa error.
- Jest minimal berjalan.
- Expo doctor pass.
- Tidak ada teks mojibake pada UI produksi.
- Tidak ada konten tertutup status bar atau bottom nav.
- Dashboard, transaksi, dompet, saving, laporan, settings memakai token brutal yang sama.
- Semua nominal besar tetap terbaca pada mobile kecil.
- Semua aksi destructive punya konfirmasi.
- Empty/loading/error state tersedia di semua layar utama.
- Reset password deep link bekerja.

## 14. Prioritas Backlog Bug

P0:

- Fix TypeScript notification permission error.
- Fix Jest startup error.
- Fix reset-password deep link.

P1:

- Normalisasi encoding UI/docs.
- Tambah scripts standar di `package.json`.
- Deklarasikan dependency langsung untuk package yang diimpor langsung.
- Audit `allowFontScaling={false}` dan `numberOfLines={1}` pada teks kritikal.

P2:

- Migrasi list panjang ke pagination/FlashList.
- Tambah test untuk wallet kosong, shared wallet, dan sync conflict.
- Tambah inline form validation yang konsisten.

## 15. Catatan Worktree

Saat audit, `package.json` dan `package-lock.json` sudah memiliki perubahan lokal berupa upgrade versi Expo/React Native package. Dokumen ini tidak mengubah kedua file tersebut.

