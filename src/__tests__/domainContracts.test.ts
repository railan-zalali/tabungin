jest.mock('../database/schema', () => ({
  getInitializedDatabase: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../utils/materialIcon', () => ({
  resolveMaterialIcon: jest.fn((name?: string | null) => name ?? 'tag'),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { getInitializedDatabase } from '../database/schema';
import { supabase } from '../lib/supabase';
import { deleteCategory, syncRemoteCategories } from '../database/categoryQueries';
import { syncRemoteRecurringTransactions } from '../database/recurringQueries';
import { revokeGoalSharing, setGoalPermission } from '../database/savingQueries';

type DbMock = {
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};

function createDbMock(): DbMock {
  return {
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
  };
}

describe('domain contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft deletes synced categories instead of removing them immediately', async () => {
    const db = createDbMock();
    db.getFirstAsync.mockResolvedValue({ sync_status: 'synced' });
    (getInitializedDatabase as jest.Mock).mockResolvedValue(db);

    await deleteCategory('category-1');

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET sync_status = 'pending_delete'"),
      [expect.any(Number), 'category-1'],
    );
  });

  it('preserves local insert arity for remote category sync', async () => {
    const db = createDbMock();
    db.getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'local-cat',
          user_id: 'user-1',
          name: 'Makanan',
          type: 'expense',
          icon: 'food',
          color: '#FF6B6B',
          is_default: 0,
          created_at: 100,
          updated_at: 200,
          sync_status: 'pending_create',
        },
      ])
      .mockResolvedValueOnce([]);
    db.getFirstAsync.mockResolvedValue(null);
    (getInitializedDatabase as jest.Mock).mockResolvedValue(db);

    const categoryQuery = { eq: jest.fn(), order: jest.fn() };
    categoryQuery.eq.mockReturnValue(categoryQuery);
    categoryQuery.order
      .mockReturnValueOnce(categoryQuery)
      .mockResolvedValueOnce({
        data: [
          {
            id: 'remote-cat',
            user_id: 'user-1',
            name: 'Bonus',
            type: 'income',
            icon: 'star',
            color: '#3498DB',
            is_default: 1,
            created_at: 111,
            updated_at: 222,
          },
        ],
        error: null,
      });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'transaction_categories') throw new Error(`Unexpected table ${table}`);
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ error: null }) }),
        select: jest.fn().mockReturnValue(categoryQuery),
      };
    });

    await syncRemoteCategories('user-1');

    const insertCall = db.runAsync.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT OR REPLACE INTO transaction_categories')
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toHaveLength(9);
  });

  it('preserves local insert arity for recurring transaction sync', async () => {
    const db = createDbMock();
    db.getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'local-recurring',
          user_id: 'user-1',
          wallet_id: null,
          category: 'Gaji',
          amount: 1000,
          type: 'income',
          note: null,
          frequency: 'monthly',
          day_of_month: 1,
          day_of_week: null,
          start_date: 100,
          end_date: null,
          next_occurrence: 200,
          is_active: 1,
          last_generated_at: null,
          created_at: 100,
          updated_at: 100,
          sync_status: 'pending_create',
        },
      ])
      .mockResolvedValueOnce([]);
    db.getFirstAsync.mockResolvedValue(null);
    (getInitializedDatabase as jest.Mock).mockResolvedValue(db);

    const recurringQuery = { eq: jest.fn(), order: jest.fn() };
    recurringQuery.eq.mockReturnValue(recurringQuery);
    recurringQuery.order.mockResolvedValue({
      data: [
        {
          id: 'remote-recurring',
          user_id: 'user-1',
          wallet_id: null,
          category: 'Belanja',
          amount: 500,
          type: 'expense',
          note: 'Bulanan',
          frequency: 'monthly',
          day_of_month: 5,
          day_of_week: null,
          start_date: 111,
          end_date: null,
          next_occurrence: 222,
          is_active: 1,
          last_generated_at: null,
          created_at: 111,
          updated_at: 222,
        },
      ],
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'recurring_transactions') throw new Error(`Unexpected table ${table}`);
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ error: null }) }),
        select: jest.fn().mockReturnValue(recurringQuery),
      };
    });

    await syncRemoteRecurringTransactions('user-1');

    const insertCall = db.runAsync.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT OR REPLACE INTO recurring_transactions')
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toHaveLength(19);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('uses the authenticated user id when calling sharing RPCs', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'auth-user-1' } } });
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await setGoalPermission('goal-1', 'member@example.com', 'read_only');
    await revokeGoalSharing('goal-1', 'member@example.com');

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'set_goal_permission', {
      p_goal_id: 'goal-1',
      p_user_email: 'member@example.com',
      p_permission_level: 'read_only',
      p_performed_by: 'auth-user-1',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'revoke_goal_sharing', {
      p_goal_id: 'goal-1',
      p_user_email: 'member@example.com',
      p_performed_by: 'auth-user-1',
    });
  });
});
