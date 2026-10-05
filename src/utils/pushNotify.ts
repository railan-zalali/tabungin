// Helper pemanggilan Edge Function `send-push-notification` (P2-05 / PN-4).
//
// Semua pemanggilan dibungkus try/catch dan TIDAK PERNAH melempar: notifikasi
// adalah pelengkap — kegagalan mengirim push tidak boleh menggagalkan aksi
// utama seperti mengundang anggota dompet. Kegagalan tetap dicatat agar tidak
// hilang diam-diam (lihat audit P0-2: error yang ditelan `catch` menyembunyikan
// bahwa fitur push tidak pernah bekerja).

import { supabase } from '../lib/supabase';

export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    emails?: string[];
    userIds?: string[];
    tokens?: string[];
}

export interface PushResult {
    sent: number;
    failed?: number;
    removedDeadTokens?: number;
    reason?: string;
    error?: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<PushResult> {
    if (!payload.title || !payload.body) {
        return { sent: 0, error: 'title dan body wajib diisi' };
    }

    const hasTarget =
        (payload.emails?.length ?? 0) > 0 ||
        (payload.userIds?.length ?? 0) > 0 ||
        (payload.tokens?.length ?? 0) > 0;
    if (!hasTarget) {
        return { sent: 0, error: 'Tidak ada target notifikasi' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: payload,
        });

        if (error) {
            // invoke mengembalikan FunctionInvokeError (network, 4xx, 5xx).
            console.warn(`[push] invoke gagal: ${error.message ?? error}`);
            return { sent: 0, error: error.message ?? String(error) };
        }

        return (data as PushResult) ?? { sent: 0, error: 'Respons kosong' };
    } catch (error) {
        console.warn(`[push] exception: ${String(error)}`);
        return { sent: 0, error: String(error) };
    }
}

/** Beritahu pemilik undangan bahwa ia diundang ke dompet bersama. */
export async function notifyWalletInvite(walletId: string, inviteeEmail: string): Promise<PushResult> {
    return sendPushNotification({
        emails: [inviteeEmail],
        title: 'Undangan dompet bersama',
        body: 'Anda diundang untuk bergabung di Tabungin.',
        data: { type: 'wallet_invite', walletId },
    });
}
