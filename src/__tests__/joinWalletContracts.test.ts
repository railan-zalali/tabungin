jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
}));

import { isActiveWalletMemberForEmail } from '../database/walletSharingService';

describe('join wallet contracts', () => {
    it('treats only active membership as already joined', () => {
        expect(
            isActiveWalletMemberForEmail(
                [
                    { user_email: 'member@example.com', status: 'pending' },
                    { user_email: 'member@example.com', status: 'rejected' },
                ],
                'member@example.com',
            ),
        ).toBe(false);

        expect(
            isActiveWalletMemberForEmail(
                [{ user_email: 'member@example.com', status: 'active' }],
                'member@example.com',
            ),
        ).toBe(true);
    });

    it('matches membership emails case-insensitively', () => {
        expect(
            isActiveWalletMemberForEmail(
                [{ user_email: 'Member@Example.com', status: 'active' }],
                'member@example.com',
            ),
        ).toBe(true);
    });
});
