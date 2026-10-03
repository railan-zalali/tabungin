// Hero gradient kartu detail target tabungan.
// Diekstrak dari SavingDetailScreen.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ProgressBar } from './ProgressBar';
import { ContextBadge } from '../common/ContextBadge';
import type { SavingGoal, SavingGoalComputedMeta } from '../../types/saving';
import type { Wallet } from '../../database/walletQueries';

interface SavingGoalHeroProps {
    goal: SavingGoal;
    progress: number;
    isCompleted: boolean;
    wallet?: Wallet | null;
    meta: SavingGoalComputedMeta;
    memberCount: number;
    animationDelay?: number;
}

export function SavingGoalHero({
    goal,
    progress,
    isCompleted,
    wallet,
    meta,
    memberCount,
    animationDelay = 70,
}: SavingGoalHeroProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
            <LinearGradient
                colors={[goal.color, `${goal.color}CC`, goal.color]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroSection}
            >
                <View style={styles.heroGlow} />

                <View style={styles.heroTopRow}>
                    <View style={styles.contextRow}>
                        {wallet ? (
                            <ContextBadge
                                icon={meta.isSharedWalletGoal ? 'account-group-outline' : 'wallet-outline'}
                                label={wallet.name}
                                inverse
                            />
                        ) : null}
                        <ContextBadge
                            icon={meta.isSharedGoal ? 'account-group-outline' : 'account-outline'}
                            label={meta.scopeLabel}
                            inverse
                        />
                        {memberCount > 0 ? (
                            <ContextBadge
                                icon="shield-account-outline"
                                label={`${memberCount} member`}
                                inverse
                            />
                        ) : null}
                    </View>
                </View>

                <Text style={styles.heroEmoji}>{goal.emoji}</Text>
                <Text style={styles.heroName}>{goal.name}</Text>
                <Text style={styles.heroProgress}>{progress.toFixed(1)}%</Text>
                <ProgressBar
                    progress={progress}
                    color={colors.textInverse}
                    height={12}
                    animationDelay={200}
                    style={{ width: '82%' }}
                />
                <Text style={styles.heroDescription}>{meta.scopeDescription}</Text>
                {isCompleted ? (
                    <View style={styles.completedBanner}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                        <Text style={styles.completedText}>Sudah tercapai!</Text>
                    </View>
                ) : null}
            </LinearGradient>
        </Animated.View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        heroSection: {
            borderRadius: 30,
            padding: 28,
            alignItems: 'center',
            gap: 12,
            overflow: 'hidden',
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 6,
        },
        heroGlow: {
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            top: -55,
            right: -24,
            backgroundColor: colors.heroOverlaySoft,
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
        heroEmoji: { fontSize: 64 },
        heroName: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h2,
            color: colors.textInverse,
            textAlign: 'center',
        },
        heroProgress: { fontFamily: FontFamily.heading, fontSize: 48, color: colors.textInverse },
        heroDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.onHeroMuted,
            textAlign: 'center',
            paddingHorizontal: 12,
        },
        completedBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.border,
        },
        completedText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.success,
        },
    });
