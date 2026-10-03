import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ContentPanel } from '../../src/components/common/ContentPanel';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { FormSection } from '../../src/components/common/FormSection';
import { PrimaryActionBar } from '../../src/components/common/PrimaryActionBar';
import { Badge } from '../../src/components/common/Badge';
import { StatePanel } from '../../src/components/common/StatePanel';
import { ScreenShell } from '../../src/components/common/ScreenShell';
import { AppErrorBoundary, withScreenErrorBoundary } from '../../src/components/common/AppErrorBoundary';

describe('ContentPanel', () => {
    it('renders children', () => {
        const { getByText } = render(
            <ContentPanel>
                <Text>Isi panel</Text>
            </ContentPanel>,
        );
        expect(getByText('Isi panel')).toBeTruthy();
    });

    it('spreads view props (testID)', () => {
        const { getByTestId } = render(
            <ContentPanel compact testID="panel">
                <Text>x</Text>
            </ContentPanel>,
        );
        expect(getByTestId('panel')).toBeTruthy();
    });
});

describe('SectionHeader', () => {
    it('renders the title', () => {
        const { getByText } = render(<SectionHeader title="Ringkasan" />);
        expect(getByText('Ringkasan')).toBeTruthy();
    });

    it('renders subtitle when provided', () => {
        const { getByText } = render(
            <SectionHeader title="Ringkasan" subtitle="Bulan ini" />,
        );
        expect(getByText('Bulan ini')).toBeTruthy();
    });

    it('hides subtitle when absent', () => {
        const { queryByText } = render(<SectionHeader title="Ringkasan" />);
        expect(queryByText('Bulan ini')).toBeNull();
    });

    it('renders action and calls onAction', () => {
        const onAction = jest.fn();
        const { getByText } = render(
            <SectionHeader title="Ringkasan" actionLabel="Lihat semua" onAction={onAction} />,
        );
        fireEvent.press(getByText('Lihat semua'));
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not render action without onAction', () => {
        const { queryByText } = render(
            <SectionHeader title="Ringkasan" actionLabel="Lihat semua" />,
        );
        expect(queryByText('Lihat semua')).toBeNull();
    });
});

describe('FormSection', () => {
    it('renders title, subtitle and children', () => {
        const { getByText } = render(
            <FormSection title="Info Target" subtitle="Langkah 1">
                <Text>Isi form</Text>
            </FormSection>,
        );
        expect(getByText('Info Target')).toBeTruthy();
        expect(getByText('Langkah 1')).toBeTruthy();
        expect(getByText('Isi form')).toBeTruthy();
    });

    it('omits subtitle when not provided', () => {
        const { queryByText } = render(
            <FormSection title="Info Target">
                <Text>isi</Text>
            </FormSection>,
        );
        expect(queryByText('Langkah 1')).toBeNull();
    });
});

describe('PrimaryActionBar', () => {
    it('renders and fires the primary action', () => {
        const onPrimaryPress = jest.fn();
        const { getByText } = render(
            <PrimaryActionBar primaryLabel="Simpan" onPrimaryPress={onPrimaryPress} />,
        );
        fireEvent.press(getByText('Simpan'));
        expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    });

    it('renders secondary action when provided', () => {
        const onSecondaryPress = jest.fn();
        const { getByText } = render(
            <PrimaryActionBar
                primaryLabel="Simpan"
                onPrimaryPress={() => {}}
                secondaryLabel="Batal"
                onSecondaryPress={onSecondaryPress}
            />,
        );
        fireEvent.press(getByText('Batal'));
        expect(onSecondaryPress).toHaveBeenCalledTimes(1);
    });

    it('hides secondary action when label missing', () => {
        const { queryByText } = render(
            <PrimaryActionBar primaryLabel="Simpan" onPrimaryPress={() => {}} />,
        );
        expect(queryByText('Batal')).toBeNull();
    });
});

describe('Badge', () => {
    it('renders the label', () => {
        const { getByText } = render(<Badge label="Aktif" />);
        expect(getByText('Aktif')).toBeTruthy();
    });

    it('supports every variant without crashing', () => {
        const variants = ['success', 'danger', 'warning', 'info', 'primary', 'secondary', 'neutral'] as const;
        for (const variant of variants) {
            const { getByText, unmount } = render(<Badge label={variant} variant={variant} />);
            expect(getByText(variant)).toBeTruthy();
            unmount();
        }
    });

    it('exposes custom accessibility label', () => {
        const { getByLabelText } = render(
            <Badge label="Aktif" accessibilityLabel="Status tabungan aktif" />,
        );
        expect(getByLabelText('Status tabungan aktif')).toBeTruthy();
    });
});

describe('StatePanel', () => {
    it('renders title and description', () => {
        const { getByText } = render(
            <StatePanel title="Belum ada data" description="Tambah transaksi dulu" />,
        );
        expect(getByText('Belum ada data')).toBeTruthy();
        expect(getByText('Tambah transaksi dulu')).toBeTruthy();
    });

    it('supports all tones', () => {
        const tones = ['default', 'success', 'warning', 'danger'] as const;
        for (const tone of tones) {
            const { getByText, unmount } = render(<StatePanel title={tone} tone={tone} />);
            expect(getByText(tone)).toBeTruthy();
            unmount();
        }
    });

    it('fires action when pressed', () => {
        const onAction = jest.fn();
        const { getByText } = render(
            <StatePanel title="Kosong" actionLabel="Tambah" onAction={onAction} />,
        );
        fireEvent.press(getByText('Tambah'));
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('hides action when label missing', () => {
        const { queryByText } = render(<StatePanel title="Kosong" />);
        expect(queryByText('Tambah')).toBeNull();
    });

    it('renders without description', () => {
        const { getByText, queryByText } = render(<StatePanel title="Hanya judul" />);
        expect(getByText('Hanya judul')).toBeTruthy();
        expect(queryByText('deskripsi-tidak-ada')).toBeNull();
    });
});

describe('ScreenShell', () => {
    it('renders children', () => {
        const { getByText } = render(
            <ScreenShell>
                <Text>Konten layar</Text>
            </ScreenShell>,
        );
        expect(getByText('Konten layar')).toBeTruthy();
    });

    it('supports surface variants', () => {
        const variants = ['default', 'panel', 'alt'] as const;
        for (const surfaceVariant of variants) {
            const { getByText, unmount } = render(
                <ScreenShell surfaceVariant={surfaceVariant}>
                    <Text>{surfaceVariant}</Text>
                </ScreenShell>,
            );
            expect(getByText(surfaceVariant)).toBeTruthy();
            unmount();
        }
    });
});

// ─── Error Boundary ───────────────────────────────────────────────
import { Text } from 'react-native';

const Boom = (): React.ReactElement => {
    throw new Error('render crash');
};

describe('AppErrorBoundary', () => {
    // console.error dipakai componentDidCatch — suppress agar output test bersih
    let consoleError: jest.SpyInstance;
    beforeEach(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => consoleError.mockRestore());

    it('renders children when there is no error', () => {
        const { getByText } = render(
            <AppErrorBoundary>
                <Text>Sehat</Text>
            </AppErrorBoundary>,
        );
        expect(getByText('Sehat')).toBeTruthy();
    });

    it('renders default fallback when a child throws', () => {
        const { getByText } = render(
            <AppErrorBoundary>
                <Boom />
            </AppErrorBoundary>,
        );
        expect(getByText('Terjadi Kesalahan')).toBeTruthy();
        expect(getByText('Muat Ulang')).toBeTruthy();
    });

    it('renders custom fallback title when provided', () => {
        const { getByText } = render(
            <AppErrorBoundary fallbackTitle="Layar bermasalah">
                <Boom />
            </AppErrorBoundary>,
        );
        expect(getByText('Layar bermasalah')).toBeTruthy();
    });

    it('recovers after pressing reload', () => {
        const { getByText, rerender } = render(
            <AppErrorBoundary>
                <Boom />
            </AppErrorBoundary>,
        );
        expect(getByText('Terjadi Kesalahan')).toBeTruthy();

        // Ganti children ke yang sehat lebih dulu, baru tekan Muat Ulang.
        // (Urutan sebaliknya membuat boundary langsung throw lagi saat reset.)
        rerender(
            <AppErrorBoundary>
                <Text>Pulih</Text>
            </AppErrorBoundary>,
        );
        fireEvent.press(getByText('Muat Ulang'));
        expect(getByText('Pulih')).toBeTruthy();
    });
});

describe('withScreenErrorBoundary', () => {
    let consoleError: jest.SpyInstance;
    beforeEach(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => consoleError.mockRestore());

    it('wraps a screen component and keeps it rendering', () => {
        const Screen = () => <Text>Layar utama</Text>;
        const Wrapped = withScreenErrorBoundary(Screen);
        const { getByText } = render(<Wrapped />);
        expect(getByText('Layar utama')).toBeTruthy();
    });

    it('isolates a crashing screen behind the fallback', () => {
        const Wrapped = withScreenErrorBoundary(Boom, 'Layar ini rusak');
        const { getByText } = render(<Wrapped />);
        expect(getByText('Layar ini rusak')).toBeTruthy();
    });

    it('sets a readable display name', () => {
        function MyScreen() {
            return <Text>x</Text>;
        }
        expect(withScreenErrorBoundary(MyScreen).displayName).toBe('withErrorBoundary(MyScreen)');
    });
});
