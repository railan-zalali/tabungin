# Tabungin — Rencana Pengembangan Lanjutan Komprehensif

> **Dibuat:** Oktober 2026  
> **Berdasarkan:** Analisis sistem pada `SYSTEM_ANALYSIS.md`  
> **Horizon:** 6 bulan (Q4 2026 – Q2 2027)  
> **Status:** Draft untuk review tim engineering

---

## Daftar Isi

1. [Strategi Umum](#1-strategi-umum)
2. [Prioritas Pengembangan](#2-prioritas-pengembangan)
3. [Fase 1 — Stabilisasi & Hardening (Bulan 1–2)](#3-fase-1--stabilisasi--hardening-bulan-12)
4. [Fase 2 — Perbaikan Arsitektur (Bulan 2–3)](#4-fase-2--perbaikan-arsitektur-bulan-23)
5. [Fase 3 — Pengembangan Fitur (Bulan 3–5)](#5-fase-3--pengembangan-fitur-bulan-35)
6. [Fase 4 — Scale & Optimalisasi (Bulan 5–6)](#6-fase-4--scale--optimalisasi-bulan-56)
7. [Backlog Fitur Lengkap](#7-backlog-fitur-lengkap)
8. [Strategi Implementasi Teknis](#8-strategi-implementasi-teknis)
9. [Metrik Keberhasilan](#9-metrik-keberhasilan)
10. [Rencana CI/CD](#10-rencana-cicd)
11. [Risiko & Mitigasi](#11-risiko--mitigasi)

---

## 1. Strategi Umum

### 1.1 Visi

Mentransformasi Tabungin dari **"mature MVP"** (skor 7.5/10) menjadi **"production-grade personal finance platform"** (target 9/10) dalam 6 bulan, dengan fokus pada:

1. **Keamanan & Reliabilitas** — Hapus technical debt kritis, tambahkan testing
2. **Konsistensi Arsitektur** — Samakan semua screen ke design system
3. **Ekspansi Fitur** — Tambah fitur high-value untuk retensi pengguna
4. **Performance & Scale** — Optimalisasi untuk basis pengguna 10x lebih besar

### 1.2 Prinsip Pengembangan

| Prinsip | Penerapan |
|---------|----------|
| **Security First** | Setiap fitur baru harus lolos security review sebelum merge |
| **Test-Driven** | Fitur baru wajib disertai unit test; bug fix wajib disertai regression test |
| **Offline-First** | Semua fitur baru harus berfungsi tanpa koneksi internet |
| **Design System Compliance** | Semua screen baru wajib menggunakan `ScreenShell` + design system |
| **Incremental Delivery** | Rilis per fase, bukan big-bang. Setiap fase menghasilkan versi yang deployable |
| **Backward Compatibility** | Schema migration harus aman untuk user existing (tidak boleh kehilangan data) |

### 1.3 Timeline Ringkas

```
Bulan 1-2:  ████████░░░░░░░░░░░░  Fase 1 — Stabilisasi & Hardening
Bulan 2-3:  ░░░░░░░░██████░░░░░░  Fase 2 — Perbaikan Arsitektur
Bulan 3-5:  ░░░░░░░░░░░░░░████████████░░  Fase 3 — Pengembangan Fitur
Bulan 5-6:  ░░░░░░░░░░░░░░░░░░░░░░░░████  Fase 4 — Scale & Optimalisasi
```

---

## 2. Prioritas Pengembangan

Matriks prioritas berdasarkan **Impact** (nilai untuk pengguna/bisnis) vs **Effort** (kompleksitas implementasi):

```
          HIGH IMPACT
              │
    ┌─────────┼─────────┐
    │  P1     │  P2     │
    │ Quick   │  Big    │
    │ Wins    │ Bets    │
 HIGH────────┼─────────LOW EFFORT
    │  P3     │  P4     │
    │ Fill    │  Avoid  │
    │ Ins     │         │
    └─────────┼─────────┘
              │
          LOW IMPACT
```

### 2.1 Matriks Prioritas

| ID | Item | Impact | Effort | Fase | Prioritas |
|----|------|--------|--------|------|-----------|
| P1-01 | Hapus password hashing lokal yang tidak aman | High | Low | 1 | 🔴 Kritis |
| P1-02 | Tambah Error Boundary | High | Low | 1 | 🔴 Kritis |
| P1-03 | Hapus dependency tidak terpakai (paper, web) | Medium | Low | 1 | 🟡 Tinggi |
| P1-04 | Fix duplikasi route registrations | Medium | Low | 1 | 🟡 Tinggi |
| P2-01 | Setup testing framework (Jest + RNTL) | High | High | 1-2 | 🔴 Kritis |
| P2-02 | Refactor 3 screen ke design system | High | Medium | 2 | 🟡 Tinggi |
| P2-03 | Refactor sync.ts ke modular architecture | High | High | 2 | 🟡 Tinggi |
| P2-04 | CI/CD pipeline dengan typecheck + test | High | Medium | 2 | 🟡 Tinggi |
| P2-05 | Push notification (expo-notifications + server) | High | High | 3 | 🟡 Tinggi |
| P2-06 | AI insight & spending prediction | High | High | 3 | 🟡 Tinggi |
| P2-07 | Debt tracking module | High | Medium | 3 | 🟡 Tinggi |
| P3-01 | Hardcoded colors cleanup | Low | Low | 2 | 🟢 Sedang |
| P3-02 | ProfileSwitcher coordinating method | Low | Low | 2 | 🟢 Sedang |
| P3-03 | E2E test dengan Maestro | Medium | Medium | 4 | 🟢 Sedang |
| P3-04 | Performance profiling & optimization | Medium | Medium | 4 | 🟢 Sedang |
| P4-01 | NativeWind adoption (penuh) | Low | High | — | ⚪ Low |
| P4-02 | WebView dashboard (react-native-web) | Low | High | — | ⚪ Low |

---

## 3. Fase 1 — Stabilisasi & Hardening (Bulan 1–2)

**Tujuan:** Menghapus technical debt kritis, menambah safety net, dan memastikan foundation yang solid sebelum pengembangan fitur baru.

### 3.1 P1-01: Hapus Password Hashing Lokal yang Tidak Aman

**Masalah:** `authQueries.ts` masih memiliki SHA-256 + static salt password hashing yang usang.

**Aksi:**
1. Audit semua referensi ke `hashPassword()`, `registerUser()`, `loginUser()` dari `authQueries.ts`
2. Pastikan semua auth flow menggunakan Supabase Auth (sudah dilakukan di `useAuthStore`)
3. Hapus fungsi `hashPassword`, `registerUser`, `loginUser`, `changePassword` dari `authQueries.ts`
4. Hapus tabel `users` dari schema (atau mark as deprecated untuk v14 migration)
5. Update `clearAllData()` untuk tidak reference tabel `users`

**Estimasi:** 1–2 hari  
**Risiko:** Rendah (auth sudah via Supabase)  
**Verifikasi:** Pastikan login/register/Logout masih berfungsi end-to-end

### 3.2 P1-02: Tambah Error Boundary

**Masalah:** Tidak ada React Error Boundary. Crash pada satu screen = crash seluruh app.

**Aksi:**
1. Buat `src/components/common/AppErrorBoundary.tsx`
2. Wrap `RootNavigator` di dalam `AppErrorBoundary`
3. Tampilkan fallback UI dengan "Terjadi kesalahan" + tombol "Muat Ulang"
4. Log error ke console (dan Sentry jika ditambahkan)
5. Tambahkan error boundary per-screen untuk isolation yang lebih baik

**Estimasi:** 1 hari  
**Risiko:** Rendah

### 3.3 P1-03: Hapus Dependency Tidak Terpakai

**Masalah:** `react-native-paper` dan `react-native-web` terdaftar tapi tidak digunakan.

**Aksi:**
1. Verifikasi tidak ada import dari kedua package
2. Hapus dari `package.json`
3. Jalankan `npm install` untuk update lock file
4. Verifikasi build masih sukses

**Estimasi:** 0.5 hari  
**Risiko:** Rendah

### 3.4 P1-04: Fix Duplikasi Route Registrations

**Masalah:** `WalletList`, `AddWallet`, `QRScanner`, `JoinWallet` didaftarkan di dua StackNavigator.

**Aksi:**
1. Konsolidasikan route wallet ke satu StackNavigator (rekomendasi: `WalletStackNavigator`)
2. Di `SettingsStackNavigator`, navigasi ke wallet menggunakan cross-tab navigation: `navigation.navigate('Wallet', { screen: 'WalletList' })`
3. Update `types/navigation.ts` untuk refleksi struktur final
4. Test semua path navigasi yang mengakses wallet dari Settings

**Estimasi:** 1 hari  
**Risiko:** Sedang (mungkin ada navigasi yang putus jika tidak teruji penuh)

### 3.5 P2-01: Setup Testing Framework

**Masalah:** Tidak ada test sama sekali.

**Aksi Bertahap:**

**Bulan 1 — Foundation:**
1. Install Jest + React Native Testing Library:
   ```bash
   npm install -D jest @testing-library/react-native @testing-library/jest-native jest-expo
   ```
2. Setup `jest.config.js` dengan preset `jest-expo`
3. Setup `__mocks__/` untuk `expo-sqlite`, `expo-secure-store`, `expo-crypto`, `@supabase/supabase-js`
4. Tambah script `"test": "jest"` dan `"test:watch": "jest --watch"` ke `package.json`
5. Tulis smoke test untuk memverifikasi setup:
   - `__tests__/App.test.tsx` — App renders without crash
   - `__tests__/stores/useThemeStore.test.ts` — Theme toggle works

**Bulan 2 — Critical Path Coverage:**
6. Unit test untuk validation utilities (`src/utils/validation.ts`)
7. Unit test untuk currency formatting (`src/utils/currency.ts`)
8. Unit test untuk date utilities (`src/utils/date.ts`)
9. Unit test untuk `syncQueue.ts` (serialized task execution)
10. Unit test untuk `calculateNextOccurrence()` di `recurringQueries.ts`
11. Integration test untuk `transactionQueries.ts` dengan in-memory SQLite mock
12. Component test untuk `Button`, `Input`, `ScreenShell` (design system basics)

**Estimasi:** 2–3 minggu  
**Risiko:** Sedang (mocking expo modules bisa tricky)  
**Target coverage:** 30% pada akhir Fase 1 (critical path only)

### 3.6 P2-04: CI/CD Pipeline

**Aksi:**
1. Buat `.github/workflows/ci.yml` (atau platform CI yang digunakan):
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     typecheck:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
         - run: npm ci
         - run: npm run typecheck
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
         - run: npm ci
         - run: npm test -- --coverage
   ```
2. Tambah pre-commit hook dengan `lint-staged` untuk typecheck pada staged files
3. Setup EAS Build untuk otomatisasi build development & preview

**Estimasi:** 2–3 hari  
**Risiko:** Rendah

---

## 4. Fase 2 — Perbaikan Arsitektur (Bulan 2–3)

**Tujuan:** Menyamakan semua screen ke design system, memecah sync engine yang monolitik, dan membersihkan kode yang tidak konsisten.

### 4.1 P2-02: Refactor 3 Screen ke Design System

**Screen yang perlu direfactor:**

#### 4.1.1 `RecurringTransactionScreen.tsx` (877 lines)

**Aksi:**
1. Ganti manual header dengan `AppScreenHeader`
2. Wrap content dengan `ScreenShell`
3. Ganti inline form modal dengan `ContentPanel` + `PrimaryActionBar`
4. Fix indentasi dari 2-space ke 4-space
5. Ganti `useNavigation<NativeStackNavigationProp<any>>` dengan typed navigation prop
6. Ganti hardcoded rgba colors dengan theme tokens
7. Ekstrak form modal ke komponen `RecurringTransactionFormModal.tsx`
8. Tambah `useEffect` dependency array yang benar
9. Hapus unused styles (`emptyContainer`, `emptyTitle`, `emptyText`)

**Estimasi:** 2–3 hari  
**Referensi:** `AddTransactionScreen.tsx` sebagai pola yang benar

#### 4.1.2 `AddSavingGoalScreen.tsx` (896 lines)

**Aksi:**
1. Ganti manual header dengan `AppScreenHeader`
2. Wrap content dengan `ScreenShell`
3. Ganti `useNavigation<NativeStackNavigationProp<any>>` dengan typed navigation
4. Ganti `useRoute<RouteProp<any>>` dengan typed route
5. Ganti hardcoded `'#FFFFFF'` dengan `colors.textInverse`
6. Ekstrak form sections:
   - `GoalBasicInfoSection` (nama, emoji, color picker)
   - `GoalTargetSection` (target amount, saving per period, period type)
   - `GoalWalletSection` (wallet selector)
   - `GoalPreviewCard` (live preview)
7. Pindahkan `fetchSavingGoalById()` call ke `useSavingStore`

**Estimasi:** 3–4 hari

#### 4.1.3 `SavingDetailScreen.tsx` (768 lines)

**Aksi:**
1. Ganti manual header dengan `AppScreenHeader` dengan variant glass (untuk gradient hero)
2. Wrap content dengan `ScreenShell`
3. Ganti `useRoute<any>` dengan typed route
4. Ganti hardcoded rgba colors dengan theme tokens
5. Ekstrak sub-components:
   - `SavingDetailHero` (gradient hero section)
   - `SavingInfoGrid` (2x2 metrics grid)
   - `SharingMemberSection` (member list + activity timeline)
   - `AddSavingsModal` (modal untuk menabung)

**Estimasi:** 3–4 hari

### 4.2 P2-03: Refactor sync.ts ke Modular Architecture

**Masalah:** `sync.ts` (848 lines) menangani semua sync logic dalam satu file.

**Target Architecture:**

```
src/database/sync/
├── index.ts              (public API: syncDatabase, handleRealtimePayload)
├── syncOrchestrator.ts   (main orchestration: push-then-pull flow)
├── syncQueue.ts          (serialized task queue — already exists)
├── syncTypes.ts          (SyncTable, SyncStatus types)
├── syncTables.ts         (SYNC_TABLES configuration)
├── pushChanges.ts        (push logic extracted from sync.ts)
├── pullChanges.ts        (pull logic extracted from sync.ts)
├── realtimeHandler.ts    (handleRealtimePayload extracted)
├── syncUtils.ts          (mapRecordToSupabase, mapRecordFromSupabase, etc.)
├── syncSelfHealing.ts    (self-healing logic: missing wallets, etc.)
└── syncProfile.ts        (profile reconciliation logic)
```

**Aksi:**
1. Ekstrak `SyncTable[]` configuration ke `syncTables.ts`
2. Ekstrak `mapRecordToSupabase` dan `mapRecordFromSupabase` ke `syncUtils.ts`
3. Ekstrak `pushChanges()` ke `pushChanges.ts` dengan sub-functions:
   - `pushPendingCreates()`
   - `pushPendingUpdates()`
   - `pushPendingDeletes()`
   - `validateWalletAccessibility()`
4. Ekstrak `pullChanges()` ke `pullChanges.ts`
5. Ekstrak `handleRealtimePayload()` ke `realtimeHandler.ts`
6. Ekstrak profile reconciliation ke `syncProfile.ts`
7. `syncOrchestrator.ts` menjadi entry point yang简洁:
   ```typescript
   export async function syncDatabase() {
     if (!isSupabaseConfigured) return;
     if (activeSyncPromise) return activeSyncPromise;
     activeSyncPromise = runSerializedSyncTask(async () => {
       await pushChanges();
       await pullChanges();
     });
     return activeSyncPromise;
   }
   ```
8. Tulis unit test untuk setiap modul

**Estimasi:** 1 minggu  
**Risiko:** Sedang (sync adalah critical path — pastikan tidak ada regression)

### 4.3 P3-01: Hardcoded Colors Cleanup

**Aksi:**
1. Audit semua file dengan regex: `#[0-9A-Fa-f]{6,8}` dan `rgba?\(`
2. Identifikasi colors yang seharusnya menggunakan theme tokens
3. Ganti dengan theme tokens yang sesuai:
   - `'#FFFFFF'` → `colors.textInverse`
   - `'rgba(255,255,255,0.12)'` → `colors.surfaceGlass` atau token baru
   - Password strength colors → tambah ke theme: `colors.danger`, `colors.warning`, `colors.success`
4. Tambah tokens baru ke `colors.ts` jika diperlukan (misal: `colors.glassOverlay`)

**Estimasi:** 1–2 hari

### 4.4 P3-02: ProfileSwitcher Coordinating Method

**Aksi:**
1. Tambah method `switchProfile(profileId)` ke `useProfileStore`:
   ```typescript
   switchProfile: async (profileId: string) => {
     set({ activeProfileId: profileId });
     // Trigger reload semua dependent stores
     await Promise.all([
       useWalletStore.getState().loadWallets(),
       useTransactionStore.getState().loadTransactions(),
       useTransactionStore.getState().loadRecent(),
       useTransactionStore.getState().refreshSummary(),
       useSavingStore.getState().loadGoals(),
     ]);
   }
   ```
2. Update `ProfileSwitcher` untuk memanggil `switchProfile()` alih-alih 5 manual calls
3. Tambah test untuk profile switch

**Estimasi:** 0.5 hari

---

## 5. Fase 3 — Pengembangan Fitur (Bulan 3–5)

**Tujuan:** Menambah fitur high-value yang meningkatkan retensi pengguna dan diferensiasi produk.

### 5.1 P2-05: Push Notification Server-Side

**Masalah:** Notifikasi saat ini hanya local (expo-notifications schedule). Tidak ada push notification dari server saat user offline.

**Aksi:**
1. Setup Supabase Edge Functions untuk push notification:
   - `notify-wallet-invite` — Trigger saat member baru ditambahkan
   - `notify-goal-reminder` — Cron job untuk reminder harian
   - `notify-budget-warning` — Trigger saat budget melebihi threshold
2. Setup Expo Push Notifications:
   - Daftar device token saat login
   - Simpan token di tabel `user_devices` (baru)
3. Buat Edge Function `send-push-notification` yang mengirim ke Expo Push API
4. Integrasikan dengan realtime: saat `wallet_members` INSERT → trigger `notify-wallet-invite`
5. Tambahkan permission request flow yang lebih baik (saat user enable reminder, bukan saat app pertama buka)

**Estimasi:** 1–2 minggu  
**Dependensi:** Supabase Edge Functions setup  
**Database:** Tambah tabel `user_devices` (v14 migration)

### 5.2 P2-06: AI Insight & Spending Prediction

**Fitur:** Analisis pola pengeluaran dengan statistik sederhana dan prediksi.

**Tahap 1 — Statistical Insight (Bulan 3–4):**
1. Buat `src/utils/analytics.ts` dengan fungsi:
   - `calculateSpendingTrend(transactions, months)` — Linear regression sederhana
   - `detectAnomalies(transactions)` — Z-score untuk transaksi unusual
   - `predictNextMonthSpending(transactions)` — Moving average + trend
   - `calculateSavingsRate(income, expense)` — Persentase savings
2. Buat `InsightEngine` yang generate insight cards:
   - "Pengeluaran kategori Makanan naik 23% bulan ini"
   - "Kamu menabung 15% dari pendapatan — target ideal 20%"
   - "Transaksi unusual terdeteksi: Rp 450.000 pada 'Belanja'"
   - "Dengan tren saat ini, target 'MacBook' tercapai dalam 4 bulan"
3. Tambah `InsightCard` component di Dashboard
4. Tambah halaman "Insight Detail" di Report screen

**Tahap 2 — AI-Powered (Bulan 4–5, opsional):**
5. Integrasikan dengan LLM API (misal: OpenAI/Anthropic via Supabase Edge Function) untuk:
   - Natural language insight generation
   - Chatbot "Tanya Tabungin" untuk query keuangan
   - Personalized recommendations
6. Privacy-first: data tidak dikirim raw ke LLM, hanya aggregate statistics

**Estimasi:** 2–3 minggu (Tahap 1), 2 minggu (Tahap 2)  
**Risiko:** Sedang (akurasi prediksi tergantung kualitas data)

### 5.3 P2-07: Debt Tracking Module

**Fitur:** Tracking utang/piutang dengan reminder pembayaran.

**Aksi:**
1. Database schema (v14 migration):
   ```sql
   CREATE TABLE IF NOT EXISTS debts (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     type TEXT NOT NULL CHECK(type IN ('debt', 'receivable')), -- utang / piutang
     counterparty TEXT NOT NULL,        -- nama orang
     counterparty_email TEXT,            -- email (untuk invite)
     amount REAL NOT NULL,
     remaining_amount REAL NOT NULL,
     interest_rate REAL DEFAULT 0,
     due_date INTEGER,
     note TEXT,
     status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paid', 'cancelled')),
     wallet_id TEXT,
     profile_id TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER,
     sync_status TEXT DEFAULT 'pending_create'
   );
   
   CREATE TABLE IF NOT EXISTS debt_payments (
     id TEXT PRIMARY KEY,
     debt_id TEXT NOT NULL,
     amount REAL NOT NULL,
     date INTEGER NOT NULL,
     note TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER,
     sync_status TEXT DEFAULT 'pending_create',
     FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
   );
   ```
2. Buat `src/database/debtQueries.ts`
3. Buat `src/store/useDebtStore.ts`
4. Buat screens:
   - `DebtListScreen` — List utang/piutang dengan filter
   - `AddDebtScreen` — Tambah utang/piutang
   - `DebtDetailScreen` — Detail + payment history + add payment
5. Tambah tab baru atau section di Dashboard
6. Integrasikan dengan wallet (pembayaran utang = transaksi expense)
7. Tambah notifikasi reminder jatuh tempo

**Estimasi:** 2 minggu  
**Database:** v14 migration dengan 2 tabel baru

### 5.4 P3 — Fitur Tambahan (Backlog)

Fitur-fitur berikut dapat diimplementasi sesuai prioritas bisnis:

| Fitur | Deskripsi | Estimasi | Prioritas |
|-------|-----------|----------|-----------|
| **Recurring Transaction Auto-Generation** | Eksekusi otomatis transaksi berulang saat next_occurrence tercapai (background task) | 1 minggu | Tinggi |
| **Budget Rollover** | Sisa budget bulan lalu masuk ke bulan ini | 3 hari | Sedang |
| **Multi-Currency** | Dukungan multiple mata uang dengan exchange rate | 2 minggu | Sedang |
| **Receipt OCR** | Scan struk dengan kamera → auto-fill transaksi | 2 mingku | Tinggi |
| **Shared Budget** | Anggaran bersama untuk shared wallet | 1 minggu | Sedang |
| **Export to PDF** | Laporan PDF dengan grafik (expo-print) | 3 hari | Sedang |
| **Widget** | Home screen widget untuk balance & quick add (iOS/Android) | 1 minggu | Tinggi |
| **Biometric Auth** | Login dengan Face ID / Fingerprint | 2 hari | Tinggi |
| **Dark Mode Auto** | Follow system dark mode setting | 0.5 hari | Sedang |
| **Transaction Tags** | Tag custom untuk transaksi (selain kategori) | 3 hari | Rendah |

---

## 6. Fase 4 — Scale & Optimalisasi (Bulan 5–6)

**Tujuan:** Optimalisasi performance, E2E testing, dan persiapan untuk scale.

### 6.1 P3-03: E2E Test dengan Maestro

**Aksi:**
1. Install Maestro CLI
2. Buat flow definitions di `.maestro/`:
   - `auth-flow.yaml` — Login → Dashboard → Logout
   - `add-transaction.yaml` — Dashboard → Add Transaction → Save → Verify
   - `add-saving-goal.yaml` — Dashboard → Add Goal → Save → Verify
   - `shared-wallet.yaml` — Create wallet → Invite → Join
3. Setup E2E test di CI (run on PR to main)
4. Buat pre-release checklist dengan E2E flows

**Estimasi:** 1 mingku

### 6.2 P3-04: Performance Profiling & Optimization

**Aksi:**
1. Profiling dengan React DevTools dan Flipper
2. Identifikasi slow renders dengan React Profiler
3. Optimasi yang mungkin diperlukan:
   - **List virtualization:** `TransactionListScreen` dan `SavingListScreen` jika list panjang → gunakan `FlashList` dari @shopify/flash-list
   - **Image optimization:** Photo URI untuk saving goals → compress dengan `expo-image-manipulator`
   - **Query optimization:** Index optimization pada SQLite untuk query yang slow
   - **Bundle size:** Analyze bundle dengan `expo export --dump-assetmap`, tree-shake unused code
   - **Memory leaks:** Audit semua `useEffect` untuk cleanup yang missing
4. Setup performance monitoring (opsional: Sentry Performance)
5. Optimasi cold start time

**Hasil (Okt 2026):**

1–2. **Belum dijalankan** — React DevTools / React Profiler harus dijalankan di
   device atau emulator; tidak bisa diukur dari CI. Butuh sesi pemakaian manual.
3. Optimasi:
   - **Bundle size — selesai dan terukur.** `expo export --platform android
     --dump-assetmap`:

     | | Sebelum | Sesudah |
     |---|---|---|
     | Aset (font, gambar) | 6,18 MB / 51 file | 1,68 MB / 12 file |
     | JS bundle (Hermes .hbc) | 6.474 KB | 6.258 KB |
     | **Total export** | **13 MB** | **7,8 MB (−40%)** |

     Penyebabnya dua barrel: `@expo/vector-icons` (19 set ikon → 3,9 MB font,
     app cuma pakai `MaterialCommunityIcons`) dan `@expo-google-fonts/*`
     (32 varian italic+weight → 2,3 MB, app cuma pakai 6). Diperbaiki lewat
     `metro.config.js` yang mengarahkan `@expo/vector-icons` ke
     `src/lib/vectorIcons.ts`, plus impor font per bobot di `App.tsx`.
     Guard regresi: `__tests__/utils/bundleImports.test.ts`.
   - **List virtualization — sebagian, sesuai bukti.** `TransactionListScreen`
     sudah `SectionList` (virtualisasi native) dan query-nya kini dipaginasi
     500 baris (§6.4). `SavingListScreen` sengaja dibiarkan ScrollView: jumlah
     goal realistis puluhan, memasang FlashList hanya menambah dependensi
     tanpa manfaat terukur — tinjau lagi bila list mendekati ±200 item.
   - **Image optimization — belum ada yang bisa dioptimasi.** Kolom `photo_uri`
     sudah ada di skema tetapi belum ada layar yang mengisinya
     (`AddSavingGoalScreen` selalu menulis `null`); begitu ada pemilih foto,
     kompresi `expo-image-manipulator` dipasang di titik itu.
   - **Query optimization — selesai** (analisis + hasilnya di §6.4).
   - **Memory leaks — selesai.** Audit semua `useEffect` yang menyetel
     timer/listener: hanya satu yang belum punya cleanup (confetti di
     `SavingDetailScreen`) dan kini sudah diberi `clearTimeout`; sisanya sudah
     bersih.
4. **Dilewati** — Sentry Performance butuh DSN, di luar scope.
5. **Cold start — belum terukur**, butuh pengukuran di device nyata
   (`adb logcat` atau pengukuran waktu ke render pertama). Yang sudah pasti,
   unduhan awal aplikasi turun ±5,2 MB — komponen utama cold start di
   perangkat kelas bawah.

**Estimasi:** 1–2 minggu

### 6.3 Observability & Monitoring

**Aksi:**
1. Integrasikan Sentry untuk error tracking:
   ```bash
   npm install @sentry/react-native
   ```
2. Setup Sentry di `App.tsx`:
   ```typescript
   Sentry.init({
     dsn: 'YOUR_SENTRY_DSN',
     enableAutoSessionTracking: true,
   });
   ```
3. Wrap dengan `Sentry.ErrorBoundary` (atau integrate dengan AppErrorBoundary)
4. Tambah custom breadcrumbs untuk critical actions (login, sync, transaction)
5. Setup performance monitoring untuk slow operations (sync, database init)

**Estimasi:** 2–3 hari

### 6.4 Database Optimization

**Aksi:**
1. Analisis query performance dengan `EXPLAIN QUERY PLAN`
2. Tambah composite indexes jika diperlukan:
   ```sql
   CREATE INDEX idx_transactions_profile_date ON transactions(profile_id, date DESC);
   CREATE INDEX idx_saving_goals_wallet_completed ON saving_goals(wallet_id, is_completed);
   ```
3. Pertimbangkan database vacuum/cleanup strategy untuk user dengan data besar
4. Tambah pagination untuk `fetchTransactions()` jika result set > 500 rows

**Hasil (Okt 2026):**

1. **Selesai** — dijalankan terhadap SQLite sungguhan (20.000 baris `transactions`,
   3.000 `saving_goals`, dengan `ANALYZE`) memakai query yang benar-benar dipancarkan
   `transactionQueries.ts` / `savingQueries.ts`:
   - `fetchTransactions` dengan rentang tanggal memakai `idx_transactions_date`;
     cabang `wallet_id` dari scope akses memakai `idx_transactions_wallet` lewat
     MULTI-INDEX OR. Keduanya sudah tepat.
   - `fetchSavingGoals` tetap `SCAN saving_goals` sebelum *dan* sesudah indeks
     kandidat ditambahkan — predikat OR-nya membuat indeks tidak terpilih.
2. **Tidak jadi ditambahkan**, sesuai syarat "jika diperlukan": kedua indeks contoh
   di atas terbukti **tidak dipakai** oleh rencana query mana pun.
   `idx_transactions_profile_date` khususnya tidak ada gunanya karena tidak ada
   query yang menyaring `profile_id` secara langsung — scope memakai subquery wallet.
   Menambahnya hanya membebani setiap tulisan baris.
3. **Ditunda** — butuh keputusan retensi/ukuran data dulu (kapan dianggap "besar"),
   bukan sekadar menyalakan `VACUUM` rutin.
4. **Selesai** — `fetchTransactions({ limit, offset })` dengan halaman
   `TRANSACTION_PAGE_SIZE = 500`, `SectionList.onEndReached` memuat halaman
   berikutnya, dan ringkasan daftar (jumlah + net) dihitung SQL lewat
   `fetchTransactionsTotals()` sehingga angka di layar tetap utuh walau daftarnya
   dipaginasi. Default tetap memuat semua baris, jadi perilaku lama tidak berubah.

**Estimasi:** 2–3 hari

---

## 7. Backlog Fitur Lengkap

### 7.1 Fitur Prioritas Tinggi (Q4 2026 – Q1 2027)

| # | Fitur | Fase | Estimasi | Impact |
|---|-------|------|----------|--------|
| 1 | Security cleanup (hapus password hashing lokal) | 1 | 2 hari | 🔴 Kritis |
| 2 | Error Boundary | 1 | 1 hari | 🔴 Kritis |
| 3 | Testing framework + critical path tests | 1-2 | 3 minggu | 🔴 Kritis |
| 4 | CI/CD pipeline | 1 | 3 hari | 🟡 Tinggi |
| 5 | Refactor 3 screen ke design system | 2 | 2 minggu | 🟡 Tinggi |
| 6 | Refactor sync.ts modular | 2 | 1 minggu | 🟡 Tinggi |
| 7 | Hardcoded colors cleanup | 2 | 2 hari | 🟢 Sedang |
| 8 | Push notification server-side | 3 | 2 minggu | 🟡 Tinggi |
| 9 | AI insight & prediction | 3 | 3 minggu | 🟡 Tinggi |
| 10 | Debt tracking module | 3 | 2 minggu | 🟡 Tinggi |
| 11 | Recurring transaction auto-generation | 3 | 1 minggu | 🟡 Tinggi |

### 7.2 Fitur Prioritas Sedang (Q1–Q2 2027)

| # | Fitur | Fase | Estimasi | Impact |
|---|-------|------|----------|--------|
| 12 | E2E test dengan Maestro | 4 | 1 minggu | 🟢 Sedang |
| 13 | Performance profiling & optimization | 4 | 2 minggu | 🟢 Sedang |
| 14 | Sentry error tracking | 4 | 3 hari | 🟢 Sedang |
| 15 | Database optimization | 4 | 3 hari | 🟢 Sedang |
| 16 | Biometric auth (Face ID/Fingerprint) | 3 | 2 hari | 🟡 Tinggi |
| 17 | Receipt OCR | 3 | 2 minggu | 🟡 Tinggi |
| 18 | Home screen widget | 3 | 1 minggu | 🟡 Tinggi |
| 19 | Budget rollover | 3 | 3 hari | 🟢 Sedang |
| 20 | Export to PDF | 3 | 3 hari | 🟢 Sedang |

### 7.3 Fitur Prioritas Rendah (Backlog)

| # | Fitur | Estimasi | Impact |
|---|-------|----------|--------|
| 21 | Multi-currency support | 2 minggu | 🟢 Sedang |
| 22 | Shared budget | 1 minggu | 🟢 Sedang |
| 23 | Transaction tags | 3 hari | 🟢 Rendah |
| 24 | Dark mode auto (follow system) | 0.5 hari | 🟢 Sedang |
| 25 | Chatbot "Tanya Tabungin" | 2 minggu | 🟢 Rendah |
| 26 | Calendar view untuk transaksi | 1 minggu | 🟢 Rendah |
| 27 | Onboarding tutorial (interactive) | 3 hari | 🟢 Rendah |

---

## 8. Strategi Implementasi Teknis

### 8.1 Branching Strategy

```
main          ─────●──────────────●──────────────●────────────
                   │ merge         │ merge         │ merge
                  PR #1           PR #2           PR #3
                   │               │               │
feature/security   └──●──●──●──────┘
feature/testing        └──●──●──●──┘
feature/refactor           └──●──●──●──●──●──────┘
feature/debt-tracking                     └──●──●──●──●──●──┘
```

- `main` — Selalu deployable, protected branch
- `feature/*` — Branch per fitur, short-lived (max 2 minggu)
- `fix/*` — Bug fix branches
- PR wajib: typecheck pass + test pass + 1 approval

### 8.2 Migration Strategy

**Prinsip:** Setiap schema migration harus:
1. **Backward compatible** — App versi lama tetap berfungsi setelah migration dijalankan
2. **Atomic** — Migration berjalan dalam transaction, rollback jika gagal
3. **Idempotent** — Migration aman dijalankan berulang (gunakan `IF NOT EXISTS`)
4. **Logged** — Console log untuk setiap step migration

**Pola untuk v14 migration (Debt Tracking):**
```typescript
14: [
    // Versi 14: Debt Tracking Module
    `CREATE TABLE IF NOT EXISTS debts (...);`,
    `CREATE TABLE IF NOT EXISTS debt_payments (...);`,
    `CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(user_id, status);`,
    `CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);`,
],
```

### 8.3 Testing Strategy

```
┌─────────────────────────────────────────────────┐
│                  TEST PYRAMID                     │
│                                                   │
│                    ╱╲                            │
│                   ╱  ╲     E2E (Maestro)          │
│                  ╱────╲    ~10 flows              │
│                 ╱      ╲                          │
│                ╱        ╲  Integration (RNTL)     │
│               ╱──────────╲ ~50 tests              │
│              ╱            ╲                       │
│             ╱              ╲ Unit (Jest)          │
│            ╱────────────────╲ ~200 tests          │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Coverage Target per Fase:**
- Fase 1: 30% (critical path: validation, currency, sync queue)
- Fase 2: 50% (query layer, store actions, design system components)
- Fase 3: 70% (new features: debt tracking, analytics)
- Fase 4: 80% (full coverage + E2E)

### 8.4 Code Review Checklist

Sebelum PR di-approve, pastikan:
- [ ] TypeScript: `npm run typecheck` pass tanpa error
- [ ] Tests: `npm test` pass, coverage tidak turun
- [ ] Design system: Screen baru menggunakan `ScreenShell` + `AppScreenHeader`
- [ ] Accessibility: `accessibilityRole`, `accessibilityLabel` pada elemen interaktif
- [ ] Theme: Tidak ada hardcoded colors (gunakan theme tokens)
- [ ] Database: Query menggunakan parameterized placeholders (`?`)
- [ ] Sync: Entitas baru ditambahkan ke `SYNC_TABLES` di sync config
- [ ] Migration: Schema migration di-test dengan database existing
- [ ] Error handling: `try/catch` pada async operations, error state di UI
- [ ] No `any` types (kecuali ada komentar penjelasan)

---

## 9. Metrik Keberhasilan

### 9.1 Technical Metrics

| Metric | Baseline | Target Fase 2 | Target Fase 4 |
|--------|----------|---------------|---------------|
| Test coverage | 0% | 50% | 80% |
| TypeScript errors | (audit) | 0 | 0 |
| Crash rate | (unknown) | < 0.5% | < 0.1% |
| Cold start time | (measure) | < 3s | < 2s |
| Sync success rate | (unknown) | > 95% | > 99% |
| Screen design system compliance | 20/23 screens | 23/23 screens | 23/23 screens |
| Bundle size | 13 MB (export android) → 7,8 MB | -10% | -15% |

### 9.2 Product Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users (DAU) | (define baseline) |
| Retention D7 | > 40% |
| Retention D30 | > 20% |
| Average sessions per user per day | > 2 |
| Crash-free sessions | > 99.5% |

---

## 10. Rencana CI/CD

### 10.1 Pipeline Stages

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Push │───►│Typecheck │───►│  Test    │───►│  Build   │───►│  Deploy  │
│      │    │ (tsc)    │    │ (Jest)   │    │ (EAS)    │    │ (Preview)│
└──────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                │               │               │               │
                ▼               ▼               ▼               ▼
            Fail = stop     Fail = stop    Fail = stop    Auto-deploy
                                              to preview
```

### 10.2 Environment Strategy

| Environment | Branch | Purpose | Auto-deploy |
|-------------|--------|---------|-------------|
| Development | `feature/*` | Developer testing | No |
| Preview | `main` | Stakeholder review | Yes (EAS Preview) |
| Production | `main` (tagged) | App Store / Play Store | Manual trigger |

### 10.3 Release Cadence

- **Preview build:** Setiap merge to `main` (otomatis via EAS)
- **Production release:** Setiap 2 minggu (atau sesuai kebutuhan)
- **Hotfix:** emergency patch dari `main`, semver patch version

---

## 11. Risiko & Mitigasi

### 11.1 Risiko Teknis

| Risiko | Probabilitas | Impact | Mitigasi |
|--------|-------------|--------|----------|
| Sync regression saat refactor | Sedang | Tinggi | Tulis integration test untuk sync sebelum refactor |
| Migration gagal pada user existing | Rendah | Tinggi | Test migration dengan copy database real sebelum release |
| Supabase Realtime tidak stabil | Sedang | Sedang | Fallback ke polling jika realtime disconnect > 30s |
| Test mock expo-sqlite sulit | Tinggi | Sedang | Gunakan in-memory SQLite atau abstract database interface |
| Bundle size membengkak dengan fitur baru | Sedang | Sedang | Code splitting, lazy load screens, tree shaking |

### 11.2 Risiko Produk

| Risiko | Probabilitas | Impact | Mitigasi |
|--------|-------------|--------|----------|
| Pengguna bingung dengan perubahan UI | Sedang | Sedang | Release notes + in-app tutorial untuk perubahan major |
| Fitur baru tidak digunakan | Sedang | Rendah | A/B testing, analytics tracking untuk feature adoption |
| Performance menurun dengan data besar | Sedang | Tinggi | Pagination, virtualization, index optimization dari Fase 4 |

### 11.3 Risiko Keamanan

| Risiko | Probabilitas | Impact | Mitigasi |
|--------|-------------|--------|----------|
| RLS policy bypass via RPC | Rendah | Tinggi | Audit semua RPC functions, pastikan SECURITY DEFINER tidak abuse |
| Token leak dari AsyncStorage | Rendah | Tinggi | Gunakan expo-secure-store untuk token storage (bukan AsyncStorage) |
| Injection via dynamic SQL | Rendah | Tinggi | Tetap gunakan parameterized queries, audit whitelist updatable fields |

---

## Ringkasan Eksekutif Roadmap

```
BULAN 1-2: STABILISASI & HARDENING
├── Hapus password hashing lokal tidak aman (2 hari)
├── Tambah Error Boundary (1 hari)
├── Hapus dependency tidak terpakai (0.5 hari)
├── Fix duplikasi route (1 hari)
├── Setup Jest + RNTL + critical path tests (3 minggu)
└── Setup CI/CD pipeline (3 hari)

BULAN 2-3: PERBAIKAN ARSITEKTUR
├── Refactor RecurringTransactionScreen (3 hari)
├── Refactor AddSavingGoalScreen (4 hari)
├── Refactor SavingDetailScreen (4 hari)
├── Refactor sync.ts → modular (1 minggu)
├── Hardcoded colors cleanup (2 hari)
└── ProfileSwitcher coordinating method (0.5 hari)

BULAN 3-5: PENGEMBANGAN FITUR
├── Push notification server-side (2 minggu)
├── AI insight & prediction (3 minggu)
├── Debt tracking module (2 minggu)
├── Recurring auto-generation (1 minggu)
├── Biometric auth (2 hari)
├── Receipt OCR (2 minggu)
└── Home screen widget (1 minggu)

BULAN 5-6: SCALE & OPTIMALISASI
├── E2E test dengan Maestro (1 minggu)
├── Performance profiling & optimization (2 minggu)
├── Sentry error tracking (3 hari)
├── Database optimization (3 hari)
└── Release v2.0 🎉
```

---

*Roadmap ini bersifat living document dan akan di-update setiap sprint review berdasarkan progress aktual dan perubahan prioritas bisnis.*
