// Test notificationService — izin, penjadwalan reminder, dan persistensi
// notifikasi ke Supabase. Modul expo-notifications di-mock per-subpath
// karena service mengimpor dari 'expo-notifications/build/*'.
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import {
    requestNotificationPermission,
    scheduleGoalReminder,
    cancelGoalReminder,
    rescheduleAllReminders,
    sendGoalCompletedNotification,
    sendBudgetWarningNotification,
    sendWalletInviteNotification,
    scheduleDebtReminder,
    cancelDebtReminder,
} from '../../src/utils/notificationService';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { SavingGoal } from '../../src/types/saving';

jest.mock('expo-notifications/build/NotificationPermissions.types', () => ({
    IosAuthorizationStatus: {
        NOT_DETERMINED: 0,
        DENIED: 1,
        AUTHORIZED: 2,
        PROVISIONAL: 3,
        EPHEMERAL: 4,
    },
}));
jest.mock('expo-notifications/build/NotificationsHandler', () => ({
    setNotificationHandler: jest.fn(),
}));
jest.mock('expo-notifications/build/Notifications.types', () => ({
    SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
}));
jest.mock('expo-notifications/build/NotificationPermissions', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
}));
jest.mock('expo-notifications/build/scheduleNotificationAsync', () => ({
    scheduleNotificationAsync: jest.fn().mockResolvedValue('sched-1'),
}));
jest.mock('expo-notifications/build/cancelScheduledNotificationAsync', () => ({
    cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-notifications/build/getAllScheduledNotificationsAsync', () => ({
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: jest.fn(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })) },
}));
jest.mock('../../src/store/useAuthStore', () => ({
    useAuthStore: { getState: jest.fn() },
}));

const getPerms = getPermissionsAsync as jest.Mock;
const requestPerms = requestPermissionsAsync as jest.Mock;
const schedule = scheduleNotificationAsync as jest.Mock;
const cancel = cancelScheduledNotificationAsync as jest.Mock;
const getAll = getAllScheduledNotificationsAsync as jest.Mock;
const insert = jest.fn().mockResolvedValue({ error: null });

const grant = { granted: true, status: 'granted' };
const deny = { granted: false, status: 'denied' };

function setAuthUser(id: string | null) {
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: id ? { id } : null });
}

const goal = (over: Partial<SavingGoal> = {}): SavingGoal =>
    ({
        id: 'g-1',
        name: 'Liburan Bali',
        target_amount: 4000,
        current_amount: 1000,
        emoji: '🌴',
        photo_uri: null,
        saving_per_period: 500,
        period_type: 'monthly',
        color: '#0EAD69',
        start_date: 1,
        estimated_date: 2,
        is_completed: false,
        reminder_enabled: true,
        reminder_time: '08:30',
        created_at: 1,
        ...over,
    }) as unknown as SavingGoal;

beforeEach(() => {
    jest.clearAllMocks();
    getPerms.mockResolvedValue(deny);
    requestPerms.mockResolvedValue(grant);
    schedule.mockResolvedValue('sched-1');
    cancel.mockResolvedValue(undefined);
    getAll.mockResolvedValue([]);
    insert.mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert });
    setAuthUser('user-1');
});

describe('requestNotificationPermission', () => {
    it('returns true without prompting when already granted', async () => {
        getPerms.mockResolvedValue(grant);

        await expect(requestNotificationPermission()).resolves.toBe(true);
        expect(requestPerms).not.toHaveBeenCalled();
    });

    it('prompts when not yet granted and reflects the answer', async () => {
        await expect(requestNotificationPermission()).resolves.toBe(true);
        expect(requestPerms).toHaveBeenCalled();
    });

    it('returns false when the user denies the prompt', async () => {
        requestPerms.mockResolvedValue(deny);

        await expect(requestNotificationPermission()).resolves.toBe(false);
    });

    it('returns false when the permission API throws', async () => {
        getPerms.mockRejectedValue(new Error('boom'));

        await expect(requestNotificationPermission()).resolves.toBe(false);
    });

    it('accepts an iOS-only authorized response', async () => {
        getPerms.mockResolvedValue({ ios: { status: 2 } });

        await expect(requestNotificationPermission()).resolves.toBe(true);
    });
});

describe('scheduleGoalReminder', () => {
    it('does nothing when the reminder is disabled or time is missing', async () => {
        await scheduleGoalReminder(goal({ reminder_enabled: false }));
        await scheduleGoalReminder(goal({ reminder_time: null as never }));

        expect(schedule).not.toHaveBeenCalled();
    });

    it('does nothing when the reminder time is malformed', async () => {
        await scheduleGoalReminder(goal({ reminder_time: 'besok pagi' }));

        expect(schedule).not.toHaveBeenCalled();
    });

    it('cancels the previous reminder, then schedules a daily one', async () => {
        getPerms.mockResolvedValue(grant);
        getAll.mockResolvedValue([
            { identifier: 'prev', content: { data: { goalId: 'g-1' } } },
        ]);

        await scheduleGoalReminder(goal());

        expect(cancel).toHaveBeenCalledWith('prev');
        expect(schedule).toHaveBeenCalledWith({
            content: {
                title: 'Waktunya menabung',
                body: 'Liburan Bali sudah 25% tercapai. Yuk lanjutkan progress hari ini.',
                data: { goalId: 'g-1' },
                sound: true,
            },
            trigger: { type: 'daily', hour: 8, minute: 30 },
        });
    });

    it('skips scheduling when permission is denied', async () => {
        requestPerms.mockResolvedValue(deny);

        await scheduleGoalReminder(goal());

        expect(schedule).not.toHaveBeenCalled();
    });

    it('reports 0% progress when the target amount is zero', async () => {
        getPerms.mockResolvedValue(grant);

        await scheduleGoalReminder(goal({ target_amount: 0, current_amount: 0 }));

        expect(schedule.mock.calls[0][0].content.body).toContain('sudah 0% tercapai');
    });

    it('swallows scheduling errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getPerms.mockResolvedValue(grant);
        schedule.mockRejectedValueOnce(new Error('no scheduler'));

        await expect(scheduleGoalReminder(goal())).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal menjadwalkan reminder goal:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('cancelGoalReminder', () => {
    it('cancels only notifications for the given goal', async () => {
        getAll.mockResolvedValue([
            { identifier: 'a', content: { data: { goalId: 'g-1' } } },
            { identifier: 'b', content: { data: { goalId: 'other' } } },
        ]);

        await cancelGoalReminder('g-1');

        expect(cancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledWith('a');
    });

    it('ignores scheduling API failures', async () => {
        getAll.mockRejectedValue(new Error('nothing scheduled'));

        await expect(cancelGoalReminder('g-1')).resolves.toBeUndefined();
    });
});

describe('rescheduleAllReminders', () => {
    it('clears old goal reminders and reschedules active ones', async () => {
        getPerms.mockResolvedValue(grant);
        getAll.mockResolvedValue([{ identifier: 'old', content: { data: { goalId: 'g-1' } } }]);

        await rescheduleAllReminders([
            goal(),
            goal({ id: 'g-2', is_completed: true }),
            goal({ id: 'g-3', reminder_enabled: false }),
        ]);

        expect(cancel).toHaveBeenCalledWith('old');
        expect(schedule).toHaveBeenCalledTimes(1);
    });

    it('reports failure without throwing', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getAll.mockRejectedValue(new Error('boom'));

        await expect(rescheduleAllReminders([])).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal me-reset reminder:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('sendGoalCompletedNotification', () => {
    it('schedules an immediate notification and persists it', async () => {
        getPerms.mockResolvedValue(grant);

        await sendGoalCompletedNotification(goal({ is_completed: true }));

        expect(schedule).toHaveBeenCalledWith(
            expect.objectContaining({ trigger: null }),
        );
        expect(insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                type: 'goal_completed',
                title: 'Target tercapai',
            }),
        );
    });

    it('still persists the record when permission is denied', async () => {
        requestPerms.mockResolvedValue(deny);

        await sendGoalCompletedNotification(goal({ is_completed: true }));

        expect(schedule).not.toHaveBeenCalled();
        expect(insert).toHaveBeenCalledTimes(1);
    });

    it('does not persist when there is no signed-in user', async () => {
        setAuthUser(null);

        await sendGoalCompletedNotification(goal());

        expect(insert).not.toHaveBeenCalled();
    });

    it('swallows scheduling errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getPerms.mockResolvedValue(grant);
        schedule.mockRejectedValueOnce(new Error('nope'));

        await expect(sendGoalCompletedNotification(goal())).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal menampilkan notifikasi target tercapai:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('sendBudgetWarningNotification', () => {
    it('uses the over-budget copy at or above 100%', async () => {
        getPerms.mockResolvedValue(grant);

        await sendBudgetWarningNotification('makan', 'Makan & Minum', 112.4);

        expect(schedule.mock.calls[0][0].content.title).toBe('Budget melebihi batas');
        expect(insert.mock.calls[0][0].type).toBe('budget_warning');
    });

    it('uses the almost-done copy below 100%', async () => {
        getPerms.mockResolvedValue(grant);

        await sendBudgetWarningNotification('makan', 'Makan & Minum', 85);

        expect(schedule.mock.calls[0][0].content.title).toBe('Budget hampir habis');
        expect(insert.mock.calls[0][0].title).toBe('Budget hampir habis');
    });

    it('swallows scheduling errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getPerms.mockResolvedValue(grant);
        schedule.mockRejectedValueOnce(new Error('nope'));

        await expect(sendBudgetWarningNotification('c', 'C', 50)).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal menampilkan notifikasi budget:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('sendWalletInviteNotification', () => {
    it('schedules and persists the invite', async () => {
        getPerms.mockResolvedValue(grant);

        await sendWalletInviteNotification('Dompet Kuliah', 'Andi');

        expect(schedule.mock.calls[0][0].content.body).toContain('Andi');
        expect(schedule.mock.calls[0][0].content.body).toContain('Dompet Kuliah');
        expect(insert.mock.calls[0][0].type).toBe('wallet_invite');
    });

    it('swallows scheduling errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getPerms.mockResolvedValue(grant);
        schedule.mockRejectedValueOnce(new Error('nope'));

        await expect(sendWalletInviteNotification('W', 'A')).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal menampilkan notifikasi undangan dompet:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('scheduleDebtReminder', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 5, 15, 12, 0, 0);

    const debtFixture = (over: Record<string, unknown> = {}) => ({
        id: 'd1',
        type: 'debt',
        counterparty: 'Rina',
        due_date: now + 5 * DAY,
        status: 'active',
        remaining_amount: 400000,
        ...over,
    });

    let spyDate: jest.SpyInstance<number, []> | undefined;

    beforeEach(() => {
        spyDate = jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
        spyDate?.mockRestore();
    });

    it('does nothing for settled debts or debts without a due date', async () => {
        await scheduleDebtReminder(debtFixture({ status: 'paid' }) as never);
        await scheduleDebtReminder(debtFixture({ status: 'cancelled' }) as never);
        await scheduleDebtReminder(debtFixture({ due_date: null }) as never);

        expect(schedule).not.toHaveBeenCalled();
        expect(cancel).not.toHaveBeenCalled();
    });

    it('schedules a single-day reminder at 09:00 the day before the due date', async () => {
        getPerms.mockResolvedValue(grant);
        getAll.mockResolvedValue([{ identifier: 'prev', content: { data: { debtId: 'd1' } } }]);

        await scheduleDebtReminder(debtFixture() as never);

        expect(cancel).toHaveBeenCalledWith('prev');
        expect(schedule).toHaveBeenCalledWith({
            content: {
                title: 'Jatuh tempo utang',
                body: expect.stringContaining('Rina'),
                data: { debtId: 'd1' },
                sound: true,
            },
            trigger: { type: 'date', date: now + 4 * DAY + 9 * 60 * 60 * 1000 },
        });
    });

    it('uses receivable wording for piutang', async () => {
        getPerms.mockResolvedValue(grant);

        await scheduleDebtReminder(debtFixture({ type: 'receivable' }) as never);

        expect(schedule.mock.calls[0][0].content.title).toBe('Jatuh tempo piutang');
        expect(schedule.mock.calls[0][0].content.body).toContain('Rina');
    });

    it('skips scheduling when permission is denied', async () => {
        requestPerms.mockResolvedValue(deny);

        await scheduleDebtReminder(debtFixture() as never);

        expect(schedule).not.toHaveBeenCalled();
    });

    it('skips scheduling when the reminder moment has already passed', async () => {
        getPerms.mockResolvedValue(grant);

        await scheduleDebtReminder(debtFixture({ due_date: now - 2 * DAY }) as never);

        expect(schedule).not.toHaveBeenCalled();
    });

    it('swallows scheduling errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        getPerms.mockResolvedValue(grant);
        schedule.mockRejectedValueOnce(new Error('nope'));

        await expect(scheduleDebtReminder(debtFixture() as never)).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            '[Notifikasi] Gagal menjadwalkan reminder jatuh tempo:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});

describe('cancelDebtReminder', () => {
    it('cancels only notifications for the given debt', async () => {
        getAll.mockResolvedValue([
            { identifier: 'a', content: { data: { debtId: 'd1' } } },
            { identifier: 'b', content: { data: { debtId: 'other' } } },
            { identifier: 'c', content: { data: { goalId: 'g1' } } },
        ]);

        await cancelDebtReminder('d1');

        expect(cancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledWith('a');
    });

    it('ignores scheduling API failures', async () => {
        getAll.mockRejectedValue(new Error('nothing scheduled'));

        await expect(cancelDebtReminder('d1')).resolves.toBeUndefined();
    });
});
