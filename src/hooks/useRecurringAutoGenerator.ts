import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { processDueRecurringTransactions } from '../database/recurringProcessor';
import { useTransactionStore } from '../store/useTransactionStore';
import { useWalletStore } from '../store/useWalletStore';

export function useRecurringAutoGenerator() {
    const user = useAuthStore((state) => state.user);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const refreshSummary = useTransactionStore((state) => state.refreshSummary);
    const loadRecent = useTransactionStore((state) => state.loadRecent);
    const loadWallets = useWalletStore((state) => state.loadWallets);

    useEffect(() => {
        if (!isLoggedIn || !user?.id) return;

        const processRecurring = async () => {
            try {
                const count = await processDueRecurringTransactions(user.id);
                if (count > 0) {
                    console.log(`[Recurring] Generated ${count} transactions.`);
                    // Refresh data
                    await Promise.all([
                        loadRecent(),
                        refreshSummary(),
                        loadWallets()
                    ]);
                }
            } catch (error) {
                console.error('[Recurring] Failed to process recurring transactions:', error);
            }
        };

        // Run once on mount when user is present
        processRecurring();

        // Optionally, run periodically (e.g., every 1 hour) while app is open
        const intervalId = setInterval(processRecurring, 60 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [isLoggedIn, user?.id, loadRecent, refreshSummary, loadWallets]);
}
