import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    StatusBar,
    Animated as RNAnimated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useTransactionStore } from '../../store/useTransactionStore';
import type { Transaction } from '../../types/transaction';
import { formatCurrency } from '../../utils/currency';
import { formatDateGroup } from '../../utils/date';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { TransactionItemSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'today' | 'week' | 'month' | 'all';

export function TransactionListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { transactions, isLoading, loadTransactions, removeTransaction } = useTransactionStore();
    
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterPeriod, setFilterPeriod] = useState<PeriodType>('month');
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // Header Animation
    const scrollY = new RNAnimated.Value(0);

    const load = useCallback(() => {
        loadTransactions({
            type: filterType === 'all' ? 'all' : filterType,
            period: filterPeriod === 'all' ? undefined : filterPeriod as any,
            searchQuery: search || undefined,
        });
    }, [filterType, filterPeriod, search]);

    useEffect(() => { load(); }, [filterType, filterPeriod, search]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    // Kelompokkan transaksi berdasarkan tanggal
    const grouped = useMemo(() => {
        const map = new Map<string, { date: number; transactions: Transaction[] }>();
        for (const tx of transactions) {
            const dayKey = new Date(tx.date).toDateString();
            if (!map.has(dayKey)) {
                map.set(dayKey, { date: tx.date, transactions: [] });
            }
            map.get(dayKey)!.transactions.push(tx);
        }
        return Array.from(map.values()).map((group) => ({
            title: formatDateGroup(group.date),
            date: group.date,
            data: group.transactions,
            totalIncome: group.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            totalExpense: group.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        }));
    }, [transactions]);

    const typeFilters: { id: FilterType; label: string }[] = [
        { id: 'all', label: 'Semua' },
        { id: 'income', label: 'Pemasukan' },
        { id: 'expense', label: 'Pengeluaran' },
    ];

    const periodFilters: { id: PeriodType; label: string }[] = [
        { id: 'today', label: 'Hari ini' },
        { id: 'week', label: 'Minggu ini' },
        { id: 'month', label: 'Bulan ini' },
        { id: 'all', label: 'Semua' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaksi</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddTransaction')}
                >
                    <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search & Filters */}
            <View style={styles.filterContainer}>
                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari transaksi..."
                        placeholderTextColor={Colors.textDisabled}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Type Filter */}
                <View style={styles.typeFilterRow}>
                    {typeFilters.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[
                                styles.typeFilterTab, 
                                filterType === f.id && styles.typeFilterTabActive,
                                filterType === f.id && { backgroundColor: f.id === 'income' ? Colors.successBg : f.id === 'expense' ? Colors.dangerBg : Colors.surfaceAlt }
                            ]}
                            onPress={() => setFilterType(f.id)}
                        >
                            <Text
                                style={[
                                    styles.typeFilterText, 
                                    filterType === f.id && styles.typeFilterTextActive,
                                    filterType === f.id && { color: f.id === 'income' ? Colors.success : f.id === 'expense' ? Colors.danger : Colors.textPrimary }
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Period Filter */}
                <View style={styles.periodFilterRow}>
                    {periodFilters.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.periodChip, filterPeriod === f.id && styles.periodChipActive]}
                            onPress={() => setFilterPeriod(f.id)}
                        >
                            <Text style={[styles.periodText, filterPeriod === f.id && styles.periodTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* List */}
            {isLoading && !refreshing ? (
                <View style={styles.listContainer}>
                    <TransactionItemSkeleton /><TransactionItemSkeleton /><TransactionItemSkeleton />
                </View>
            ) : grouped.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <EmptyState
                        icon="receipt"
                        title="Tidak ada transaksi"
                        message="Coba ubah filter atau mulai catat transaksimu"
                        actionLabel="Tambah Transaksi"
                        onAction={() => navigation.navigate('AddTransaction')}
                    />
                </View>
            ) : (
                <SectionList
                    sections={grouped}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.sectionSummary}>
                                {section.totalIncome > 0 && (
                                    <Text style={styles.incomeText}>+{formatCurrency(section.totalIncome)}</Text>
                                )}
                                {section.totalExpense > 0 && (
                                    <Text style={styles.expenseText}>-{formatCurrency(section.totalExpense)}</Text>
                                )}
                            </View>
                        </View>
                    )}
                    renderItem={({ item, index, section }) => (
                        <View style={styles.itemWrapper}>
                            <TransactionItem
                                transaction={item}
                                onDelete={removeTransaction}
                                onEdit={(id) => navigation.navigate('AddTransaction', { editId: id })}
                                onPress={(t) => navigation.navigate('TransactionDetail', { transactionId: t.id })}
                            />
                            {index < section.data.length - 1 && <View style={styles.separator} />}
                        </View>
                    )}
                    renderSectionFooter={() => <View style={{ height: 16 }} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.background,
    },
    backBtn: { padding: 4 },
    headerTitle: { ...Typography.h2, color: Colors.textPrimary },
    addBtn: { 
        padding: 4,
        backgroundColor: Colors.primaryLight,
        borderRadius: 8,
    },

    filterContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        gap: 12,
    },
    
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },

    typeFilterRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeFilterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeFilterTabActive: {
        backgroundColor: Colors.surfaceAlt,
    },
    typeFilterText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
    },
    typeFilterTextActive: {
        fontFamily: FontFamily.bodyBold,
        color: Colors.textPrimary,
    },

    periodFilterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    periodChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    periodChipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primaryLight,
    },
    periodText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
    },
    periodTextActive: {
        fontFamily: FontFamily.bodyBold,
        color: Colors.primaryDark,
    },

    listContainer: { padding: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    listContent: { padding: 20, paddingBottom: 100 },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionSummary: {
        flexDirection: 'row',
        gap: 8,
    },
    incomeText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: Colors.success,
    },
    expenseText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: Colors.danger,
    },

    itemWrapper: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        ...Shadow.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: -1, // Overlap borders for list look
    },
    separator: {
        height: 1,
        backgroundColor: Colors.divider,
        marginLeft: 56, // Align with text
    },
});
