// Kartu utang/piutang pada daftar. Diekstrak agar DebtListScreen cukup
// berisi state filter + komposisi.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { formatCurrency } from '../../utils/currency';
import {
    getDebtDueLabel,
    getDebtDueState,
    getDebtProgress,
    getDebtTypeLabel,
} from '../../utils/debtUtils';
import { ContextBadge } from '../common/ContextBadge';
import { ProgressBar } from '../saving/ProgressBar';
import type { Debt } from '../../types/debt';

interface DebtCardProps {
    debt: Debt;
    onPress?: () => void;
    animationDelay?: number;
    /** Titik waktu uji — default Date.now() */
    now?: number;
}

export function DebtCard({ debt, onPress, animationDelay = 0, now = Date.now() }: DebtCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const dueState = getDebtDueState(debt, now);
    const progress = getDebtProgress(debt);
    const isSettled = debt.status !== 'active';

    const dueTone: 'neutral' | 'info' | 'success' | 'warning' =
        dueState === 'overdue'
            ? 'warning'
            : dueState === 'settled'
                ? 'success'
                : dueState === 'due_soon'
                    ? 'info'
                    : 'neutral';

    return (
        <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
            <TouchableOpacity
                style={styles.card}
                onPress={onPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Buka detail ${getDebtTypeLabel(debt.type)} dari ${debt.counterparty}`}
            >
                <View style={styles.topRow}>
                    <ContextBadge
                        icon={debt.type === 'debt' ? 'arrow-up-bold-outline' : 'arrow-down-bold-outline'}
                        label={getDebtTypeLabel(debt.type)}
                        tone={debt.type === 'debt' ? 'warning' : 'success'}
                    />
                    <ContextBadge
                        icon={dueState === 'overdue' ? 'alert-circle-outline' : 'calendar-clock-outline'}
                        label={getDebtDueLabel(debt, now)}
                        tone={dueTone as 'neutral' | 'info' | 'success' | 'warning'}
                    />
                </View>

                <View style={styles.header}>
                    <View style={styles.counterpartyWrap}>
                        <Text style={styles.counterparty} numberOfLines={1}>
                            {debt.counterparty}
                        </Text>
                        {debt.note ? (
                            <Text style={styles.note} numberOfLines={1}>
                                {debt.note}
                            </Text>
                        ) : null}
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={colors.textTertiary}
                    />
                </View>

                <ProgressBar
                    progress={progress}
                    color={isSettled ? colors.success : colors.primary}
                    height={8}
                    animationDelay={animationDelay + 120}
                    accessibilityLabel={`Progres pembayaran ${debt.counterparty}`}
                />

                <View style={styles.amountRow}>
                    <View>
                        <Text style={styles.amountLabel}>Sisa</Text>
                        <Text style={[styles.amountValue, isSettled && styles.amountPaid]}>
                            {formatCurrency(debt.remaining_amount)}
                        </Text>
                    </View>
                    <View style={styles.amountRight}>
                        <Text style={styles.amountLabel}>Total</Text>
                        <Text style={styles.amountTotal}>{formatCurrency(debt.amount)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        card: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 14,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 2,
        },
        topRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        counterpartyWrap: {
            flex: 1,
        },
        counterparty: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textPrimary,
        },
        note: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        amountRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
        },
        amountRight: {
            alignItems: 'flex-end',
        },
        amountLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        amountValue: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textPrimary,
            marginTop: 2,
        },
        amountPaid: {
            color: colors.success,
        },
        amountTotal: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
            marginTop: 2,
        },
    });
