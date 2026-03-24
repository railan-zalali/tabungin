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
import { Shadow } from '../../constants/theme';
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
    }, []);

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
                        style={[styles.summaryCard, Shadow.md]}
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
                                <MaterialCommunityIcons name="piggy-bank-outline" size={30} color="rgba(255,255,255,0.86)" />
                            </View>
                        </View>

                        <View style={styles.targetRow}>
                            <MaterialCommunityIcons name="flag-checkered" size={14} color="rgba(255,255,255,0.78)" />
                            <Text style={styles.summarySubtext}>
                                dari target {formatCurrency(totalTarget)}
                            </Text>
                        </View>

                        <View style={styles.summaryStatsRow}>
                            <View style={styles.summaryStatChip}>
                                <MaterialCommunityIcons name="wallet-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.summaryStatText}>{walletLinkedGoals} terkait dompet</Text>
                            </View>
                            <View style={styles.summaryStatChip}>
                                <MaterialCommunityIcons name="account-group-outline" size={14} color="#FFFFFF" />
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
        borderRadius: 14,
        backgroundColor: `${colors.surface}D9`,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        ...Shadow.sm,
    },
    content: { paddingBottom: 108, gap: 18 },
    summaryCard: {
        marginHorizontal: 20,
        borderRadius: 28,
        padding: 22,
        overflow: 'hidden',
        gap: 12,
    },
    summaryGlowTop: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        top: -52,
        right: -30,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    summaryGlowBottom: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        bottom: -48,
        left: -24,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    summaryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    summaryAmount: {
        fontFamily: FontFamily.heading,
        fontSize: 30,
        color: '#FFFFFF',
    },
    summaryIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summarySubtext: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.74)',
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
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    summaryStatText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: '#FFFFFF',
    },
    filterBlock: {
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 22,
        backgroundColor: `${colors.surface}D8`,
        borderWidth: 1,
        borderColor: `${colors.border}B0`,
        ...Shadow.sm,
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
        backgroundColor: `${colors.background}A6`,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: `${colors.border}99`,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    filterTabActive: {
        backgroundColor: colors.surface,
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
