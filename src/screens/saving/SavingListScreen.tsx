import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { formatCurrency } from '../../utils/currency';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { useProfileStore } from '../../store/useProfileStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import type { SavingNavigationProp } from '../../types/navigation';

type FilterTab = 'all' | 'personal' | 'shared' | 'completed';

export function SavingListScreen() {
    const navigation = useNavigation<SavingNavigationProp<'SavingList'>>();
    const { colors } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { goals, isLoading, loadGoals } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
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
                    meta: getGoalComputedMeta(goal, wallet, activeProfileId),
                };
            }),
        [activeProfileId, goals, wallets],
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <Animated.View entering={FadeInDown.delay(60).springify()}>
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

                {isLoading && !refreshing ? (
                    <View style={styles.listWrap}>
                        <SavingGoalCardSkeleton />
                        <SavingGoalCardSkeleton />
                    </View>
                ) : filteredGoals.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.emptyWrap}>
                        <EmptyState
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
                ) : (
                    <View style={styles.listWrap}>
                        {filteredGoals.map(({ goal }, index) => (
                            <SavingGoalCard
                                key={goal.id}
                                goal={goal}
                                animationDelay={index * 80}
                                onPress={() => navigation.navigate('SavingDetail', { goalId: goal.id })}
                                onAddSaving={() => navigation.navigate('SavingDetail', { goalId: goal.id })}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        filterBlock: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
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
        },
    });
