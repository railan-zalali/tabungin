// Transaction List Screen — dengan filter, search, grouped by date
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    SectionList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useTransactionStore } from '../../store/useTransactionStore';
import type { Transaction, DailySummary } from '../../types/transaction';
import { formatRupiah } from '../../utils/currency';
import { formatDateGroup, startOfDay, endOfDay, isSameDay } from '../../utils/date';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { TransactionItemSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'today' | 'week' | 'month' | 'all';

export function TransactionListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { transactions, isLoading, loadTransactions, removeTransaction } = useTransactionStore();
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterPeriod, setFilterPeriod] = useState<PeriodType>('month');
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

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
    const grouped = React.useMemo(() => {
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
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title} allowFontScaling={true} accessibilityRole="header">
                    Transaksi
                </Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddTransaction')}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Tambah transaksi baru"
                >
                    <MaterialCommunityIcons name="plus" size={22} color={Colors.textInverse} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} accessibilityElementsHidden={true} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari transaksi..."
                    placeholderTextColor={Colors.textDisabled}
                    value={search}
                    onChangeText={setSearch}
                    accessible={true}
                    accessibilityLabel="Cari transaksi"
                    allowFontScaling={true}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} accessible={true} accessibilityLabel="Hapus pencarian">
                        <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tipe */}
            <View style={styles.filterRow} accessibilityRole="tablist">
                {typeFilters.map((f) => (
                    <TouchableOpacity
                        key={f.id}
                        style={[styles.filterTab, filterType === f.id && styles.filterTabActive]}
                        onPress={() => setFilterType(f.id)}
                        accessible={true}
                        accessibilityRole="tab"
                        accessibilityLabel={f.label}
                        accessibilityState={{ selected: filterType === f.id }}
                    >
                        <Text
                            style={[styles.filterTabText, filterType === f.id && styles.filterTabTextActive]}
                            allowFontScaling={true}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Filter Periode */}
            <View style={styles.periodRow}>
                {periodFilters.map((f) => (
                    <TouchableOpacity
                        key={f.id}
                        style={[styles.periodChip, filterPeriod === f.id && styles.periodChipActive]}
                        onPress={() => setFilterPeriod(f.id)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={f.label}
                        accessibilityState={{ selected: filterPeriod === f.id }}
                    >
                        <Text
                            style={[styles.periodChipText, filterPeriod === f.id && styles.periodChipTextActive]}
                            allowFontScaling={true}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {isLoading ? (
                <View>
                    <TransactionItemSkeleton /><TransactionItemSkeleton /><TransactionItemSkeleton />
                </View>
            ) : grouped.length === 0 ? (
                <EmptyState
                    icon="receipt"
                    title="Tidak ada transaksi"
                    description="Coba ubah filter atau mulai catat transaksimu"
                    actionLabel="Tambah Transaksi"
                    onAction={() => navigation.navigate('AddTransaction')}
                />
            ) : (
                <SectionList
                    sections={grouped}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionDate} allowFontScaling={true}>{section.title}</Text>
                            <View style={styles.sectionSummary}>
                                {section.totalIncome > 0 && (
                                    <Text style={styles.incomeSmall} allowFontScaling={true}>
                                        +{formatRupiah(section.totalIncome)}
                                    </Text>
                                )}
                                {section.totalExpense > 0 && (
                                    <Text style={styles.expenseSmall} allowFontScaling={true}>
                                        -{formatRupiah(section.totalExpense)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                    renderItem={({ item, index, section }) => (
                        <>
                            <TransactionItem
                                transaction={item}
                                onDelete={removeTransaction}
                                onEdit={(id) => navigation.navigate('AddTransaction', { editId: id })}
                                onPress={(t) => navigation.navigate('TransactionDetail', { transactionId: t.id })}
                            />
                            {index < section.data.length - 1 && (
                                <View style={{ height: 1, backgroundColor: Colors.divider, marginLeft: 72 }} />
                            )}
                        </>
                    )}
                    renderSectionFooter={() => <View style={{ height: 8, backgroundColor: Colors.background }} />}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddTransaction')}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Tambah transaksi baru"
                accessibilityHint="Ketuk dua kali untuk membuka form tambah transaksi"
            >
                <MaterialCommunityIcons name="plus" size={28} color={Colors.textInverse} accessibilityElementsHidden={true} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        ...Shadow.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },
    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 0,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 9,
        minHeight: 40,
        justifyContent: 'center',
    },
    filterTabActive: { backgroundColor: Colors.surface, ...Shadow.sm },
    filterTabText: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.textSecondary },
    filterTabTextActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
    periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    periodChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 36, justifyContent: 'center' },
    periodChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    periodChipText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    periodChipTextActive: { color: Colors.primaryDark, fontFamily: FontFamily.bodyMedium },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.background,
    },
    sectionDate: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.caption, color: Colors.textSecondary, textTransform: 'uppercase' },
    sectionSummary: { flexDirection: 'row', gap: 12 },
    incomeSmall: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.success },
    expenseSmall: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.danger },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.lg,
    },
});
