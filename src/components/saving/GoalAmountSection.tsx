// Bagian "Nominal dan Ritme" pada form target tabungan.
// Diekstrak dari AddSavingGoalScreen.
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import type { PeriodType } from '../../types/saving';

const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
    { id: 'daily', label: 'Hari' },
    { id: 'weekly', label: 'Minggu' },
    { id: 'monthly', label: 'Bulan' },
];

interface GoalAmountSectionProps {
    targetInput: string;
    onTargetChange: (value: string) => void;
    currentInput: string;
    onCurrentChange: (value: string) => void;
    savingInput: string;
    onSavingChange: (value: string) => void;
    periodType: PeriodType;
    onPeriodChange: (value: PeriodType) => void;
    errors: { target?: string; saving?: string };
}

export function GoalAmountSection({
    targetInput,
    onTargetChange,
    currentInput,
    onCurrentChange,
    savingInput,
    onSavingChange,
    periodType,
    onPeriodChange,
    errors,
}: GoalAmountSectionProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Nominal dan Ritme</Text>

            <Text style={styles.fieldLabel}>Harga Target (Rp)</Text>
            <View style={[styles.rupiahInput, errors.target ? styles.inputError : null]}>
                <Text style={[styles.prefix, { color: colors.textSecondary }]}>Rp</Text>
                <TextInput
                    style={styles.numInput}
                    value={targetInput}
                    onChangeText={onTargetChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel="Harga target"
                />
            </View>
            {errors.target ? <Text style={styles.errorText}>{errors.target}</Text> : null}

            <Text style={styles.fieldLabel}>Modal Awal (opsional)</Text>
            <View style={styles.rupiahInput}>
                <Text style={[styles.prefix, { color: colors.textSecondary }]}>Rp</Text>
                <TextInput
                    style={styles.numInput}
                    value={currentInput}
                    onChangeText={onCurrentChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel="Modal awal"
                />
            </View>

            <Text style={styles.fieldLabel}>Rencana Menabung</Text>
            <View style={styles.savingRow}>
                <View style={[styles.rupiahInput, styles.savingInput, errors.saving ? styles.inputError : null]}>
                    <Text style={[styles.prefix, { color: colors.textSecondary }]}>Rp</Text>
                    <TextInput
                        style={styles.numInput}
                        value={savingInput}
                        onChangeText={onSavingChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        accessibilityLabel="Rencana menabung"
                    />
                </View>
                <View
                    style={[
                        styles.periodSelector,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                >
                    {PERIOD_OPTIONS.map((period) => {
                        const active = periodType === period.id;
                        return (
                            <TouchableOpacity
                                key={period.id}
                                style={[styles.periodBtn, active && { backgroundColor: colors.primaryBg }]}
                                onPress={() => onPeriodChange(period.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text
                                    style={[
                                        styles.periodBtnText,
                                        { color: colors.textSecondary },
                                        active && { color: colors.primary, fontFamily: FontFamily.bodyBold },
                                    ]}
                                >
                                    /{period.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
            {errors.saving ? <Text style={styles.errorText}>{errors.saving}</Text> : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        card: {
            borderWidth: 1,
            borderRadius: 24,
            padding: 18,
            gap: 12,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 1,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
        },
        fieldLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        rupiahInput: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
            minHeight: 54,
        },
        inputError: { borderColor: colors.danger },
        prefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
        },
        numInput: {
            flex: 1,
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textPrimary,
            padding: 0,
            height: 40,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
        savingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        savingInput: { flex: 1 },
        periodSelector: {
            flexDirection: 'row',
            borderRadius: 16,
            padding: 4,
            gap: 2,
            borderWidth: 1,
            height: 54,
            alignItems: 'center',
        },
        periodBtn: {
            paddingHorizontal: 12,
            height: '100%',
            justifyContent: 'center',
            borderRadius: 12,
        },
        periodBtnText: { fontFamily: FontFamily.body, fontSize: 12 },
    });
