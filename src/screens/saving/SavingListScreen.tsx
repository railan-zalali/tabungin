import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/currency';

type FilterTab = 'active' | 'completed' | 'all';

export function SavingListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { goals, activeGoals, completedGoals, isLoading, loadGoals } = useSavingStore();
    const [filterTab, setFilterTab] = useState<FilterTab>('active');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadGoals(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadGoals();
        setRefreshing(false);
    };

    const displayGoals = filterTab === 'active' ? activeGoals
        : filterTab === 'completed' ? completedGoals
            : goals;

    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

    const tabFilters: { id: FilterTab; label: string }[] = [
        { id: 'active', label: `Aktif (${activeGoals.length})` },
        { id: 'completed', label: `Selesai (${completedGoals.length})` },
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
                <Text style={styles.headerTitle}>Target Tabungan</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddSavingGoal')}
                >
                    <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Summary Card */}
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={[styles.summaryCard, Shadow.md]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View>
                        <Text style={styles.summaryLabel}>Total Terkumpul</Text>
                        <Text style={styles.summaryAmount}>
                            {formatCurrency(totalSaved)}
                        </Text>
                        <View style={styles.targetRow}>
                            <MaterialCommunityIcons name="flag-checkered" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.summarySubtext}>
                                dari target {formatCurrency(totalTarget)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryIcon}>
                        <MaterialCommunityIcons name="piggy-bank" size={32} color="rgba(255,255,255,0.2)" />
                    </View>
                </LinearGradient>

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                    {tabFilters.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.filterTab, filterTab === f.id && styles.filterTabActive]}
                            onPress={() => setFilterTab(f.id)}
                        >
                            <Text style={[styles.filterTabText, filterTab === f.id && styles.filterTabTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Goal List */}
                {isLoading && !refreshing ? (
                    <View style={styles.listContainer}>
                        <SavingGoalCardSkeleton />
                        <SavingGoalCardSkeleton />
                    </View>
                ) : displayGoals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <EmptyState
                            icon={filterTab === 'completed' ? 'check-circle-outline' : 'piggy-bank-outline'}
                            title={filterTab === 'completed' ? 'Belum ada goal selesai' : 'Belum ada target aktif'}
                            message={filterTab === 'active' ? 'Mulai buat target tabungan pertamamu!' : undefined}
                            actionLabel={filterTab === 'active' ? 'Buat Target' : undefined}
                            onAction={filterTab === 'active' ? () => navigation.navigate('AddSavingGoal') : undefined}
                        />
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {displayGoals.map((goal, idx) => (
                            <SavingGoalCard
                                key={goal.id}
                                goal={goal}
                                animationDelay={idx * 80}
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

    content: { paddingBottom: 100 },
    
    summaryCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
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
        fontSize: 28, 
        color: '#FFF',
        marginBottom: 8,
    },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summarySubtext: { 
        fontFamily: FontFamily.body, 
        fontSize: FontSize.caption, 
        color: 'rgba(255,255,255,0.7)',
    },
    summaryIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterTab: { 
        flex: 1, 
        paddingVertical: 8, 
        alignItems: 'center', 
        borderRadius: 10,
    },
    filterTabActive: { 
        backgroundColor: Colors.surfaceAlt,
    },
    filterTabText: { 
        fontFamily: FontFamily.bodyMedium, 
        fontSize: FontSize.caption, 
        color: Colors.textSecondary 
    },
    filterTabTextActive: { 
        fontFamily: FontFamily.bodyBold, 
        color: Colors.textPrimary 
    },

    listContainer: { paddingHorizontal: 20, gap: 16 },
    emptyContainer: { paddingHorizontal: 20, marginTop: 20 },
});
