// SQLite fake in-memory untuk integration test (mis. transactionQueries).
//
// Ini bukan engine SQL: ia mengenali bentuk statement yang benar-benar
// dipancarkan oleh modul query dan menerjemahkannya ke operasi array.
// Statement yang tidak dikenal akan melempar, sehingga perubahan query di
// kode produksi langsung ketahuan saat test dijalankan.

type Value = string | number | null;
export type Row = Record<string, any>;

function normalize(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
}

/** Split pada separator di kedalaman tanda kurung 0. */
function splitTopLevel(input: string, separator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        if (char === '(') depth += 1;
        else if (char === ')') depth -= 1;
        else if (depth === 0 && input.startsWith(separator, i)) {
            parts.push(input.slice(start, i).trim());
            i += separator.length - 1;
            start = i + 1;
        }
    }

    parts.push(input.slice(start).trim());
    return parts.filter(Boolean);
}

/** Split daftar kolom, menghormati koma di dalam tanda kurung. */
function splitColumns(cols: string): string[] {
    return splitTopLevel(cols, ', ');
}

function countPlaceholders(clause: string): number {
    return (clause.match(/\?/g) ?? []).length;
}

function stripParens(clause: string): string {
    let text = clause.trim();
    while (text.startsWith('(') && text.endsWith(')')) {
        text = text.slice(1, -1).trim();
    }
    return text;
}

function evaluateLeaf(clause: string, row: Row, values: Value[]): boolean {
    const text = stripParens(clause);

    const notEqual = text.match(/^(\w+) != '([^']+)'$/);
    if (notEqual) return row[notEqual[1]] !== notEqual[2];

    const comparison = text.match(/^(\w+) (>=|<=|>|<) \?$/);
    if (comparison) {
        const target = values[0] as number;
        const actual = row[comparison[1]] as number;
        switch (comparison[2]) {
            case '>=':
                return actual >= target;
            case '<=':
                return actual <= target;
            case '>':
                return actual > target;
            default:
                return actual < target;
        }
    }

    const like = text.match(/^(\w+) LIKE \?$/);
    if (like) {
        const needle = String(values[0] ?? '').toLowerCase().replace(/%/g, '');
        return String(row[like[1]] ?? '').toLowerCase().includes(needle);
    }

    const equality = text.match(/^(\w+) = \?$/);
    if (equality) return row[equality[1]] === values[0];

    if (text === 'sync_status IS NOT NULL') return row.sync_status != null;

    throw new Error(`FakeSqlite: klausa WHERE tak dikenal -> "${text}"`);
}

function evaluateClause(clause: string, row: Row, values: Value[]): boolean {
    const text = stripParens(clause);
    const orParts = splitTopLevel(text, ' OR ');
    if (orParts.length === 1) return evaluateLeaf(text, row, values);

    let cursor = 0;
    let matched = false;
    for (const part of orParts) {
        const span = countPlaceholders(part);
        if (evaluateLeaf(part, row, values.slice(cursor, cursor + span))) matched = true;
        cursor += span;
    }
    return matched;
}

function evaluate(where: string, row: Row, values: Value[]): boolean {
    let cursor = 0;
    for (const part of splitTopLevel(where, ' AND ')) {
        const span = countPlaceholders(part);
        if (!evaluateClause(part, row, values.slice(cursor, cursor + span))) return false;
        cursor += span;
    }
    return true;
}

interface ParsedSelect {
    cols: string;
    table: string;
    where: string | null;
    group: string | null;
    order: string | null;
    hasLimit: boolean;
    hasOffset: boolean;
}

function nextMarker(rest: string, from: number): number {
    const markers = [' GROUP BY ', ' ORDER BY ', ' LIMIT ?']
        .map((marker) => rest.indexOf(marker, from))
        .filter((index) => index >= 0);
    return markers.length > 0 ? Math.min(...markers) : rest.length;
}

function parseSelect(sql: string): ParsedSelect {
    const fromIndex = sql.indexOf(' FROM ');
    if (fromIndex < 0) throw new Error(`FakeSqlite: statement tak dikenal -> "${sql}"`);

    const cols = sql.slice('SELECT '.length, fromIndex).trim();
    let rest = sql.slice(fromIndex + 6);
    const table = rest.split(' ')[0];
    // Sengaja TIDAK di-trim: spasi awal dipakai sebagai jangkar marker
    // (' WHERE ', ' GROUP BY ', dst.) agar selalu ketemu tepat di awal clause.
    rest = rest.slice(table.length);

    const whereIndex = rest.indexOf(' WHERE ');
    const groupIndex = rest.indexOf(' GROUP BY ');
    const orderIndex = rest.indexOf(' ORDER BY ');
    const limitIndex = rest.indexOf(' LIMIT ?');
    const offsetIndex = rest.indexOf(' OFFSET ?');

    const whereEnd = nextMarker(rest, whereIndex >= 0 ? whereIndex + 7 : 0);
    const groupEnd = nextMarker(rest, groupIndex >= 0 ? groupIndex + 10 : 0);
    const orderEnd = nextMarker(rest, orderIndex >= 0 ? orderIndex + 10 : 0);

    return {
        cols,
        table,
        where: whereIndex >= 0 ? rest.slice(whereIndex + 7, whereEnd).trim() : null,
        group: groupIndex >= 0 ? rest.slice(groupIndex + 10, groupEnd).trim() : null,
        order: orderIndex >= 0 ? rest.slice(orderIndex + 10, orderEnd).trim() : null,
        hasLimit: limitIndex >= 0,
        hasOffset: offsetIndex >= 0,
    };
}

function aggregateValue(expr: string, rows: Row[]): number {
    const count = expr.match(/^COUNT\(\*\)$/);
    if (count) return rows.length;

    const sum = expr.match(/^(?:COALESCE\()?SUM\((\w+)\)(?:, 0\))?$/);
    if (sum) return rows.reduce((total, row) => total + Number(row[sum[1]] ?? 0), 0);

    throw new Error(`FakeSqlite: ekspresi agregat tak dikenal -> "${expr}"`);
}

function project(cols: string, rows: Row[]): Row[] {
    if (cols === '*') return rows.map((row) => ({ ...row }));

    const specs = splitColumns(cols).map((spec) => spec.trim());
    const isAggregate = specs.some((spec) => /SUM\(|COUNT\(/.test(spec));

    if (isAggregate) {
        return specs.map((spec) => {
            const match = spec.match(/^(.+) as (\w+)$/);
            if (!match) throw new Error(`FakeSqlite: kolom agregat tak dikenal -> "${spec}"`);
            return { [match[2]]: aggregateValue(match[1].trim(), rows) };
        });
    }

    return rows.map((row) => {
        const projected: Row = {};
        for (const spec of specs) {
            const match = spec.match(/^(\w+)(?: as (\w+))?$/);
            if (!match) throw new Error(`FakeSqlite: kolom tak dikenal -> "${spec}"`);
            projected[match[2] ?? match[1]] = row[match[1]];
        }
        return projected;
    });
}

function sortRows(rows: Row[], order: string | null): Row[] {
    if (!order) return rows;
    const keys = order.split(',').map((clause) => {
        const match = clause.trim().match(/^(\w+)( DESC| ASC)?$/);
        if (!match) throw new Error(`FakeSqlite: ORDER BY tak dikenal -> "${clause}"`);
        return { col: match[1], desc: (match[2] ?? '').trim() === 'DESC' };
    });

    return [...rows].sort((a, b) => {
        for (const key of keys) {
            const left = a[key.col];
            const right = b[key.col];
            if (left === right) continue;
            const result = left < right ? -1 : 1;
            return key.desc ? -result : result;
        }
        return 0;
    });
}

export class FakeSqlite {
    transactions: Row[] = [];
    wallets: Row[] = [];

    private table(name: string): Row[] {
        if (name === 'transactions') return this.transactions;
        if (name === 'wallets') return this.wallets;
        throw new Error(`FakeSqlite: tabel tak dikenal -> "${name}"`);
    }

    async withTransactionAsync<T>(work: () => Promise<T>): Promise<T> {
        return work();
    }

    async runAsync(sql: string, params: Value[] = []): Promise<{ changes: number }> {
        const query = normalize(sql);
        let match: RegExpMatchArray | null;

        match = query.match(
            /^INSERT INTO (\w+) \((.+?)\) VALUES \((.+?)\)$/,
        );
        if (match) {
            const columns = match[2].split(',').map((col) => col.trim());
            const row: Row = {};
            columns.forEach((column, index) => {
                row[column] = params[index];
            });
            this.table(match[1]).push(row);
            return { changes: 1 };
        }

        match = query.match(
            /^UPDATE wallets SET balance = balance ([+-]) \?, sync_status = 'pending_update', updated_at = \? WHERE id = \?$/,
        );
        if (match) {
            const wallet = this.wallets.find((row) => row.id === params[2]);
            if (!wallet) return { changes: 0 };
            const delta = Number(params[0]) * (match[1] === '+' ? 1 : -1);
            wallet.balance = Number(wallet.balance) + delta;
            wallet.sync_status = 'pending_update';
            wallet.updated_at = params[1];
            return { changes: 1 };
        }

        match = query.match(/^DELETE FROM (\w+) WHERE id = \?$/);
        if (match) {
            const table = this.table(match[1]);
            const before = table.length;
            const keep = table.filter((row) => row.id !== params[0]);
            if (match[1] === 'transactions') this.transactions = keep;
            else this.wallets = keep;
            return { changes: before - keep.length };
        }

        match = query.match(
            /^UPDATE (\w+) SET sync_status = 'pending_delete', updated_at = \? WHERE id = \?$/,
        );
        if (match) {
            const row = this.table(match[1]).find((item) => item.id === params[1]);
            if (!row) return { changes: 0 };
            row.sync_status = 'pending_delete';
            row.updated_at = params[0];
            return { changes: 1 };
        }

        match = query.match(/^UPDATE (\w+) SET (.+), sync_status = \?, updated_at = \? WHERE id = \?$/);
        if (match) {
            const fields = match[2].split(',').map((field) => field.trim().split(' =')[0]);
            const id = params[params.length - 1];
            const row = this.table(match[1]).find((item) => item.id === id);
            if (!row) return { changes: 0 };

            fields.forEach((field, index) => {
                row[field] = params[index];
            });
            row.sync_status = params[fields.length];
            row.updated_at = params[fields.length + 1];
            return { changes: 1 };
        }

        throw new Error(`FakeSqlite: runAsync tak dikenal -> "${query}"`);
    }

    async getFirstAsync<T>(sql: string, params: Value[] = []): Promise<T | null> {
        const rows = await this.getAllAsync<T>(sql, params);
        return rows[0] ?? null;
    }

    async getAllAsync<T>(sql: string, params: Value[] = []): Promise<T[]> {
        const query = normalize(sql);
        const select = parseSelect(query);

        // LIMIT ? / OFFSET ? memakai placeholder terakhir (urut menurut tulisan),
        // jadi harus dilepas dari parameter WHERE sebelum evaluasi.
        const trailingParams = (select.hasLimit ? 1 : 0) + (select.hasOffset ? 1 : 0);
        const limit = select.hasLimit ? Number(params[params.length - trailingParams]) : null;
        const offset = select.hasOffset ? Number(params[params.length - 1]) : 0;
        const whereParams = select.where
            ? trailingParams > 0
                ? params.slice(0, params.length - trailingParams)
                : params
            : [];
        let rows = this.table(select.table);

        if (select.where) {
            rows = rows.filter((row) => evaluate(select.where as string, row, whereParams));
        }

        const grouped = select.group
            ? groupRows(rows, select.group, select.cols)
            : project(select.cols, rows);

        const sorted = sortRows(grouped, select.order);
        const offsetRows = offset > 0 ? sorted.slice(offset) : sorted;
        return (limit != null ? offsetRows.slice(0, limit) : offsetRows) as T[];
    }
}

function groupRows(rows: Row[], group: string, cols: string): Row[] {
    const specs = splitColumns(cols).map((spec) => spec.trim());
    const key = specs[0];
    if (key !== group) {
        throw new Error(`FakeSqlite: GROUP BY hanya mendukung kolom pertama (${group})`);
    }

    const buckets = new Map<string, Row[]>();
    for (const row of rows) {
        const bucketKey = String(row[group]);
        const bucket = buckets.get(bucketKey);
        if (bucket) bucket.push(row);
        else buckets.set(bucketKey, [row]);
    }

    const results: Row[] = [];
    for (const [bucketKey, bucket] of buckets) {
        const aggregated: Row = { [group]: bucketKey };
        for (const spec of specs.slice(1)) {
            const match = spec.match(/^(.+) as (\w+)$/);
            if (!match) throw new Error(`FakeSqlite: kolom agregat tak dikenal -> "${spec}"`);
            aggregated[match[2]] = aggregateValue(match[1].trim(), bucket);
        }
        results.push(aggregated);
    }

    return results;
}
