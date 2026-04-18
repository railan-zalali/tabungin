// Simulator interaktif — berapa lama jika menabung sejumlah tertentu?
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { PeriodType } from '../../types/saving';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving, formatDuration } from '../../utils/calculator';
import { getSavingPlanInsight, getSavingPlanLabel } from '../../utils/savingPlan';

interface SavingSimulatorProps {
    targetAmount: number;
    currentAmount: number;
    periodType: PeriodType;
    initialSavingAmount?: number;
    deadlineAt?: number;
}

export function SavingSimulator({
    targetAmount,
    currentAmount,
    periodType,
    initialSavingAmount = 0,
    deadlineAt,
}: SavingSimulatorProps) {
    const [inputValue, setInputValue] = useState(
        initialSavingAmount > 0 ? formatInputRupiah(String(initialSavingAmount)) : ''
    );
    const [result, setResult] = useState<{ days: number; estimatedDate: Date } | null>(
        initialSavingAmount > 0
            ? simulateSaving(targetAmount, currentAmount, initialSavingAmount, periodType)
            : null
    );

    const periodLabel = periodType === 'daily' ? 'hari'
        : periodType === 'weekly' ? 'minggu' : 'bulan';
    const planInsight = result && deadlineAt
        ? getSavingPlanInsight(targetAmount, currentAmount, parseRupiah(inputValue), periodType, deadlineAt)
        : null;

    const handleChange = useCallback((text: string) => {
        const formatted = formatInputRupiah(text);
        setInputValue(formatted);
        const amount = parseRupiah(text);
        if (amount > 0) {
            setResult(simulateSaving(targetAmount, currentAmount, amount, periodType));
        } else {
            setResult(null);
        }
    }, [targetAmount, currentAmount, periodType]);

    return (
        <View style={styles.container}>
            <Text style={styles.title} allowFontScaling={true}>
                🧮 Simulasi Tabungan
            </Text>
            <Text style={styles.subtitle} allowFontScaling={true}>
                Berapa yang bisa kamu tabung per {periodLabel}?
            </Text>

            <View style={styles.inputContainer} accessible={true} accessibilityLabel={`Input nominal tabungan per ${periodLabel}`}>
                <Text style={styles.prefix} allowFontScaling={true}>Rp</Text>
                <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={handleChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textDisabled}
                    accessible={true}
                    accessibilityLabel={`Nominal tabungan per ${periodLabel}`}
                    accessibilityHint={`Masukkan jumlah yang bisa kamu tabung setiap ${periodLabel}`}
                    allowFontScaling={true}
                />
                <Text style={styles.suffix} allowFontScaling={true}>/{periodLabel}</Text>
            </View>

            {result && (
                <View
                    style={styles.result}
                    accessible={true}
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={`Estimasi selesai dalam ${formatDuration(result.days)}, yaitu tanggal ${formatEstimatedDate(result.estimatedDate)}`}
                >
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel} allowFontScaling={true}>⏱ Estimasi waktu</Text>
                        <Text style={styles.resultValue} allowFontScaling={true}>
                            {formatDuration(result.days)}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel} allowFontScaling={true}>📅 Perkiraan selesai</Text>
                        <Text style={styles.resultDate} allowFontScaling={true}>
                            {formatEstimatedDate(result.estimatedDate)}
                        </Text>
                    </View>
                    {planInsight ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.planBlock}>
                                <Text style={styles.planBadge} allowFontScaling={true}>
                                    {getSavingPlanLabel(planInsight.status)}
                                </Text>
                                <Text style={styles.planCaption} allowFontScaling={true}>
                                    Perlu sekitar {formatRupiah(planInsight.requiredPerPeriod)} per {periodLabel} untuk tetap aman terhadap deadline.
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.primaryLight,
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    title: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: Colors.primaryDark,
    },
    subtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        minHeight: 52,
    },
    prefix: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    input: {
        flex: 1,
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.h4,
        color: Colors.textPrimary,
    },
    suffix: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    result: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    resultValue: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.h4,
        color: Colors.primaryDark,
    },
    resultDate: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },
    planBlock: {
        gap: 6,
    },
    planBadge: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: Colors.primaryDark,
    },
    planCaption: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    divider: { height: 1, backgroundColor: Colors.divider },
});
