// Saving List Screen — daftar semua saving goals
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { SavingGoalCard } from '../../components/saving/SavingGoalCard';
import { SavingGoalCardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { formatRupiah } from '../../utils/currency';

type FilterTab = 'active' | 'completed' | 'all';

export function SavingListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
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
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title} allowFontScaling={true} accessibilityRole="header">Tabungan</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddSavingGoal')}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Tambah target tabungan baru"
                >
                    <MaterialCommunityIcons name="plus" size={22} color={Colors.textInverse} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Summary Card */}
                <View style={[styles.summaryCard, Shadow.sm]}>
                    <View accessible={true} accessibilityLabel={`Total terkumpul ${formatRupiah(totalSaved)} dari target ${formatRupiah(totalTarget)}`}>
                        <Text style={styles.summaryLabel} allowFontScaling={true}>Total Terkumpul</Text>
                        <Text style={styles.summaryAmount} allowFontScaling={true} accessibilityLiveRegion="polite">
                            {formatRupiah(totalSaved)}
                        </Text>
                        <Text style={styles.summarySubtext} allowFontScaling={true}>
                            dari {formatRupiah(totalTarget)} total target
                        </Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterRow} accessibilityRole="tablist">
                    {tabFilters.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[styles.filterTab, filterTab === f.id && styles.filterTabActive]}
                            onPress={() => setFilterTab(f.id)}
                            accessible={true}
                            accessibilityRole="tab"
                            accessibilityLabel={f.label}
                            accessibilityState={{ selected: filterTab === f.id }}
                        >
                            <Text style={[styles.filterTabText, filterTab === f.id && styles.filterTabTextActive]} allowFontScaling={true}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Goal List */}
                {isLoading ? (
                    <>
                        <SavingGoalCardSkeleton />
                        <SavingGoalCardSkeleton />
                    </>
                ) : displayGoals.length === 0 ? (
                    <EmptyState
                        icon={filterTab === 'completed' ? 'check-circle-outline' : 'piggy-bank-outline'}
                        title={filterTab === 'completed' ? 'Belum ada goal selesai' : 'Belum ada target aktif'}
                        description={filterTab === 'active' ? 'Mulai buat target tabungan pertamamu!' : undefined}
                        actionLabel={filterTab === 'active' ? 'Buat Target' : undefined}
                        onAction={filterTab === 'active' ? () => navigation.navigate('AddSavingGoal') : undefined}
                    />
                ) : (
                    displayGoals.map((goal, idx) => (
                        <SavingGoalCard
                            key={goal.id}
                            goal={goal}
                            animationDelay={idx * 80}
                            onPress={() => navigation.navigate('SavingDetail', { goalId: goal.id })}
                            onAddSaving={() => navigation.navigate('SavingDetail', { goalId: goal.id })}
                        />
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddSavingGoal')}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Tambah target tabungan baru"
                accessibilityHint="Ketuk dua kali untuk membuat target tabungan baru"
            >
                <MaterialCommunityIcons name="plus" size={28} color={Colors.textInverse} accessibilityElementsHidden={true} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
    addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    summaryCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
    },
    summaryLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    summaryAmount: { fontFamily: FontFamily.heading, fontSize: FontSize.h1, color: Colors.primary, marginTop: 4 },
    summarySubtext: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 4 },
    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 0,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9, minHeight: 40, justifyContent: 'center' },
    filterTabActive: { backgroundColor: Colors.surface, ...Shadow.sm },
    filterTabText: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.textSecondary },
    filterTabTextActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.lg,
    },
});
