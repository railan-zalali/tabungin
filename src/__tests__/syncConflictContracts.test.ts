import { shouldApplyRemoteChange, shouldApplyRealtimePayload } from '../utils/syncConflict';

const tables = ['wallets', 'transactions', 'saving_goals', 'saving_logs'] as const;
const eventTypes = ['INSERT', 'UPDATE', 'DELETE'] as const;

describe('sync conflict contracts', () => {
    it.each(tables)('applies realtime payload for synced %s rows', (tableName) => {
        for (const eventType of eventTypes) {
            expect(shouldApplyRealtimePayload(tableName, 'synced', eventType)).toBe(true);
        }
    });

    it.each(tables)('skips realtime payload for dirty %s rows', (tableName) => {
        for (const eventType of eventTypes) {
            expect(shouldApplyRealtimePayload(tableName, 'pending_create', eventType)).toBe(false);
            expect(shouldApplyRealtimePayload(tableName, 'pending_update', eventType)).toBe(false);
            expect(shouldApplyRealtimePayload(tableName, 'pending_delete', eventType)).toBe(eventType === 'DELETE');
        }
    });

    it.each(tables)('accepts realtime payload when no local row exists for %s', (tableName) => {
        for (const eventType of eventTypes) {
            expect(shouldApplyRealtimePayload(tableName, null, eventType)).toBe(true);
            expect(shouldApplyRealtimePayload(tableName, undefined, eventType)).toBe(true);
        }
    });

    it.each(tables)('rejects stale remote updates for %s when local synced row is newer', (tableName) => {
        expect(
            shouldApplyRemoteChange({
                tableName,
                localSyncStatus: 'synced',
                eventType: 'UPDATE',
                localUpdatedAt: 200,
                remoteUpdatedAt: 150,
            }),
        ).toBe(false);
    });

    it.each(tables)('keeps delete-vs-update precedence deterministic for %s', (tableName) => {
        expect(
            shouldApplyRemoteChange({
                tableName,
                localSyncStatus: 'pending_delete',
                eventType: 'DELETE',
                localUpdatedAt: 200,
                remoteUpdatedAt: 250,
            }),
        ).toBe(true);

        expect(
            shouldApplyRemoteChange({
                tableName,
                localSyncStatus: 'pending_delete',
                eventType: 'UPDATE',
                localUpdatedAt: 200,
                remoteUpdatedAt: 250,
            }),
        ).toBe(false);
    });
});
