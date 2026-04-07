import { getInitializedDatabase } from '../database/schema';
import { insertTransaction } from '../database/transactionQueries';
import { insertSavingGoal } from '../database/savingQueries';

type ImportKind = 'json' | 'csv';
type RowRecord = Record<string, any>;

interface ImportTransactionPayload {
    id?: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note?: string | null;
    date: number;
    created_at?: number;
    wallet_id?: string | null;
    profile_id?: string | null;
}

interface ImportGoalPayload {
    id?: string;
    name: string;
    target_amount: number;
    current_amount?: number;
    emoji?: string;
    photo_uri?: string | null;
    saving_per_period?: number;
    period_type?: 'daily' | 'weekly' | 'monthly';
    color?: string;
    start_date?: number;
    deadline_at?: number;
    estimated_date?: number;
    is_completed?: boolean;
    reminder_enabled?: boolean;
    reminder_time?: string | null;
    wallet_id?: string | null;
    profile_id?: string | null;
    owner_user_id?: string | null;
    created_by_user_id?: string | null;
}

interface FullBackupPayload {
    version: number;
    exportedAt: number;
    profiles: RowRecord[];
    wallets: RowRecord[];
    transactions: ImportTransactionPayload[];
    budgets: RowRecord[];
    goals: ImportGoalPayload[];
    savingLogs: RowRecord[];
    walletMembers: RowRecord[];
    walletGoalShares: RowRecord[];
    sharingActivity: RowRecord[];
}

export interface ImportPreview {
    kind: ImportKind;
    importedTransactions: number;
    importedGoals: number;
    importedProfiles: number;
    importedWallets: number;
    importedBudgets: number;
    importedSavingLogs: number;
    skippedTransactions: number;
    skippedGoals: number;
    skippedProfiles: number;
    skippedWallets: number;
    skippedBudgets: number;
    skippedSavingLogs: number;
    failedRows: number;
    transactions: ImportTransactionPayload[];
    goals: ImportGoalPayload[];
    fullBackup?: FullBackupPayload;
}

interface ImportContext {
    userId: string;
    defaultProfileId: string | null;
    defaultWalletId: string | null;
    availableProfileIds: Set<string>;
    availableWalletIds: Set<string>;
}

const DEFAULT_GOAL_EMOJI = '🎯';
const DEFAULT_BRAND_COLOR = '#1D7D53';

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
            continue;
        }
        current += char;
    }

    result.push(current);
    return result.map((item) => item.trim());
}

function normalizeTimestamp(value: unknown, fallback = Date.now()): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
        const parsedDate = Date.parse(value);
        if (Number.isFinite(parsedDate)) return parsedDate;
    }
    return fallback;
}

function normalizeTransaction(input: any): ImportTransactionPayload | null {
    if (!input || (input.type !== 'income' && input.type !== 'expense')) return null;
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !input.category) return null;

    return {
        id: typeof input.id === 'string' ? input.id : undefined,
        type: input.type,
        amount,
        category: String(input.category),
        note: input.note ? String(input.note) : null,
        date: normalizeTimestamp(input.date),
        created_at: normalizeTimestamp(input.created_at, normalizeTimestamp(input.date)),
        wallet_id: typeof input.wallet_id === 'string' ? input.wallet_id : null,
        profile_id: typeof input.profile_id === 'string' ? input.profile_id : null,
    };
}

function normalizeGoal(input: any): ImportGoalPayload | null {
    if (!input?.name) return null;
    const targetAmount = Number(input.target_amount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
    const periodType = input.period_type === 'daily' || input.period_type === 'weekly' || input.period_type === 'monthly' ? input.period_type : 'monthly';

    return {
        id: typeof input.id === 'string' ? input.id : undefined,
        name: String(input.name),
        target_amount: targetAmount,
        current_amount: Math.max(0, Number(input.current_amount) || 0),
        emoji: typeof input.emoji === 'string' ? input.emoji : DEFAULT_GOAL_EMOJI,
        photo_uri: input.photo_uri ?? null,
        saving_per_period: Number(input.saving_per_period) || Math.max(1, Math.round(targetAmount / 12)),
        period_type: periodType,
        color: typeof input.color === 'string' ? input.color : DEFAULT_BRAND_COLOR,
        start_date: normalizeTimestamp(input.start_date),
        deadline_at: normalizeTimestamp(input.deadline_at, normalizeTimestamp(input.estimated_date, Date.now())),
        estimated_date: normalizeTimestamp(input.estimated_date, Date.now()),
        is_completed: Boolean(input.is_completed),
        reminder_enabled: Boolean(input.reminder_enabled),
        reminder_time: typeof input.reminder_time === 'string' ? input.reminder_time : null,
        wallet_id: typeof input.wallet_id === 'string' ? input.wallet_id : null,
        profile_id: typeof input.profile_id === 'string' ? input.profile_id : null,
        owner_user_id: typeof input.owner_user_id === 'string' ? input.owner_user_id : null,
        created_by_user_id: typeof input.created_by_user_id === 'string' ? input.created_by_user_id : null,
    };
}

function normalizeRowArray(values: unknown, mapper?: (value: any) => any): RowRecord[] {
    if (!Array.isArray(values)) return [];
    return mapper ? values.map(mapper).filter(Boolean) : values.filter(Boolean).map((value) => ({ ...value }));
}

function buildEmptyPreview(kind: ImportKind): ImportPreview {
    return {
        kind,
        importedTransactions: 0,
        importedGoals: 0,
        importedProfiles: 0,
        importedWallets: 0,
        importedBudgets: 0,
        importedSavingLogs: 0,
        skippedTransactions: 0,
        skippedGoals: 0,
        skippedProfiles: 0,
        skippedWallets: 0,
        skippedBudgets: 0,
        skippedSavingLogs: 0,
        failedRows: 0,
        transactions: [],
        goals: [],
    };
}

export function previewJsonImport(fileContent: string): ImportPreview {
    const parsed = JSON.parse(fileContent);
    const transactionsInput = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    const goalsInput = Array.isArray(parsed?.goals) ? parsed.goals : [];
    const transactions = transactionsInput.map(normalizeTransaction).filter(Boolean) as ImportTransactionPayload[];
    const goals = goalsInput.map(normalizeGoal).filter(Boolean) as ImportGoalPayload[];

    const profiles = normalizeRowArray(parsed?.profiles);
    const wallets = normalizeRowArray(parsed?.wallets);
    const budgets = normalizeRowArray(parsed?.budgets);
    const savingLogs = normalizeRowArray(parsed?.savingLogs);
    const walletMembers = normalizeRowArray(parsed?.walletMembers);
    const walletGoalShares = normalizeRowArray(parsed?.walletGoalShares);
    const sharingActivity = normalizeRowArray(parsed?.sharingActivity);

    const preview = buildEmptyPreview('json');
    preview.importedTransactions = transactions.length;
    preview.importedGoals = goals.length;
    preview.importedProfiles = profiles.length;
    preview.importedWallets = wallets.length;
    preview.importedBudgets = budgets.length;
    preview.importedSavingLogs = savingLogs.length;
    preview.skippedTransactions = transactionsInput.length - transactions.length;
    preview.skippedGoals = goalsInput.length - goals.length;
    preview.transactions = transactions;
    preview.goals = goals;

    if (profiles.length || wallets.length || budgets.length || savingLogs.length || walletMembers.length || walletGoalShares.length || sharingActivity.length) {
        preview.fullBackup = {
            version: Number(parsed?.version) || 2,
            exportedAt: normalizeTimestamp(parsed?.exportedAt),
            profiles,
            wallets,
            transactions,
            budgets,
            goals,
            savingLogs,
            walletMembers,
            walletGoalShares,
            sharingActivity,
        };
    }

    return preview;
}

export function previewCsvImport(fileContent: string): ImportPreview {
    const preview = buildEmptyPreview('csv');
    const lines = fileContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length <= 1) return preview;

    let headerIndex = 0;
    let dataLines = lines.slice(1);
    if (lines[0].toUpperCase() === 'TRANSAKSI' && lines.length > 2) {
        headerIndex = 1;
        const nextSectionIndex = lines.findIndex((line, index) => index > headerIndex && line.toUpperCase() === 'TARGET TABUNGAN');
        dataLines = nextSectionIndex === -1 ? lines.slice(headerIndex + 1) : lines.slice(headerIndex + 1, nextSectionIndex);
    }

    const header = parseCsvLine(lines[headerIndex]).map((column) => column.toLowerCase());
    for (const line of dataLines) {
        const values = parseCsvLine(line);
        const row = header.reduce<Record<string, string>>((acc, key, index) => {
            acc[key] = values[index] ?? '';
            return acc;
        }, {});

        const normalized = normalizeTransaction({
            type: row.jenis?.toLowerCase() || row.type?.toLowerCase(),
            amount: row.jumlah || row.amount,
            category: row.kategori || row.category,
            note: row.catatan || row.note,
            date: row.tanggal || row.date,
            created_at: row['dibuat pada'] || row.created_at,
        });

        if (!normalized) {
            preview.failedRows += 1;
            continue;
        }

        preview.transactions.push(normalized);
    }

    preview.importedTransactions = preview.transactions.length;
    return preview;
}

async function getImportContext(userId: string): Promise<ImportContext> {
    const db = await getInitializedDatabase();
    const [wallets, profiles] = await Promise.all([
        db.getAllAsync<{ id: string; profile_id: string | null; is_default: number; created_at: number }>(
            `SELECT id, profile_id, is_default, created_at
             FROM wallets
             WHERE sync_status != 'pending_delete'
             ORDER BY is_default DESC, created_at ASC`,
        ),
        db.getAllAsync<{ id: string; created_at: number }>(
            `SELECT id, created_at
             FROM profiles
             WHERE sync_status != 'pending_delete'
             ORDER BY created_at ASC`,
        ),
    ]);

    return {
        userId,
        defaultProfileId: wallets[0]?.profile_id ?? profiles[0]?.id ?? null,
        defaultWalletId: wallets[0]?.id ?? null,
        availableProfileIds: new Set(profiles.map((profile) => profile.id)),
        availableWalletIds: new Set(wallets.map((wallet) => wallet.id)),
    };
}

async function hasTransactionFingerprint(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    transaction: ImportTransactionPayload,
): Promise<boolean> {
    const row = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM transactions
         WHERE type = ? AND amount = ? AND category = ? AND date = ? AND COALESCE(note, '') = ? AND sync_status != 'pending_delete'
         LIMIT 1`,
        [transaction.type, transaction.amount, transaction.category, transaction.date, transaction.note || ''],
    );

    return Boolean(row);
}

function resolveLegacyProfileId(profileId: string | null | undefined, context: ImportContext): string | null {
    if (profileId && context.availableProfileIds.has(profileId)) return profileId;
    return context.defaultProfileId;
}

function resolveLegacyWalletId(walletId: string | null | undefined, context: ImportContext): string | null {
    if (walletId && context.availableWalletIds.has(walletId)) return walletId;
    return context.defaultWalletId;
}

async function insertSnapshotRows(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    tableName: string,
    columns: string[],
    rows: RowRecord[],
): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
        const existing = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM ${tableName} WHERE id = ? AND sync_status != 'pending_delete'`,
            [row.id],
        );

        if (existing) {
            skipped += 1;
            continue;
        }

        await db.runAsync(
            `INSERT INTO ${tableName} (${columns.join(', ')}, sync_status) VALUES (${columns.map(() => '?').join(', ')}, 'pending_create')`,
            columns.map((column) => row[column] ?? null),
        );
        imported += 1;
    }

    return { imported, skipped };
}

async function commitFullBackup(preview: ImportPreview, userId: string): Promise<ImportPreview> {
    const db = await getInitializedDatabase();
    const snapshot = preview.fullBackup;
    if (!snapshot) return preview;

    const tableConfigs = [
        {
            key: 'profiles',
            columns: ['id', 'user_id', 'name', 'icon', 'color', 'created_at', 'updated_at'],
            rows: snapshot.profiles.map((row) => ({
                ...row,
                user_id: userId,
                icon: row.icon || 'account',
                color: row.color || DEFAULT_BRAND_COLOR,
                created_at: normalizeTimestamp(row.created_at),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at)),
            })),
        },
        {
            key: 'wallets',
            columns: ['id', 'profile_id', 'name', 'type', 'color', 'balance', 'is_default', 'created_at', 'updated_at'],
            rows: snapshot.wallets.map((row) => ({
                ...row,
                color: row.color || DEFAULT_BRAND_COLOR,
                balance: Math.max(0, Number(row.balance) || 0),
                is_default: row.is_default ? 1 : 0,
                created_at: normalizeTimestamp(row.created_at),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at)),
            })),
        },
        {
            key: 'wallet_members',
            columns: ['id', 'wallet_id', 'user_email', 'role', 'status', 'created_at', 'updated_at'],
            rows: snapshot.walletMembers.map((row) => ({
                ...row,
                user_email: String(row.user_email || '').toLowerCase(),
                created_at: normalizeTimestamp(row.created_at),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at)),
            })),
        },
        {
            key: 'transactions',
            columns: ['id', 'type', 'amount', 'category', 'note', 'date', 'created_at', 'updated_at', 'wallet_id', 'profile_id'],
            rows: snapshot.transactions.map((row) => ({
                ...row,
                created_at: normalizeTimestamp(row.created_at, normalizeTimestamp(row.date)),
                updated_at: normalizeTimestamp((row as any).updated_at, normalizeTimestamp(row.created_at, normalizeTimestamp(row.date))),
            })),
        },
        {
            key: 'budgets',
            columns: ['id', 'category', 'amount', 'month', 'year', 'reminder_enabled', 'reminder_time', 'created_at', 'updated_at', 'wallet_id', 'profile_id'],
            rows: snapshot.budgets.map((row) => ({
                ...row,
                reminder_enabled: row.reminder_enabled ? 1 : 0,
                created_at: normalizeTimestamp(row.created_at),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at)),
            })),
        },
        {
            key: 'saving_goals',
            columns: ['id', 'name', 'target_amount', 'current_amount', 'emoji', 'photo_uri', 'saving_per_period', 'period_type', 'color', 'start_date', 'deadline_at', 'estimated_date', 'is_completed', 'reminder_enabled', 'reminder_time', 'created_at', 'updated_at', 'wallet_id', 'profile_id', 'owner_user_id', 'created_by_user_id'],
            rows: snapshot.goals.map((row) => ({
                ...row,
                emoji: row.emoji || DEFAULT_GOAL_EMOJI,
                color: row.color || DEFAULT_BRAND_COLOR,
                deadline_at: normalizeTimestamp(row.deadline_at, normalizeTimestamp(row.estimated_date)),
                is_completed: row.is_completed ? 1 : 0,
                reminder_enabled: row.reminder_enabled ? 1 : 0,
                created_at: normalizeTimestamp((row as any).created_at, normalizeTimestamp(row.start_date)),
                updated_at: normalizeTimestamp((row as any).updated_at, normalizeTimestamp((row as any).created_at, normalizeTimestamp(row.start_date))),
                owner_user_id: row.owner_user_id ?? userId,
                created_by_user_id: row.created_by_user_id ?? userId,
            })),
        },
        {
            key: 'saving_logs',
            columns: ['id', 'goal_id', 'amount', 'note', 'date', 'created_at', 'updated_at'],
            rows: snapshot.savingLogs.map((row) => ({
                ...row,
                created_at: normalizeTimestamp(row.created_at, normalizeTimestamp(row.date)),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at, normalizeTimestamp(row.date))),
            })),
        },
        {
            key: 'wallet_goals_shared',
            columns: ['id', 'goal_id', 'wallet_id', 'user_email', 'shared_by', 'shared_at', 'created_at', 'updated_at', 'permission_level'],
            rows: snapshot.walletGoalShares.map((row) => ({
                ...row,
                user_email: String(row.user_email || '').toLowerCase(),
                shared_by: row.shared_by || 'system',
                created_at: normalizeTimestamp(row.created_at, normalizeTimestamp(row.shared_at)),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at, normalizeTimestamp(row.shared_at))),
                permission_level: row.permission_level || 'read_write',
            })),
        },
        {
            key: 'sharing_activity_log',
            columns: ['id', 'goal_id', 'wallet_id', 'user_email', 'action', 'performed_by', 'metadata', 'timestamp', 'created_at', 'updated_at'],
            rows: snapshot.sharingActivity.map((row) => ({
                ...row,
                user_email: String(row.user_email || '').toLowerCase(),
                created_at: normalizeTimestamp(row.created_at, normalizeTimestamp(row.timestamp)),
                updated_at: normalizeTimestamp(row.updated_at, normalizeTimestamp(row.created_at, normalizeTimestamp(row.timestamp))),
            })),
        },
    ] as const;

    const totals: Record<string, { imported: number; skipped: number }> = {};
    await db.withTransactionAsync(async () => {
        for (const config of tableConfigs) {
            totals[config.key] = await insertSnapshotRows(db, config.key, [...config.columns], [...config.rows]);
        }
    });

    return {
        ...preview,
        importedProfiles: totals.profiles?.imported ?? 0,
        importedWallets: totals.wallets?.imported ?? 0,
        importedTransactions: totals.transactions?.imported ?? 0,
        importedBudgets: totals.budgets?.imported ?? 0,
        importedGoals: totals.saving_goals?.imported ?? 0,
        importedSavingLogs: totals.saving_logs?.imported ?? 0,
        skippedProfiles: totals.profiles?.skipped ?? 0,
        skippedWallets: totals.wallets?.skipped ?? 0,
        skippedTransactions: totals.transactions?.skipped ?? 0,
        skippedBudgets: totals.budgets?.skipped ?? 0,
        skippedGoals: totals.saving_goals?.skipped ?? 0,
        skippedSavingLogs: totals.saving_logs?.skipped ?? 0,
    };
}

export async function commitImportPreview(preview: ImportPreview, userId: string): Promise<ImportPreview> {
    if (preview.fullBackup) {
        return commitFullBackup(preview, userId);
    }

    const db = await getInitializedDatabase();
    const context = await getImportContext(userId);
    let importedTransactions = 0;
    let importedGoals = 0;
    let skippedTransactions = 0;
    let skippedGoals = 0;

    for (const transaction of preview.transactions) {
        const duplicatedById = transaction.id
            ? await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM transactions WHERE id = ? AND sync_status != 'pending_delete'`,
                [transaction.id],
            )
            : null;

        if (duplicatedById || (await hasTransactionFingerprint(db, transaction))) {
            skippedTransactions += 1;
            continue;
        }

        await insertTransaction({
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            note: transaction.note || null,
            date: transaction.date,
            wallet_id: resolveLegacyWalletId(transaction.wallet_id, context) ?? undefined,
            profile_id: resolveLegacyProfileId(transaction.profile_id, context) ?? undefined,
        });
        importedTransactions += 1;
    }

    for (const goal of preview.goals) {
        const duplicated = goal.id
            ? await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM saving_goals WHERE id = ? AND sync_status != 'pending_delete'`,
                [goal.id],
            )
            : await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM saving_goals WHERE name = ? AND target_amount = ? AND sync_status != 'pending_delete' LIMIT 1`,
                [goal.name, goal.target_amount],
            );

        if (duplicated) {
            skippedGoals += 1;
            continue;
        }

        await insertSavingGoal({
            name: goal.name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount || 0,
            emoji: goal.emoji || DEFAULT_GOAL_EMOJI,
            photo_uri: goal.photo_uri || null,
            saving_per_period: goal.saving_per_period || Math.max(1, Math.round(goal.target_amount / 12)),
            period_type: goal.period_type || 'monthly',
            color: goal.color || DEFAULT_BRAND_COLOR,
            start_date: goal.start_date || Date.now(),
            deadline_at: goal.deadline_at || goal.estimated_date || Date.now(),
            estimated_date: goal.estimated_date || Date.now(),
            is_completed: Boolean(goal.is_completed),
            reminder_enabled: Boolean(goal.reminder_enabled),
            reminder_time: goal.reminder_time || null,
            wallet_id: resolveLegacyWalletId(goal.wallet_id, context) ?? undefined,
            profile_id: resolveLegacyProfileId(goal.profile_id, context) ?? undefined,
            owner_user_id: goal.owner_user_id ?? userId,
            created_by_user_id: goal.created_by_user_id ?? userId,
        });
        importedGoals += 1;
    }

    return {
        ...preview,
        importedTransactions,
        importedGoals,
        skippedTransactions,
        skippedGoals,
    };
}
