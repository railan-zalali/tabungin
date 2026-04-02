import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { formatCurrency } from '../../utils/currency';
import { formatDateGroup } from '../../utils/date';
import type { Transaction } from '../../types/transaction';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterBar } from '../../components/common/FilterBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { TransactionItemSkeleton } from '../../components/common/SkeletonLoader';
import { TransactionItem } from '../../components/transaction/TransactionItem';

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'today' | 'week' | 'month' | 'all';

export function TransactionListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { transactions, isLoading, loadTransactions, removeTransaction } = useTransactionStore();
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const categoryCount = useCategoryStore((state) => state.categories.length);

    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterPeriod, setFilterPeriod] = useState<PeriodType>('month');
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(() => {
        return loadTransactions({
            type: filterType === 'all' ? 'all' : filterType,
            period: filterPeriod === 'all' ? undefined : (filterPeriod as any),
            searchQuery: search || undefined,
        });
    }, [filterPeriod, filterType, loadTransactions, search]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            load();
        }, 350);
        return () => clearTimeout(timeout);
    }, [load]);

    useEffect(() => {
        if (categoryCount === 0) {
            loadCategories();
        }
    }, [categoryCount, loadCategories]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await load();
        } finally {
            setRefreshing(false);
        }
    };

    const grouped = useMemo(() => {
        const map = new Map<string, { date: number; transactions: Transaction[] }>();
        for (const transaction of transactions) {
            const key = new Date(transaction.date).toDateString();
            if (!map.has(key)) {
                map.set(key, { date: transaction.date, transactions: [] });
            }
            map.get(key)?.transactions.push(transaction);
        }

        return Array.from(map.values()).map((group) => ({
            title: formatDateGroup(group.date),
            date: group.date,
            data: group.transactions,
            totalIncome: group.transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
            totalExpense: group.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        }));
    }, [transactions]);

    const netAmount = useMemo(
        () =>
            transactions.reduce((sum, item) => {
                return sum + (item.type === 'income' ? item.amount : -item.amount);
            }, 0),
        [transactions],
    );

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Transaksi"
                subtitle="Cari, saring, dan baca perubahan arus uang dengan lebih cepat."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'plus',
                    label: 'Tambah transaksi',
                    onPress: () => navigation.navigate('AddTransaction'),
                }}
                variant="transparent"
            />

            <View style={styles.content}>
                <FilterBar
                    title="Cari dan saring"
                    subtitle="Supaya daftar panjang tetap terasa ringan dipindai."
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Cari kategori atau catatan..."
                    resultLabel={`${grouped.length} kelompok hari`}
                    segmentValue={filterType}
                    segmentOptions={[
                        { id: 'all', label: 'Semua' },
                        { id: 'income', label: 'Pemasukan' },
                        { id: 'expense', label: 'Pengeluaran' },
                    ]}
                    onSegmentChange={setFilterType}
                    chipValue={filterPeriod}
                    chipOptions={[
                        { id: 'today', label: 'Hari ini' },
                        { id: 'week', label: 'Minggu ini' },
                        { id: 'month', label: 'Bulan ini' },
                        { id: 'all', label: 'Semua' },
                    ]}
                    onChipChange={setFilterPeriod}
                />

                <View style={styles.summaryStrip}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Transaksi</Text>
                        <Text style={styles.summaryValue}>{transactions.length}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Net</Text>
                        <Text style={[styles.summaryValue, { color: netAmount >= 0 ? colors.success : colors.danger }]}>
                            {formatCurrency(Math.abs(netAmount))}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Mode</Text>
                        <Text style={styles.summaryValue}>{filterPeriod === 'all' ? 'Semua' : filterPeriod}</Text>
                    </View>
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.loadingList}>
                        <TransactionItemSkeleton />
                        <TransactionItemSkeleton />
                        <TransactionItemSkeleton />
                    </View>
                ) : grouped.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <EmptyState
                            icon="receipt-text-outline"
                            title="Belum ada transaksi yang cocok"
                            description="Coba longgarkan filter atau tambahkan transaksi baru supaya ritme keuanganmu mulai terbaca."
                            actionLabel="Tambah transaksi"
                            onAction={() => navigation.navigate('AddTransaction')}
                        />
                    </View>
                ) : (
                    <SectionList
                        sections={grouped}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        stickySectionHeadersEnabled={false}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                        renderSectionHeader={({ section }) => (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <View style={styles.sectionMeta}>
                                    {section.totalIncome > 0 ? <Text style={styles.incomeText}>+{formatCurrency(section.totalIncome)}</Text> : null}
                                    {section.totalExpense > 0 ? <Text style={styles.expenseText}>-{formatCurrency(section.totalExpense)}</Text> : null}
                                </View>
                            </View>
                        )}
                        renderItem={({ item, index, section }) => (
                            <View style={styles.itemBlock}>
                                <TransactionItem
                                    transaction={item}
                                    onDelete={removeTransaction}
                                    onEdit={(id) => navigation.navigate('AddTransaction', { editId: id })}
                                    onPress={(transaction) => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
                                />
                                {index < section.data.length - 1 ? <View style={styles.separator} /> : null}
                            </View>
                        )}
                        renderSectionFooter={() => <View style={{ height: 16 }} />}
                    />
                )}
            </View>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            flex: 1,
            paddingHorizontal: 20,
            gap: 14,
        },
        summaryStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        summaryItem: {
            flex: 1,
            alignItems: 'center',
            gap: 4,
        },
        summaryDivider: {
            width: 1,
            height: 28,
            backgroundColor: colors.divider,
        },
        summaryLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        summaryValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        loadingList: {
            gap: 12,
            paddingTop: 6,
        },
        emptyWrap: {
            flex: 1,
            justifyContent: 'center',
            paddingBottom: 80,
        },
        listContent: {
            paddingBottom: 104,
        },
        sectionHeader: {
            marginTop: 10,
            marginBottom: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: BorderRadius['2xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        sectionTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        sectionMeta: {
            flexDirection: 'row',
            gap: 8,
        },
        incomeText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.success,
        },
        expenseText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
        itemBlock: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
        },
        separator: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 60,
            marginRight: 12,
        },
    });
