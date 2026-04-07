export type AuthCallbackParams = {
    accessToken: string | null;
    refreshToken: string | null;
    type: string | null;
    errorDescription: string | null;
};

export function extractAuthCallbackParams(url: string | null): AuthCallbackParams {
    if (!url) {
        return {
            accessToken: null,
            refreshToken: null,
            type: null,
            errorDescription: null,
        };
    }

    const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    const fragment = url.includes('#') ? url.split('#')[1] : '';
    const params = new URLSearchParams([query, fragment].filter(Boolean).join('&'));

    return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        type: params.get('type'),
        errorDescription: params.get('error_description'),
    };
}
