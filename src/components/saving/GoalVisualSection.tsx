// Bagian "Visual dan Reminder" pada form target tabungan.
// Diekstrak dari AddSavingGoalScreen.
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import { useTheme } from '../../store/useThemeStore';

interface GoalVisualSectionProps {
    color: string;
    onColorChange: (color: string) => void;
    /** Teks estimasi tercapai; null saat simulasi belum tersedia */
    estimatedLabel: string | null;
    reminderEnabled: boolean;
    onReminderChange: (enabled: boolean) => void;
}

export function GoalVisualSection({
    color,
    onColorChange,
    estimatedLabel,
    reminderEnabled,
    onReminderChange,
}: GoalVisualSectionProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Visual dan Reminder</Text>

            <Text style={styles.fieldLabel}>Warna Tema</Text>
            <View style={styles.colorRow}>
                {GOAL_COLORS.map((item) => (
                    <TouchableOpacity
                        key={item}
                        style={[styles.colorBtn, { backgroundColor: item }]}
                        onPress={() => onColorChange(item)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: color === item }}
                        accessibilityLabel={`Pilih warna ${item}`}
                    >
                        {color === item ? (
                            <View style={[styles.checkIcon, { backgroundColor: colors.overlayLight }]}>
                                <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} />
                            </View>
                        ) : null}
                    </TouchableOpacity>
                ))}
            </View>

            {estimatedLabel ? (
                <View
                    style={[
                        styles.simulationCard,
                        { backgroundColor: `${colors.primaryLight}88`, borderColor: `${colors.primary}24` },
                    ]}
                >
                    <View style={styles.simHeader}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                        <Text style={[styles.simTitle, { color: colors.primary }]}>Estimasi tercapai</Text>
                    </View>
                    <Text style={[styles.simText, { color: colors.textPrimary }]}>
                        Dengan ritme ini, target diperkirakan tercapai pada{' '}
                        <Text style={[styles.simHighlight, { color: colors.primary }]}>{estimatedLabel}</Text>.
                    </Text>
                </View>
            ) : null}

            <View
                style={[
                    styles.switchContainer,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
            >
                <View style={styles.switchTextContainer}>
                    <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Pengingat Menabung</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                        Notifikasi rutin sesuai periode menabung agar target tetap bergerak.
                    </Text>
                </View>
                <Switch
                    value={reminderEnabled}
                    onValueChange={onReminderChange}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={reminderEnabled ? colors.primary : colors.surfaceElevated}
                />
            </View>
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
        colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
        colorBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkIcon: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
        simulationCard: {
            borderRadius: 18,
            padding: 16,
            gap: 8,
            borderWidth: 1,
        },
        simHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        simTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body },
        simText: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 22 },
        simHighlight: { fontFamily: FontFamily.bodyBold },
        switchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 1,
        },
        switchTextContainer: { flex: 1, marginRight: 16 },
        switchLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            marginBottom: 2,
        },
        switchDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
        },
    });
