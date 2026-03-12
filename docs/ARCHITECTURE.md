# Architecture Documentation

## Overview
Tabungin is a **Local-First** personal finance application built with React Native (Expo). It prioritizes offline availability and speed by using a local SQLite database as the single source of truth, while synchronizing with Supabase for backup and multi-device support.

## Tech Stack
- **Framework**: React Native (Expo SDK 50+)
- **Language**: TypeScript
- **State Management**: Zustand
- **Local Database**: Expo SQLite
- **Backend/Sync**: Supabase (PostgreSQL)
- **Styling**: NativeWind (Tailwind CSS)

## Data Architecture

### Local-First Principle
1.  **Read**: UI always reads from Zustand store or directly from SQLite.
2.  **Write**: User actions write to SQLite first, then update Zustand store.
3.  **Sync**: A background process pushes changes to Supabase and pulls updates.

### Database Schema
- `transactions`: Stores income/expense records.
- `wallets`: Stores accounts (Bank, Cash, E-Wallet).
- `saving_goals`: Stores saving targets.
- `budgets`: Stores monthly category budgets.

### Sync Mechanism
Sync logic is located in `src/database/sync.ts`.
- **Push**: Finds records with `sync_status` IN ('pending_create', 'pending_update', 'pending_delete') and sends them to Supabase.
- **Pull**: Fetches records from Supabase where `updated_at` > `last_sync_time` stored in AsyncStorage.

## Directory Structure
- `src/components`: Reusable UI components.
- `src/screens`: Application screens.
- `src/database`: SQLite queries, schema migrations, and sync logic.
- `src/store`: Zustand stores (global state).
- `src/utils`: Helper functions.

## Future Improvements
- **Conflict Resolution**: Currently uses "Server Wins" (via timestamp). Future: CRDTs or manual merge.
- **Encryption**: Sensitive data (balance) is not encrypted at rest in SQLite (standard OS protection). Future: SQLCipher.
