import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { RecurringFrequency } from '../../database/recurringQueries';
import { formatCurrency, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { resolveCategoriesForType } from '../../utils/categoryResolver';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { Input } from '../../components/common/Input';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SelectionChip } from '../../components/common/SelectionChip';
import { StatStrip } from '../../components/common/StatStrip';
import { useResponsiveMetrics } from '../../utils/responsive';

const FREQUENCY_OPTIONS: { label: string; value: RecurringFrequency }[] = [
    { label: 'Harian', value: 'daily' },
    { label: 'Mingguan', value: 'weekly' },
    { label: 'Dua mingguan', value: 'biweekly' },
    { label: 'Bulanan', value: 'monthly' },
    { label: 'Tahunan', value: 'yearly' },
];

export function RecurringTransactionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
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
    const [formType, setFormType] = useState<'income' | 'expense'>('expense');
    const [formCategory, setFormCategory] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formNote, setFormNote] = useState('');
    const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
    const [formDayOfMonth, setFormDayOfMonth] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadRecurringTransactions();
        loadCategories();
    }, [loadCategories, loadRecurringTransactions]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRecurringTransactions();
        setRefreshing(false);
    }, [loadRecurringTransactions]);

    const resetForm = () => {
        setFormType('expense');
        setFormCategory('');
        setFormAmount('');
        setFormNote('');
        setFormFrequency('monthly');
        setFormDayOfMonth('');
    };

    const handleAddRecurring = async () => {
        if (!formCategory || !formAmount || !formFrequency) {
            Alert.alert('Error', 'Mohon lengkapi semua field yang diperlukan');
            return;
        }

        const amount = parseRupiah(formAmount);
        if (amount <= 0) {
            Alert.alert('Error', 'Jumlah tidak valid');
            return;
        }

        setIsSubmitting(true);
        try {
            const dayOfMonth = formFrequency === 'monthly' ? parseInt(formDayOfMonth, 10) || 1 : null;
            const startDate = Date.now();

            let firstOccurrence = startDate;
            if (formFrequency === 'monthly' && dayOfMonth) {
                const now = new Date();
                const targetDay = Math.min(dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
                firstOccurrence = new Date(now.getFullYear(), now.getMonth() + 1, targetDay).getTime();
            } else if (formFrequency === 'weekly') {
                firstOccurrence = startDate + 7 * 24 * 60 * 60 * 1000;
            } else if (formFrequency === 'biweekly') {
                firstOccurrence = startDate + 14 * 24 * 60 * 60 * 1000;
            } else if (formFrequency === 'yearly') {
                firstOccurrence = new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).getTime();
            }

            await addRecurringTransaction({
                user_id: '',
                wallet_id: null,
                category: formCategory,
                amount,
                type: formType,
                note: formNote || null,
                frequency: formFrequency,
                day_of_month: dayOfMonth,
                day_of_week: null,
                start_date: startDate,
                end_date: null,
                next_occurrence: firstOccurrence,
                is_active: true,
                last_generated_at: null,
                reminder_enabled: false,
                reminder_offset_minutes: 60,
            });

            setShowAddModal(false);
            resetForm();
            Alert.alert('Sukses', 'Transaksi berulang berhasil ditambahkan');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Gagal menambahkan transaksi berulang');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = useCallback(
        (id: string) => {
            Alert.alert('Hapus transaksi berulang', 'Apakah Anda yakin ingin menghapus transaksi berulang ini?', [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRecurringTransaction(id);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Gagal menghapus transaksi');
                        }
                    },
                },
            ]);
        },
        [deleteRecurringTransaction],
    );

    const relevantCategories = useMemo(() => resolveCategoriesForType(formType, categories), [formType, categories]);

    const recurringSummary = useMemo(() => {
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
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Transaksi berulang"
                subtitle="Jadwalkan pemasukan dan pengeluaran rutin tanpa harus input ulang setiap periode."
                eyebrow="Recurring Flow"
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{ icon: 'plus', label: 'Tambah', onPress: () => setShowAddModal(true) }}
                variant="transparent"
            />

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                        gap: metrics.verticalGap,
                    },
                    metrics.widthClass !== 'compact' ? styles.contentWide : null,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            >
                <HeroSummaryCard
                    eyebrow="Recurring Overview"
                    title="Jadwal transaksi"
                    value={`${recurringSummary.activeCount} aktif`}
                    description="Pakai recurring transaction untuk gaji, tagihan, iuran, atau kebutuhan rutin lain yang tidak ingin dimasukkan manual berulang kali."
                    icon="autorenew"
                    stats={[
                        { label: 'Pemasukan', value: String(recurringSummary.incomeCount), icon: 'arrow-down-left' },
                        { label: 'Pengeluaran', value: String(recurringSummary.expenseCount), icon: 'arrow-up-right' },
                        { label: 'Terdekat', value: recurringSummary.nextLabel, icon: 'calendar-clock' },
                    ]}
                    onPressCta={() => setShowAddModal(true)}
                    ctaLabel="Tambah jadwal"
                />

                <InlineNotice
                    icon="calendar-sync-outline"
                    title="Gunakan untuk ritme yang stabil"
                    description="Recurring transaction paling efektif untuk pola yang benar-benar terulang. Hindari memasukkan pengeluaran yang sering berubah besarannya."
                    tone="info"
                />

                <StatStrip
                    items={[
                        { label: 'Status aktif', value: String(recurringSummary.activeCount) },
                        { label: 'Semua jadwal', value: String(recurringTransactions.length) },
                        { label: 'Berikutnya', value: recurringSummary.nextLabel },
                    ]}
                    vertical={metrics.widthClass === 'compact'}
                />

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : recurringTransactions.length === 0 ? (
                    <EmptyState
                        icon="autorenew"
                        title="Belum ada transaksi berulang"
                        description="Tambahkan transaksi rutin untuk gaji, tagihan, atau kebutuhan bulanan supaya pencatatan lebih rapi."
                        actionLabel="Tambah transaksi"
                        onAction={() => setShowAddModal(true)}
                    />
                ) : (
                    <View style={styles.list}>
                        {recurringTransactions.map((transaction) => (
                            <View key={transaction.id} style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            { backgroundColor: transaction.type === 'income' ? colors.successBg : colors.dangerBg },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={transaction.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
                                            size={18}
                                            color={transaction.type === 'income' ? colors.success : colors.danger}
                                        />
                                    </View>
                                    <View style={styles.cardCopy}>
                                        <Text style={styles.cardTitle}>{transaction.category}</Text>
                                        <Text style={styles.cardMeta}>
                                            {FREQUENCY_OPTIONS.find((item) => item.value === transaction.frequency)?.label || transaction.frequency}
                                        </Text>
                                    </View>
                                    <View style={styles.amountWrap}>
                                        <Text style={[styles.amount, { color: transaction.type === 'income' ? colors.success : colors.danger }]}>
                                            {transaction.type === 'income' ? '+' : '-'}
                                            {formatCurrency(transaction.amount)}
                                        </Text>
                                        <Text style={styles.cardMeta}>{transaction.is_active ? 'Aktif' : 'Dijeda'}</Text>
                                    </View>
                                </View>

                                {transaction.note ? <Text style={styles.note}>{transaction.note}</Text> : null}

                                <View style={styles.cardBottom}>
                                    <Text style={styles.nextOccurrence}>Berikutnya: {formatDateLong(transaction.next_occurrence)}</Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => toggleRecurringTransaction(transaction.id)}>
                                            <MaterialCommunityIcons
                                                name={transaction.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                                                size={22}
                                                color={transaction.is_active ? colors.warning : colors.success}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(transaction.id)}>
                                            <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
                <View style={styles.modalOverlay}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.modalScroll,
                            {
                                paddingHorizontal: metrics.horizontalPadding,
                                paddingVertical: metrics.safeBottomSpacing + 16,
                            },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalCard}>
                            <FormSection
                                eyebrow="New Schedule"
                                title="Tambah transaksi berulang"
                                subtitle="Atur tipe transaksi, kategori, nominal, dan frekuensi dalam satu flow yang ringkas."
                                density="compact"
                                variant="subtle"
                            >
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Tipe transaksi</Text>
                                    <View style={styles.selectionWrap}>
                                        <SelectionChip label="Pengeluaran" icon="arrow-up-right" selected={formType === 'expense'} onPress={() => setFormType('expense')} />
                                        <SelectionChip label="Pemasukan" icon="arrow-down-left" selected={formType === 'income'} onPress={() => setFormType('income')} />
                                    </View>
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Kategori</Text>
                                    <View style={styles.selectionWrap}>
                                        {relevantCategories.map((category) => (
                                            <SelectionChip
                                                key={category.id}
                                                icon={category.icon}
                                                label={category.name}
                                                selected={formCategory === category.name}
                                                accentColor={category.color}
                                                onPress={() => setFormCategory(category.name)}
                                            />
                                        ))}
                                    </View>
                                </View>

                                <Input
                                    label="Jumlah"
                                    value={formAmount}
                                    onChangeText={(value) => setFormAmount(formatInputRupiah(value))}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    leftIcon="cash"
                                />

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Frekuensi</Text>
                                    <View style={styles.selectionWrap}>
                                        {FREQUENCY_OPTIONS.map((option) => (
                                            <SelectionChip
                                                key={option.value}
                                                label={option.label}
                                                selected={formFrequency === option.value}
                                                onPress={() => setFormFrequency(option.value)}
                                            />
                                        ))}
                                    </View>
                                </View>

                                {formFrequency === 'monthly' ? (
                                    <Input
                                        label="Tanggal bulanan"
                                        value={formDayOfMonth}
                                        onChangeText={setFormDayOfMonth}
                                        placeholder="1"
                                        keyboardType="number-pad"
                                        leftIcon="calendar-month-outline"
                                        maxLength={2}
                                        hint="Pakai angka 1-31. Sistem akan menyesuaikan saat bulan lebih pendek."
                                    />
                                ) : null}

                                <Input
                                    label="Catatan"
                                    value={formNote}
                                    onChangeText={setFormNote}
                                    placeholder="Opsional"
                                    leftIcon="text-box-outline"
                                    multiline
                                    numberOfLines={3}
                                />

                                <InlineNotice
                                    icon="clock-outline"
                                    description="Reminder untuk recurring bisa diatur lebih lanjut dari Reminder Center setelah jadwal ini disimpan."
                                    tone="primary"
                                />
                            </FormSection>

                            <View style={styles.modalActions}>
                                <Button
                                    label="Batal"
                                    onPress={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    variant="outline"
                                    style={styles.modalActionButton}
                                />
                                <Button
                                    label="Simpan"
                                    onPress={handleAddRecurring}
                                    loading={isSubmitting}
                                    style={styles.modalActionButton}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 18,
        },
        contentWide: {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
        },
        loadingWrap: {
            paddingVertical: 28,
        },
        list: {
            gap: 12,
        },
        card: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['4xl'],
            padding: 16,
            gap: 12,
        },
        cardTop: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cardCopy: {
            flex: 1,
            gap: 2,
        },
        cardTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        cardMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        amountWrap: {
            alignItems: 'flex-end',
            gap: 2,
        },
        amount: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
        },
        note: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 19,
            color: colors.textSecondary,
        },
        cardBottom: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
        },
        nextOccurrence: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        actions: {
            flexDirection: 'row',
            gap: 8,
        },
        actionButton: {
            width: 36,
            height: 36,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(10, 14, 26, 0.42)',
        },
        modalScroll: {
            flexGrow: 1,
            justifyContent: 'center',
            paddingVertical: 32,
        },
        modalCard: {
            backgroundColor: colors.panelSurface,
            borderRadius: BorderRadius['4xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
            gap: 14,
        },
        fieldGroup: {
            gap: 10,
        },
        fieldLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
        },
        selectionWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        modalActions: {
            flexDirection: 'row',
            gap: 10,
        },
        modalActionButton: {
            flex: 1,
        },
    });
