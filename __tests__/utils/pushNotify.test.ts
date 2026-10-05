import { sendPushNotification, notifyWalletInvite } from '../../src/utils/pushNotify';

const mockInvoke = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
    supabase: {
        functions: {
            invoke: (...args: unknown[]) => mockInvoke(...args),
        },
    },
}));

const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
    mockInvoke.mockReset();
    consoleWarn.mockClear();
});

afterAll(() => {
    consoleWarn.mockRestore();
});

describe('sendPushNotification', () => {
    it('menolak payload tanpa judul tanpa melempar exception', async () => {
        const result = await sendPushNotification({ title: '', body: 'isi' });

        expect(result.sent).toBe(0);
        expect(result.error).toMatch(/title/);
        expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('menolak payload tanpa target', async () => {
        const result = await sendPushNotification({ title: 'Judul', body: 'Isi' });

        expect(result.sent).toBe(0);
        expect(result.error).toMatch(/target/i);
        expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('meneruskan payload ke Edge Function dan mengembalikan hasilnya', async () => {
        mockInvoke.mockResolvedValue({ data: { sent: 2, failed: 0 }, error: null });

        const payload = {
            title: 'Undangan',
            body: 'Anda diundang',
            emails: ['a@b.com'],
            data: { type: 'wallet_invite', walletId: 'w1' },
        };

        const result = await sendPushNotification(payload);

        expect(result).toEqual({ sent: 2, failed: 0 });
        expect(mockInvoke).toHaveBeenCalledWith('send-push-notification', { body: payload });
    });

    it('mengubah error invoke menjadi hasil (bukan exception)', async () => {
        mockInvoke.mockResolvedValue({
            data: null,
            error: { message: 'Function not found' },
        });

        const result = await sendPushNotification({
            title: 'Judul',
            body: 'Isi',
            tokens: ['ExponentPushToken[x]'],
        });

        expect(result.sent).toBe(0);
        expect(result.error).toBe('Function not found');
        expect(consoleWarn).toHaveBeenCalled();
    });

    it('menangkap exception yang dilempar supabase client', async () => {
        mockInvoke.mockRejectedValue(new Error('jaringan putus'));

        const result = await sendPushNotification({
            title: 'Judul',
            body: 'Isi',
            userIds: ['u1'],
        });

        expect(result.sent).toBe(0);
        expect(result.error).toContain('jaringan putus');
    });

    it('mengembalikan error bila data respons kosong', async () => {
        mockInvoke.mockResolvedValue({ data: null, error: null });

        const result = await sendPushNotification({
            title: 'Judul',
            body: 'Isi',
            tokens: ['t'],
        });

        expect(result.sent).toBe(0);
        expect(result.error).toMatch(/kosong/i);
    });
});

describe('notifyWalletInvite', () => {
    it('mengirim ke email undangan dengan tipe data wallet_invite', async () => {
        mockInvoke.mockResolvedValue({ data: { sent: 1 }, error: null });

        const result = await notifyWalletInvite('wallet-123', 'tamatan@contoh.com');

        expect(result.sent).toBe(1);
        expect(mockInvoke).toHaveBeenCalledWith('send-push-notification', {
            body: expect.objectContaining({
                emails: ['tamatan@contoh.com'],
                data: { type: 'wallet_invite', walletId: 'wallet-123' },
            }),
        });
    });

    it('gagal dengan lembut bila Edge Function error — undangan tidak terpengaruh', async () => {
        mockInvoke.mockResolvedValue({ data: null, error: { message: '500' } });

        const result = await notifyWalletInvite('wallet-123', 'tamatan@contoh.com');

        expect(result.sent).toBe(0);
        expect(result.error).toBe('500');
    });
});
