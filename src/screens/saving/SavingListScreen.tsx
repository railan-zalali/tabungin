import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';

type FilterTab = 'active' | 'completed' | 'all';

export function SavingListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { goals, activeGoals, completedGoals, isLoading, loadGoals } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const [filterTab, setFilterTab] = useState<FilterTab>('active');
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

    const displayGoals = filterTab === 'active'
        ? activeGoals
        : filterTab === 'completed'
            ? completedGoals
            : goals;

    const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
    const walletLinkedGoals = goals.filter((goal) => Boolean(goal.wallet_id)).length;
    const sharedGoals = goals.filter((goal) => {
        const wallet = wallets.find((item) => item.id === goal.wallet_id);
        return Boolean(wallet?.profile_id && wallet.profile_id !== activeProfileId);
    }).length;

    const tabFilters: { id: FilterTab; label: string }[] = [
        { id: 'active', label: `Aktif (${activeGoals.length})` },
        { id: 'completed', label: `Selesai (${completedGoals.length})` },
        { id: 'all', label: 'Semua' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

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
                    <Text style={styles.headerSubtitle}>Pribadi dan terhubung ke dompet</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddSavingGoal')}
                >
                    <MaterialCommunityIcons name="plus" size={22} color={colors.textInverse} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <Animated.View entering={FadeInDown.delay(80).springify()}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark, colors.primary]}
                        style={styles.summaryCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.summaryGlowTop} />
                        <View style={styles.summaryGlowBottom} />

                        <View style={styles.summaryHeaderRow}>
                            <View>
                                <Text style={styles.summaryLabel}>Total Terkumpul</Text>
                                <Text style={styles.summaryAmount}>{formatCurrency(totalSaved)}</Text>
                            </View>
                            <View style={styles.summaryIcon}>
                                <MaterialCommunityIcons name="piggy-bank-outline" size={30} color={colors.textInverse} />
                            </View>
                        </View>

                        <View style={styles.targetRow}>
                            <MaterialCommunityIcons name="flag-checkered" size={14} color={colors.textInverse} />
                            <Text style={styles.summarySubtext}>
                                dari target {formatCurrency(totalTarget)}
                            </Text>
                        </View>

                        <View style={styles.summaryStatsRow}>
                            <View style={styles.summaryStatChip}>
                                <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.primaryDark} />
                                <Text style={styles.summaryStatText}>{walletLinkedGoals} terkait dompet</Text>
                            </View>
                            <View style={styles.summaryStatChip}>
                                <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.primaryDark} />
                                <Text style={styles.summaryStatText}>{sharedGoals} shared</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.filterBlock}>
                    <View style={styles.filterBlockHeader}>
                        <Text style={styles.filterTitle}>Fokus Tampilan</Text>
                        <Text style={styles.filterHint}>Pisahkan target aktif, selesai, atau lihat semuanya</Text>
                    </View>

                    <View style={styles.filterRow}>
                        {tabFilters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterTab,
                                    filterTab === filter.id && styles.filterTabActive,
                                ]}
                                onPress={() => setFilterTab(filter.id)}
                            >
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        filterTab === filter.id && styles.filterTabTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {isLoading && !refreshing ? (
                    <View style={styles.listContainer}>
                        <SavingGoalCardSkeleton />
                        <SavingGoalCardSkeleton />
                    </View>
                ) : displayGoals.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.emptyContainer}>
                        <EmptyState
                            icon={filterTab === 'completed' ? 'check-circle-outline' : 'piggy-bank-outline'}
                            title={filterTab === 'completed' ? 'Belum ada goal selesai' : 'Belum ada target aktif'}
                            message={filterTab === 'active' ? 'Mulai buat target tabungan pertamamu atau kaitkan ke dompet yang tepat.' : undefined}
                            actionLabel={filterTab === 'active' ? 'Buat Target' : undefined}
                            onAction={filterTab === 'active' ? () => navigation.navigate('AddSavingGoal') : undefined}
                        />
                    </Animated.View>
                ) : (
                    <View style={styles.listContainer}>
                        {displayGoals.map((goal, index) => (
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
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -120,
        right: -30,
        width: 250,
        height: 250,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryLight,
        opacity: 0.52,
    },
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
    headerTitle: { ...Typography.h2, color: colors.textPrimary },
    headerSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
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
        gap: 12,
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
    },
    summaryLabel: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textInverse,
        marginBottom: 4,
    },
    summaryAmount: {
        fontFamily: FontFamily.heading,
        fontSize: 30,
        color: colors.textInverse,
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
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summarySubtext: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.primaryDark,
    },
    summaryStatsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    summaryStatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryBg,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    summaryStatText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.primaryDark,
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
    },
    filterBlockHeader: { marginBottom: 14 },
    filterTitle: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
    },
    filterHint: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        marginTop: 4,
    },
    filterRow: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: BorderRadius.xl,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
    },
    filterTabActive: {
        backgroundColor: colors.background,
    },
    filterTabText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    filterTabTextActive: {
        fontFamily: FontFamily.bodyBold,
        color: colors.textPrimary,
    },
    listContainer: { paddingHorizontal: 20, gap: 16 },
    emptyContainer: { paddingHorizontal: 20, marginTop: 12 },
});
