// Preview gradient kartu target pada layar Buat/Edit Target.
// Diekstrak dari AddSavingGoalScreen agar screen cukup berisi form + komposisi.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ContextBadge } from '../common/ContextBadge';
import type { Wallet } from '../../database/walletQueries';

interface GoalPreviewCardProps {
    color: string;
    emoji: string;
    name: string;
    /** Sudah diformat, contoh: "Rp 15.000.000" atau "Rp 0" */
    targetLabel: string;
    /** Sudah diformat, contoh: "12 Okt 2026" atau "Menunggu simulasi" */
    estimatedLabel: string;
    wallet?: Wallet | null;
    isSharedWallet: boolean;
    isSharedGoal: boolean;
    scopeLabel: string;
    scopeDescription: string;
    animationDelay?: number;
}

export function GoalPreviewCard({
    color,
    emoji,
    name,
    targetLabel,
    estimatedLabel,
    wallet,
    isSharedWallet,
    isSharedGoal,
    scopeLabel,
    scopeDescription,
    animationDelay = 60,
}: GoalPreviewCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
            <LinearGradient
                colors={[color, colors.primaryDark, color]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.orb} />
                <View style={styles.badgeRow}>
                    {wallet ? (
                        <ContextBadge
                            icon={isSharedWallet ? 'account-group-outline' : 'wallet-outline'}
                            label={wallet.name}
                            inverse
                        />
                    ) : null}
                    <ContextBadge
                        icon={isSharedGoal ? 'account-group-outline' : 'account-outline'}
                        label={scopeLabel}
                        inverse
                    />
                </View>

                <View style={styles.header}>
                    <View style={styles.emojiWrap}>
                        <Text style={styles.emoji}>{emoji}</Text>
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>
                            {name.trim() || 'Nama targetmu'}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {scopeDescription}
                        </Text>
                    </View>
                </View>

                <View style={styles.metrics}>
                    <View>
                        <Text style={styles.metricLabel}>Target</Text>
                        <Text style={styles.metricValue}>{targetLabel}</Text>
                    </View>
                    <View>
                        <Text style={styles.metricLabel}>Estimasi</Text>
                        <Text style={styles.metricValueSmall}>{estimatedLabel}</Text>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        card: {
            borderRadius: 28,
            padding: 20,
            overflow: 'hidden',
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
        },
        orb: {
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            top: -60,
            right: -24,
            backgroundColor: colors.heroOverlaySoft,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 14,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        emojiWrap: {
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.heroStroke,
            borderWidth: 1,
            borderColor: colors.heroStroke,
        },
        emoji: { fontSize: 28 },
        info: { flex: 1 },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textInverse,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.onHeroMuted,
            marginTop: 4,
        },
        metrics: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 22,
        },
        metricLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.onHeroMuted,
        },
        metricValue: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textInverse,
            marginTop: 6,
        },
        metricValueSmall: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textInverse,
            marginTop: 6,
        },
    });
