import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import type { SavingGoal } from '../../types/saving';
import { formatRupiah, formatRupiahShort } from '../../utils/currency';
import { daysFromNow } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';
import { ProgressBar } from './ProgressBar';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';

interface SavingGoalCardProps {
    goal: SavingGoal;
    onPress?: () => void;
    onAddSaving?: () => void;
    animationDelay?: number;
}

export function SavingGoalCard({ goal, onPress, onAddSaving, animationDelay = 0 }: SavingGoalCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const wallets = useWalletStore((state) => state.wallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const progress = calculateProgress(goal.current_amount, goal.target_amount);
    const daysLeft = daysFromNow(goal.estimated_date);
    const isCompleted = goal.is_completed || goal.current_amount >= goal.target_amount;
    const wallet = wallets.find((item) => item.id === goal.wallet_id);
    const isSharedGoal = Boolean(wallet?.profile_id && wallet.profile_id !== activeProfileId);

    const periodLabel = goal.period_type === 'daily'
        ? 'hari'
        : goal.period_type === 'weekly'
            ? 'minggu'
            : 'bulan';

    return (
        <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
            <TouchableOpacity
                style={[styles.card, Shadow.sm]}
                onPress={onPress}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${goal.emoji} ${goal.name}. Progress ${progress.toFixed(0)} persen. Terkumpul ${formatRupiah(goal.current_amount)} dari ${formatRupiah(goal.target_amount)}.`}
                accessibilityHint="Ketuk dua kali untuk melihat detail tabungan"
                activeOpacity={0.92}
            >
                <LinearGradient
                    colors={[`${goal.color}18`, `${colors.surface}F3`, `${colors.surface}E3`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.glassOverlay}
                />
                <View style={[styles.glowOrb, { backgroundColor: `${goal.color}12` }]} />

                {(wallet || isSharedGoal) && (
                    <View style={styles.contextRow}>
                        {wallet && (
                            <View style={styles.contextChip}>
                                <MaterialCommunityIcons
                                    name='wallet-outline'
                                    size={12}
                                    color={colors.primary}
                                    accessibilityElementsHidden={true}
                                />
                                <Text style={styles.contextChipText} numberOfLines={1}>
                                    {wallet.name}
                                </Text>
                            </View>
                        )}
                        {isSharedGoal && (
                            <View style={[styles.contextChip, styles.sharedChip]}>
                                <MaterialCommunityIcons
                                    name='account-group-outline'
                                    size={12}
                                    color={colors.info}
                                    accessibilityElementsHidden={true}
                                />
                                <Text style={[styles.contextChipText, { color: colors.info }]}>
                                    Shared
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.header}>
                    <View style={[styles.emojiContainer, { backgroundColor: `${goal.color}24` }]}>
                        <Text style={styles.emoji} accessibilityElementsHidden={true}>{goal.emoji}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.goalName} allowFontScaling={true} numberOfLines={1}>
                            {goal.name}
                        </Text>
                        {isCompleted ? (
                            <View style={styles.completedBadge}>
                                <MaterialCommunityIcons
                                    name='check-circle'
                                    size={14}
                                    color={colors.success}
                                    accessibilityElementsHidden={true}
                                />
                                <Text style={styles.completedText} allowFontScaling={true}>
                                    Sudah tercapai!
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.savingChip} allowFontScaling={true}>
                                Nabung {formatRupiahShort(goal.saving_per_period)}/{periodLabel}
                            </Text>
                        )}
                    </View>

                    {!isCompleted && daysLeft > 0 && (
                        <View style={styles.daysContainer} accessibilityElementsHidden={true}>
                            <Text style={styles.daysNumber}>{daysLeft}</Text>
                            <Text style={styles.daysLabel}>hari</Text>
                        </View>
                    )}
                </View>

                <View style={styles.progressSection}>
                    <ProgressBar
                        progress={progress}
                        color={goal.color}
                        height={8}
                        animationDelay={animationDelay}
                        accessibilityLabel={`Progress ${goal.name} ${progress.toFixed(0)} persen`}
                    />
                    <View style={styles.amountRow}>
                        <Text style={styles.currentAmount} allowFontScaling={true}>
                            <Text style={{ color: goal.color }}>Terkumpul: </Text>
                            {formatRupiah(goal.current_amount)}
                        </Text>
                        <Text style={styles.targetAmount} allowFontScaling={true} accessibilityLiveRegion="polite">
                            {progress.toFixed(0)}% dari {formatRupiahShort(goal.target_amount)}
                        </Text>
                    </View>
                </View>

                {!isCompleted && (
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: `${goal.color}14`, borderColor: `${goal.color}80` }]}
                        onPress={onAddSaving}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Tambah tabungan untuk ${goal.name}`}
                        accessibilityHint="Ketuk dua kali untuk menambah jumlah tabungan"
                    >
                        <MaterialCommunityIcons name='plus' size={16} color={goal.color} accessibilityElementsHidden={true} />
                        <Text style={[styles.addBtnText, { color: goal.color }]} allowFontScaling={true}>
                            Tambah Tabungan
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 16,
        gap: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.textInverse}55`,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    glowOrb: {
        position: 'absolute',
        width: 116,
        height: 116,
        borderRadius: 58,
        top: -36,
        right: -14,
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
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: `${colors.surface}CC`,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
        maxWidth: '100%',
    },
    sharedChip: {
        backgroundColor: `${colors.infoLight}C0`,
        borderColor: `${colors.info}30`,
    },
    contextChipText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.label,
        color: colors.textSecondary,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    emojiContainer: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${colors.textInverse}44`,
    },
    emoji: { fontSize: 26 },
    headerInfo: { flex: 1, gap: 4 },
    goalName: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: colors.textPrimary,
    },
    savingChip: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    completedText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.success,
    },
    daysContainer: { alignItems: 'center' },
    daysNumber: {
        fontFamily: FontFamily.heading,
        fontSize: 20,
        color: colors.textPrimary,
    },
    daysLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.label,
        color: colors.textSecondary,
    },
    progressSection: { gap: 8 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    currentAmount: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textPrimary,
    },
    targetAmount: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        minHeight: 48,
    },
    addBtnText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
    },
});
