import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const toneMap = {
        primary: colors.brutalYellow,
        success: colors.brutalLime,
        warning: colors.brutalYellow,
        info: colors.brutalBlue,
    };
    const foregroundColor = tone === 'info' ? colors.brutalWhite : colors.brutalInk;

    return (
        <View style={[styles.card, { backgroundColor: toneMap[tone] }]}>
            <View style={styles.header}>
                <View style={styles.copy}>
                    {eyebrow ? <Text style={[styles.eyebrow, { color: foregroundColor }]}>{eyebrow}</Text> : null}
                    <Text style={[styles.title, { color: foregroundColor }]}>{title}</Text>
                    <Text style={[styles.value, { color: foregroundColor }]} adjustsFontSizeToFit minimumFontScale={0.78}>
                        {value}
                    </Text>
                    {description ? <Text style={[styles.description, { color: foregroundColor }]}>{description}</Text> : null}
                </View>

                <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name={icon as any} size={26} color={colors.brutalInk} />
                </View>
            </View>

            {badges ? <View style={styles.badges}>{badges}</View> : null}

            {stats?.length ? (
                <View style={styles.statsRow}>
                    {stats.map((item) => (
                        <View key={`${item.label}-${item.value}`} style={styles.statChip}>
                            {item.icon ? (
                                <MaterialCommunityIcons name={item.icon as any} size={14} color={colors.brutalInk} />
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
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.brutalInk} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        card: {
            borderRadius: BorderRadius.md,
            padding: 22,
            overflow: 'hidden',
            borderWidth: 3,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 6, height: 6 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 7,
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
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.h4, textSize),
        },
        value: {
            ...Typography.display,
            fontSize: scaleFontSize(FontSize.display, textSize),
            marginTop: 8,
            letterSpacing: 0,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            marginTop: 6,
            lineHeight: 18,
        },
        iconWrap: {
            width: 54,
            height: 54,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brutalWhite,
            borderWidth: 2,
            borderColor: colors.brutalInk,
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
            borderRadius: BorderRadius.md,
            backgroundColor: colors.brutalWhite,
            borderWidth: 2,
            borderColor: colors.brutalInk,
        },
        statValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.brutalInk,
        },
        statLabel: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.brutalInk,
        },
        cta: {
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: BorderRadius.md,
            paddingVertical: 12,
            backgroundColor: colors.brutalWhite,
            borderWidth: 2,
            borderColor: colors.brutalInk,
        },
        ctaText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.brutalInk,
        },
    });
