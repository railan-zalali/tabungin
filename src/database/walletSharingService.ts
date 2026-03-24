import { supabase } from "../lib/supabase";
import { getInitializedDatabase } from "./schema";
import type { WalletMember } from "./walletQueries";
import { fetchWalletMembers, removeWalletMember } from "./walletQueries";
import { v4 as uuidv4 } from "uuid";
import { isValidWalletId } from "../utils/walletInvite";
import { useAuthStore } from "../store/useAuthStore";
import { sendWalletInviteNotification } from "../utils/notificationService";

type RemoteWalletMember = WalletMember & {
  updated_at: number;
};

type RemoteWallet = {
  id: string;
  name: string;
  type: string;
  color: string;
  balance: number;
  is_default: boolean;
  created_at: number;
  updated_at: number | null;
  profile_id: string | null;
};

type RemoteTransaction = {
  id: string;
  type: string;
  amount: number;
  category: string;
  note: string | null;
  date: number;
  created_at: number;
  updated_at: number;
  wallet_id: string | null;
  profile_id: string | null;
};

type RemoteBudget = {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  created_at: number;
  updated_at: number;
  wallet_id: string | null;
  profile_id: string | null;
};

type RemoteSavingGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  emoji: string;
  photo_uri: string | null;
  saving_per_period: number;
  period_type: string;
  color: string;
  start_date: number;
  estimated_date: number;
  is_completed: boolean;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: number;
  updated_at: number;
  wallet_id: string | null;
  profile_id: string | null;
};

type RemoteSavingLog = {
  id: string;
  goal_id: string;
  amount: number;
  note: string | null;
  date: number;
  created_at: number;
  updated_at: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAuthenticatedWalletEmail(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sessionEmail = session?.user?.email;
  if (sessionEmail) {
    return normalizeEmail(sessionEmail);
  }

  return normalizeEmail(useAuthStore.getState().user?.email ?? "");
}

function mapLocalWalletMember(member: RemoteWalletMember): WalletMember {
  return {
    id: member.id,
    wallet_id: member.wallet_id,
    user_email: normalizeEmail(member.user_email),
    role: member.role,
    status: member.status,
    created_at: member.created_at,
  };
}

async function upsertLocalWalletMember(member: RemoteWalletMember): Promise<void> {
  const db = await getInitializedDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO wallet_members (
      id, wallet_id, user_email, role, status, created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
    [
      member.id,
      member.wallet_id,
      normalizeEmail(member.user_email),
      member.role,
      member.status,
      member.created_at,
      member.updated_at,
    ],
  );
}

async function replaceLocalWalletMembers(walletId: string, members: RemoteWalletMember[]): Promise<void> {
  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "DELETE FROM wallet_members WHERE wallet_id = ? AND sync_status = 'synced'",
      [walletId],
    );

    for (const member of members) {
      await db.runAsync(
        `INSERT OR REPLACE INTO wallet_members (
          id, wallet_id, user_email, role, status, created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          member.id,
          member.wallet_id,
          normalizeEmail(member.user_email),
          member.role,
          member.status,
          member.created_at,
          member.updated_at,
        ],
      );
    }
  });
}

async function replaceLocalWalletMembersForWallets(
  walletIds: string[],
  members: RemoteWalletMember[],
): Promise<void> {
  if (walletIds.length === 0) return;

  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    for (const walletId of walletIds) {
      await db.runAsync(
        "DELETE FROM wallet_members WHERE wallet_id = ? AND sync_status = 'synced'",
        [walletId],
      );
    }

    for (const member of members) {
      await db.runAsync(
        `INSERT OR REPLACE INTO wallet_members (
          id, wallet_id, user_email, role, status, created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          member.id,
          member.wallet_id,
          normalizeEmail(member.user_email),
          member.role,
          member.status,
          member.created_at,
          member.updated_at,
        ],
      );
    }
  });
}

async function upsertLocalWallet(wallet: RemoteWallet): Promise<void> {
  const db = await getInitializedDatabase();
  const existingWallet = await db.getFirstAsync<{ sync_status: string }>(
    "SELECT sync_status FROM wallets WHERE id = ?",
    [wallet.id],
  );

  if (
    existingWallet?.sync_status === "pending_create" ||
    existingWallet?.sync_status === "pending_update" ||
    existingWallet?.sync_status === "pending_delete"
  ) {
    return;
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO wallets (
      id, name, type, color, balance, is_default, created_at, updated_at, profile_id, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
    [
      wallet.id,
      wallet.name,
      wallet.type,
      wallet.color,
      wallet.balance ?? 0,
      wallet.is_default ? 1 : 0,
      wallet.created_at,
      wallet.updated_at ?? wallet.created_at,
      wallet.profile_id,
    ],
  );
}

async function upsertLocalTransactions(transactions: RemoteTransaction[]): Promise<void> {
  if (transactions.length === 0) return;

  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    for (const transaction of transactions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions (
          id, type, amount, category, note, date, created_at, updated_at, wallet_id, profile_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          transaction.id,
          transaction.type,
          transaction.amount,
          transaction.category,
          transaction.note,
          transaction.date,
          transaction.created_at,
          transaction.updated_at,
          transaction.wallet_id,
          transaction.profile_id,
        ],
      );
    }
  });
}

async function upsertLocalBudgets(budgets: RemoteBudget[]): Promise<void> {
  if (budgets.length === 0) return;

  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    for (const budget of budgets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO budgets (
          id, category, amount, month, year, created_at, updated_at, wallet_id, profile_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          budget.id,
          budget.category,
          budget.amount,
          budget.month,
          budget.year,
          budget.created_at,
          budget.updated_at,
          budget.wallet_id,
          budget.profile_id,
        ],
      );
    }
  });
}

async function upsertLocalSavingGoals(goals: RemoteSavingGoal[]): Promise<void> {
  if (goals.length === 0) return;

  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    for (const goal of goals) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saving_goals (
          id, name, target_amount, current_amount, emoji, photo_uri, saving_per_period, period_type,
          color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time,
          created_at, updated_at, wallet_id, profile_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          goal.id,
          goal.name,
          goal.target_amount,
          goal.current_amount,
          goal.emoji,
          goal.photo_uri,
          goal.saving_per_period,
          goal.period_type,
          goal.color,
          goal.start_date,
          goal.estimated_date,
          goal.is_completed ? 1 : 0,
          goal.reminder_enabled ? 1 : 0,
          goal.reminder_time,
          goal.created_at,
          goal.updated_at,
          goal.wallet_id,
          goal.profile_id,
        ],
      );
    }
  });
}

async function upsertLocalSavingLogs(logs: RemoteSavingLog[]): Promise<void> {
  if (logs.length === 0) return;

  const db = await getInitializedDatabase();

  await db.withTransactionAsync(async () => {
    for (const log of logs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saving_logs (
          id, goal_id, amount, note, date, created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          log.id,
          log.goal_id,
          log.amount,
          log.note,
          log.date,
          log.created_at,
          log.updated_at,
        ],
      );
    }
  });
}

async function hydrateSharedWallet(walletId: string): Promise<void> {
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (walletError) {
    throw walletError;
  }

  await upsertLocalWallet(wallet as RemoteWallet);

  const [
    transactionsResult,
    budgetsResult,
    goalsResult,
    membersResult,
  ] = await Promise.all([
    supabase.from("transactions").select("*").eq("wallet_id", walletId),
    supabase.from("budgets").select("*").eq("wallet_id", walletId),
    supabase.from("saving_goals").select("*").eq("wallet_id", walletId),
    supabase
      .from("wallet_members")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false }),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (budgetsResult.error) throw budgetsResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (membersResult.error) throw membersResult.error;

  const goals = (goalsResult.data ?? []) as RemoteSavingGoal[];
  const goalIds = goals.map((goal) => goal.id);

  let savingLogs: RemoteSavingLog[] = [];
  if (goalIds.length > 0) {
    const { data, error } = await supabase.from("saving_logs").select("*").in("goal_id", goalIds);
    if (error) throw error;
    savingLogs = (data ?? []) as RemoteSavingLog[];
  }

  await Promise.all([
    upsertLocalTransactions((transactionsResult.data ?? []) as RemoteTransaction[]),
    upsertLocalBudgets((budgetsResult.data ?? []) as RemoteBudget[]),
    upsertLocalSavingGoals(goals),
    upsertLocalSavingLogs(savingLogs),
    replaceLocalWalletMembers(walletId, (membersResult.data ?? []) as RemoteWalletMember[]),
  ]);
}

export async function fetchWalletMembersForDisplay(walletId: string): Promise<WalletMember[]> {
  if (!walletId) {
    return [];
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return fetchWalletMembers(walletId);
  }

  const { data, error } = await supabase
    .from("wallet_members")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching remote wallet members:", error);
    return fetchWalletMembers(walletId);
  }

  const members = ((data ?? []) as RemoteWalletMember[]).map((member) => ({
    ...member,
    user_email: normalizeEmail(member.user_email),
  }));

  await replaceLocalWalletMembers(walletId, members);
  return members.map(mapLocalWalletMember);
}

export async function syncAccessibleWalletsFromServer(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return;
  }

  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: true });

  if (walletsError) {
    throw walletsError;
  }

  const remoteWallets = (wallets ?? []) as RemoteWallet[];
  await Promise.all(remoteWallets.map((wallet) => upsertLocalWallet(wallet)));

  const walletIds = remoteWallets.map((wallet) => wallet.id);
  if (walletIds.length === 0) {
    return;
  }

  const { data: members, error: membersError } = await supabase
    .from("wallet_members")
    .select("*")
    .in("wallet_id", walletIds);

  if (membersError) {
    throw membersError;
  }

  await replaceLocalWalletMembersForWallets(walletIds, (members ?? []) as RemoteWalletMember[]);
}

export async function inviteWalletMember(
  walletId: string,
  email: string,
  role: WalletMember["role"] = "editor",
): Promise<WalletMember> {
  if (!isValidWalletId(walletId)) {
    throw new Error("ID dompet tidak valid.");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes("@")) {
    throw new Error("Masukkan email yang valid.");
  }

  const currentUserEmail = await getAuthenticatedWalletEmail();

  if (!currentUserEmail) {
    throw new Error("Silakan login kembali untuk mengundang anggota.");
  }

  if (currentUserEmail === normalizedEmail) {
    throw new Error("Anda sudah memiliki akses ke dompet ini.");
  }

  const existingMembers = await fetchWalletMembersForDisplay(walletId);
  if (existingMembers.some((member) => normalizeEmail(member.user_email) === normalizedEmail)) {
    throw new Error("Email ini sudah menjadi anggota dompet.");
  }

  const timestamp = Date.now();
  const payload = {
    id: uuidv4(),
    wallet_id: walletId,
    user_email: normalizedEmail,
    role,
    status: "pending" as const,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { data, error } = await supabase
    .from("wallet_members")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Email ini sudah menjadi anggota dompet.");
    }
    throw error;
  }

  const member = data as RemoteWalletMember;
  await upsertLocalWalletMember(member);

  // Auto-share active goals to new member
  await autoShareWalletGoals(walletId, normalizedEmail, currentUserEmail);

  // Send notification to the new member
  // Note: This would typically be handled by a backend service or Supabase Realtime
  // For now, we'll skip this as it requires the new user to be online

  return mapLocalWalletMember(member);
}

export async function joinWalletByInvite(walletId: string): Promise<{
  alreadyMember: boolean;
  wallet: RemoteWallet;
  member: WalletMember;
}> {
  if (!isValidWalletId(walletId)) {
    throw new Error("ID dompet tidak valid.");
  }

  const userEmail = await getAuthenticatedWalletEmail();
  if (!userEmail) {
    throw new Error("Silakan login kembali.");
  }

  const timestamp = Date.now();

  const { data: memberRows, error: memberLookupError } = await supabase
    .from("wallet_members")
    .select("*")
    .eq("wallet_id", walletId);

  if (memberLookupError) {
    throw memberLookupError;
  }

  const existingMember = ((memberRows ?? []) as RemoteWalletMember[]).find(
    (member) => normalizeEmail(member.user_email) === userEmail,
  );

  let remoteMember: RemoteWalletMember;
  let alreadyMember = false;

  if (existingMember?.status === "active") {
    remoteMember = existingMember;
    alreadyMember = true;
  } else if (existingMember) {
    const { data, error } = await supabase
      .from("wallet_members")
      .update({
        status: "active",
        updated_at: timestamp,
      })
      .eq("id", existingMember.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    remoteMember = data as RemoteWalletMember;
  } else {
    const { data, error } = await supabase
      .from("wallet_members")
      .insert({
        id: uuidv4(),
        wallet_id: walletId,
        user_email: userEmail,
        role: "editor",
        status: "active",
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        alreadyMember = true;
      } else {
        throw error;
      }
    }

    if (!data) {
      const refreshedMembers = await fetchWalletMembersForDisplay(walletId);
      const fallbackMember = refreshedMembers.find(
        (member) => normalizeEmail(member.user_email) === userEmail,
      );
      if (!fallbackMember) {
        throw new Error("Gagal memuat status anggota dompet.");
      }

      await hydrateSharedWallet(walletId);

      const db = await getInitializedDatabase();
      const wallet = await db.getFirstAsync<RemoteWallet>("SELECT * FROM wallets WHERE id = ?", [walletId]);
      if (!wallet) {
        throw new Error("Gagal memuat dompet bersama.");
      }

      return {
        alreadyMember,
        wallet,
        member: fallbackMember,
      };
    }

    remoteMember = data as RemoteWalletMember;
  }

  await hydrateSharedWallet(walletId);
  await upsertLocalWalletMember(remoteMember);

  const db = await getInitializedDatabase();
  const wallet = await db.getFirstAsync<RemoteWallet>("SELECT * FROM wallets WHERE id = ?", [walletId]);
  if (!wallet) {
    throw new Error("Gagal memuat dompet bersama.");
  }

  return {
    alreadyMember,
    wallet,
    member: mapLocalWalletMember(remoteMember),
  };
}

export async function removeWalletMemberWithSync(memberId: string): Promise<void> {
  const db = await getInitializedDatabase();
  const localMember = await db.getFirstAsync<{ id: string; wallet_id: string; sync_status: string }>(
    "SELECT id, wallet_id, sync_status FROM wallet_members WHERE id = ?",
    [memberId],
  );

  if (!localMember) {
    return;
  }

  if (localMember.sync_status === "pending_create") {
    await removeWalletMember(memberId);
    return;
  }

  const { error } = await supabase.from("wallet_members").delete().eq("id", memberId);
  if (error) {
    throw error;
  }

  await db.runAsync("DELETE FROM wallet_members WHERE id = ?", [memberId]);
}

/**
 * Auto-share goals to new wallet member
 */
async function autoShareWalletGoals(walletId: string, userEmail: string, sharedBy: string): Promise<void> {
  const { error } = await supabase.rpc('auto_share_wallet_goals', {
    p_wallet_id: walletId,
    p_user_email: userEmail,
    p_shared_by: sharedBy,
  });

  if (error) {
    console.error('Failed to auto-share goals:', error);
  }
}

/**
 * Fetch shared goals for a member
 */
export async function fetchSharedGoalsForMember(walletId: string, userEmail: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('wallet_goals_shared')
    .select('goal_id')
    .eq('wallet_id', walletId)
    .eq('user_email', userEmail);

  if (error) throw error;
  return (data ?? []).map(item => item.goal_id);
}

export { normalizeEmail as normalizeWalletMemberEmail };

