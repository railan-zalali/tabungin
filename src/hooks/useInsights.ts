// Menyatukan data transaksi 6 bulan terakhir dengan InsightEngine.
// Dipakai Dashboard (satu insight teratas) dan Report (daftar lengkap).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveCategoryByKey } from '../utils/categoryResolver';
import { buildInsights, type Insight } from '../utils/insightEngine';
import { fetchTransactions } from '../database/transactionQueries';
import { useAuthStore } from '../store/useAuthStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useProfileStore } from '../store/useProfileStore';
import type { Transaction } from '../types/transaction';

/** Jendela analisis insight: dari awal bulan ke-(N-1) lalu sampai sekarang. */
export const INSIGHT_WINDOW_MONTHS = 6;

function windowStart(months: number, now: number): number {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
    start.setMonth(start.getMonth() - (months - 1));
    return start.getTime();
}

export function useInsights() {
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const categories = useCategoryStore((state) => state.categories);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const userEmail = useAuthStore.getState().user?.email;
            const now = Date.now();
            const data = await fetchTransactions({
                period: 'custom',
                startDate: windowStart(INSIGHT_WINDOW_MONTHS, now),
                endDate: now,
                profile_id: activeProfileId || undefined,
                userEmail,
            });
            setTransactions(data);
        } catch (error) {
            console.error('Insight load failed:', error);
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeProfileId]);

    useEffect(() => {
        load();
    }, [load]);

    const resolveCategory = useCallback(
        (key: string) => resolveCategoryByKey(key, categories)?.name ?? key,
        [categories],
    );

    const insights: Insight[] = useMemo(
        () => buildInsights(transactions, { resolveCategory, months: INSIGHT_WINDOW_MONTHS }),
        [resolveCategory, transactions],
    );

    return { insights, isLoading, refresh: load };
}
