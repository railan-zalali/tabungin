// Kartu saving goal dengan progress bar dan informasi lengkap
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import type { SavingGoal } from '../../types/saving';
import { formatRupiah, formatRupiahShort } from '../../utils/currency';
import { formatRelativeDays, daysFromNow } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';
import { ProgressBar } from './ProgressBar';
import { useTheme } from '../../store/useThemeStore';

interface SavingGoalCardProps {
    goal: SavingGoal;
    onPress?: () => void;
    onAddSaving?: () => void;
    animationDelay?: number;
}

export function SavingGoalCard({ goal, onPress, onAddSaving, animationDelay = 0 }: SavingGoalCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const progress = calculateProgress(goal.current_amount, goal.target_amount);
    const daysLeft = daysFromNow(goal.estimated_date);
    const isCompleted = goal.is_completed || goal.current_amount >= goal.target_amount;

    const periodLabel = goal.period_type === 'daily' ? 'hari'
        : goal.period_type === 'weekly' ? 'minggu' : 'bulan';

    return (
        <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            onPress={onPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${goal.emoji} ${goal.name}. Progress ${progress.toFixed(0)} persen. Terkumpul ${formatRupiah(goal.current_amount)} dari ${formatRupiah(goal.target_amount)}.`}
            accessibilityHint="Ketuk dua kali untuk melihat detail tabungan"
            activeOpacity={0.85}
        >
            {/* Header dengan emoji + nama */}
            <View style={styles.header}>
                <View style={[styles.emojiContainer, { backgroundColor: `${goal.color}20` }]}>
                    <Text style={styles.emoji} accessibilityElementsHidden={true}>{goal.emoji}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.goalName} allowFontScaling={true} numberOfLines={1}>
                        {goal.name}
                    </Text>
                    {isCompleted ? (
                        <View style={styles.completedBadge}>
                            <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} accessibilityElementsHidden={true} />
                            <Text style={styles.completedText} allowFontScaling={true}>Sudah tercapai! 🎉</Text>
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

            {/* Progress bar animasi */}
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

            {/* Tombol aksi */}
            {!isCompleted && (
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: `${goal.color}15`, borderColor: goal.color }]}
                    onPress={onAddSaving}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Tambah tabungan untuk ${goal.name}`}
                    accessibilityHint="Ketuk dua kali untuk menambah jumlah tabungan"
                >
                    <MaterialCommunityIcons name="plus" size={16} color={goal.color} accessibilityElementsHidden={true} />
                    <Text style={[styles.addBtnText, { color: goal.color }]} allowFontScaling={true}>
                        Tambah Tabungan
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    emojiContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 48,
    },
    addBtnText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
    },
});
