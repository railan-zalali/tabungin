import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { ProgressBar } from '../../components/saving/ProgressBar';
import { SavingSimulator } from '../../components/saving/SavingSimulator';
import { Button } from '../../components/common/Button';
import { formatInputRupiah, parseRupiah, formatCurrency } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';

export function SavingDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const goalId = route.params?.goalId as string;
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const wallets = useWalletStore((state) => state.wallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const {
        currentGoal,
        currentLogs,
        justCompletedGoalId,
        loadGoalById,
        loadLogs,
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
    }, [goalId]);

    useEffect(() => {
        if (justCompletedGoalId === goalId) {
            setShowConfetti(true);
            clearJustCompleted();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setShowConfetti(false), 5000);
        }
    }, [justCompletedGoalId]);

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
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Text style={styles.loadingText}>Memuat...</Text>
            </View>
        );
    }

    const progress = calculateProgress(currentGoal.current_amount, currentGoal.target_amount);
    const remaining = Math.max(currentGoal.target_amount - currentGoal.current_amount, 0);
    const isCompleted = currentGoal.is_completed || progress >= 100;
    const wallet = wallets.find((item) => item.id === currentGoal.wallet_id);
    const isSharedWallet = Boolean(wallet?.profile_id && wallet.profile_id !== activeProfileId);

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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {showConfetti && (
                <View style={styles.confettiOverlay}>
                    <Text style={styles.confettiText}>🎉</Text>
                    <Text style={styles.confettiTitle}>Selamat!</Text>
                    <Text style={styles.confettiSub}>
                        Target {currentGoal.name} sudah tercapai!
                    </Text>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{currentGoal.name}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(70).springify()}>
                    <LinearGradient
                        colors={[`${currentGoal.color}`, `${currentGoal.color}CC`, `${currentGoal.color}`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.heroSection, Shadow.md]}
                    >
                        <View style={styles.heroGlow} />

                        <View style={styles.heroTopRow}>
                            {(wallet || isSharedWallet) && (
                                <View style={styles.contextRow}>
                                    {wallet && (
                                        <View style={styles.contextChip}>
                                            <MaterialCommunityIcons name="wallet-outline" size={12} color="#FFFFFF" />
                                            <Text style={styles.contextChipText}>{wallet.name}</Text>
                                        </View>
                                    )}
                                    {isSharedWallet && (
                                        <View style={styles.contextChip}>
                                            <MaterialCommunityIcons name="account-group-outline" size={12} color="#FFFFFF" />
                                            <Text style={styles.contextChipText}>Shared</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <Text style={styles.heroEmoji}>{currentGoal.emoji}</Text>
                        <Text style={styles.heroName}>{currentGoal.name}</Text>
                        <Text style={styles.heroProgress}>{progress.toFixed(1)}%</Text>
                        <ProgressBar
                            progress={progress}
                            color="#FFFFFF"
                            height={12}
                            animationDelay={200}
                            style={{ width: '82%' }}
                        />
                        {isCompleted && (
                            <View style={styles.completedBanner}>
                                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                <Text style={styles.completedText}>Sudah tercapai!</Text>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(140).springify()} style={[styles.infoGrid, Shadow.sm]}>
                    {infoItems.map((item, idx) => (
                        <View key={item.label} style={[styles.infoItem, idx % 2 === 0 ? styles.borderRight : null, idx < 2 ? styles.borderBottom : null]}>
                            <View style={[styles.iconBox, { backgroundColor: `${currentGoal.color}20` }]}>
                                <MaterialCommunityIcons name={item.icon as any} size={20} color={currentGoal.color} />
                            </View>
                            <View style={styles.infoTextWrap}>
                                <Text style={styles.infoLabel}>{item.label}</Text>
                                <Text style={styles.infoValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {!isCompleted && (
                    <Animated.View entering={FadeInUp.delay(200).springify()}>
                        <SavingSimulator
                            targetAmount={currentGoal.target_amount}
                            currentAmount={currentGoal.current_amount}
                            periodType={currentGoal.period_type}
                            initialSavingAmount={currentGoal.saving_per_period}
                        />
                    </Animated.View>
                )}

                {currentLogs.length > 0 && (
                    <Animated.View entering={FadeInUp.delay(260).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Riwayat Tabungan</Text>
                            <Text style={styles.sectionSubtitle}>{currentLogs.length} kontribusi tercatat</Text>
                        </View>
                        <View style={[styles.logList, Shadow.sm]}>
                            {currentLogs.map((log, idx) => (
                                <React.Fragment key={log.id}>
                                    <View style={styles.logItem}>
                                        <View style={styles.logIcon}>
                                            <MaterialCommunityIcons name="plus" size={20} color={currentGoal.color} />
                                        </View>
                                        <View style={styles.logInfo}>
                                            <Text style={[styles.logAmount, { color: currentGoal.color }]}>+{formatCurrency(log.amount)}</Text>
                                            {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                                        </View>
                                        <Text style={styles.logDate}>{formatDateShort(log.date)}</Text>
                                    </View>
                                    {idx < currentLogs.length - 1 && <View style={styles.logDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {!isCompleted && (
                <View style={styles.footer}>
                    <Button
                        label="+ Tambah Tabungan"
                        onPress={() => setShowAddModal(true)}
                        variant="primary"
                        size="lg"
                        fullWidth
                    />
                </View>
            )}

            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Tambah Tabungan</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalGoalName}>{currentGoal.emoji} {currentGoal.name}</Text>

                        <View style={[styles.rupiahInput, { borderColor: currentGoal.color }]}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput
                                style={styles.modalAmountInput}
                                value={addAmount}
                                onChangeText={(v) => setAddAmount(formatInputRupiah(v))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                                autoFocus
                            />
                        </View>

                        <TextInput
                            style={styles.modalNoteInput}
                            value={addNote}
                            onChangeText={setAddNote}
                            placeholder="Catatan (opsional)"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Button
                            label="Simpan Tabungan"
                            onPress={handleAddSaving}
                            variant="primary"
                            size="lg"
                            loading={isAdding}
                            fullWidth
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingText: { padding: 20, color: colors.textSecondary, fontFamily: FontFamily.body },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.surface}D8`,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
    },
    headerTitle: { ...Typography.h3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
    content: { padding: 20, gap: 24, paddingBottom: 100 },
    heroSection: {
        borderRadius: 30,
        padding: 28,
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
    },
    heroGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        top: -55,
        right: -24,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroTopRow: {
        width: '100%',
        alignItems: 'flex-start',
    },
    contextRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    contextChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    contextChipText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: '#FFFFFF',
    },
    heroEmoji: { fontSize: 64 },
    heroName: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: '#FFFFFF', textAlign: 'center' },
    heroProgress: { fontFamily: FontFamily.heading, fontSize: 48, color: '#FFFFFF' },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: `${colors.surface}D8`,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 8,
    },
    completedText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.success },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: `${colors.surface}D8`,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
    },
    infoItem: {
        width: '50%',
        padding: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoTextWrap: { flex: 1 },
    borderRight: { borderRightWidth: 1, borderRightColor: colors.divider },
    borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginBottom: 4 },
    infoValue: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: colors.textPrimary },
    section: { gap: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { ...Typography.h4, color: colors.textPrimary },
    sectionSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    logList: {
        backgroundColor: `${colors.surface}D8`,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
    logNote: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginTop: 2 },
    logDate: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    logDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 74 },
    footer: {
        padding: 20,
        paddingBottom: 32,
        backgroundColor: `${colors.surface}F2`,
        borderTopWidth: 1,
        borderTopColor: `${colors.border}AA`,
    },
    confettiOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 185, 129, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        gap: 12,
    },
    confettiText: { fontSize: 80 },
    confettiTitle: { fontFamily: FontFamily.heading, fontSize: 36, color: '#FFF' },
    confettiSub: { fontFamily: FontFamily.body, fontSize: FontSize.h3, color: '#FFF', textAlign: 'center', paddingHorizontal: 40 },
    modalSafe: { flex: 1, backgroundColor: colors.surface },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { ...Typography.h3, color: colors.textPrimary },
    modalContent: { padding: 20, gap: 20 },
    modalGoalName: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.textSecondary },
    rupiahInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.background}94`,
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderWidth: 1,
        gap: 8,
    },
    prefix: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: colors.textSecondary },
    modalAmountInput: { flex: 1, fontFamily: FontFamily.heading, fontSize: 32, color: colors.textPrimary, padding: 0, height: 40 },
    modalNoteInput: {
        backgroundColor: `${colors.background}94`,
        borderRadius: 18,
        padding: 16,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
        minHeight: 52,
    },
});
