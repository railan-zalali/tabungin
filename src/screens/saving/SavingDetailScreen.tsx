// Layar detail target tabungan — komposisi hero, statistik, sharing, riwayat.
// Section diekstrak ke components/saving/*.
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize } from '../../constants/typography';
import { useSavingStore } from '../../store/useSavingStore';
import { Button } from '../../components/common/Button';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { formatInputRupiah, parseRupiah, formatCurrency } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import type { SavingNavigationProp, SavingStackParamList } from '../../types/navigation';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { SavingSimulator } from '../../components/saving/SavingSimulator';
import { SavingGoalHero } from '../../components/saving/SavingGoalHero';
import { GoalStatsGrid } from '../../components/saving/GoalStatsGrid';
import { SharingAccessSection } from '../../components/saving/SharingAccessSection';
import { AddSavingModal } from '../../components/saving/AddSavingModal';

export function SavingDetailScreen() {
    const navigation = useNavigation<SavingNavigationProp<'SavingDetail'>>();
    const route = useRoute<RouteProp<SavingStackParamList, 'SavingDetail'>>();
    const goalId = route.params.goalId;
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const wallets = useWalletStore((state) => state.wallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const {
        currentGoal,
        currentLogs,
        sharingMembers,
        sharingActivity,
        justCompletedGoalId,
        loadGoalById,
        loadLogs,
        loadSharingDetails,
        addSavingLog,
        clearJustCompleted,
    } = useSavingStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addNote, setAddNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        loadGoalById(goalId);
        loadLogs(goalId);
        loadSharingDetails(goalId);
    }, [goalId, loadGoalById, loadLogs, loadSharingDetails]);

    useEffect(() => {
        if (justCompletedGoalId !== goalId) return;
        setShowConfetti(true);
        clearJustCompleted();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Timer harus dibersihkan: kalau layar ditutup sebelum 5 detik,
        // setState akan menyasar komponen yang sudah unmount.
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, [clearJustCompleted, goalId, justCompletedGoalId]);

    const handleAddSaving = async () => {
        const amount = parseRupiah(addAmount);
        if (amount <= 0) {
            Alert.alert('Nominal tidak valid', 'Masukkan nominal yang lebih dari Rp 0');
            return;
        }
        setIsAdding(true);
        try {
            await addSavingLog({
                goal_id: goalId,
                amount,
                note: addNote.trim() || null,
                date: Date.now(),
            });
            setShowAddModal(false);
            setAddAmount('');
            setAddNote('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setIsAdding(false);
        }
    };

    if (!currentGoal) {
        return (
            <ScreenShell topInset={false} bottomInset={false}>
                <AppScreenHeader
                    title="Detail Target"
                    showBack
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Memuat...</Text>
                </View>
            </ScreenShell>
        );
    }

    const progress = calculateProgress(currentGoal.current_amount, currentGoal.target_amount);
    const remaining = Math.max(currentGoal.target_amount - currentGoal.current_amount, 0);
    const isCompleted = currentGoal.is_completed || progress >= 100;
    const wallet = wallets.find((item) => item.id === currentGoal.wallet_id);
    const goalMeta = getGoalComputedMeta(currentGoal, wallet, activeProfileId, sharingMembers);

    const infoItems = [
        { label: 'Target', value: formatCurrency(currentGoal.target_amount), icon: 'flag-variant' },
        { label: 'Terkumpul', value: formatCurrency(currentGoal.current_amount), icon: 'piggy-bank' },
        { label: 'Sisa', value: formatCurrency(remaining), icon: 'timer-sand' },
        {
            label: 'Nabung/Periode',
            value: `${formatCurrency(currentGoal.saving_per_period)}/${currentGoal.period_type}`,
            icon: 'calendar-refresh',
        },
    ];

    const hasSharingSection =
        goalMeta.isSharedGoal || sharingMembers.length > 0 || sharingActivity.length > 0;

    return (
        <ScreenShell topInset={false} bottomInset={false}>
            <AppScreenHeader
                title={currentGoal.name}
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'pencil',
                    label: 'Edit',
                    onPress: () => navigation.navigate('AddSavingGoal', { editId: goalId }),
                }}
            />

            {showConfetti ? (
                <View style={styles.confettiOverlay}>
                    <Text style={styles.confettiText}>🎉</Text>
                    <Text style={styles.confettiTitle}>Selamat!</Text>
                    <Text style={styles.confettiSub}>
                        Target {currentGoal.name} sudah tercapai!
                    </Text>
                </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <SavingGoalHero
                    goal={currentGoal}
                    progress={progress}
                    isCompleted={isCompleted}
                    wallet={wallet}
                    meta={goalMeta}
                    memberCount={sharingMembers.length}
                />

                <GoalStatsGrid
                    items={infoItems}
                    accentColor={currentGoal.color}
                    scopeLabel={goalMeta.scopeLabel}
                    walletLabel={wallet?.name || 'Tanpa dompet khusus'}
                />

                {!isCompleted ? (
                    <Animated.View entering={FadeInUp.delay(220).springify()}>
                        <SavingSimulator
                            targetAmount={currentGoal.target_amount}
                            currentAmount={currentGoal.current_amount}
                            periodType={currentGoal.period_type}
                            initialSavingAmount={currentGoal.saving_per_period}
                        />
                    </Animated.View>
                ) : null}

                {hasSharingSection ? (
                    <SharingAccessSection members={sharingMembers} activity={sharingActivity} />
                ) : null}

                {currentLogs.length > 0 ? (
                    <Animated.View entering={FadeInUp.delay(280).springify()} style={styles.section}>
                        <SectionHeader
                            title="Riwayat Tabungan"
                            subtitle={`${currentLogs.length} kontribusi tercatat`}
                        />
                        <View style={styles.logList}>
                            {currentLogs.map((log, idx) => (
                                <React.Fragment key={log.id}>
                                    <View style={styles.logItem}>
                                        <View style={styles.logIcon}>
                                            <MaterialCommunityIcons
                                                name="plus"
                                                size={20}
                                                color={currentGoal.color}
                                            />
                                        </View>
                                        <View style={styles.logInfo}>
                                            <Text style={[styles.logAmount, { color: currentGoal.color }]}>
                                                +{formatCurrency(log.amount)}
                                            </Text>
                                            {log.note ? <Text style={styles.logNote}>{log.note}</Text> : null}
                                        </View>
                                        <Text style={styles.logDate}>{formatDateShort(log.date)}</Text>
                                    </View>
                                    {idx < currentLogs.length - 1 && <View style={styles.logDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </Animated.View>
                ) : null}
            </ScrollView>

            {!isCompleted ? (
                <View style={[styles.footer, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
                    <Button
                        label="+ Tambah Tabungan"
                        onPress={() => setShowAddModal(true)}
                        variant="primary"
                        size="lg"
                        fullWidth
                    />
                </View>
            ) : null}

            <AddSavingModal
                visible={showAddModal}
                goalEmoji={currentGoal.emoji}
                goalName={currentGoal.name}
                accentColor={currentGoal.color}
                amount={addAmount}
                onAmountChange={(value) => setAddAmount(formatInputRupiah(value))}
                note={addNote}
                onNoteChange={setAddNote}
                isSubmitting={isAdding}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleAddSaving}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        loadingText: {
            padding: 20,
            color: colors.textSecondary,
            fontFamily: FontFamily.body,
        },
        content: { padding: 20, gap: 24, paddingBottom: 100 },
        section: { gap: 12 },
        confettiOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            gap: 12,
        },
        confettiText: { fontSize: 80 },
        confettiTitle: {
            fontFamily: FontFamily.heading,
            fontSize: 36,
            color: colors.textInverse,
        },
        confettiSub: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.h3,
            color: colors.textInverse,
            textAlign: 'center',
            paddingHorizontal: 40,
        },
        logList: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
        },
        logItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
        logIcon: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: `${colors.primaryLight}AA`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        logInfo: { flex: 1 },
        logAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body },
        logNote: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        logDate: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        logDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 74 },
        footer: {
            padding: 20,
            paddingBottom: 32,
            borderTopWidth: 1,
        },
    });
