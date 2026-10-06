import { isSyncTaskRunning, runSerializedSyncTask } from '../../src/database/sync/syncQueue';

describe('syncQueue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('runs a single task and returns its result', async () => {
        const result = await runSerializedSyncTask(async () => 42);
        expect(result).toBe(42);
    });

    it('indicates no sync task running after completion', async () => {
        await runSerializedSyncTask(async () => undefined);
        expect(isSyncTaskRunning()).toBe(false);
    });

    it('indicates sync task running during execution', async () => {
        expect(isSyncTaskRunning()).toBe(false);
        const promise = runSerializedSyncTask(async () => {
            expect(isSyncTaskRunning()).toBe(true);
            return 'done';
        });
        await promise;
        expect(isSyncTaskRunning()).toBe(false);
    });

    it('serializes multiple tasks in order', async () => {
        const executionOrder: number[] = [];
        const task1 = runSerializedSyncTask(async () => {
            executionOrder.push(1);
            await new Promise((r) => setTimeout(r, 50));
        });
        const task2 = runSerializedSyncTask(async () => {
            executionOrder.push(2);
            await new Promise((r) => setTimeout(r, 10));
        });
        const task3 = runSerializedSyncTask(async () => {
            executionOrder.push(3);
        });

        await Promise.all([task1, task2, task3]);
        expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('propagates errors from tasks', async () => {
        await expect(
            runSerializedSyncTask(async () => {
                throw new Error('sync failed');
            }),
        ).rejects.toThrow('sync failed');
    });

    it('allows subsequent tasks after a failed task', async () => {
        try {
            await runSerializedSyncTask(async () => {
                throw new Error('first fails');
            });
        } catch {
            // expected
        }

        const result = await runSerializedSyncTask(async () => 'second succeeds');
        expect(result).toBe('second succeeds');
        expect(isSyncTaskRunning()).toBe(false);
    });
});
