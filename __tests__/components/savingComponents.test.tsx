// Test komponen presentasi hasil ekstraksi AddSavingGoalScreen /
// SavingDetailScreen — memastikan perilaku render, callback, dan
// state aksesibilitas tetap benar setelah refactor.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { GoalPreviewCard } from '../../src/components/saving/GoalPreviewCard';
import { WalletSelector } from '../../src/components/saving/WalletSelector';
import { GoalAmountSection } from '../../src/components/saving/GoalAmountSection';
import { GoalBasicInfoSection } from '../../src/components/saving/GoalBasicInfoSection';
import { GoalVisualSection } from '../../src/components/saving/GoalVisualSection';
import { GoalStatsGrid } from '../../src/components/saving/GoalStatsGrid';
import { SavingGoalHero } from '../../src/components/saving/SavingGoalHero';
import { SharingAccessSection } from '../../src/components/saving/SharingAccessSection';
import { AddSavingModal } from '../../src/components/saving/AddSavingModal';

import type { Wallet } from '../../src/database/walletQueries';
import type {
    GoalSharingActivity,
    GoalSharingMember,
    SavingGoal,
    SavingGoalComputedMeta,
} from '../../src/types/saving';

const wallet = (over: Partial<Wallet> = {}): Wallet =>
    ({
        id: 'w1',
        profile_id: 'p1',
        name: 'Dompet Utama',
        type: 'cash',
        color: '#0EAD69',
        balance: 100000,
        is_default: true,
        created_at: 1,
        ...over,
    }) as Wallet;

const meta: SavingGoalComputedMeta = {
    scope: 'personal',
    scopeLabel: 'Pribadi',
    scopeDescription: 'Target milikmu sendiri',
    isSharedGoal: false,
    isSharedWalletGoal: false,
    isSharedDirectGoal: false,
};

const goal = (over: Partial<SavingGoal> = {}): SavingGoal =>
    ({
        id: 'g1',
        name: 'Liburan Bali',
        target_amount: 5000000,
        current_amount: 2500000,
        emoji: '🌴',
        photo_uri: null,
        saving_per_period: 500000,
        period_type: 'monthly',
        color: '#0EAD69',
        start_date: 1,
        estimated_date: 2,
        is_completed: false,
        reminder_enabled: false,
        reminder_time: null,
        created_at: 1,
        ...over,
    }) as SavingGoal;

describe('GoalPreviewCard', () => {
    const base = {
        color: '#0EAD69',
        emoji: '🌴',
        name: 'Liburan Bali',
        targetLabel: 'Rp 5.000.000',
        estimatedLabel: '12 Okt 2026',
        isSharedWallet: false,
        isSharedGoal: false,
        scopeLabel: 'Pribadi',
        scopeDescription: 'Target milikmu sendiri',
    };

    it('shows name, target and estimate', () => {
        const { getByText } = render(<GoalPreviewCard {...base} />);

        expect(getByText('Liburan Bali')).toBeTruthy();
        expect(getByText('Rp 5.000.000')).toBeTruthy();
        expect(getByText('12 Okt 2026')).toBeTruthy();
        expect(getByText('Pribadi')).toBeTruthy();
    });

    it('falls back to a placeholder when the name is blank', () => {
        const { getByText } = render(<GoalPreviewCard {...base} name="   " />);
        expect(getByText('Nama targetmu')).toBeTruthy();
    });

    it('shows the wallet badge and shared-wallet icon when provided', () => {
        const { getByText } = render(
            <GoalPreviewCard {...base} wallet={wallet()} isSharedWallet isSharedGoal />,
        );

        expect(getByText('Dompet Utama')).toBeTruthy();
        expect(getByText('Pribadi')).toBeTruthy();
    });

    it('omits the wallet badge when no wallet is selected', () => {
        const { queryByText } = render(<GoalPreviewCard {...base} wallet={null} />);
        expect(queryByText('Dompet Utama')).toBeNull();
    });
});

describe('WalletSelector', () => {
    const base = {
        wallets: [wallet(), wallet({ id: 'w2', name: 'Tabungan', profile_id: 'p2' })],
        activeProfileId: 'p1',
        selectedWalletId: 'w1',
    };

    it('renders every wallet as a selectable chip', () => {
        const { getByText, getByLabelText } = render(<WalletSelector {...base} onSelect={jest.fn()} />);

        expect(getByText('Dompet Utama')).toBeTruthy();
        expect(getByText('Tabungan')).toBeTruthy();
        expect(getByLabelText('Pilih dompet Dompet Utama')).toBeTruthy();
    });

    it('marks the selected chip', () => {
        const { getByLabelText } = render(<WalletSelector {...base} onSelect={jest.fn()} />);
        expect(getByLabelText('Pilih dompet Dompet Utama').props.accessibilityState).toEqual({
            selected: true,
        });
        expect(getByLabelText('Pilih dompet Tabungan').props.accessibilityState).toEqual({
            selected: false,
        });
    });

    it('calls onSelect with the wallet id', () => {
        const onSelect = jest.fn();
        const { getByLabelText } = render(<WalletSelector {...base} onSelect={onSelect} />);

        fireEvent.press(getByLabelText('Pilih dompet Tabungan'));

        expect(onSelect).toHaveBeenCalledWith('w2');
    });

    it('explains personal vs shared context for the selection', () => {
        const { getByText } = render(<WalletSelector {...base} onSelect={jest.fn()} />);
        expect(getByText(/Target ini akan tetap berada di ruang personal aktif/)).toBeTruthy();
    });

    it('explains shared-wallet implications when the wallet belongs to another profile', () => {
        const { getByText } = render(
            <WalletSelector {...base} selectedWalletId="w2" onSelect={jest.fn()} />,
        );
        expect(getByText(/konteks dan progresnya akan terlihat sebagai goal bersama/)).toBeTruthy();
    });

    it('shows the validation error when provided', () => {
        const { getByText } = render(
            <WalletSelector {...base} onSelect={jest.fn()} errorMessage="Pilih dompet dulu" />,
        );
        expect(getByText('Pilih dompet dulu')).toBeTruthy();
    });
});

describe('GoalAmountSection', () => {
    const base = {
        targetInput: '5.000.000',
        currentInput: '1.000.000',
        savingInput: '500.000',
        periodType: 'monthly' as const,
        errors: {},
    };

    it('renders the current values', () => {
        const { getByDisplayValue } = render(<GoalAmountSection {...base} onTargetChange={jest.fn()} onCurrentChange={jest.fn()} onSavingChange={jest.fn()} onPeriodChange={jest.fn()} />);

        expect(getByDisplayValue('5.000.000')).toBeTruthy();
        expect(getByDisplayValue('1.000.000')).toBeTruthy();
        expect(getByDisplayValue('500.000')).toBeTruthy();
    });

    it('reports input changes', () => {
        const onTargetChange = jest.fn();
        const onSavingChange = jest.fn();
        const onCurrentChange = jest.fn();
        const { getByLabelText } = render(
            <GoalAmountSection
                {...base}
                onTargetChange={onTargetChange}
                onCurrentChange={onCurrentChange}
                onSavingChange={onSavingChange}
                onPeriodChange={jest.fn()}
            />,
        );

        fireEvent.changeText(getByLabelText('Harga target'), '6000000');
        fireEvent.changeText(getByLabelText('Modal awal'), '2000000');
        fireEvent.changeText(getByLabelText('Rencana menabung'), '600000');

        expect(onTargetChange).toHaveBeenCalledWith('6000000');
        expect(onCurrentChange).toHaveBeenCalledWith('2000000');
        expect(onSavingChange).toHaveBeenCalledWith('600000');
    });

    it('switches the saving period', () => {
        const onPeriodChange = jest.fn();
        const { getByText } = render(
            <GoalAmountSection
                {...base}
                onTargetChange={jest.fn()}
                onCurrentChange={jest.fn()}
                onSavingChange={jest.fn()}
                onPeriodChange={onPeriodChange}
            />,
        );

        fireEvent.press(getByText('/Minggu'));

        expect(onPeriodChange).toHaveBeenCalledWith('weekly');
    });

    it('surfaces field errors', () => {
        const { getByText } = render(
            <GoalAmountSection
                {...base}
                errors={{ target: 'Target wajib diisi', saving: 'Tidak boleh kosong' }}
                onTargetChange={jest.fn()}
                onCurrentChange={jest.fn()}
                onSavingChange={jest.fn()}
                onPeriodChange={jest.fn()}
            />,
        );

        expect(getByText('Target wajib diisi')).toBeTruthy();
        expect(getByText('Tidak boleh kosong')).toBeTruthy();
    });
});

describe('GoalVisualSection', () => {
    const base = {
        color: '#0EAD69',
        estimatedLabel: null as string | null,
        reminderEnabled: false,
    };

    it('reports color choices', () => {
        const onColorChange = jest.fn();
        const { getByLabelText } = render(
            <GoalVisualSection {...base} onColorChange={onColorChange} onReminderChange={jest.fn()} />,
        );

        fireEvent.press(getByLabelText('Pilih warna #F5A623'));

        expect(onColorChange).toHaveBeenCalledWith('#F5A623');
    });

    it('toggles the saving reminder', () => {
        const onReminderChange = jest.fn();
        const { getByRole } = render(
            <GoalVisualSection {...base} onColorChange={jest.fn()} onReminderChange={onReminderChange} />,
        );

        fireEvent(getByRole('switch'), 'valueChange', true);

        expect(onReminderChange).toHaveBeenCalledWith(true);
    });

    it('hides the estimate block when there is no simulation yet', () => {
        const { queryByText } = render(
            <GoalVisualSection {...base} onColorChange={jest.fn()} onReminderChange={jest.fn()} />,
        );
        expect(queryByText('Estimasi tercapai')).toBeNull();
    });

    it('shows the estimated date when the simulation exists', () => {
        const { getByText } = render(
            <GoalVisualSection
                {...base}
                estimatedLabel="12 Okt 2026"
                onColorChange={jest.fn()}
                onReminderChange={jest.fn()}
            />,
        );
        expect(getByText('Estimasi tercapai')).toBeTruthy();
        expect(getByText('12 Okt 2026')).toBeTruthy();
    });
});

describe('GoalStatsGrid', () => {
    const items = [
        { label: 'Target', value: 'Rp 5.000.000', icon: 'flag-variant' },
        { label: 'Terkumpul', value: 'Rp 2.500.000', icon: 'piggy-bank' },
        { label: 'Sisa', value: 'Rp 1.500.000', icon: 'timer-sand' },
        { label: 'Nabung/Periode', value: 'Rp 500.000/monthly', icon: 'calendar-refresh' },
    ];

    it('renders every stat plus the ownership summary', () => {
        const { getByText } = render(
            <GoalStatsGrid
                items={items}
                accentColor="#0EAD69"
                scopeLabel="Bersama"
                walletLabel="Dompet Utama"
            />,
        );

        expect(getByText('Target')).toBeTruthy();
        expect(getByText('Rp 2.500.000')).toBeTruthy();
        expect(getByText('Konteks Ownership')).toBeTruthy();
        expect(getByText('Bersama')).toBeTruthy();
        expect(getByText('Dompet Utama')).toBeTruthy();
    });

    it('falls back to a placeholder wallet label', () => {
        const { getByText } = render(
            <GoalStatsGrid items={items} accentColor="#0EAD69" scopeLabel="Pribadi" walletLabel="Tanpa dompet khusus" />,
        );
        expect(getByText('Tanpa dompet khusus')).toBeTruthy();
    });
});

describe('SavingGoalHero', () => {
    const base = { goal: goal(), progress: 50, isCompleted: false, wallet: wallet(), meta, memberCount: 0 };

    it('renders the goal name and progress percentage', () => {
        const { getByText } = render(<SavingGoalHero {...base} />);
        expect(getByText('Liburan Bali')).toBeTruthy();
        expect(getByText('50.0%')).toBeTruthy();
        expect(getByText('Pribadi')).toBeTruthy();
    });

    it('shows the wallet and member badges', () => {
        const { getByText } = render(<SavingGoalHero {...base} memberCount={3} />);
        expect(getByText('Dompet Utama')).toBeTruthy();
        expect(getByText('3 member')).toBeTruthy();
    });

    it('shows the completed banner only when finished', () => {
        const { queryByText, rerender } = render(<SavingGoalHero {...base} />);
        expect(queryByText('Sudah tercapai!')).toBeNull();

        rerender(<SavingGoalHero {...base} isCompleted progress={100} />);
        expect(queryByText('Sudah tercapai!')).toBeTruthy();
    });
});

describe('SharingAccessSection', () => {
    const member: GoalSharingMember = {
        user_email: 'andi@contoh.id',
        shared_by: 'budi',
        shared_at: Date.UTC(2026, 0, 5),
        permission_level: 'admin',
    };

    const activity: GoalSharingActivity = {
        id: 'a1',
        goal_id: 'g1',
        wallet_id: 'w1',
        user_email: 'andi@contoh.id',
        action: 'shared',
        performed_by: 'budi',
        metadata: null,
        timestamp: Date.UTC(2026, 0, 5),
        created_at: Date.UTC(2026, 0, 5),
        updated_at: Date.UTC(2026, 0, 5),
    };

    it('lists members with their permission level', () => {
        const { getByText } = render(<SharingAccessSection members={[member]} activity={[]} />);
        expect(getByText('andi@contoh.id')).toBeTruthy();
        expect(getByText(/Admin/)).toBeTruthy();
        expect(getByText('Timeline Aktivitas')).toBeTruthy();
    });

    it('lists the activity timeline', () => {
        const { getByText } = render(<SharingAccessSection members={[member]} activity={[activity]} />);
        expect(getByText('Target dibagikan')).toBeTruthy();
        expect(getByText(/membagikan target ini/)).toBeTruthy();
    });

    it('falls back to an empty state for members and activity', () => {
        const { getByText } = render(<SharingAccessSection members={[]} activity={[]} />);
        expect(getByText(/Belum ada anggota tambahan/)).toBeTruthy();
        expect(getByText(/Belum ada log aktivitas sharing/)).toBeTruthy();
    });
});

describe('AddSavingModal', () => {
    const base = {
        visible: true,
        goalEmoji: '🌴',
        goalName: 'Liburan Bali',
        accentColor: '#0EAD69',
        amount: '500.000',
        note: 'Bonus',
        isSubmitting: false,
    };

    it('renders the goal context', () => {
        const { getByText } = render(
            <AddSavingModal
                {...base}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(getByText('🌴 Liburan Bali')).toBeTruthy();
    });

    it('reports amount and note changes', () => {
        const onAmountChange = jest.fn();
        const onNoteChange = jest.fn();
        const { getByLabelText } = render(
            <AddSavingModal
                {...base}
                onAmountChange={onAmountChange}
                onNoteChange={onNoteChange}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );

        fireEvent.changeText(getByLabelText('Nominal tabungan'), '750000');
        fireEvent.changeText(getByLabelText('Catatan tabungan'), 'Lebaran');

        expect(onAmountChange).toHaveBeenCalledWith('750000');
        expect(onNoteChange).toHaveBeenCalledWith('Lebaran');
    });

    it('submits and closes', () => {
        const onSubmit = jest.fn();
        const onClose = jest.fn();
        const { getByText, getByLabelText } = render(
            <AddSavingModal
                {...base}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={onClose}
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByText('Simpan Tabungan'));
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.press(getByLabelText('Tutup'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders nothing when hidden', () => {
        const { queryByText } = render(
            <AddSavingModal
                {...base}
                visible={false}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(queryByText('Simpan Tabungan')).toBeNull();
    });
});

describe('GoalBasicInfoSection', () => {
    const base = {
        name: 'MacBook Air M3',
        emoji: '💻',
        accentColor: '#0EAD69',
    };

    it('menampilkan nama saat ini dan tombol ikon terpilih', () => {
        const { getByDisplayValue, getByLabelText } = render(
            <GoalBasicInfoSection
                {...base}
                onNameChange={jest.fn()}
                onEmojiChange={jest.fn()}
            />,
        );

        expect(getByDisplayValue('MacBook Air M3')).toBeTruthy();
        expect(getByLabelText('Pilih ikon 💻').props.accessibilityState).toEqual({ selected: true });
    });

    it('melaporkan perubahan nama dan pilihan ikon', () => {
        const onNameChange = jest.fn();
        const onEmojiChange = jest.fn();
        const { getByLabelText } = render(
            <GoalBasicInfoSection
                {...base}
                onNameChange={onNameChange}
                onEmojiChange={onEmojiChange}
            />,
        );

        fireEvent.changeText(getByLabelText('Nama target'), 'MacBook Pro');
        fireEvent.press(getByLabelText('Pilih ikon 🌴'));

        expect(onNameChange).toHaveBeenCalledWith('MacBook Pro');
        expect(onEmojiChange).toHaveBeenCalledWith('🌴');
    });

    it('menampilkan pesan error nama bila ada', () => {
        const { getByText } = render(
            <GoalBasicInfoSection
                {...base}
                onNameChange={jest.fn()}
                onEmojiChange={jest.fn()}
                nameError="Nama target wajib diisi"
            />,
        );

        expect(getByText('Nama target wajib diisi')).toBeTruthy();
    });
});
