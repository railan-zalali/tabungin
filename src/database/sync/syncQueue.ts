let syncQueue: Promise<unknown> = Promise.resolve();
let activeSyncTasks = 0;

export function isSyncTaskRunning() {
    return activeSyncTasks > 0;
}

export async function runSerializedSyncTask<T>(task: () => Promise<T>): Promise<T> {
    const wrappedTask = async () => {
        activeSyncTasks += 1;
        try {
            return await task();
        } finally {
            activeSyncTasks = Math.max(0, activeSyncTasks - 1);
        }
    };

    const queuedTask = syncQueue.then(wrappedTask, wrappedTask);
    syncQueue = queuedTask.then(
        () => undefined,
        () => undefined
    );

    return queuedTask;
}
