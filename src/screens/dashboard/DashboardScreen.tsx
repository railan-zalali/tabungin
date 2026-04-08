import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatCurrency } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { useAuthStore } from '../../store/useAuthStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import type { DashboardNavigationProp } from '../../types/navigation';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ActionTile } from '../../components/common/ActionTile';
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InsightPanel } from '../../components/common/InsightPanel';
import { MetricCard } from '../../components/common/MetricCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { ProfileSwitcher } from '../../components/profile/ProfileSwitcher';
import { SavingGoalCardSkeleton, TransactionItemSkeleton } from '../../components/common/SkeletonLoader';
import { useResponsiveMetrics } from '../../utils/responsive';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    description: string;
    tone: 'primary' | 'success' | 'warning';
    onPress: () => void;
}

export function DashboardScreen() {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const user = useAuthStore((state) => state.user);
    const { profiles, activeProfileId, loadProfiles } = useProfileStore();
    const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
    const [refreshing, setRefreshing] = useState(false);

    const {
        recentTransactions,
        totalIncome,
        totalExpense,
        isLoading: txLoading,
        loadRecent,
        refreshSummary,
        removeTransaction,
    } = useTransactionStore();
    const { goals, activeGoals, isLoading: savingLoading, loadGoals } = useSavingStore();
    const { wallets, totalBalance, loadWallets } = useWalletStore();
    const { unreadCount, loadUnreadCount } = useNotificationStore();
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const categoryCount = useCategoryStore((state) => state.categories.length);

    const sharedGoalsCount = useMemo(
        () =>
            activeGoals.filter((goal) => {
                const wallet = wallets.find((item) => item.id === goal.wallet_id);
                return getGoalComputedMeta(goal, wallet, activeProfileId, [], user?.id, null, user?.email).isSharedGoal;
            }).length,
        [activeGoals, activeProfileId, user?.id, wallets],
    );
    const sharedWalletCount = useMemo(
        () => wallets.filter((wallet) => wallet.profile_id && wallet.profile_id !== activeProfileId).length,
        [activeProfileId, wallets],
    );
    const netBalance = totalIncome - totalExpense;

    const loadAll = useCallback(async () => {
        await loadProfiles();
        await Promise.all([loadRecent(), refreshSummary(), loadGoals(), loadWallets(), loadUnreadCount()]);
    }, [loadGoals, loadProfiles, loadRecent, loadUnreadCount, loadWallets, refreshSummary]);

    useEffect(() => {
        loadAll().catch((error) => console.error('Dashboard load failed:', error));
    }, [loadAll]);

    useEffect(() => {
        if (categoryCount === 0) {
            loadCategories();
        }
    }, [categoryCount, loadCategories]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadAll();
        } finally {
            setRefreshing(false);
        }
    };

    const quickActions: QuickAction[] = [
        {
            id: 'income',
            label: 'Catat pemasukan',
            icon: 'arrow-up-circle-outline',
            description: 'Masukkan pemasukan baru dan kaitkan ke dompet yang tepat.',
            tone: 'success',
            onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'income' } }),
        },
        {
            id: 'expense',
            label: 'Catat pengeluaran',
            icon: 'arrow-down-circle-outline',
            description: 'Tambahkan pengeluaran cepat tanpa kehilangan konteks kategori.',
            tone: 'warning',
            onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'expense' } }),
        },
        {
            id: 'saving',
            label: 'Buat target',
            icon: 'bullseye-arrow',
            description: 'Mulai satu goal baru agar ritme menabung lebih terarah.',
            tone: 'primary',
            onPress: () => navigation.navigate('Savings', { screen: 'AddSavingGoal' }),
        },
    ];

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                eyebrow="Dashboard Harian"
                title={`Halo, ${user?.name ? user.name.split(' ')[0] : 'Kawan'}`}
                subtitle={formatDateLong(Date.now())}
                rightAction={{
                    icon: 'bell-outline',
                    label: 'Buka notifikasi',
                    onPress: () => navigation.navigate('Settings', { screen: 'Notifications' } as never),
                }}
                contextBadges={
                    <>
                        {activeProfile ? <ContextBadge icon="account-circle-outline" label={activeProfile.name} tone="primary" /> : null}
                        <ContextBadge icon="wallet-outline" label={`${wallets.length} dompet`} tone="neutral" />
                        {sharedWalletCount > 0 ? (
                            <ContextBadge icon="account-group-outline" label={`${sharedWalletCount} bersama`} tone="info" />
                        ) : null}
                    </>
                }
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                        gap: metrics.verticalGap + 2,
                    },
                    metrics.isWide ? styles.contentWide : null,
                ]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <Animated.View entering={FadeInDown.delay(40).springify()} style={[styles.sectionGap, metrics.isWide ? styles.sectionGapWide : null]}>
                    <View style={styles.profileRow}>
                        <ProfileSwitcher />
                        {unreadCount > 0 ? <ContextBadge icon="bell-badge-outline" label={`${unreadCount} belum dibaca`} tone="warning" /> : null}
                    </View>

                    <View style={[styles.overviewGrid, metrics.isWide ? styles.overviewGridWide : null]}>
                        <View style={styles.overviewMain}>
                            <HeroSummaryCard
                                eyebrow="Financial Overview"
                                title="Saldo total lintas dompet"
                                value={formatCurrency(totalBalance)}
                                description={
                                    netBalance >= 0
                                        ? 'Arus kas bulan ini masih positif. Saat yang bagus untuk lanjut menjaga target utama tetap bergerak.'
                                        : 'Pengeluaran bulan ini lebih agresif dari pemasukan. Cek kategori utama sebelum ritme makin berat.'
                                }
                                icon="wallet-outline"
                                badges={
                                    <>
                                        <ContextBadge icon="piggy-bank-outline" label={`${goals.length} target`} inverse />
                                        <ContextBadge icon="credit-card-multiple-outline" label={`${wallets.length} dompet`} inverse />
                                        {sharedGoalsCount > 0 ? (
                                            <ContextBadge icon="account-group-outline" label={`${sharedGoalsCount} target bersama`} inverse />
                                        ) : null}
                                    </>
                                }
                                stats={[
                                    { label: 'Pemasukan', value: formatCurrency(totalIncome), icon: 'arrow-up' },
                                    { label: 'Pengeluaran', value: formatCurrency(totalExpense), icon: 'arrow-down' },
                                ]}
                                ctaLabel="Buka insight keuangan"
                                onPressCta={() => navigation.navigate('Report')}
                            />

                            <View style={styles.metricRow}>
                                <MetricCard
                                    label="Saldo bersih"
                                    value={formatCurrency(Math.abs(netBalance))}
                                    icon={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                                    tone={netBalance >= 0 ? 'success' : 'warning'}
                                    caption={netBalance >= 0 ? 'Masih surplus di bulan berjalan' : 'Perlu pengendalian pengeluaran'}
                                />
                                <MetricCard
                                    label="Notifikasi"
                                    value={unreadCount > 0 ? `${unreadCount} baru` : 'Inbox bersih'}
                                    icon="bell-outline"
                                    tone="primary"
                                    caption="Pantau update penting tanpa membuka banyak layar."
                                />
                            </View>
                        </View>

                        <View style={styles.overviewSide}>
                            <SectionHeader
                                eyebrow="Next Best Actions"
                                title="Aksi cepat"
                                subtitle="Tiga aksi paling sering dipakai, dibuat jelas dan mudah dijangkau."
                            />
                            <View style={[styles.quickActionGrid, metrics.widthClass === 'compact' ? styles.quickActionGridStack : null, metrics.isWide ? styles.quickActionGridWide : null]}>
                                {quickActions.map((item) => (
                                    <ActionTile
                                        key={item.id}
                                        icon={item.icon}
                                        title={item.label}
                                        description={item.description}
                                        tone={item.tone}
                                        onPress={item.onPress}
                                    />
                                ))}
                            </View>

                            <InsightPanel
                                title="Fokus yang layak dipantau"
                                description={
                                    sharedGoalsCount > 0
                                        ? `Ada ${sharedGoalsCount} target bersama aktif. Pastikan konteks wallet dan ownership tetap jelas saat menambah progres.`
                                        : activeGoals.length > 0
                                            ? `Masih ada ${activeGoals.length} target aktif. Sedikit kontribusi rutin akan menjaga progres tetap sehat.`
                                            : 'Belum ada target aktif. Membuat satu target utama akan membantu dashboard terasa lebih actionable.'
                                }
                                badges={
                                    <>
                                        <ContextBadge
                                            icon={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                                            label={netBalance >= 0 ? 'Arus kas positif' : 'Perlu perhatian'}
                                            tone={netBalance >= 0 ? 'success' : 'warning'}
                                        />
                                        <ContextBadge icon="calendar-month-outline" label="Bulan berjalan" tone="neutral" />
                                    </>
                                }
                                actionLabel={activeGoals.length > 0 ? 'Lihat target aktif' : 'Buat target pertama'}
                                onAction={() =>
                                            navigation.navigate('Savings', {
                                                screen: activeGoals.length > 0 ? 'SavingList' : 'AddSavingGoal',
                                            })
                                        }
                                tone={netBalance >= 0 ? 'primary' : 'warning'}
                            />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(160).springify()} style={[styles.bottomGrid, metrics.isWide ? styles.bottomGridWide : null]}>
                    <View style={styles.bottomColumn}>
                        <SectionHeader
                            eyebrow="Saving Goals"
                            title="Target tabungan"
                            subtitle="Target yang sedang bergerak sekarang, lengkap dengan konteks personal atau shared."
                            actionLabel="Lihat semua"
                            onAction={() => navigation.navigate('Savings', { screen: 'SavingList' })}
                        />

                        {savingLoading ? (
                            <View style={styles.cardList}>
                                <SavingGoalCardSkeleton />
                                <SavingGoalCardSkeleton />
                            </View>
                        ) : activeGoals.length === 0 ? (
                            <EmptyState
                                icon="piggy-bank-outline"
                                title="Belum ada target aktif"
                                description="Mulai dari satu target utama dulu supaya dashboard punya alasan yang jelas untuk dipantau setiap hari."
                                actionLabel="Buat target"
                                onAction={() => navigation.navigate('Savings', { screen: 'AddSavingGoal' })}
                            />
                        ) : (
                            <View style={styles.cardList}>
                                {activeGoals.slice(0, 2).map((goal, index) => (
                                    <SavingGoalCard
                                        key={goal.id}
                                        goal={goal}
                                        animationDelay={index * 70}
                                        onPress={() => navigation.navigate('Savings', { screen: 'SavingDetail', params: { goalId: goal.id } })}
                                        onAddSaving={() =>
                                            navigation.navigate('Savings', { screen: 'SavingDetail', params: { goalId: goal.id } })
                                        }
                                    />
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.bottomColumn}>
                        <SectionHeader
                            eyebrow="Recent Flow"
                            title="Transaksi terbaru"
                            subtitle="Pantau apa yang baru berubah sebelum kamu pindah ke layar transaksi penuh."
                            actionLabel="Lihat semua"
                            onAction={() => navigation.navigate('Transactions', { screen: 'TransactionList' })}
                        />

                        <View style={styles.transactionPanel}>
                            {txLoading ? (
                                <>
                                    <TransactionItemSkeleton />
                                    <TransactionItemSkeleton />
                                </>
                            ) : recentTransactions.length === 0 ? (
                                <EmptyState
                                    icon="receipt-text-outline"
                                    title="Belum ada transaksi"
                                    description="Catatan pertama akan langsung membuat dashboard lebih hidup dan laporan lebih berguna."
                                    actionLabel="Tambah transaksi"
                                    onAction={() => navigation.navigate('Transactions', { screen: 'AddTransaction' })}
                                    compact
                                />
                            ) : (
                                recentTransactions.map((transaction, index) => (
                                    <View key={transaction.id}>
                                        <TransactionItem
                                            transaction={transaction}
                                            onDelete={removeTransaction}
                                            onEdit={(id) => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { editId: id } })}
                                            onPress={(item) =>
                                                navigation.navigate('Transactions', { screen: 'TransactionDetail', params: { transactionId: item.id } })
                                            }
                                        />
                                        {index < recentTransactions.length - 1 ? <View style={styles.separator} /> : null}
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 20,
        },
        contentWide: {
            maxWidth: 1280,
            width: '100%',
            alignSelf: 'center',
            paddingTop: 10,
        },
        sectionGap: {
            gap: 14,
        },
        sectionGapWide: {
            gap: 18,
        },
        profileRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        overviewGrid: {
            gap: 16,
        },
        overviewGridWide: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        overviewMain: {
            flex: 1.2,
        },
        overviewSide: {
            flex: 0.8,
            gap: 14,
        },
        quickActionGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        quickActionGridStack: {
            flexDirection: 'column',
        },
        quickActionGridWide: {
            flexDirection: 'column',
        },
        metricRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 12,
        },
        cardList: {
            gap: 12,
        },
        transactionPanel: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['4xl'],
            padding: 8,
            overflow: 'hidden',
        },
        bottomGrid: {
            gap: 18,
        },
        bottomGridWide: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        bottomColumn: {
            flex: 1,
            gap: 14,
        },
        separator: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 64,
            marginRight: 12,
        },
    });
