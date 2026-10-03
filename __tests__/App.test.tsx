// Smoke test App: tidak crash saat boot, menampilkan layar muat, lalu
// masuk ke navigator; dan punya jalur retry bila init database gagal.
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../App';
import { initDatabase } from '../src/database/schema';

jest.mock('../src/database/schema', () => ({
    initDatabase: jest.fn().mockResolvedValue(undefined),
}));

const mockInitDatabase = initDatabase as jest.Mock;

describe('App', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInitDatabase.mockResolvedValue(undefined);
    });

    it('renders the splash while the database initializes', async () => {
        const { getByLabelText, getByText } = render(<App />);

        expect(getByLabelText('Memuat aplikasi Tabungin')).toBeTruthy();
        expect(getByLabelText('Sedang memuat')).toBeTruthy();
        expect(getByText('Tabungin')).toBeTruthy();
        expect(getByText('Catat, Kelola, Wujudkan')).toBeTruthy();

        // Flushe promise initDatabase di dalam act agar tidak ada update liar.
        await act(async () => {});
    });

    it('leaves the splash once the database is ready', async () => {
        const { findByText, queryByLabelText, queryByText } = render(<App />);

        await waitFor(() => expect(mockInitDatabase).toHaveBeenCalledTimes(1));

        // Splash hilang dan navigator root sudah mengambil alih (layar onboarding).
        await waitFor(() => expect(queryByLabelText('Memuat aplikasi Tabungin')).toBeNull());
        expect(queryByText(/Gagal memuat database/)).toBeNull();
        expect(await findByText('Mission Control Keuangan Harian')).toBeTruthy();
    });

    it('shows a retry action when the database fails to initialize', async () => {
        mockInitDatabase.mockRejectedValueOnce(new Error('disk full'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { getByText, getByLabelText, queryByLabelText, queryByText } = render(<App />);

        await waitFor(() => expect(getByText('Gagal memuat database. Coba lagi untuk melanjutkan.')).toBeTruthy());
        expect(queryByText('Mission Control Keuangan Harian')).toBeNull();

        mockInitDatabase.mockClear();
        mockInitDatabase.mockResolvedValue(undefined);

        fireEvent.press(getByLabelText('Coba lagi memuat database'));

        await waitFor(() => expect(mockInitDatabase).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(queryByText('Gagal memuat database. Coba lagi untuk melanjutkan.')).toBeNull());
        await act(async () => {});

        errorSpy.mockRestore();
    });
});
