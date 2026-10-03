// Tambah / edit utang & piutang.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useAuthStore } from '../../store/useAuthStore';
import { useDebtStore } from '../../store/useDebtStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { formatCurrency, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { getDebtTypeLabel } from '../../utils/debtUtils';
import { cancelDebtReminder, scheduleDebtReminder } from '../../utils/notificationService';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Input } from '../../components/common/Input';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { WalletSelector } from '../../components/saving/WalletSelector';
import type { DebtType } from '../../types/debt';
import type { TransactionNavigationProp, TransactionStackParamList } from '../../types/navigation';

type AddDebtRoute = RouteProp<TransactionStackParamList, 'AddDebt'>;
type TypeTab = 'debt' | 'receivable';

export function AddDebtScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'AddDebt'>>();
    const route = useRoute<AddDebtRoute>();
    const editId = route.params?.editId;

    const { colors } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const user = useAuthStore((state) => state.user);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const { wallets, loadWallets } = useWalletStore();
    const {
        debts,
        isLoading,
        loadDebts,
        addDebt,
        editDebt,
        loadDebtById,
    } = useDebtStore();

    const [debtType, setDebtType] = useState<TypeTab>('debt');
    const [counterparty, setCounterparty] = useState('');
    const [counterpartyEmail, setCounterpartyEmail] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [interestInput, setInterestInput] = useState('');
    const [note, setNote] = useState('');
    const [dueDate, setDueDate] = useState<number | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const editing = useMemo(
        () => (editId ? (debts.find((debt) => debt.id === editId) ?? null) : null),
        [debts, editId],
    );

    useEffect(() => {
        loadWallets();
        if (editId) {
            loadDebtById(editId);
            loadDebts();
        }
    }, [editId, loadDebtById, loadDebts, loadWallets]);

    useEffect(() => {
        if (!editing) return;
        setDebtType(editing.type === 'receivable' ? 'receivable' : 'debt');
        setCounterparty(editing.counterparty);
        setCounterpartyEmail(editing.counterparty_email ?? '');
        setAmountInput(formatInputRupiah(String(editing.amount)));
        setInterestInput(String(editing.interest_rate ?? 0));
        setNote(editing.note ?? '');
        setDueDate(editing.due_date);
        setSelectedWalletId(editing.wallet_id ?? '');
    }, [editing]);

    const amount = parseRupiah(amountInput);
    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId) ?? null;
    const typeLabel = getDebtTypeLabel(debtType);

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!counterparty.trim()) next.counterparty = 'Nama pihak lawan transaksi wajib diisi';
        if (amount <= 0) next.amount = 'Nominal harus lebih dari 0';
        if (counterpartyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartyEmail.trim())) {
            next.counterpartyEmail = 'Format email tidak valid';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload = {
                user_id: user?.id ?? '',
                type: debtType as DebtType,
                counterparty: counterparty.trim(),
                counterparty_email: counterpartyEmail.trim() || null,
                amount,
                interest_rate: Number(interestInput) || 0,
                due_date: dueDate,
                note: note.trim() || null,
                status: 'active' as const,
                wallet_id: selectedWallet?.id ?? null,
                profile_id: selectedWallet?.profile_id ?? activeProfileId,
            };

            if (editing) {
                await editDebt(editing.id, {
                    ...payload,
                    // Sisa tagihan tidak boleh melebihi total setelah nominal diubah.
                    remaining_amount: Math.min(editing.remaining_amount, amount),
                });
                await cancelDebtReminder(editing.id);
                await scheduleDebtReminder({
                    ...editing,
                    ...payload,
                });
            } else {
                const created = await addDebt(payload);
                await scheduleDebtReminder(created);
            }

            navigation.goBack();
        } finally {
            setSubmitting(false);
        }
    };

    const renderDueDateValue = () =>
        dueDate ? formatDateLong(dueDate) : 'Tidak ada jatuh tempo';

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title={editId ? 'Ubah Utang' : 'Catat Utang'}
                subtitle={`Rincian ${typeLabel.toLowerCase()} beserta jatuh tempo dan sumber dananya.`}
                showClose
                onClosePress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing + 96 }]}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.block}>
                    <SectionHeader title="Jenis" subtitle="Arah uang: keluar sebagai utang, masuk sebagai piutang." />
                    <SegmentedControl
                        value={debtType}
                        onChange={setDebtType}
                        options={[
                            { id: 'debt', label: 'Utang', icon: 'arrow-up-bold-outline' },
                            { id: 'receivable', label: 'Piutang', icon: 'arrow-down-bold-outline' },
                        ]}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.block}>
                    <SectionHeader title="Pihak & Nominal" />
                    <Input
                        label="Nama pihak"
                        placeholder={debtType === 'debt' ? 'Contoh: Bank, Rina' : 'Contoh: Budi'}
                        value={counterparty}
                        onChangeText={setCounterparty}
                        leftIcon="account-outline"
                        required
                        error={errors.counterparty}
                    />
                    <Input
                        label="Email (opsional)"
                        placeholder="dipakai untuk mengundang"
                        value={counterpartyEmail}
                        onChangeText={setCounterpartyEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon="email-outline"
                        error={errors.counterpartyEmail}
                    />
                    <Input
                        label="Nominal"
                        placeholder="Rp 0"
                        value={amountInput}
                        onChangeText={(next) => setAmountInput(formatInputRupiah(next))}
                        keyboardType="number-pad"
                        required
                        leftIcon="cash"
                        error={errors.amount}
                        hint={amount > 0 ? formatCurrency(amount) : undefined}
                    />
                    <Input
                        label="Bunga (%) — opsional"
                        placeholder="0"
                        value={interestInput}
                        onChangeText={setInterestInput}
                        keyboardType="numeric"
                        leftIcon="percent"
                        hint="Bunga dicatat informatif, tidak mengubah sisa tagihan."
                    />
                    <Input
                        label="Catatan — opsional"
                        placeholder="Contoh: pinjaman modal usaha"
                        value={note}
                        onChangeText={setNote}
                        leftIcon="note-text-outline"
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.block}>
                    <SectionHeader
                        title="Jatuh tempo"
                        subtitle="Dipakai untuk mengingatkan sebelum tanggalnya lewat."
                    />
                    <View style={styles.dueRow}>
                        <View style={styles.dueValueWrap}>
                            <Text style={styles.dueLabel}>Tanggal</Text>
                            <Text style={[styles.dueValue, !dueDate && styles.dueValueMuted]}>
                                {renderDueDateValue()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.dueButton}
                            onPress={() => setShowDatePicker((current) => !current)}
                            accessibilityRole="button"
                            accessibilityLabel="Ubah tanggal jatuh tempo"
                        >
                            <Text style={styles.dueButtonText}>{dueDate ? 'Ubah' : 'Pilih'}</Text>
                        </TouchableOpacity>
                        {dueDate ? (
                            <TouchableOpacity
                                style={styles.dueButton}
                                onPress={() => setDueDate(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Hapus tanggal jatuh tempo"
                            >
                                <Text style={styles.dueButtonText}>Hapus</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {showDatePicker ? (
                        <DateTimePicker
                            value={dueDate ? new Date(dueDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={(event, selected) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (event.type !== 'set' || !selected) return;
                                setDueDate(selected.getTime());
                            }}
                        />
                    ) : null}
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.block}>
                    <SectionHeader
                        title="Sumber dana"
                        subtitle="Pembayaran nanti dicatat ke dompet yang kamu pilih di sini."
                    />
                    <WalletSelector
                        wallets={wallets}
                        activeProfileId={activeProfileId}
                        selectedWalletId={selectedWalletId}
                        onSelect={setSelectedWalletId}
                        sharedHint={
                            debtType === 'debt'
                                ? 'Utang ini menempel ke dompet bersama, sehingga riwayat pembayarannya ikut terlihat oleh anggota dompet.'
                                : 'Piutang ini menempel ke dompet bersama, sehingga penerimaannya ikut terlihat oleh anggota dompet.'
                        }
                        personalHint={
                            debtType === 'debt'
                                ? 'Utang ini tetap berada di ruang personal aktif, dan pembayarannya menyesuaikan dompet yang kamu pilih.'
                                : 'Piutang ini tetap berada di ruang personal aktif, dan penerimaannya menyesuaikan dompet yang kamu pilih.'
                        }
                    />
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel="Simpan utang"
                >
                    <Text style={styles.saveButtonText}>
                        {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Utang'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 24,
        },
        block: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        dueRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        dueValueWrap: {
            flex: 1,
        },
        dueLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        dueValue: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginTop: 2,
        },
        dueValueMuted: {
            color: colors.textTertiary,
        },
        dueButton: {
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
        },
        dueButtonText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textPrimary,
        },
        footer: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            backgroundColor: colors.surfaceElevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        saveButton: {
            minHeight: 54,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: '#FFFFFF',
        },
    });
