# Architecture Documentation

> Terakhir diperbarui: 6 Oktober 2026 (Sprint 0-2). Sumber status resmi ada di
> `DEVELOPMENT_ROADMAP.md` + `DEVELOPMENT_ROADMAP_AUDIT_DAN_RENCANA_20261005.md`.

## Overview
Tabungin is a **Local-First** personal finance application built with React Native (Expo). It prioritizes offline availability and speed by using a local SQLite database as the single source of truth, while synchronizing with Supabase for backup and multi-device support.

## Tech Stack
- **Framework**: React Native 0.83 (Expo SDK 55)
- **Language**: TypeScript (strict)
- **State Management**: Zustand
- **Local Database**: Expo SQLite (migrations in `src/database/schema.ts`)
- **Backend/Sync**: Supabase (PostgreSQL, RLS per tabel)
- **Navigation**: React Navigation (root stack + bottom tabs + stack per tab)
- **Styling**: Design system components (`src/components/common`) + `StyleSheet` + token tema dari `useThemeStore().colors`
- **Testing**: Jest + React Native Testing Library (`npm test`, gate `coverageThreshold`)

## Data Architecture

### Local-First Principle
1.  **Write**: User actions write to SQLite first, then update Zustand store.
2.  **Sync**: A background process pushes changes to Supabase and pulls updates.

### Database Schema
- `transactions`: Stores income/expense records.
- `wallets`: Stores accounts (Bank, Cash, E-Wallet).
- `wallet_members`: Wallet sharing (role per email).
- `saving_goals`: Stores saving targets.
- `budgets`: Stores monthly category budgets.
- `debts` / `debt_payments`: Debt & receivable tracking with payments.
- `recurring_transactions`: Template for auto-generated transactions.

### Sync Mechanism
Sync logic lives in `src/database/sync/` (the old 684-line `src/database/sync.ts` monolith was split up):
- `syncOrchestrator.ts`: Entry point — single-flight guard + serialized queue.
- `pushChanges.ts` / `pullChanges.ts`: Upstream & downstream sync per `SYNC_TABLES`.
- `syncTables.ts`: Per-table config (which fields map, which need a remote wallet).
- `syncUtils.ts`: Record <-> Supabase row mapping.
- `syncProfile.ts`: Profile reconciliation.
- `realtimeHandler.ts`: Supabase Realtime payload handling.
- `syncQueue.ts`: Serializes sync tasks so two runs never overlap.

- **Push**: Finds records with `sync_status` IN ('pending_create', 'pending_update', 'pending_delete') and sends them to Supabase.
- **Pull**: Fetches records from Supabase where `updated_at` > `last_sync_time` stored in AsyncStorage.
- **Server-side only**: `user_devices` (push tokens) is NOT synced — it is written by the client directly to Supabase and read by the Edge Function.

### Push Notifications
- Client registers an Expo push token per device into the `user_devices` table (RLS: `user_id = auth.uid()`).
- `supabase/functions/send-push-notification`: Edge Function resolves `emails` / `userIds` / `tokens` -> Expo Push API, and deletes tokens that Expo reports as `DeviceNotRegistered`.
- Permission is requested on demand (Settings toggle "Notifikasi push"), never automatically at login.

## Directory Structure
- `src/components`: Reusable UI components (design system in `common/`, feature components in `saving/`, `transaction/`, ...).
- `src/screens`: Application screens.
- `src/database`: SQLite queries, schema migrations, and the `sync/` engine.
- `src/store`: Zustand stores (global state).
- `src/hooks`: Cross-cutting hooks (biometric lock, push token, insights, recurring generator).
- `src/constants`: Design tokens (theme, typography, layout).
- `src/utils`: Helper functions (formatting, insight engine, push helpers).
- `supabase/migrations`: SQL migrations for the remote schema (RLS, grants, RPC).
- `supabase/functions`: Supabase Edge Functions (Deno, deployed separately from the app).
- `scripts`: Maintenance scripts (e.g. `npm run db:explain` reproducing the §6.4 query plans).

## Future Improvements
- **Conflict Resolution**: Currently uses "Server Wins" (via timestamp). Future: CRDTs or manual merge.
- **Encryption**: Sensitive data (balance) is not encrypted at rest in SQLite (standard OS protection). Future: SQLCipher.
- **Sync self-healing**: No self-healing logic for records referencing a missing wallet/profile yet (see Sprint 2 task SY-2 in the audit document).
