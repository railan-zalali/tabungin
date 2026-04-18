jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
}));

import { extractAuthCallbackParams } from '../utils/authCallback';

describe('auth recovery contracts', () => {
    it('parses recovery tokens from url fragments', () => {
        const params = extractAuthCallbackParams(
            'tabungin://reset-password#access_token=token-1&refresh_token=token-2&type=recovery',
        );

        expect(params.accessToken).toBe('token-1');
        expect(params.refreshToken).toBe('token-2');
        expect(params.type).toBe('recovery');
    });

    it('parses fallback query params and error payloads', () => {
        const params = extractAuthCallbackParams(
            'tabungin://reset-password?error_description=Link%20expired&type=recovery',
        );

        expect(params.errorDescription).toBe('Link expired');
        expect(params.type).toBe('recovery');
        expect(params.accessToken).toBeNull();
    });
});
