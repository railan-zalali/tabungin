// Test komponen debt: kartu daftar dan modal pembayaran.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DebtCard } from '../../src/components/debt/DebtCard';
import { AddPaymentModal } from '../../src/components/debt/AddPaymentModal';
import type { Debt } from '../../src/types/debt';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

const debt = (over: Partial<Debt> = {}): Debt =>
    ({
        id: 'd1',
        user_id: 'u1',
        type: 'debt',
        counterparty: 'Rina',
        counterparty_email: null,
        amount: 1000000,
        remaining_amount: 400000,
        interest_rate: 0,
        due_date: null,
        note: 'Pinjaman modal',
        status: 'active',
        wallet_id: null,
        profile_id: null,
        created_at: NOW - 10 * DAY,
        updated_at: null,
        ...over,
    }) as Debt;

describe('DebtCard', () => {
    it('shows counterparty, remaining and total amounts', () => {
        const { getByText, getByLabelText } = render(<DebtCard debt={debt()} now={NOW} />);

        expect(getByText('Rina')).toBeTruthy();
        expect(getByText('Pinjaman modal')).toBeTruthy();
        expect(getByText('Sisa')).toBeTruthy();
        expect(getByText('Total')).toBeTruthy();
        expect(getByLabelText('Buka detail Utang dari Rina')).toBeTruthy();
    });

    it('labels receivables as Piutang', () => {
        const { getByText } = render(
            <DebtCard debt={debt({ type: 'receivable', counterparty: 'Budi' })} now={NOW} />,
        );
        expect(getByText('Piutang')).toBeTruthy();
    });

    it('marks overdue debts', () => {
        const { getByText } = render(
            <DebtCard debt={debt({ due_date: NOW - 2 * DAY })} now={NOW} />,
        );
        expect(getByText('Terlambat 2 hari')).toBeTruthy();
    });

    it('shows a due-soon label inside the window', () => {
        const { getByText } = render(<DebtCard debt={debt({ due_date: NOW + 3 * DAY })} now={NOW} />);
        expect(getByText(/^Jatuh tempo /)).toBeTruthy();
    });

    it('reports settled debts as lunas', () => {
        const { getByText } = render(
            <DebtCard debt={debt({ status: 'paid', due_date: NOW - DAY })} now={NOW} />,
        );
        expect(getByText('Lunas')).toBeTruthy();
    });

    it('calls onPress', () => {
        const onPress = jest.fn();
        const { getByLabelText } = render(<DebtCard debt={debt()} now={NOW} onPress={onPress} />);

        fireEvent.press(getByLabelText('Buka detail Utang dari Rina'));

        expect(onPress).toHaveBeenCalledTimes(1);
    });
});

describe('AddPaymentModal', () => {
    const base = {
        visible: true,
        counterparty: 'Rina',
        accentColor: '#FF9F1C',
        amount: '400.000',
        note: 'Cicilan 2',
        isSubmitting: false,
    };

    it('explains the wallet linkage', () => {
        const { getByText } = render(
            <AddPaymentModal
                {...base}
                walletName="Dompet Utama"
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(
            getByText(/juga dicatat sebagai transaksi dari dompet Dompet Utama/),
        ).toBeTruthy();
    });

    it('explains when no wallet transaction will be created', () => {
        const { getByText } = render(
            <AddPaymentModal
                {...base}
                walletName={null}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(getByText(/tanpa transaksi dompet/)).toBeTruthy();
    });

    it('reports amount and note changes', () => {
        const onAmountChange = jest.fn();
        const onNoteChange = jest.fn();
        const { getByLabelText } = render(
            <AddPaymentModal
                {...base}
                onAmountChange={onAmountChange}
                onNoteChange={onNoteChange}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );

        fireEvent.changeText(getByLabelText('Nominal pembayaran'), '500000');
        fireEvent.changeText(getByLabelText('Catatan pembayaran'), 'Terakhir');

        expect(onAmountChange).toHaveBeenCalledWith('500000');
        expect(onNoteChange).toHaveBeenCalledWith('Terakhir');
    });

    it('submits and closes', () => {
        const onSubmit = jest.fn();
        const onClose = jest.fn();
        const { getByText, getByLabelText } = render(
            <AddPaymentModal
                {...base}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={onClose}
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByText('Simpan Pembayaran'));
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.press(getByLabelText('Tutup'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows the validation error', () => {
        const { getByText } = render(
            <AddPaymentModal
                {...base}
                error="Maksimal Rp 400.000"
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(getByText('Maksimal Rp 400.000')).toBeTruthy();
    });

    it('renders nothing when hidden', () => {
        const { queryByText } = render(
            <AddPaymentModal
                {...base}
                visible={false}
                onAmountChange={jest.fn()}
                onNoteChange={jest.fn()}
                onClose={jest.fn()}
                onSubmit={jest.fn()}
            />,
        );
        expect(queryByText('Simpan Pembayaran')).toBeNull();
    });
});
