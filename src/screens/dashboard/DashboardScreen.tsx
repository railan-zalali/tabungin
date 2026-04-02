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
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InsightPanel } from '../../components/common/InsightPanel';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { ProfileSwitcher } from '../../components/profile/ProfileSwitcher';
import { SavingGoalCardSkeleton, TransactionItemSkeleton } from '../../components/common/SkeletonLoader';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    tone: 'primary' | 'success' | 'warning';
    onPress: () => void;
}

function QuickActionCard({ item }: { item: QuickAction }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const toneMap = {
        primary: { bg: colors.primaryBg, icon: colors.primary },
        success: { bg: colors.successBg, icon: colors.success },
        warning: { bg: colors.warningBg, icon: colors.warning },
    };
    const palette = toneMap[item.tone];

    return (
        <TouchableOpacity style={styles.quickActionCard} onPress={item.onPress} activeOpacity={0.9}>
            <View style={[styles.quickActionIcon, { backgroundColor: palette.bg }]}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={palette.icon} />
            </View>
            <Text style={styles.quickActionLabel}>{item.label}</Text>
        </TouchableOpacity>
    );
}

export function DashboardScreen() {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
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
                return getGoalComputedMeta(goal, wallet, activeProfileId).isSharedGoal;
            }).length,
        [activeGoals, activeProfileId, wallets],
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
            tone: 'success',
            onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'income' } }),
        },
        {
            id: 'expense',
            label: 'Catat pengeluaran',
            icon: 'arrow-down-circle-outline',
            tone: 'warning',
            onPress: () => navigation.navigate('Transactions', { screen: 'AddTransaction', params: { type: 'expense' } }),
        },
        {
            id: 'saving',
            label: 'Buat target',
            icon: 'bullseye-arrow',
            tone: 'primary',
            onPress: () => navigation.navigate('Savings', { screen: 'AddSavingGoal' }),
        },
    ];

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
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
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.sectionGap}>
                    <View style={styles.profileRow}>
                        <ProfileSwitcher />
                        {unreadCount > 0 ? <ContextBadge icon="bell-badge-outline" label={`${unreadCount} belum dibaca`} tone="warning" /> : null}
                    </View>

                    <HeroSummaryCard
                        eyebrow="Ringkasan Hari Ini"
                        title="Saldo total lintas dompet"
                        value={formatCurrency(totalBalance)}
                        description={
                            netBalance >= 0
                                ? 'Arus kas bulan ini masih positif. Waktu yang bagus untuk lanjutkan target utama.'
                                : 'Pengeluaran sedang lebih tinggi dari pemasukan bulan ini. Perlu cek kategori yang paling aktif.'
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
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.sectionGap}>
                    <SectionHeader
                        title="Aksi cepat"
                        subtitle="Tiga pintu masuk utama untuk menjaga ritme harian tetap cepat."
                    />
                    <View style={styles.quickActionGrid}>
                        {quickActions.map((item) => (
                            <QuickActionCard key={item.id} item={item} />
                        ))}
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.sectionGap}>
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
                    />
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.sectionGap}>
                    <SectionHeader
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
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(220).springify()} style={[styles.sectionGap, styles.bottomSpacing]}>
                    <SectionHeader
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
                </Animated.View>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            paddingBottom: 36,
            gap: 20,
        },
        sectionGap: {
            gap: 14,
        },
        profileRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        quickActionGrid: {
            flexDirection: 'row',
            gap: 12,
        },
        quickActionCard: {
            flex: 1,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 16,
            gap: 12,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
        },
        quickActionIcon: {
            width: 50,
            height: 50,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        quickActionLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            lineHeight: 20,
            color: colors.textPrimary,
        },
        cardList: {
            gap: 12,
        },
        transactionPanel: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 8,
            overflow: 'hidden',
        },
        separator: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 64,
            marginRight: 12,
        },
        bottomSpacing: {
            paddingBottom: 92,
        },
    });
