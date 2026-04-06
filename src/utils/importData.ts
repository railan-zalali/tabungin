import { getInitializedDatabase } from '../database/schema';
import { v4 as uuidv4 } from 'uuid';

type ImportKind = 'json' | 'csv';

interface ImportTransactionPayload {
    id?: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note?: string | null;
    date: number;
    created_at?: number;
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
    estimated_date?: number;
    is_completed?: boolean;
    reminder_enabled?: boolean;
    reminder_time?: string | null;
}

export interface ImportPreview {
    kind: ImportKind;
    importedTransactions: number;
    importedGoals: number;
    skippedTransactions: number;
    skippedGoals: number;
    failedRows: number;
    transactions: ImportTransactionPayload[];
    goals: ImportGoalPayload[];
}

interface ImportContext {
    userId: string;
    profileId: string | null;
    walletId: string | null;
}

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
    if (!input || (input.type !== 'income' && input.type !== 'expense')) {
        return null;
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !input.category) {
        return null;
    }

    return {
        id: typeof input.id === 'string' ? input.id : undefined,
        type: input.type,
        amount,
        category: String(input.category),
        note: input.note ? String(input.note) : null,
        date: normalizeTimestamp(input.date),
        created_at: normalizeTimestamp(input.created_at, normalizeTimestamp(input.date)),
    };
}

function normalizeGoal(input: any): ImportGoalPayload | null {
    if (!input?.name) return null;

    const targetAmount = Number(input.target_amount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        return null;
    }

    const currentAmount = Math.max(0, Number(input.current_amount) || 0);
    const periodType =
        input.period_type === 'daily' || input.period_type === 'weekly' || input.period_type === 'monthly'
            ? input.period_type
            : 'monthly';

    return {
        id: typeof input.id === 'string' ? input.id : undefined,
        name: String(input.name),
        target_amount: targetAmount,
        current_amount: currentAmount,
        emoji: typeof input.emoji === 'string' ? input.emoji : '🎯',
        photo_uri: input.photo_uri ?? null,
        saving_per_period: Number(input.saving_per_period) || Math.max(1, Math.round(targetAmount / 12)),
        period_type: periodType,
        color: typeof input.color === 'string' ? input.color : '#1D7D53',
        start_date: normalizeTimestamp(input.start_date),
        estimated_date: normalizeTimestamp(input.estimated_date, Date.now()),
        is_completed: Boolean(input.is_completed),
        reminder_enabled: Boolean(input.reminder_enabled),
        reminder_time: typeof input.reminder_time === 'string' ? input.reminder_time : null,
    };
}

export function previewJsonImport(fileContent: string): ImportPreview {
    const parsed = JSON.parse(fileContent);
    const transactionsInput = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    const goalsInput = Array.isArray(parsed?.goals) ? parsed.goals : [];
    const transactions = transactionsInput.map(normalizeTransaction).filter(Boolean) as ImportTransactionPayload[];
    const goals = goalsInput.map(normalizeGoal).filter(Boolean) as ImportGoalPayload[];

    return {
        kind: 'json',
        importedTransactions: transactions.length,
        importedGoals: goals.length,
        skippedTransactions: transactionsInput.length - transactions.length,
        skippedGoals: goalsInput.length - goals.length,
        failedRows: 0,
        transactions,
        goals,
    };
}

export function previewCsvImport(fileContent: string): ImportPreview {
    const lines = fileContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length <= 1) {
        return {
            kind: 'csv',
            importedTransactions: 0,
            importedGoals: 0,
            skippedTransactions: 0,
            skippedGoals: 0,
            failedRows: 0,
            transactions: [],
            goals: [],
        };
    }

    const header = parseCsvLine(lines[0]).map((column) => column.toLowerCase());
    const transactions: ImportTransactionPayload[] = [];
    let failedRows = 0;

    for (const line of lines.slice(1)) {
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
            failedRows += 1;
            continue;
        }

        transactions.push(normalized);
    }

    return {
        kind: 'csv',
        importedTransactions: transactions.length,
        importedGoals: 0,
        skippedTransactions: 0,
        skippedGoals: 0,
        failedRows,
        transactions,
        goals: [],
    };
}

async function getImportContext(userId: string): Promise<ImportContext> {
    const db = await getInitializedDatabase();
    const wallet = await db.getFirstAsync<{ id: string; profile_id: string | null }>(
        `SELECT id, profile_id
         FROM wallets
         WHERE sync_status != 'pending_delete'
         ORDER BY is_default DESC, created_at ASC
         LIMIT 1`,
    );

    return {
        userId,
        profileId: wallet?.profile_id ?? null,
        walletId: wallet?.id ?? null,
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

export async function commitImportPreview(preview: ImportPreview, userId: string): Promise<ImportPreview> {
    const db = await getInitializedDatabase();
    const context = await getImportContext(userId);
    let importedTransactions = 0;
    let importedGoals = 0;
    let skippedTransactions = 0;
    let skippedGoals = 0;

    await db.withTransactionAsync(async () => {
        for (const transaction of preview.transactions) {
            const duplicatedById =
                transaction.id &&
                (await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM transactions WHERE id = ? AND sync_status != 'pending_delete'`,
                    [transaction.id],
                ));

            const duplicatedByFingerprint = await hasTransactionFingerprint(db, transaction);
            if (duplicatedById || duplicatedByFingerprint) {
                skippedTransactions += 1;
                continue;
            }

            const id = transaction.id || uuidv4();
            const createdAt = transaction.created_at || Date.now();
            await db.runAsync(
                `INSERT INTO transactions
                 (id, type, amount, category, note, date, created_at, updated_at, sync_status, wallet_id, profile_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_create', ?, ?)`,
                [
                    id,
                    transaction.type,
                    transaction.amount,
                    transaction.category,
                    transaction.note || null,
                    transaction.date,
                    createdAt,
                    Date.now(),
                    context.walletId,
                    context.profileId,
                ],
            );
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

            const id = goal.id || uuidv4();
            const createdAt = goal.start_date || Date.now();
            await db.runAsync(
                `INSERT INTO saving_goals
                 (id, name, target_amount, current_amount, emoji, photo_uri, saving_per_period, period_type, color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time, created_at, updated_at, sync_status, wallet_id, profile_id, owner_user_id, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create', ?, ?, ?, ?)`,
                [
                    id,
                    goal.name,
                    goal.target_amount,
                    goal.current_amount || 0,
                    goal.emoji || '🎯',
                    goal.photo_uri || null,
                    goal.saving_per_period || Math.max(1, Math.round(goal.target_amount / 12)),
                    goal.period_type || 'monthly',
                    goal.color || '#1D7D53',
                    goal.start_date || Date.now(),
                    goal.estimated_date || Date.now(),
                    goal.is_completed ? 1 : 0,
                    goal.reminder_enabled ? 1 : 0,
                    goal.reminder_time || null,
                    createdAt,
                    Date.now(),
                    context.walletId,
                    context.profileId,
                    userId,
                    userId,
                ],
            );
            importedGoals += 1;
        }
    });

    return {
        ...preview,
        importedTransactions,
        importedGoals,
        skippedTransactions,
        skippedGoals,
    };
}
