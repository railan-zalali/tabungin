// Layar transaksi berulang — komposisi hero + list.
// Form modal diekstrak ke RecurringTransactionFormModal.
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { RecurringFrequency } from '../../database/recurringQueries';
import type { TransactionNavigationProp } from '../../types/navigation';
import { formatCurrency } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { resolveCategoriesForType } from '../../utils/categoryResolver';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import {
    FREQUENCY_OPTIONS,
    RecurringTransactionFormModal,
} from '../../components/transaction/RecurringTransactionFormModal';

interface FormState {
    type: 'income' | 'expense';
    category: string;
    amount: string;
    note: string;
    frequency: RecurringFrequency;
    dayOfMonth: string;
}

const INITIAL_FORM: FormState = {
    type: 'expense',
    category: '',
    amount: '',
    note: '',
    frequency: 'monthly',
    dayOfMonth: '',
};

export function RecurringTransactionScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'RecurringTransaction'>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const {
        recurringTransactions,
        isLoading,
        loadRecurringTransactions,
        addRecurringTransaction,
        toggleRecurringTransaction,
        deleteRecurringTransaction,
    } = useRecurringStore();
    const { categories, loadCategories } = useCategoryStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<FormState>(INITIAL_FORM);

    useEffect(() => {
        loadRecurringTransactions();
        loadCategories();
    }, [loadRecurringTransactions, loadCategories]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRecurringTransactions();
        setRefreshing(false);
    }, [loadRecurringTransactions]);

    const updateForm = useCallback((patch: Partial<FormState>) => {
        setForm((current) => ({ ...current, ...patch }));
    }, []);

    const resetForm = useCallback(() => setForm(INITIAL_FORM), []);

    const closeAddModal = useCallback(() => {
        setShowAddModal(false);
        resetForm();
    }, [resetForm]);

    const handleAddRecurring = async () => {
        if (!form.category || !form.amount || !form.frequency) {
            Alert.alert('Error', 'Mohon lengkapi semua field yang diperlukan');
            return;
        }

        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Jumlah tidak valid');
            return;
        }

        setIsSubmitting(true);
        try {
            const dayOfMonth =
                form.frequency === 'monthly' ? parseInt(form.dayOfMonth, 10) || 1 : null;
            const startDate = Date.now();

            await addRecurringTransaction({
                user_id: '', // Diisi oleh store
                wallet_id: null,
                category: form.category,
                amount,
                type: form.type,
                note: form.note || null,
                frequency: form.frequency,
                day_of_month: dayOfMonth,
                day_of_week: null,
                start_date: startDate,
                end_date: null,
                next_occurrence: calculateFirstOccurrence(form.frequency, dayOfMonth, startDate),
                is_active: true,
                last_generated_at: null,
            });

            closeAddModal();
            Alert.alert('Sukses', 'Transaksi berulang berhasil ditambahkan');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal menambahkan transaksi berulang';
            Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = useCallback(
        (id: string) => {
            Alert.alert(
                'Hapus Transaksi Berulang',
                'Apakah Anda yakin ingin menghapus transaksi berulang ini?',
                [
                    { text: 'Batal', style: 'cancel' },
                    {
                        text: 'Hapus',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteRecurringTransaction(id);
                            } catch (error) {
                                const message =
                                    error instanceof Error ? error.message : 'Gagal menghapus transaksi';
                                Alert.alert('Error', message);
                            }
                        },
                    },
                ],
            );
        },
        [deleteRecurringTransaction],
    );

    const relevantCategories = React.useMemo(
        () => resolveCategoriesForType(form.type, categories),
        [form.type, categories],
    );

    const recurringSummary = React.useMemo(() => {
        const activeCount = recurringTransactions.filter((tx) => tx.is_active).length;
        const incomeCount = recurringTransactions.filter((tx) => tx.type === 'income').length;
        const expenseCount = recurringTransactions.filter((tx) => tx.type === 'expense').length;
        const nextActive = recurringTransactions
            .filter((tx) => tx.is_active)
            .slice()
            .sort((a, b) => a.next_occurrence - b.next_occurrence)[0];

        return {
            activeCount,
            incomeCount,
            expenseCount,
            nextLabel: nextActive ? formatDateLong(nextActive.next_occurrence) : 'Belum ada jadwal',
        };
    }, [recurringTransactions]);

    return (
        <ScreenShell topInset={false} bottomInset={false}>
            <AppScreenHeader
                title="Transaksi Berulang"
                subtitle="Jadwalkan pemasukan dan pengeluaran rutin."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'plus',
                    label: 'Tambah',
                    onPress: () => setShowAddModal(true),
                    tone: 'primary',
                }}
                variant="transparent"
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroWrap}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroGlow} />
                        <View style={styles.heroTopRow}>
                            <View style={styles.heroIcon}>
                                <MaterialCommunityIcons
                                    name="autorenew"
                                    size={24}
                                    color={colors.textInverse}
                                />
                            </View>
                            <View style={styles.heroCopy}>
                                <Text style={styles.heroTitle}>Transaksi Berulang</Text>
                                <Text style={styles.heroSubtitle}>
                                    Jadwalkan pemasukan dan pengeluaran rutin tanpa harus input
                                    ulang setiap bulan.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.heroStats}>
                            <View style={styles.heroStatChip}>
                                <Text style={styles.heroStatValue}>{recurringSummary.activeCount}</Text>
                                <Text style={styles.heroStatLabel}>Aktif</Text>
                            </View>
                            <View style={styles.heroStatChip}>
                                <Text style={styles.heroStatValue}>{recurringSummary.incomeCount}</Text>
                                <Text style={styles.heroStatLabel}>Income</Text>
                            </View>
                            <View style={styles.heroStatChip}>
                                <Text style={styles.heroStatValue}>
                                    {recurringSummary.expenseCount}
                                </Text>
                                <Text style={styles.heroStatLabel}>Expense</Text>
                            </View>
                        </View>

                        <View style={styles.heroNextCard}>
                            <MaterialCommunityIcons
                                name="calendar-clock"
                                size={18}
                                color={colors.primary}
                            />
                            <Text style={styles.heroNextText}>
                                Jadwal terdekat: {recurringSummary.nextLabel}
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : recurringTransactions.length === 0 ? (
                    <EmptyState
                        icon="autorenew"
                        title="Belum ada transaksi berulang"
                        description="Tambahkan transaksi rutin untuk gaji, tagihan, atau kebutuhan bulanan supaya pencatatan lebih rapi."
                        actionLabel="Tambah Transaksi"
                        onAction={() => setShowAddModal(true)}
                        style={styles.emptyState}
                    />
                ) : (
                    <View style={styles.list}>
                        {recurringTransactions.map((transaction, index) => (
                            <Animated.View
                                key={transaction.id}
                                entering={FadeInUp.delay(index * 50).springify()}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: colors.surfaceElevated,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={styles.cardHeader}>
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            {
                                                backgroundColor:
                                                    transaction.type === 'income'
                                                        ? colors.successBg
                                                        : colors.dangerBg,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={
                                                transaction.type === 'income'
                                                    ? 'arrow-up'
                                                    : 'arrow-down'
                                            }
                                            size={20}
                                            color={
                                                transaction.type === 'income'
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                        />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={[styles.category, { color: colors.textPrimary }]}>
                                            {transaction.category}
                                        </Text>
                                        <Text style={[styles.frequency, { color: colors.textSecondary }]}>
                                            {FREQUENCY_OPTIONS.find(
                                                (f) => f.value === transaction.frequency,
                                            )?.label}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.amount,
                                            {
                                                color:
                                                    transaction.type === 'income'
                                                        ? colors.success
                                                        : colors.danger,
                                            },
                                        ]}
                                    >
                                        {transaction.type === 'income' ? '+' : '-'}
                                        {formatCurrency(transaction.amount)}
                                    </Text>
                                </View>

                                {transaction.note ? (
                                    <Text style={[styles.note, { color: colors.textSecondary }]}>
                                        {transaction.note}
                                    </Text>
                                ) : null}

                                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                                    <Text
                                        style={[styles.nextOccurrence, { color: colors.textSecondary }]}
                                    >
                                        Berikutnya: {formatDateLong(transaction.next_occurrence)}
                                    </Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => toggleRecurringTransaction(transaction.id)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                transaction.is_active
                                                    ? 'Jeda transaksi berulang'
                                                    : 'Aktifkan transaksi berulang'
                                            }
                                        >
                                            <MaterialCommunityIcons
                                                name={transaction.is_active ? 'pause' : 'play'}
                                                size={20}
                                                color={transaction.is_active ? colors.warning : colors.success}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleDelete(transaction.id)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Hapus transaksi berulang"
                                        >
                                            <MaterialCommunityIcons
                                                name="delete-outline"
                                                size={20}
                                                color={colors.danger}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <RecurringTransactionFormModal
                visible={showAddModal}
                onClose={closeAddModal}
                onSubmit={handleAddRecurring}
                submitting={isSubmitting}
                categories={relevantCategories}
                form={form}
                onFormChange={updateForm}
            />
        </ScreenShell>
    );
}

/**
 * Hitung occurrence pertama berdasarkan frekuensi yang dipilih.
 * Dipisah dari handler agar mudah diuji. Perilaku identik dengan versi inline
 * sebelumnya: daily/tak dikenal jatuh pada startDate itu sendiri.
 */
export function calculateFirstOccurrence(
    frequency: RecurringFrequency,
    dayOfMonth: number | null,
    startDate: number,
): number {
    const DAY_MS = 24 * 60 * 60 * 1000;

    switch (frequency) {
        case 'monthly': {
            const now = new Date(startDate);
            // Clamp ke jumlah hari bulan berjalan, lalu tempatkan di bulan berikutnya.
            const targetDay = Math.min(
                dayOfMonth ?? 1,
                new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
            );
            return new Date(now.getFullYear(), now.getMonth() + 1, targetDay).getTime();
        }
        case 'weekly':
            return startDate + 7 * DAY_MS;
        case 'biweekly':
            return startDate + 14 * DAY_MS;
        case 'yearly': {
            const base = new Date(startDate);
            return new Date(base.getFullYear() + 1, base.getMonth(), base.getDate()).getTime();
        }
        case 'daily':
        default:
            return startDate;
    }
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        scrollContent: {
            paddingVertical: 16,
            gap: 16,
        },
        heroWrap: {
            paddingHorizontal: 16,
        },
        heroCard: {
            borderRadius: 28,
            padding: 18,
            overflow: 'hidden',
            gap: 14,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
        },
        heroGlow: {
            position: 'absolute',
            top: -40,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.heroOverlaySoft,
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        heroIcon: {
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.heroOverlaySoft,
            borderWidth: 1,
            borderColor: colors.heroStroke,
        },
        heroCopy: {
            flex: 1,
        },
        heroTitle: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textInverse,
        },
        heroSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.onHeroMuted,
            marginTop: 4,
            lineHeight: 18,
        },
        heroStats: {
            flexDirection: 'row',
            gap: 10,
        },
        heroStatChip: {
            flex: 1,
            borderRadius: 18,
            paddingVertical: 12,
            backgroundColor: colors.heroOverlaySoft,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.heroStroke,
        },
        heroStatValue: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textInverse,
        },
        heroStatLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.onHeroMuted,
            marginTop: 2,
        },
        heroNextCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.heroPill,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        heroNextText: {
            flex: 1,
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textPrimary,
        },
        list: {
            gap: 12,
            paddingHorizontal: 16,
        },
        card: {
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 1,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 8,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cardInfo: {
            flex: 1,
        },
        category: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
        },
        frequency: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            marginTop: 2,
        },
        amount: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
        },
        note: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            marginBottom: 8,
        },
        cardFooter: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
        },
        nextOccurrence: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
        },
        actions: {
            flexDirection: 'row',
            gap: 8,
        },
        actionButton: {
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyState: {
            marginHorizontal: 16,
        },
    });
