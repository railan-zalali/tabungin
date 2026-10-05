// Test render InsightDetailScreen (IN-1) — memastikan seluruh insight tampil
// beserta penjelasnya, ada keadaan kosong/muat, dan navigasi keluar bekerja.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { InsightDetailScreen } from '../../src/screens/insight/InsightDetailScreen';
import { useInsights } from '../../src/hooks/useInsights';
import { useNavigation } from '@react-navigation/native';
import type { Insight } from '../../src/utils/insightEngine';

jest.mock('@react-navigation/native', () => ({
    useNavigation: jest.fn(),
}));

jest.mock('../../src/hooks/useInsights', () => ({
    INSIGHT_WINDOW_MONTHS: 6,
    useInsights: jest.fn(),
}));

const useInsightsMock = useInsights as jest.Mock;
const useNavigationMock = useNavigation as jest.Mock;

const insight = (over: Partial<Insight> = {}): Insight =>
    ({
        id: 'savings-rate',
        icon: 'piggy-bank-outline',
        tone: 'success',
        title: 'Menabung 25% dari pemasukan',
        description: 'Di atas target ideal 20%.',
        ...over,
    }) as Insight;

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => {
    jest.clearAllMocks();
    useNavigationMock.mockReturnValue(navigation);
    useInsightsMock.mockReturnValue({ insights: [insight()], isLoading: false, refresh: jest.fn() });
});

describe('InsightDetailScreen', () => {
    it('menampilkan setiap insight beserta arti dan langkahnya', () => {
        useInsightsMock.mockReturnValue({
            insights: [
                insight(),
                insight({
                    id: 'forecast',
                    icon: 'chart-line',
                    tone: 'info',
                    title: 'Perkiraan pengeluaran bulan depan',
                    description: 'Berdasarkan rata-rata 6 bulan.',
                }),
            ],
            isLoading: false,
            refresh: jest.fn(),
        });

        const { getByText, getAllByText } = render(<InsightDetailScreen />);

        expect(getByText('Menabung 25% dari pemasukan')).toBeTruthy();
        expect(getByText('Perkiraan pengeluaran bulan depan')).toBeTruthy();
        expect(getByText('2 insight terbaca')).toBeTruthy();
        // Dua blok penjelasan per insight.
        expect(getAllByText('Apa artinya')).toHaveLength(2);
        expect(getAllByText('Yang bisa dilakukan')).toHaveLength(2);
    });

    it('menampilkan keadaan kosong saat belum ada insight', () => {
        useInsightsMock.mockReturnValue({ insights: [], isLoading: false, refresh: jest.fn() });

        const { getByText } = render(<InsightDetailScreen />);

        expect(getByText('Belum ada insight')).toBeTruthy();
        expect(getByText('0 insight terbaca')).toBeTruthy();
    });

    it('menampilkan skeleton saat data masih dimuat', () => {
        useInsightsMock.mockReturnValue({ insights: [], isLoading: true, refresh: jest.fn() });

        const { queryByText } = render(<InsightDetailScreen />);

        expect(queryByText('Belum ada insight')).toBeNull();
    });

    it('tombol Buka laporan membawa ke tab Report', () => {
        const { getByText } = render(<InsightDetailScreen />);

        fireEvent.press(getByText('Buka laporan'));

        expect(navigation.navigate).toHaveBeenCalledWith('Main', { screen: 'Report' });
    });

    it('tombol kembali memanggil goBack', () => {
        const { getByLabelText } = render(<InsightDetailScreen />);

        fireEvent.press(getByLabelText('Kembali'));

        expect(navigation.goBack).toHaveBeenCalled();
    });
});
