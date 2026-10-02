# Tabungin — Analisis Sistem Menyeluruh

> **Tanggal Analisis:** Oktober 2026  
> **Versi Codebase:** Branch `BARU`  
> **Platform:** React Native (Expo SDK 55) + Supabase + SQLite  
> **Analyst:** Senior Engineer Review

---

## Daftar Isi

1. [Eksekutif Ringkas](#1-eksekutif-ringkas)
2. [Gambaran Arsitektur Sistem](#2-gambaran-arsitektur-sistem)
3. [Detail Komponen Sistem](#3-detail-komponen-sistem)
4. [Analisis Database & Backend](#4-analisis-database--backend)
5. [Analisis Frontend & UI](#5-analisis-frontend--ui)
6. [Analisis Sinkronisasi & Offline-First](#6-analisis-sinkronisasi--offline-first)
7. [Analisis Keamanan](#7-analisis-keamanan)
8. [Identifikasi Kelebihan](#8-identifikasi-kelebihan)
9. [Identifikasi Kekurangan & Risiko](#9-identifikasi-kekurangan--risiko)
10. [Metrik Kode](#10-metrik-kode)
11. [Kesimpulan](#11-kesimpulan)

---

## 1. Eksekutif Ringkas

**Tabungin** adalah aplikasi manajemen keuangan pribadi berbasis React Native (Expo) yang dibangun dengan arsitektur **offline-first** menggunakan SQLite sebagai database lokal dan Supabase (PostgreSQL) sebagai backend cloud. Aplikasi ini mendukung autentikasi pengguna, multi-dompet, multi-profil, transaksi pemasukan/pengeluaran, target tabungan dengan progres, anggaran per kategori, transaksi berulang, kategori kustom, notifikasi, serta fitur kolaboratif berupa dompet bersama (shared wallet) dengan QR code invite.

Sistem menunjukkan **kedewasaan arsitektur yang baik** dengan pemisahan concern yang jelas (database layer → store layer → UI layer), design system yang konsisten, dan sistem sinkronisasi yang mendukung operasi offline. Namun, terdapat **ketidakkonsistenan refactor** pada beberapa layar, **kelemahan keamanan** pada password hashing, dan **kompleksitas sync engine** yang mulai sulit dipertahankan.

---

## 2. Gambaran Arsitektur Sistem

### 2.1 Stack Teknologi

| Lapisan | Teknologi | Versi |
|---------|-----------|-------|
| **Runtime** | React Native | 0.83.6 |
| **Framework** | Expo SDK | 55 |
| **Language** | TypeScript | 5.9.2 |
| **Local DB** | expo-sqlite (SQLite) | 55.0.15 |
| **Cloud DB** | Supabase (PostgreSQL) | supabase-js 2.99.0 |
| **State Management** | Zustand | 5.0.11 |
| **Navigation** | React Navigation v7 | 7.1.33+ |
| **Styling** | NativeWind + StyleSheet | 4.2.2 |
| **Animation** | React Native Reanimated | 4.2.1 |
| **Charts** | Victory Native | 41.20.2 |
| **Auth** | Supabase Auth | — |
| **Notifications** | expo-notifications | 55.0.20 |
| **Secure Storage** | expo-secure-store | 55.0.13 |

### 2.2 Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Screens  │  │Components│  │Navigation│  │  Hooks  │ │
│  │  (23)    │  │   (32)   │  │   (7)    │  │   (2)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └──────────┬───┴─────────────┴────────────┘       │
│                  │                                       │
├──────────────────┼───────────────────────────────────────┤
│           STATE LAYER (Zustand Stores)                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │  Auth  │ │Transac-│ │ Wallet │ │ Saving │ │Category││
│  │ Store  │ │  tion  │ │ Store  │ │ Store  │ │ Store  ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │Profile │ │  Recur │ │Notific.│ │ Theme  │           │
│  │ Store  │ │ Store  │ │ Store  │ │ Store  │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                  │                                       │
├──────────────────┼───────────────────────────────────────┤
│           DATA LAYER (Queries + Sync)                    │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │ SQLite     │ │ Supabase   │ │ Sync Engine          │ │
│  │ Queries    │ │ Remote     │ │ (Push/Pull/Realtime) │ │
│  │ (10 files) │ │ RPCs       │ │                      │ │
│  └────────────┘ └────────────┘ └──────────────────────┘ │
│                  │                                       │
├──────────────────┼───────────────────────────────────────┤
│           PERSISTENCE LAYER                              │
│  ┌────────────────┐    ┌────────────────────────────┐   │
│  │ SQLite (Local) │◄──►│ Supabase PostgreSQL (Cloud)│   │
│  │ tabungin.db    │    │ RLS-enabled tables         │   │
│  │ v13 schema     │    │ + RPC functions            │   │
│  └────────────────┘    └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Alur Data

```
User Action → Store Action → SQLite Query (local write, sync_status='pending_*')
                                ↓
                           Sync Engine (triggered by action, app focus, or realtime)
                                ↓
                           Push: Upload pending changes to Supabase
                           Pull: Download remote changes since lastSync
                                ↓
                           SQLite updated (sync_status='synced')
                                ↓
                           Store reloads → UI re-renders
```

---

## 3. Detail Komponen Sistem

### 3.1 Navigasi

```
RootNavigator (Auth Gate)
  ├── Unauthenticated:
  │   ├── OnboardingScreen (3-slide carousel)
  │   ├── LoginScreen
  │   ├── RegisterScreen
  │   └── ForgotPasswordScreen
  │
  └── Authenticated:
      └── TabNavigator (5 tabs, custom animated bar)
          ├── Dashboard (Beranda)     → DashboardScreen
          ├── Transactions             → TransactionStackNavigator
          │   ├── TransactionList
          │   ├── AddTransaction (create/edit)
          │   ├── TransactionDetail
          │   └── RecurringTransaction
          ├── Wallet                   → WalletStackNavigator
          │   ├── WalletList
          │   ├── AddWallet
          │   ├── QRScanner
          │   └── JoinWallet
          ├── Report (Laporan)        → ReportScreen
          └── Settings (Setelan)      → SettingsStackNavigator
              ├── SettingsMain
              ├── Profile
              ├── Notifications
              ├── CategoryManagement
              ├── ExportData
              ├── Budget
              ├── WalletList (duplicate route)
              ├── AddWallet (duplicate route)
              ├── QRScanner (duplicate route)
              └── JoinWallet (duplicate route)
```

**Deep linking:** `tabungin://` URI scheme untuk navigasi langsung (misal: `tabungin://savings/:goalId`, `tabungin://wallets/join/:walletId`).

### 3.2 State Management

Aplikasi menggunakan **9 Zustand stores** yang masing-masing bertanggung jawab untuk satu domain data:

| Store | Responsibility | Realtime? |
|-------|---------------|-----------|
| `useAuthStore` | Session, login/register/logout, profile update | No |
| `useThemeStore` | Light/dark mode, text size, haptic, color palette | No |
| `useTransactionStore` | CRUD transaksi, summary, filter | Yes (Supabase Realtime) |
| `useWalletStore` | CRUD dompet, saldo total | Yes (Supabase Realtime) |
| `useSavingStore` | CRUD target tabungan, log, sharing | No (polling) |
| `useCategoryStore` | CRUD kategori transaksi | No |
| `useProfileStore` | Multi-profile, active profile switch | No |
| `useNotificationStore` | Notifikasi, unread count | No |
| `useRecurringStore` | Transaksi berulang | No |

**Pattern:** Store actions memanggil database query functions → set state → trigger `syncDatabase()` secara async. Realtime update ditangani via Supabase channels yang memanggil `handleRealtimePayload()`.

### 3.3 Komponen UI

Sistem memiliki **32 komponen reusable** dalam 5 kategori:

**Layout Shell:** `ScreenShell`, `AppScreenHeader`, `AuthScreenLayout`, `ContentPanel`, `PrimaryActionBar`, `NavigationBar`

**Data Display:** `HeroSummaryCard`, `ContextBadge`, `EmptyState`, `StatePanel`, `InsightPanel`, `SectionHeader`, `SkeletonLoader`, `Badge`, `Card`

**Interactive:** `Button` (5 variants, 3 sizes, spring animation), `Input` (dengan icon, error, password toggle), `FilterBar`, `SegmentedControl`, `FormSection`

**Domain-Specific:** `TransactionItem` (swipe-to-delete, long-press menu), `SavingGoalCard`, `ProfileSwitcher`, `ProgressBar`, `SavingSimulator`, `CategoryPicker`, `WalletMemberList`

---

## 4. Analisis Database & Backend

### 4.1 Skema Database Lokal (SQLite)

Database lokal berada di versi schema **v13** dengan sistem migrasi berbasis `PRAGMA user_version`. Terdapat **11 tabel**:

| Tabel | Versi Dibuat | Purpose |
|-------|-------------|---------|
| `transactions` | v1 | Transaksi pemasukan/pengeluaran |
| `saving_goals` | v1 | Target tabungan |
| `saving_logs` | v1 | Log progres tabungan |
| `budgets` | v2 | Anggaran per kategori per bulan |
| `users` | v3 | Cache user lokal (auth) |
| `wallets` | v5 | Multi-dompet |
| `profiles` | v6 | Multi-profil |
| `wallet_members` | v7 | Anggota dompet bersama |
| `notifications` | v9 | Notifikasi in-app |
| `wallet_goals_shared` | v10 | Sharing target tabungan |
| `recurring_transactions` | v11 | Transaksi berulang |
| `transaction_categories` | v12 | Kategori kustom |
| `sharing_activity_log` | v13 | Audit log sharing |

**Self-healing mechanism:** `runSchemaGuards()` dan `runMigrations()` dilengkapi dengan logic reparasi kolom yang hilang, pengecekan tabel exist, dan auto-creation tabel baru jika tidak ditemukan.

### 4.2 Skema Database Cloud (Supabase/PostgreSQL)

Cloud schema menggunakan **RLS (Row Level Security)** pada semua tabel. Beberapa tabel memiliki **RPC functions** (SECURITY DEFINER):

| RPC Function | Purpose |
|-------------|---------|
| `auto_share_wallet_goals` | Auto-share target tabungan saat member baru join |
| `set_goal_permission` | Set level permission (read_only/read_write/admin) |
| `revoke_goal_sharing` | Cabut akses sharing |
| `get_goal_sharing_status` | Ambil status sharing untuk goal |
| `insert_default_categories_for_user` | Inisialisasi 12 kategori default |
| `ensure_wallet_owner` | Pastikan owner terdaftar di wallet_members |

### 4.3 Query Layer Pattern

Setiap entitas memiliki file query terpisah dengan pattern konsisten:

```
src/database/
├── schema.ts              (SQLite schema + migration runner)
├── sync.ts                (Sync engine: push/pull/realtime)
├── syncQueue.ts           (Serialized sync task queue)
├── authQueries.ts         (Auth + session management)
├── transactionQueries.ts  (CRUD transaksi)
├── walletQueries.ts       (CRUD dompet + members)
├── savingQueries.ts       (CRUD goals + logs + sharing)
├── budgetQueries.ts       (CRUD anggaran)
├── recurringQueries.ts    (CRUD transaksi berulang)
├── categoryQueries.ts     (CRUD kategori)
├── notificationQueries.ts (CRUD notifikasi)
├── profileQueries.ts      (CRUD profil)
└── walletSharingService.ts (Sharing orchestration)
```

**Keamanan:** Query menggunakan **parameterized queries** (`?` placeholders) dan **whitelist updatable fields** untuk mencegah SQL injection.

---

## 5. Analisis Frontend & UI

### 5.1 Design System

Sistem memiliki design system yang **sangat matang** dengan:

- **Theme system:** Light & dark mode dengan 30+ color tokens, gradient definitions, motion constants
- **Typography:** Plus Jakarta Sans (display) + DM Sans (body)
- **Spacing scale:** 11 level (xs=4 → 5xl=64)
- **Border radius scale:** 10 level (xs=4 → full=9999)
- **Shadow scale:** 4 level (sm/md/lg/xl)
- **Motion system:** Duration (fast/normal/slow), spring configs, stagger delays
- **Accessibility:** Text size scaling, haptic feedback toggle

### 5.2 Screen Composition Pattern

Screen yang sudah refactor mengikuti pola komposisi yang konsisten:

```jsx
<ScreenShell surfaceVariant="default">
  <AppScreenHeader title="..." showBack />
  <ScrollView>
    <HeroSummaryCard ... />
    <SectionHeader ... />
    <ContentPanel>
      <Input ... />
      <CategoryPicker ... />
    </ContentPanel>
    <PrimaryActionBar>
      <Button ... />
    </PrimaryActionBar>
  </ScrollView>
</ScreenShell>
```

### 5.3 Style Factory Pattern

Setiap komponen menggunakan pattern `getStyles(colors)` yang di-memoize:

```typescript
const { colors } = useTheme();
const styles = useMemo(() => getStyles(colors), [colors]);
```

Ini memastikan style diregenerasi hanya saat theme berubah, mencegah re-render yang tidak perlu.

### 5.4 Animasi

- **Entrance animations:** Staggered `FadeInDown.delay(N * 40).springify()`
- **Interactive:** Spring-based scale/glow pada Button dan TabBar
- **Skeleton:** Shimmer dengan `withRepeat(withTiming(...))`
- **Confetti:** Overlay saat goal tercapai

### 5.5 Accessibility

Implementasi accessibility **sangat komprehensif**:
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` pada semua elemen interaktif
- `accessibilityState` untuk disabled/busy/selected
- `accessibilityLiveRegion="polite"` untuk konten dinamis (error, loading)
- `accessibilityElementsHidden` untuk elemen dekoratif
- `allowFontScaling` pada Text components
- WCAG triple-redundancy pada amount transaksi (color + text prefix + a11y label)

---

## 6. Analisis Sinkronisasi & Offline-First

### 6.1 Sync Architecture

Sistem menggunakan **bidirectional sync** dengan pattern **Push-then-Pull**:

1. **Push:** Ambil semua row dengan `sync_status IN ('pending_create', 'pending_update', 'pending_delete')` → kirim ke Supabase → tandai sebagai `synced` (atau hapus untuk pending_delete)
2. **Pull:** Ambil semua row dengan `updated_at > lastSync` dari Supabase → `INSERT OR REPLACE` ke SQLite → update `lastSync`

### 6.2 Sync Status State Machine

```
┌─────────────┐     create     ┌─────────────────┐
│  (new row)  │ ─────────────► │ pending_create  │
└─────────────┘                └───────┬─────────┘
                                       │ sync push
                                       ▼
                               ┌───────────────┐
                               │    synced     │
                               └───────┬───────┘
                                       │ update
                                       ▼
                               ┌─────────────────┐
                               │ pending_update  │
                               └───────┬─────────┘
                                       │ sync push
                                       ▼
                               ┌───────────────┐
                               │    synced     │
                               └───────┬───────┘
                                       │ delete
                                       ▼
                               ┌─────────────────┐
                               │ pending_delete  │
                               └───────┬─────────┘
                                       │ sync push
                                       ▼
                               ┌───────────────┐
                               │  (hard delete) │
                               └───────────────┘
```

### 6.3 Konflik Penanganan

- **Local priority:** Jika row lokal memiliki `sync_status = 'pending_update'`, realtime payload diabaikan (local change menang)
- **Self-healing:** Jika transaction/saving_goal/budget merujuk ke `wallet_id` yang belum ada di lokal, sistem otomatis menarik wallet tersebut dari server
- **Serialized sync:** `syncQueue.ts` memastikan hanya satu sync task yang berjalan pada satu waktu

### 6.4 Realtime

Supabase Realtime channels untuk `transactions` dan `wallets` table, diinisialisasi di `TabNavigator` dan di-clean-up saat unmount. Realtime payload ditangani oleh `handleRealtimePayload()` yang melakukan `INSERT OR REPLACE` ke SQLite.

---

## 7. Analisis Keamanan

### 7.1 Autentikasi

- **Supabase Auth:** Menggunakan email/password dengan session persistence via AsyncStorage
- **Token refresh:** Auto-refresh saat app active, stop saat background
- **Password reset:** Via Supabase `resetPasswordForEmail` dengan deep link redirect

### 7.2 Row Level Security (RLS)

Semua tabel cloud memiliki RLS policies:
- User hanya bisa melihat/mengubah data miliknya (`user_id = auth.uid()`)
- Shared wallet members dapat melihat data wallet melalui `wallet_members` join
- Sharing goals melalui `wallet_goals_shared` table

### 7.3 RPC Functions

RPC functions menggunakan `SECURITY DEFINER` untuk bypass RLS saat operasi yang sah (auto-share, set permission, dll).

### 7.4 ⚠️ Keamanan Password Hashing (KRITIS)

File `src/database/authQueries.ts` masih menggunakan **SHA-256 dengan static salt**:

```typescript
export async function hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'tabungin_salt_v1' // static salt
    );
}
```

**Masalah:**
- SHA-256 **bukan** algoritma password hashing yang aman (terlalu cepat untuk brute-force)
- Static salt membuat rainbow table attack tetap mungkin
- Comment dalam kode sendiri mengakui: *"untuk production gunakan per-user random salt"*

**Catatan:** Autentikasi utama sebenarnya sudah menggunakan Supabase Auth (yang aman), tetapi `authQueries.ts` masih memiliki sistem password hashing lokal yang usang dan berpotensi membingungkan developer.

---

## 8. Identifikasi Kelebihan

### 8.1 Arsitektur Offline-First yang Matang

Sistem sync engine dengan status state machine yang jelas (`synced` → `pending_create/update/delete`), self-healing mechanism, dan serialized sync queue. Aplikasi dapat berfungsi penuh tanpa koneksi internet dan sync otomatis saat koneksi pulih.

### 8.2 Pemisahan Concern yang Baik

Arsitektur 3-layer (Database → Store → UI) dengan boundaries yang jelas. Setiap entitas memiliki query file terpisah, store terpisah, dan screen terpisah. Memudahkan testing dan maintenance.

### 8.3 Design System yang Konsisten

32 komponen reusable dengan theme system yang mendukung light/dark mode, text size scaling, dan motion constants. Pattern `getStyles(colors)` + `useMemo` memastikan theme-aware styling tanpa re-render berlebihan.

### 8.4 Accessibility yang Komprehensif

Implementasi a11y yang sangat baik: semantic roles, live regions, element hiding, text scaling, haptic feedback, dan WCAG triple-redundancy untuk informasi kritis.

### 8.5 Database Migration System

Sistem migrasi berbasis `PRAGMA user_version` dengan 13 versi terdefinisi, self-healing schema guards, dan auto-repair untuk kolom yang hilang. Memungkinkan upgrade tanpa kehilangan data.

### 8.6 Multi-Profile & Shared Wallet

Dukungan multi-profile (pribadi/bisnis) dan shared wallet dengan QR code invite, role-based access (owner/editor), auto-share goals, permission levels, dan activity log untuk audit trail.

### 8.7 Realtime Sync

Supabase Realtime channels untuk transactions dan wallets, memberikan update langsung saat ada perubahan dari device lain atau dari member dompet bersama.

### 8.8 Export Data

Fitur export ke JSON/CSV/TXT dengan format yang terstruktur, mendukung export transaksi saja, goals saja, atau keduanya.

### 8.9 Tipe Aman (Sebagian Besar)

TypeScript digunakan secara konsisten dengan typed navigation params, typed stores, dan typed query results. Validation utilities terpisah dengan return type yang jelas.

### 8.10 Animasi yang Halus

Reanimated v3 untuk entrance animations, interactive feedback, dan skeleton loaders. Staggered animations memberikan polish yang baik pada UX.

---

## 9. Identifikasi Kekurangan & Risiko

### 9.1 🔴 KRITIS — Password Hashing Tidak Aman

`authQueries.ts` menggunakan SHA-256 + static salt untuk password hashing lokal. Meskipun auth utama via Supabase Auth, kode ini masih ada dan berpotensi:
- Digunakan secara tidak sengaja oleh developer baru
- Menimbulkan false sense of security
- Rentan terhadap rainbow table attack

**Rekomendasi:** Hapus sistem password hashing lokal sepenuhnya, atau migrasi ke bcrypt/argon2 dengan per-user random salt.

### 9.2 🔴 TINGGI — Ketidakkonsistenan Refactor Screen

Tiga screen belum direfactor ke design system:

| Screen | Masalah |
|--------|---------|
| `RecurringTransactionScreen.tsx` | Tidak menggunakan `ScreenShell`/`AppScreenHeader`/`ContentPanel`/`PrimaryActionBar`. Indentasi 2-space (vs 4-space rest of codebase). `useNavigation<NativeStackNavigationProp<any>>` — tidak type-safe. Hardcoded rgba colors. |
| `AddSavingGoalScreen.tsx` (896 lines) | Tidak menggunakan `ScreenShell`/`AppScreenHeader`. `useNavigation<NativeStackNavigationProp<any>>`, `useRoute<RouteProp<any>>`. Hardcoded `'#FFFFFF'`. |
| `SavingDetailScreen.tsx` (768 lines) | Sama dengan di atas. `useRoute<any>`. Hardcoded rgba colors. |

**Dampak:** Inkonsistensi visual, type safety gap, maintenance burden, dan potensi bug karena pola berbeda.

### 9.3 🟡 SEDANG — Sync Engine Complexity

File `sync.ts` (848 lines) menangani:
- Push changes untuk 10 tabel dengan ordering dependency
- Pull changes dengan self-healing
- Profile reconciliation
- Wallet accessibility validation
- Owner membership assurance
- Realtime payload handling

Logic yang sangat kompleks dalam satu file, sulit untuk:
- Memahami alur sync untuk developer baru
- Testing (tidak ada unit test)
- Debugging saat sync conflict
- Menambah tabel baru ke sync

### 9.4 🟡 SEDANG — Tidak Ada Testing

Tidak ditemukan:
- Unit test (tidak ada Jest configuration)
- Integration test
- E2E test (tidak ada Detox/Maestro)
- Type test (tidak ada `tsc --noEmit` di CI)

**Dampak:** Perubahan kode berisiko meng引入 regression tanpa terdeteksi.

### 9.5 🟡 SEDANG — Duplikasi Route Registrations

`WalletList`, `AddWallet`, `QRScanner`, dan `JoinWallet` didaftarkan di **dua** StackNavigator (`SettingsStackNavigator` dan `WalletStackNavigator`). Dapat menyebabkan:
- Route name collisions
- Navigation behavior yang tidak terduga
- Maintenance overhead

### 9.6 🟡 SEDANG — Hardcoded Colors

Beberapa screen masih menggunakan hardcoded hex/rgba values alih-alih theme tokens:
- `RegisterScreen`: `'#E5533D'`, `'#FF9F1C'`, `'#18A957'` (password strength)
- `AddSavingGoalScreen`: `'#FFFFFF'`, `'rgba(255,255,255,0.12)'`
- `SavingDetailScreen`: `'rgba(255,255,255,0.10)'`, `'rgba(16, 185, 129, 0.95)'`

**Dampak:** Dark mode tidak optimal, inkonsistensi visual.

### 9.7 🟡 SEDANG — Direct Database Calls di Screens

`SettingsScreen` memanggil `deleteUserAccount()` langsung dari `database/authQueries` (bypassing store). `AddSavingGoalScreen` memanggil `fetchSavingGoalById()` langsung. Ini melanggar pattern store-as-gateway dan menyulitkan testing.

### 9.8 🟢 RENDAH — File Size yang Besar

| File | Lines | Ukuran |
|------|-------|--------|
| `AddSavingGoalScreen.tsx` | 896 | 37.75 KB |
| `SavingDetailScreen.tsx` | 768 | 31.88 KB |
| `sync.ts` | 848 | — |
| `RecurringTransactionScreen.tsx` | 877 | 28.78 KB |
| `AddTransactionScreen.tsx` | — | 30.76 KB |

Form sections bisa diekstrak ke sub-components untuk meningkatkan readability.

### 9.9 🟢 RENDAH — useEffect Dependency Issues

Beberapa screen memiliki `useEffect` dengan missing dependencies:
- `RecurringTransactionScreen`: `useEffect(() => { loadRecurringTransactions(); loadCategories(); }, [])` — missing deps
- `AddSavingGoalScreen`: `loadGoalForEdit` effect dengan deps tidak lengkap

### 9.10 🟢 RENDAH — ProfileSwitcher Manual Reload

Saat switch profile, `ProfileSwitcher` memanggil 5 store action secara manual:
```typescript
await loadWallets();
await loadTransactions();
await loadRecent();
await refreshSummary();
await loadGoals();
```

Sebaiknya dibungkus dalam coordinating method (misal: `useProfileStore.switchProfile()` yang trigger reload semua store).

### 9.11 🟢 RENDAH — NativeWind Tidak Digunakan Secara Maksimal

`nativewind` dan `tailwind.config.js` ada di dependencies, tetapi codebase menggunakan `StyleSheet.create()` secara eksklusif. NativeWind hanya di-import di `nativewind-env.d.ts` tapi tidak digunakan di komponen.

### 9.12 🟢 RENDAH — Tidak Ada Error Boundary

Tidak ditemukan React Error Boundary di level aplikasi. Crash pada satu screen akan membuat seluruh app crash tanpa recovery mechanism.

### 9.13 🟢 RENDAH — `react-native-paper` dan `react-native-web` Tidak Digunakan

`react-native-paper` (UI library) dan `react-native-web` terdaftar di dependencies tetapi tidak digunakan. Ini menambah bundle size tanpa manfaat.

---

## 10. Metrik Kode

### 10.1 Statistik File

| Kategori | Jumlah | Total Files |
|----------|--------|-------------|
| Screens | 23 | 56 .tsx |
| Components | 32 | — |
| Navigation | 7 | — |
| Stores | 9 | 48 .ts |
| Database queries | 12 | — |
| Utils | ~10 | — |
| Types | ~5 | — |
| Constants | ~5 | — |
| Hooks | 2 | — |
| Supabase migrations | 4+ | 14 files |

### 10.2 Dependency Count

- **Production dependencies:** 36 packages
- **Dev dependencies:** 2 packages (tailwindcss, typescript)
- **Total:** 38 packages

### 10.3 Database Schema

- **SQLite tables:** 11
- **Schema version:** 13
- **Migration steps:** 13 versioned migrations + schema guards
- **Supabase tables:** ~12 (dengan RLS)
- **RPC functions:** 6

---

## 11. Kesimpulan

Tabungin adalah **aplikasi manajemen keuangan yang well-architected** dengan fondasi offline-first yang solid, design system yang matang, dan feature set yang komprehensif untuk personal finance. Arsitektur 3-layer dengan Zustand stores memberikan separation of concerns yang jelas.

**Skor kualitas per aspek:**

| Aspek | Skor | Keterangan |
|-------|------|------------|
| Arsitektur | 8/10 | Pemisahan concern baik, sync engine kompleks tapi bekerja |
| Design System | 9/10 | Komprehensif, konsisten (dengan 3 screen exception) |
| Accessibility | 9/10 | Sangat baik, WCAG-compliant |
| Keamanan | 6/10 | RLS + Supabase Auth baik, tapi password hashing lokal berbahaya |
| Testing | 2/10 | Tidak ada test sama sekali |
| Maintainability | 7/10 | Kode bersih, tapi sync.ts dan 3 screen perlu refactor |
| Performance | 8/10 | SQLite + Reanimated + memoized styles |
| Feature Completeness | 8/10 | Fitur lengkap untuk MVP+ |

**Skor keseluruhan: 7.5/10**

Sistem berada pada tahap **"mature MVP"** — siap untuk pengguna tetapi memerlukan hardening (testing, security cleanup, refactor konsistensi) sebelum scaling ke basis pengguna yang lebih besar.

---

*Analisis ini berdasarkan codebase per Oktober 2026. Untuk rencana pengembangan lanjutan, lihat file `DEVELOPMENT_ROADMAP.md`.*
