// Grid statistik + ringkasan konteks ownership pada detail target.
// Diekstrak dari SavingDetailScreen.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { SectionHeader } from '../common/SectionHeader';

export interface GoalStatItem {
    label: string;
    value: string;
    icon: string;
}

interface GoalStatsGridProps {
    items: GoalStatItem[];
    /** Warna aksen (warna goal) untuk ikon dan kotak ikon */
    accentColor: string;
    scopeLabel: string;
    walletLabel: string;
}

export function GoalStatsGrid({ items, accentColor, scopeLabel, walletLabel }: GoalStatsGridProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <>
            <Animated.View entering={FadeInUp.delay(140).springify()} style={styles.infoGrid}>
                {items.map((item, idx) => (
                    <View
                        key={item.label}
                        style={[
                            styles.infoItem,
                            idx % 2 === 0 ? styles.borderRight : null,
                            idx < 2 ? styles.borderBottom : null,
                        ]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: `${accentColor}20` }]}>
                            <MaterialCommunityIcons name={item.icon as never} size={20} color={accentColor} />
                        </View>
                        <View style={styles.infoTextWrap}>
                            <Text style={styles.infoLabel}>{item.label}</Text>
                            <Text style={styles.infoValue}>{item.value}</Text>
                        </View>
                    </View>
                ))}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.summaryCard}>
                <SectionHeader
                    title="Konteks Ownership"
                    subtitle="Supaya jelas target ini berada di ruang mana dan siapa yang ikut melihat."
                />
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Scope</Text>
                        <Text style={styles.summaryValue}>{scopeLabel}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Wallet</Text>
                        <Text style={styles.summaryValue}>{walletLabel}</Text>
                    </View>
                </View>
            </Animated.View>
        </>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        infoGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
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
        infoLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginBottom: 4,
        },
        infoValue: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        summaryCard: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 24,
            padding: 18,
            gap: 14,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
        },
        summaryRow: {
            flexDirection: 'row',
            gap: 12,
        },
        summaryItem: {
            flex: 1,
            backgroundColor: colors.surfaceCard,
            borderRadius: BorderRadius['2xl'],
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
        },
        summaryLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        summaryValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginTop: 4,
        },
    });
