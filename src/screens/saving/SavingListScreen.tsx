import React, { useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { ContextBadge } from '../../components/common/ContextBadge';

type FilterTab = 'all' | 'personal' | 'shared' | 'completed';

export function SavingListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
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
        await Promise.all([loadGoals(), loadWallets()]);
        setRefreshing(false);
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
        [activeProfileId, goals, wallets]
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

    const tabFilters: { id: FilterTab; label: string }[] = [
        { id: 'all', label: `Semua (${goals.length})` },
        { id: 'personal', label: `Pribadi (${personalGoalsCount})` },
        { id: 'shared', label: `Bersama (${sharedGoalsCount})` },
        { id: 'completed', label: `Selesai (${completedGoalsCount})` },
    ];

    return (
        <ScreenShell>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Target Tabungan</Text>
                    <Text style={styles.headerSubtitle}>Pisahkan target personal, dompet bersama, dan hasil share.</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddSavingGoal')}>
                    <MaterialCommunityIcons name="plus" size={22} color={colors.textInverse} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <Animated.View entering={FadeInDown.delay(80).springify()}>
                    <LinearGradient colors={[colors.primary, colors.primaryDark, colors.primary]} style={styles.summaryCard}>
                        <View style={styles.summaryGlowTop} />
                        <View style={styles.summaryGlowBottom} />

                        <View style={styles.summaryHeaderRow}>
                            <View style={styles.summaryCopy}>
                                <Text style={styles.summaryLabel}>Total Terkumpul</Text>
                                <Text style={styles.summaryAmount}>{formatCurrency(totalSaved)}</Text>
                                <Text style={styles.summarySubtext}>Dari target {formatCurrency(totalTarget)}</Text>
                            </View>
                            <View style={styles.summaryIcon}>
                                <MaterialCommunityIcons name="piggy-bank-outline" size={30} color={colors.textInverse} />
                            </View>
                        </View>

                        <View style={styles.badgeRow}>
                            <ContextBadge icon="bullseye-arrow" label={`${activeGoalsCount} aktif`} inverse />
                            <ContextBadge icon="account-outline" label={`${personalGoalsCount} pribadi`} inverse />
                            <ContextBadge icon="account-group-outline" label={`${sharedGoalsCount} bersama`} inverse />
                        </View>
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.filterBlock}>
                    <SectionHeader
                        title="Fokus Tampilan"
                        subtitle="Pilih konteks yang ingin kamu pantau sekarang."
                    />
                    <SegmentedControl value={filterTab} options={tabFilters} onChange={setFilterTab} />
                </Animated.View>

                <View style={styles.legendRow}>
                    <ContextBadge icon="account-outline" label="Pribadi" tone="primary" />
                    <ContextBadge icon="account-group-outline" label="Dompet Bersama" tone="info" />
                    <ContextBadge icon="check-circle-outline" label="Selesai" tone="success" />
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.listContainer}>
                        <SavingGoalCardSkeleton />
                        <SavingGoalCardSkeleton />
                    </View>
                ) : filteredGoals.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.emptyContainer}>
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
                            message={
                                filterTab === 'shared'
                                    ? 'Target dari dompet bersama atau hasil share akan tampil di sini.'
                                    : 'Buat target baru atau kaitkan ke dompet yang tepat agar progresnya lebih mudah dipantau.'
                            }
                            actionLabel={filterTab === 'completed' ? undefined : 'Buat Target'}
                            onAction={filterTab === 'completed' ? undefined : () => navigation.navigate('AddSavingGoal')}
                        />
                    </Animated.View>
                ) : (
                    <View style={styles.listContainer}>
                        {filteredGoals.map(({ goal }, index) => (
                            <SavingGoalCard
                                key={goal.id}
                                goal={goal}
                                animationDelay={index * 90}
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

const getStyles = (colors: any, textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            gap: 12,
        },
        backBtn: {
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.xl,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
        },
        headerCenter: { flex: 1 },
        headerTitle: { ...Typography.h2, fontSize: scaleFontSize(FontSize.h2, textSize), color: colors.textPrimary },
        headerSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            marginTop: 2,
        },
        addBtn: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.16,
            shadowRadius: 18,
            elevation: 5,
        },
        content: { paddingBottom: 108, gap: 18 },
        summaryCard: {
            marginHorizontal: 20,
            borderRadius: BorderRadius['5xl'],
            padding: 22,
            overflow: 'hidden',
            gap: 14,
            borderWidth: 1,
            borderColor: `${colors.textInverse}29`,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 6,
        },
        summaryGlowTop: {
            position: 'absolute',
            width: 170,
            height: 170,
            borderRadius: BorderRadius.full,
            top: -52,
            right: -30,
            backgroundColor: `${colors.textInverse}1F`,
        },
        summaryGlowBottom: {
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: BorderRadius.full,
            bottom: -48,
            left: -24,
            backgroundColor: `${colors.textInverse}14`,
        },
        summaryHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
        },
        summaryCopy: { flex: 1 },
        summaryLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textInverse,
            marginBottom: 4,
        },
        summaryAmount: {
            fontFamily: FontFamily.heading,
            fontSize: scaleFontSize(30, textSize),
            color: colors.textInverse,
        },
        summarySubtext: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: 'rgba(255,255,255,0.82)',
            marginTop: 6,
        },
        summaryIcon: {
            width: 56,
            height: 56,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
            borderWidth: 1,
            borderColor: colors.primaryLight,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        filterBlock: {
            marginHorizontal: 20,
            padding: 16,
            borderRadius: BorderRadius['4xl'],
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
            gap: 14,
        },
        legendRow: {
            paddingHorizontal: 20,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        listContainer: { paddingHorizontal: 20, gap: 16 },
        emptyContainer: { paddingHorizontal: 20, marginTop: 12 },
    });
