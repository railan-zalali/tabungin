// send-push-notification — Edge Function pengirim notifikasi push (P2-05 / PN-2)
//
// Dipanggil dari klien (authenticated, memakai JWT user) atau dari sistem
// server lain. Menerima minimal satu target, meresolve ke token Expo Push,
// lalu meneruskan ke Expo Push API.
//
// Deploy:
//   npx supabase functions deploy send-push-notification --verify-jwt
//
// Body:
//   {
//     "title": "Undangan dompet bersama",
//     "body" : "Anda diundang untuk bergabung",
//     "data" : { "type": "wallet_invite", "walletId": "..." },
//     "emails" : ["a@b.com"],     // salah satu dari emails / userIds / tokens
//     "userIds": ["<uuid>"],
//     "tokens" : ["ExponentPushToken[xxx]"]
//   }

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Batas pesan per request (batas resmi Expo Push API).
const EXPO_BATCH_SIZE = 100;

type SendRequest = {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    emails?: string[];
    userIds?: string[];
    tokens?: string[];
};

type ExpoTicket =
    | { status: 'ok'; id: string }
    | { status: 'error'; message: string; details?: { error?: string }; id?: string };

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            // Memudahkan pengujian dari browser; klien React Native tidak
            // membutuhkannya.
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
    });
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });
    if (req.method !== 'POST') return jsonResponse({ error: 'Method tidak diizinkan' }, 405);

    let payload: SendRequest;
    try {
        payload = await req.json();
    } catch {
        return jsonResponse({ error: 'Body bukan JSON yang valid' }, 400);
    }

    if (!payload?.title || !payload?.body) {
        return jsonResponse({ error: 'title dan body wajib diisi' }, 400);
    }

    const wantsTarget =
        (payload.emails?.length ?? 0) > 0 ||
        (payload.userIds?.length ?? 0) > 0 ||
        (payload.tokens?.length ?? 0) > 0;
    if (!wantsTarget) {
        return jsonResponse({ error: 'Minimal satu target: emails / userIds / tokens' }, 400);
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const tokens = new Set<string>();

    // 1. email -> token (via RPC SECURITY DEFINER; lihat migrasi PN-1)
    if (payload.emails?.length) {
        const { data, error } = await supabase.rpc('devices_for_emails', {
            p_emails: payload.emails,
        });
        if (error) {
            console.error('[push] devices_for_emails gagal:', error.message);
            return jsonResponse({ error: `Resolve email gagal: ${error.message}` }, 500);
        }
        for (const row of (data ?? []) as { push_token: string }[]) {
            if (row.push_token) tokens.add(row.push_token);
        }
    }

    // 2. user_id -> token (langsung ke tabel; RLS dilewati karena service_role)
    if (payload.userIds?.length) {
        const { data, error } = await supabase
            .from('user_devices')
            .select('push_token')
            .in('user_id', payload.userIds);
        if (error) {
            console.error('[push] query user_devices gagal:', error.message);
            return jsonResponse({ error: `Resolve user gagal: ${error.message}` }, 500);
        }
        for (const row of (data ?? []) as { push_token: string }[]) {
            if (row.push_token) tokens.add(row.push_token);
        }
    }

    // 3. token eksplisit
    for (const token of payload.tokens ?? []) {
        if (token) tokens.add(token);
    }

    if (tokens.size === 0) {
        // Bukan error: undangan ke email yang belum pernah membuka aplikasi
        // memang tidak punya token.
        return jsonResponse({ sent: 0, reason: 'Tidak ada device yang menerima token' });
    }

    const message = {
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default' as const,
    };
    // Dipisah per batch sejak awal sehingga indeks tiket Expo bisa dipetakan
    // balik ke token aslinya tanpa menghitung ulang.
    const tokenList = [...tokens];
    const messageBatches = chunk(tokenList, EXPO_BATCH_SIZE).map((batch) =>
        batch.map((to) => ({ to, ...message })),
    );

    const tickets: ExpoTicket[] = [];
    let transportError: string | null = null;

    for (const batch of messageBatches) {
        try {
            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
            });
            const json = (await res.json()) as { data?: ExpoTicket[] | ExpoTicket };
            if (!res.ok) {
                transportError = `Expo menolak (${res.status}): ${JSON.stringify(json).slice(0, 300)}`;
                break;
            }
            const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
            tickets.push(...list);
        } catch (err) {
            transportError = `Gagal menghubungi Expo Push API: ${String(err)}`;
            break;
        }
    }

    // 4. Buang token yang sudah mati agar tabel tidak tumbuh sampah dan
    //    permintaan berikutnya tidak membuang kuota.
    const deadTokens: string[] = [];
    for (const [index, ticket] of tickets.entries()) {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const token = messageBatches[Math.floor(index / EXPO_BATCH_SIZE)]?.[
                index % EXPO_BATCH_SIZE
            ]?.to;
            if (token) deadTokens.push(token);
        }
    }

    let removed = 0;
    if (deadTokens.length > 0) {
        const { error } = await supabase
            .from('user_devices')
            .delete()
            .in('push_token', deadTokens);
        if (error) console.error('[push] gagal membuang token mati:', error.message);
        else removed = deadTokens.length;
    }

    const failed = tickets.filter((t) => t.status === 'error').length;
    const sent = tickets.filter((t) => t.status === 'ok').length;

    return jsonResponse({
        sent,
        failed,
        removedDeadTokens: removed,
        ...(transportError ? { transportError } : {}),
    });
});
