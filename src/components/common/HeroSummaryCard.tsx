import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface HeroStatItem {
    label: string;
    value: string;
    icon?: string;
}

interface HeroSummaryCardProps {
    eyebrow?: string;
    title: string;
    value: string;
    description?: string;
    icon?: string;
    badges?: React.ReactNode;
    stats?: HeroStatItem[];
    ctaLabel?: string;
    onPressCta?: () => void;
    tone?: 'primary' | 'success' | 'warning' | 'info';
}

export function HeroSummaryCard({
    eyebrow,
    title,
    value,
    description,
    icon = 'sparkles',
    badges,
    stats,
    ctaLabel,
    onPressCta,
    tone = 'primary',
}: HeroSummaryCardProps) {
    const { colors, gradients, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const gradientMap = {
        primary: gradients.hero,
        success: [colors.success, colors.primaryDark, colors.success] as const,
        warning: [colors.warning, colors.primaryDark, colors.warning] as const,
        info: [colors.info, colors.primaryDark, colors.info] as const,
    };

    return (
        <LinearGradient
            colors={gradientMap[tone] as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />

            <View style={styles.header}>
                <View style={styles.copy}>
                    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.value} numberOfLines={1}>
                        {value}
                    </Text>
                    {description ? <Text style={styles.description}>{description}</Text> : null}
                </View>

                <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name={icon as any} size={26} color={colors.textInverse} />
                </View>
            </View>

            {badges ? <View style={styles.badges}>{badges}</View> : null}

            {stats?.length ? (
                <View style={styles.statsRow}>
                    {stats.map((item) => (
                        <View key={`${item.label}-${item.value}`} style={styles.statChip}>
                            {item.icon ? (
                                <MaterialCommunityIcons name={item.icon as any} size={14} color={colors.textInverse} />
                            ) : null}
                            <Text style={styles.statValue}>{item.value}</Text>
                            <Text style={styles.statLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {ctaLabel && onPressCta ? (
                <TouchableOpacity style={styles.cta} onPress={onPressCta}>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textInverse} />
                </TouchableOpacity>
            ) : null}
        </LinearGradient>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        card: {
            borderRadius: BorderRadius['5xl'],
            padding: 22,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.16,
            shadowRadius: 24,
            elevation: 6,
        },
        glowTop: {
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: BorderRadius.full,
            top: -68,
            right: -24,
            backgroundColor: 'rgba(255,255,255,0.12)',
        },
        glowBottom: {
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: BorderRadius.full,
            bottom: -40,
            left: -20,
            backgroundColor: 'rgba(255,255,255,0.08)',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        copy: {
            flex: 1,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: 'rgba(255,255,255,0.78)',
            marginBottom: 6,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textInverse,
        },
        value: {
            ...Typography.display,
            fontSize: scaleFontSize(FontSize.display, textSize),
            color: colors.textInverse,
            marginTop: 8,
            letterSpacing: -1,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: 'rgba(255,255,255,0.82)',
            marginTop: 6,
            lineHeight: 18,
        },
        iconWrap: {
            width: 54,
            height: 54,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
        },
        badges: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 16,
        },
        statsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 18,
        },
        statChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: BorderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
        },
        statValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textInverse,
        },
        statLabel: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: 'rgba(255,255,255,0.82)',
        },
        cta: {
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: BorderRadius.xl,
            paddingVertical: 12,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
        },
        ctaText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.textInverse,
        },
    });
