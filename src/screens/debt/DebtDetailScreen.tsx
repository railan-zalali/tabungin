// Detail utang/piutang: progres, rincian, riwayat pembayaran, dan
// pencatatan pembayaran yang ikut menulis transaksi ke dompet.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useDebtStore } from '../../store/useDebtStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { formatCurrency, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import {
    getDebtDueLabel,
    getDebtDueState,
    getDebtPaidAmount,
    getDebtProgress,
    getDebtStatusLabel,
    getDebtTotalWithInterest,
    getDebtTypeLabel,
} from '../../utils/debtUtils';
import { cancelDebtReminder } from '../../utils/notificationService';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ProgressBar } from '../../components/saving/ProgressBar';
import { AddPaymentModal } from '../../components/debt/AddPaymentModal';
import type { TransactionNavigationProp, TransactionStackParamList } from '../../types/navigation';

type DebtDetailRoute = RouteProp<TransactionStackParamList, 'DebtDetail'>;

/** Kategori transaksi untuk pembayaran utang/piutang. */
const PAYMENT_CATEGORY = 'Lainnya';

export function DebtDetailScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'DebtDetail'>>();
    const route = useRoute<DebtDetailRoute>();
    const { debtId } = route.params;

    const { colors } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const { currentDebt, currentPayments, loadDebtById, loadPayments, addPayment, editDebt, removeDebt, loadSummary } =
        useDebtStore();
    const { addTransaction } = useTransactionStore();
    const { wallets, loadWallets } = useWalletStore();

    const [modalVisible, setModalVisible] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadWallets();
        loadDebtById(debtId);
        loadPayments(debtId);
    }, [debtId, loadDebtById, loadPayments, loadWallets]);

    const debt = currentDebt?.id === debtId ? currentDebt : null;
    const wallet = wallets.find((item) => item.id === debt?.wallet_id) ?? null;

    const openPaymentModal = () => {
        setPaymentAmount('');
        setPaymentNote('');
        setPaymentError(null);
        setModalVisible(true);
    };

    const handlePayment = async () => {
        if (!debt) return;
        const amount = parseRupiah(paymentAmount);

        if (amount <= 0) {
            setPaymentError('Nominal harus lebih dari 0');
            return;
        }
        if (amount > debt.remaining_amount) {
            setPaymentError(`Maksimal ${formatCurrency(debt.remaining_amount)}`);
            return;
        }

        setSubmitting(true);
        try {
            const payment = await addPayment({
                debt_id: debt.id,
                amount,
                date: Date.now(),
                note: paymentNote.trim() || null,
            });

            // Pembayaran ikut tercatat sebagai transaksi bila debt punya dompet.
            if (debt.wallet_id) {
                await addTransaction({
                    type: debt.type === 'debt' ? 'expense' : 'income',
                    amount,
                    category: PAYMENT_CATEGORY,
                    note:
                        paymentNote.trim() ||
                        `${getDebtTypeLabel(debt.type)} ${debt.counterparty}`,
                    date: payment.date,
                    wallet_id: debt.wallet_id,
                    profile_id: debt.profile_id ?? undefined,
                });
            }

            // Sisa tinggal 0 -> DB otomatis menandai lunas, batalkan pengingatnya.
            if (debt.remaining_amount - amount <= 0) {
                await cancelDebtReminder(debt.id);
            }

            await Promise.all([loadDebtById(debtId), loadPayments(debtId), loadSummary()]);
            setModalVisible(false);
        } catch (error) {
            console.error('[DebtDetail] Gagal mencatat pembayaran:', error);
            setPaymentError('Gagal menyimpan pembayaran. Coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkPaid = () => {
        if (!debt) return;
        Alert.alert('Tandai lunas?', 'Sisa tagihan akan disetel nol dan tidak menerima pembayaran baru.', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Tandai Lunas',
                style: 'destructive',
                onPress: async () => {
                    await editDebt(debt.id, { status: 'paid', remaining_amount: 0 });
                    await cancelDebtReminder(debt.id);
                    await Promise.all([loadDebtById(debtId), loadSummary()]);
                },
            },
        ]);
    };

    const handleDelete = () => {
        if (!debt) return;
        Alert.alert('Hapus utang?', 'Riwayat pembayaran ikut dihapus. Transaksi dompet tidak ikut terhapus.', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus',
                style: 'destructive',
                onPress: async () => {
                    await removeDebt(debt.id);
                    await cancelDebtReminder(debt.id);
                    await loadSummary();
                    navigation.goBack();
                },
            },
        ]);
    };

    if (!debt) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader
                    title="Detail Utang"
                    showBack
                    onBackPress={() => navigation.goBack()}
                    variant="transparent"
                />
                <View style={styles.emptyWrap}>
                    <EmptyState
                        icon="alert-circle-outline"
                        title="Utang tidak ditemukan"
                        description="Data ini mungkin sudah dihapus atau belum selesai dimuat."
                        actionLabel="Kembali"
                        onAction={() => navigation.goBack()}
                    />
                </View>
            </ScreenShell>
        );
    }

    const paid = getDebtPaidAmount(debt);
    const progress = getDebtProgress(debt);
    const dueState = getDebtDueState(debt);
    const totalWithInterest = getDebtTotalWithInterest(debt);
    const canPay = debt.status === 'active' && debt.remaining_amount > 0;
    const infoRows = [
        { label: 'Total', value: formatCurrency(debt.amount) },
        { label: 'Terbayar', value: formatCurrency(paid) },
        ...(debt.interest_rate > 0
            ? [{ label: `Bunga (${debt.interest_rate}%)`, value: formatCurrency(totalWithInterest) }]
            : []),
        { label: 'Sisa', value: formatCurrency(debt.remaining_amount) },
        { label: 'Status', value: getDebtStatusLabel(debt.status) },
        { label: 'Sumber dana', value: wallet?.name ?? 'Tanpa dompet' },
    ];

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Detail Utang"
                subtitle={getDebtTypeLabel(debt.type)}
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{ icon: 'pencil', label: 'Ubah utang', onPress: () => navigation.navigate('AddDebt', { editId: debt.id }) }}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing + 96 }]}
            >
                <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroCard}>
                    <View style={styles.heroBadges}>
                        <ContextBadge
                            icon={debt.type === 'debt' ? 'arrow-up-bold-outline' : 'arrow-down-bold-outline'}
                            label={getDebtTypeLabel(debt.type)}
                            tone={debt.type === 'debt' ? 'warning' : 'success'}
                        />
                        <ContextBadge
                            icon={dueState === 'overdue' ? 'alert-circle-outline' : 'calendar-clock-outline'}
                            label={getDebtDueLabel(debt)}
                            tone={dueState === 'overdue' ? 'warning' : dueState === 'settled' ? 'success' : 'info'}
                        />
                    </View>

                    <Text style={styles.counterparty}>{debt.counterparty}</Text>
                    {debt.note ? <Text style={styles.heroNote}>{debt.note}</Text> : null}

                    <View style={styles.balanceWrap}>
                        <Text style={styles.balanceLabel}>Sisa yang harus dibayar</Text>
                        <Text style={styles.balanceValue}>{formatCurrency(debt.remaining_amount)}</Text>
                    </View>

                    <ProgressBar
                        progress={progress}
                        color={debt.status === 'active' ? colors.primary : colors.success}
                        height={10}
                        showLabel
                        label={`${progress}% terbayar`}
                        accessibilityLabel={`Progres pembayaran ${debt.counterparty}`}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.block}>
                    <SectionHeader title="Rincian" />
                    <View style={styles.infoGrid}>
                        {infoRows.map((row) => (
                            <View key={row.label} style={styles.infoCell}>
                                <Text style={styles.infoLabel}>{row.label}</Text>
                                <Text style={styles.infoValue}>{row.value}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.block}>
                    <SectionHeader
                        title="Riwayat Pembayaran"
                        subtitle={`${currentPayments.length} transaksi tercatat`}
                    />
                    {currentPayments.length === 0 ? (
                        <EmptyState
                            icon="history"
                            title="Belum ada pembayaran"
                            description="Catat pembayaran pertama untuk mulai mengurangi sisa utang."
                            compact
                            actionLabel={canPay ? 'Catat pembayaran' : undefined}
                            onAction={canPay ? openPaymentModal : undefined}
                        />
                    ) : (
                        <View style={styles.paymentList}>
                            {currentPayments.map((payment, index) => (
                                <Animated.View
                                    key={payment.id}
                                    entering={FadeInUp.delay(index * 60).springify()}
                                    style={styles.paymentRow}
                                >
                                    <View style={styles.paymentLeft}>
                                        <Text style={styles.paymentAmount}>
                                            {formatCurrency(payment.amount)}
                                        </Text>
                                        <Text style={styles.paymentDate}>
                                            {formatDateShort(payment.date)}
                                            {payment.note ? ` · ${payment.note}` : ''}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="check-circle-outline"
                                        size={20}
                                        color={colors.success}
                                    />
                                </Animated.View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payButton, !canPay && styles.payButtonDisabled]}
                    onPress={openPaymentModal}
                    disabled={!canPay}
                    accessibilityRole="button"
                    accessibilityLabel="Catat pembayaran"
                >
                    <Text style={styles.payButtonText}>
                        {canPay ? 'Catat Pembayaran' : 'Sudah tidak ada sisa tagihan'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.footerSecondary}>
                    {debt.status === 'active' ? (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleMarkPaid}
                            accessibilityRole="button"
                            accessibilityLabel="Tandai lunas"
                        >
                            <Text style={styles.secondaryButtonText}>Tandai Lunas</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleDelete}
                        accessibilityRole="button"
                        accessibilityLabel="Hapus utang"
                    >
                        <Text style={[styles.secondaryButtonText, styles.destructiveText]}>Hapus</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <AddPaymentModal
                visible={modalVisible}
                counterparty={debt.counterparty}
                accentColor={debt.type === 'debt' ? colors.warning : colors.primary}
                amount={paymentAmount}
                onAmountChange={(next) => {
                    setPaymentAmount(formatInputRupiah(next));
                    setPaymentError(null);
                }}
                note={paymentNote}
                onNoteChange={setPaymentNote}
                walletName={wallet?.name ?? null}
                error={paymentError}
                isSubmitting={submitting}
                onClose={() => setModalVisible(false)}
                onSubmit={handlePayment}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        emptyWrap: {
            paddingHorizontal: 20,
            paddingTop: 40,
        },
        heroCard: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 22,
            gap: 14,
        },
        heroBadges: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        counterparty: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h2,
            color: colors.textPrimary,
        },
        heroNote: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
            marginTop: -8,
        },
        balanceWrap: {
            gap: 4,
        },
        balanceLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        balanceValue: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h2,
            color: colors.textPrimary,
        },
        block: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        infoGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        infoCell: {
            flexGrow: 1,
            flexBasis: '45%',
            backgroundColor: colors.surfaceMuted,
            borderRadius: BorderRadius['3xl'],
            padding: 14,
            gap: 4,
        },
        infoLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        infoValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        paymentList: {
            gap: 10,
        },
        paymentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            padding: 14,
            gap: 12,
        },
        paymentLeft: {
            flex: 1,
            gap: 2,
        },
        paymentAmount: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        paymentDate: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
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
            gap: 10,
        },
        payButton: {
            minHeight: 54,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        payButtonDisabled: {
            backgroundColor: colors.surfaceMuted,
        },
        payButtonText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        footerSecondary: {
            flexDirection: 'row',
            gap: 10,
        },
        secondaryButton: {
            flex: 1,
            minHeight: 44,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
        },
        secondaryButtonText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textPrimary,
        },
        destructiveText: {
            color: colors.danger,
        },
    });
