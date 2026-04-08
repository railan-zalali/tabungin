import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BorderRadius } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { useProfileStore } from '../../store/useProfileStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyIllustrationState } from '../../components/common/EmptyIllustrationState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { StatStrip } from '../../components/common/StatStrip';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveMetrics } from '../../utils/responsive';

type FilterTab = 'all' | 'personal' | 'shared' | 'completed';

export function SavingListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const { goals, isLoading, loadGoals } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const currentUserEmail = useAuthStore((state) => state.user?.email);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadGoals();
        loadWallets();
    }, [loadGoals, loadWallets]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadGoals(), loadWallets()]);
        } finally {
            setRefreshing(false);
        }
    };

    const goalsWithMeta = useMemo(
        () =>
            goals.map((goal) => {
                const wallet = wallets.find((item) => item.id === goal.wallet_id);
                return {
                    goal,
                    wallet,
                    meta: getGoalComputedMeta(goal, wallet, activeProfileId, [], currentUserId, null, currentUserEmail),
                };
            }),
        [activeProfileId, currentUserEmail, currentUserId, goals, wallets],
    );

    const filteredGoals = useMemo(() => {
        switch (filterTab) {
            case 'personal':
                return goalsWithMeta.filter((item) => item.meta.scope === 'personal' && !item.goal.is_completed);
            case 'shared':
                return goalsWithMeta.filter((item) => item.meta.isSharedGoal && !item.goal.is_completed);
            case 'completed':
                return goalsWithMeta.filter((item) => item.goal.is_completed);
            case 'all':
            default:
                return goalsWithMeta;
        }
    }, [filterTab, goalsWithMeta]);

    const activeGoalsCount = goalsWithMeta.filter((item) => !item.goal.is_completed).length;
    const personalGoalsCount = goalsWithMeta.filter((item) => item.meta.scope === 'personal' && !item.goal.is_completed).length;
    const sharedGoalsCount = goalsWithMeta.filter((item) => item.meta.isSharedGoal && !item.goal.is_completed).length;
    const completedGoalsCount = goalsWithMeta.filter((item) => item.goal.is_completed).length;
    const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                eyebrow="Goal Portfolio"
                title="Target tabungan"
                subtitle="Pisahkan konteks personal, shared wallet, dan target yang sudah selesai."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'plus',
                    label: 'Buat target',
                    onPress: () => navigation.navigate('AddSavingGoal'),
                }}
                variant="transparent"
            />

            <FlashList
                data={isLoading && !refreshing ? [null, null] : filteredGoals}
                keyExtractor={(item, index) => item?.goal?.id || `skeleton-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                        gap: metrics.verticalGap,
                    },
                    metrics.isWide ? styles.contentWide : null,
                ]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={
                    <View style={[styles.heroGrid, metrics.isWide ? styles.heroGridWide : null]}>
                        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroMain}>
                            <HeroSummaryCard
                                eyebrow="Ringkasan Progres"
                                title="Total dana yang sudah terkumpul"
                                value={formatCurrency(totalSaved)}
                                description={`Dari target ${formatCurrency(totalTarget)} di semua goal yang kamu pantau.`}
                                icon="piggy-bank-outline"
                                badges={
                                    <>
                                        <ContextBadge icon="bullseye-arrow" label={`${activeGoalsCount} aktif`} inverse />
                                        <ContextBadge icon="account-outline" label={`${personalGoalsCount} pribadi`} inverse />
                                        <ContextBadge icon="account-group-outline" label={`${sharedGoalsCount} bersama`} inverse />
                                    </>
                                }
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.filterBlock}>
                            <SectionHeader
                                eyebrow="Scope Filter"
                                title="Fokus tampilan"
                                subtitle="Pilih dulu konteks yang ingin kamu evaluasi sekarang."
                            />
                            <SegmentedControl
                                value={filterTab}
                                onChange={setFilterTab}
                                scrollable
                                options={[
                                    { id: 'all', label: 'Semua', count: goals.length },
                                    { id: 'personal', label: 'Pribadi', count: personalGoalsCount },
                                    { id: 'shared', label: 'Bersama', count: sharedGoalsCount },
                                    { id: 'completed', label: 'Selesai', count: completedGoalsCount },
                                ]}
                            />
                            <View style={styles.legendRow}>
                                <ContextBadge icon="account-outline" label="Pribadi" tone="primary" />
                                <ContextBadge icon="account-group-outline" label="Dompet bersama" tone="info" />
                                <ContextBadge icon="check-circle-outline" label="Selesai" tone="success" />
                            </View>
                        </Animated.View>

                        <StatStrip
                            items={[
                                { label: 'Aktif', value: `${activeGoalsCount}` },
                                { label: 'Shared', value: `${sharedGoalsCount}`, valueColor: sharedGoalsCount > 0 ? colors.info : colors.textSecondary },
                                { label: 'Selesai', value: `${completedGoalsCount}`, valueColor: completedGoalsCount > 0 ? colors.success : colors.textSecondary },
                            ]}
                            vertical={metrics.isWide}
                        />
                    </View>
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.emptyWrap}>
                            <EmptyIllustrationState
                                icon={filterTab === 'completed' ? 'check-circle-outline' : 'piggy-bank-outline'}
                                title={
                                    filterTab === 'completed'
                                        ? 'Belum ada target selesai'
                                        : filterTab === 'shared'
                                            ? 'Belum ada target bersama'
                                            : filterTab === 'personal'
                                                ? 'Belum ada target personal'
                                                : 'Belum ada target'
                                }
                                description={
                                    filterTab === 'shared'
                                        ? 'Target dari dompet bersama akan muncul di sini dengan konteks ownership yang lebih jelas.'
                                        : 'Buat satu target utama dulu supaya progres dan simulasi tabungan mulai terasa berguna.'
                                }
                                actionLabel={filterTab === 'completed' ? undefined : 'Buat target'}
                                onAction={filterTab === 'completed' ? undefined : () => navigation.navigate('AddSavingGoal')}
                            />
                        </Animated.View>
                    ) : null
                }
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item, index }) =>
                    item ? (
                        <SavingGoalCard
                            goal={item.goal}
                            animationDelay={index * 80}
                            onPress={() => navigation.navigate('SavingDetail', { goalId: item.goal.id })}
                            onAddSaving={() => navigation.navigate('SavingDetail', { goalId: item.goal.id })}
                        />
                    ) : (
                        <SavingGoalCardSkeleton />
                    )
                }
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 18,
            maxWidth: 920,
            width: '100%',
            alignSelf: 'center',
        },
        contentWide: {
            maxWidth: 1240,
            paddingTop: 10,
        },
        heroGrid: {
            gap: 18,
        },
        heroGridWide: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        heroMain: {
            flex: 1,
        },
        filterBlock: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            flex: 0.82,
        },
        legendRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        listWrap: {
            gap: 12,
        },
        emptyWrap: {
            paddingTop: 8,
            paddingBottom: 48,
        },
    });
