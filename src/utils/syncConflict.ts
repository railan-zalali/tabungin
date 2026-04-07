export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';
export type LocalSyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete' | null | undefined;

export interface RemoteConflictInput {
    tableName: string;
    localSyncStatus: LocalSyncStatus;
    eventType: RealtimeEventType;
    localUpdatedAt?: number | null;
    remoteUpdatedAt?: number | null;
}

export function isLocalDirtyRecord(localSyncStatus: LocalSyncStatus): boolean {
    return (
        localSyncStatus === 'pending_create' ||
        localSyncStatus === 'pending_update' ||
        localSyncStatus === 'pending_delete'
    );
}

export function shouldApplyRemoteChange({
    localSyncStatus,
    eventType,
    localUpdatedAt,
    remoteUpdatedAt,
}: RemoteConflictInput): boolean {
    if (localSyncStatus === 'pending_create' || localSyncStatus === 'pending_update') {
        return false;
    }

    if (localSyncStatus === 'pending_delete') {
        return eventType === 'DELETE';
    }

    if (eventType === 'DELETE') {
        return true;
    }

    if (
        typeof localUpdatedAt === 'number' &&
        typeof remoteUpdatedAt === 'number' &&
        remoteUpdatedAt < localUpdatedAt
    ) {
        return false;
    }

    return true;
}

export function shouldApplyRealtimePayload(
    tableName: string,
    localSyncStatus: LocalSyncStatus,
    eventType: RealtimeEventType,
    localUpdatedAt?: number | null,
    remoteUpdatedAt?: number | null,
): boolean {
    return shouldApplyRemoteChange({
        tableName,
        localSyncStatus,
        eventType,
        localUpdatedAt,
        remoteUpdatedAt,
    });
}
