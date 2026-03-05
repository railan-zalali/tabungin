// Dashboard Screen — Halaman utama dengan saldo, saving goals, transaksi terbaru
import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { formatRupiah } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { TransactionItemSkeleton, SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';

export function DashboardScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const user = useAuthStore((s) => s.user);

    const {
        recentTransactions,
        totalIncome,
        totalExpense,
        isLoading: txLoading,
        loadRecent,
        refreshSummary,
        removeTransaction,
    } = useTransactionStore();

    const {
        activeGoals,
        isLoading: savLoading,
        loadGoals,
    } = useSavingStore();

    const [refreshing, setRefreshing] = React.useState(false);

    const balance = totalIncome - totalExpense;

    const loadAll = useCallback(async () => {
        await Promise.all([loadRecent(), refreshSummary(), loadGoals()]);
    }, []);

    useEffect(() => { loadAll(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    // Quick action items
    const quickActions = [
        { id: '1', icon: 'plus-circle', label: 'Pemasukan', color: Colors.success, onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'income' } }) },
        { id: '2', icon: 'minus-circle', label: 'Pengeluaran', color: Colors.danger, onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'expense' } }) },
        { id: '3', icon: 'piggy-bank', label: 'Tabungan', color: Colors.secondary, onPress: () => navigation.navigate('Savings') },
        { id: '4', icon: 'chart-bar', label: 'Laporan', color: Colors.info, onPress: () => navigation.navigate('Report') },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        accessibilityLabel="Memperbarui data"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting} allowFontScaling={true} accessibilityRole="header">
                            Halo, {user?.name?.split(' ')[0] ?? 'Kawan'}! 👋
                        </Text>
                        <Text style={styles.date} allowFontScaling={true}>
                            {formatDateLong(Date.now())}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.notifBtn}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Notifikasi"
                        accessibilityHint="Ketuk dua kali untuk melihat notifikasi"
                    >
                        <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Kartu Saldo Utama */}
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    accessible={true}
                    accessibilityRole="summary"
                    accessibilityLabel={`Total saldo ${formatRupiah(balance)}. Pemasukan bulan ini ${formatRupiah(totalIncome)}. Pengeluaran bulan ini ${formatRupiah(totalExpense)}`}
                    accessibilityLiveRegion="polite"
                >
                    <Text style={styles.balanceLabel} allowFontScaling={true}>Total Saldo</Text>
                    <Text style={styles.balanceAmount} allowFontScaling={true} numberOfLines={1}>
                        {formatRupiah(balance)}
                    </Text>
                    <Text style={styles.balancePeriod} allowFontScaling={true}>Bulan ini</Text>

                    <View style={styles.incomeExpenseRow}>
                        <View style={styles.incomeExpenseItem}>
                            <View style={styles.iconRow} accessibilityElementsHidden={true}>
                                <MaterialCommunityIcons name="arrow-up-circle" size={20} color={Colors.textInverse} />
                                <Text style={styles.incomeExpenseLabel} allowFontScaling={true}>Pemasukan</Text>
                            </View>
                            <Text style={styles.incomeAmount} allowFontScaling={true}>
                                {formatRupiah(totalIncome)}
                            </Text>
                        </View>
                        <View style={styles.dividerV} accessibilityElementsHidden={true} />
                        <View style={styles.incomeExpenseItem}>
                            <View style={styles.iconRow} accessibilityElementsHidden={true}>
                                <MaterialCommunityIcons name="arrow-down-circle" size={20} color={Colors.secondaryLight} />
                                <Text style={styles.incomeExpenseLabel} allowFontScaling={true}>Pengeluaran</Text>
                            </View>
                            <Text style={[styles.incomeAmount, { color: Colors.secondaryLight }]} allowFontScaling={true}>
                                {formatRupiah(totalExpense)}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.quickActions} accessibilityRole="toolbar" accessibilityLabel="Aksi cepat">
                    {quickActions.map((action) => (
                        <TouchableOpacity
                            key={action.id}
                            style={styles.quickAction}
                            onPress={action.onPress}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={action.label}
                            accessibilityHint={`Ketuk dua kali untuk membuka ${action.label}`}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                                <MaterialCommunityIcons
                                    name={action.icon as any}
                                    size={26}
                                    color={action.color}
                                    accessibilityElementsHidden={true}
                                />
                            </View>
                            <Text style={styles.quickActionLabel} allowFontScaling={true}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Saving Goals Preview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle} allowFontScaling={true} accessibilityRole="header">
                            🎯 Target Tabungan
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Savings')}
                            accessible={true}
                            accessibilityRole="link"
                            accessibilityLabel="Lihat semua target tabungan"
                            hitSlop={{ top: 10, bottom: 10 }}
                        >
                            <Text style={styles.seeAll} allowFontScaling={true}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {savLoading ? (
                        <>
                            <SavingGoalCardSkeleton />
                            <SavingGoalCardSkeleton />
                        </>
                    ) : activeGoals.length === 0 ? (
                        <EmptyState
                            icon="piggy-bank-outline"
                            title="Belum ada target tabungan"
                            description="Tambahkan target tabunganmu dan mulai wujudkan impianmu!"
                            actionLabel="Buat Target"
                            onAction={() => navigation.navigate('Savings', { screen: 'AddSavingGoal' })}
                            style={{ paddingVertical: 24 }}
                        />
                    ) : (
                        activeGoals.slice(0, 3).map((goal, idx) => (
                            <SavingGoalCard
                                key={goal.id}
                                goal={goal}
                                animationDelay={idx * 100}
                                onPress={() => navigation.navigate('Savings', { screen: 'SavingDetail', params: { goalId: goal.id } })}
                                onAddSaving={() => navigation.navigate('Savings', { screen: 'SavingDetail', params: { goalId: goal.id } })}
                            />
                        ))
                    )}
                </View>

                {/* Transaksi Terbaru */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle} allowFontScaling={true} accessibilityRole="header">
                            💳 Transaksi Terbaru
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Transactions')}
                            accessible={true}
                            accessibilityRole="link"
                            accessibilityLabel="Lihat semua transaksi"
                            hitSlop={{ top: 10, bottom: 10 }}
                        >
                            <Text style={styles.seeAll} allowFontScaling={true}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.transactionList, Shadow.sm]}>
                        {txLoading ? (
                            <>
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                            </>
                        ) : recentTransactions.length === 0 ? (
                            <EmptyState
                                icon="receipt"
                                title="Belum ada transaksi"
                                description="Mulai catat pemasukan & pengeluaranmu"
                                style={{ paddingVertical: 24 }}
                            />
                        ) : (
                            recentTransactions.map((tx, idx) => (
                                <React.Fragment key={tx.id}>
                                    <TransactionItem
                                        transaction={tx}
                                        onDelete={removeTransaction}
                                        onPress={(t) => navigation.navigate('Transactions', { screen: 'TransactionDetail', params: { transactionId: t.id } })}
                                    />
                                    {idx < recentTransactions.length - 1 && <View style={styles.separator} />}
                                </React.Fragment>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    container: { paddingBottom: 100, gap: 0 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    greeting: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: Colors.textPrimary },
    date: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
    notifBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.surface },

    balanceCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 24,
        gap: 4,
        ...Shadow.lg,
    },
    balanceLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.8)' },
    balanceAmount: { fontFamily: FontFamily.heading, fontSize: 34, color: Colors.textInverse, marginTop: 2 },
    balancePeriod: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
    incomeExpenseRow: { flexDirection: 'row', marginTop: 4 },
    dividerV: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },
    incomeExpenseItem: { flex: 1, gap: 4 },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    incomeExpenseLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.8)' },
    incomeAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.textInverse },

    quickActions: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginVertical: 20,
        gap: 10,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
        minHeight: 88,
        justifyContent: 'center',
    },
    quickActionIcon: {
        width: 54,
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },

    section: { gap: 12, marginBottom: 8 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 4,
    },
    sectionTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    seeAll: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.primary },
    transactionList: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 20,
    },
    separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 72 },
});
