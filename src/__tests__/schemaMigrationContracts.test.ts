describe('schema migration contracts', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('skips duplicate ADD COLUMN steps when a partially migrated database already has the column', async () => {
        const runAsync = jest.fn().mockResolvedValue(undefined);
        const execAsync = jest.fn().mockResolvedValue(undefined);
        const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
            await callback();
        });

        const columnNames = [
            'id',
            'sync_status',
            'updated_at',
            'wallet_id',
            'profile_id',
            'user_id',
            'target_params',
            'reminder_enabled',
            'reminder_offset_minutes',
            'updated_at',
            'permission_level',
            'owner_user_id',
            'created_by_user_id',
            'deadline_at',
        ];

        const getAllAsync = jest.fn(async (sql: string) => {
            if (sql.startsWith('PRAGMA table_info(')) {
                return columnNames.map((name) => ({ name }));
            }
            return [];
        });

        const getFirstAsync = jest.fn(async (sql: string) => {
            if (sql === 'PRAGMA user_version') {
                return { user_version: 14 };
            }

            if (sql.includes('SELECT COUNT(*) as count FROM wallets')) {
                return { count: 1 };
            }

            if (sql.includes('SELECT COUNT(*) as count FROM profiles')) {
                return { count: 1 };
            }

            if (sql.includes("SELECT name FROM sqlite_master WHERE type='table'")) {
                return { name: 'existing_table' };
            }

            return null;
        });

        const mockDatabase = {
            runAsync,
            execAsync,
            withTransactionAsync,
            getAllAsync,
            getFirstAsync,
        };

        jest.doMock('expo-sqlite', () => ({
            openDatabaseAsync: jest.fn().mockResolvedValue(mockDatabase),
        }));

        let initPromise: Promise<void>;
        jest.isolateModules(() => {
            const schema = require('../database/schema') as typeof import('../database/schema');
            initPromise = schema.initDatabase();
        });

        await initPromise!;

        expect(runAsync).not.toHaveBeenCalledWith(
            'ALTER TABLE saving_goals ADD COLUMN deadline_at INTEGER;'
        );
        expect(runAsync).toHaveBeenCalledWith(
            'UPDATE saving_goals SET deadline_at = estimated_date WHERE deadline_at IS NULL;'
        );
        expect(execAsync).toHaveBeenCalledWith('PRAGMA user_version = 15;');
    });
});
