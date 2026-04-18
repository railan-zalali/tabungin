import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

type MetricTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface MetricCardProps {
    label: string;
    value: string;
    icon?: string;
    caption?: string;
    tone?: MetricTone;
}

function resolvePalette(colors: ReturnType<typeof useTheme>['colors'], tone: MetricTone) {
    switch (tone) {
        case 'success':
            return { accent: colors.success, bg: colors.successBg };
        case 'warning':
            return { accent: colors.warning, bg: colors.warningBg };
        case 'danger':
            return { accent: colors.danger, bg: colors.dangerBg };
        case 'neutral':
            return { accent: colors.textPrimary, bg: colors.statSurface };
        case 'primary':
        default:
            return { accent: colors.primary, bg: colors.primaryBg };
    }
}

export function MetricCard({
    label,
    value,
    icon,
    caption,
    tone = 'neutral',
}: MetricCardProps) {
    const { colors, textSize } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, textSize, metrics.density === 'compact'), [colors, metrics.density, textSize]);
    const palette = resolvePalette(colors, tone);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <Text style={styles.label}>{label}</Text>
                {icon ? (
                    <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                        <MaterialCommunityIcons name={icon as any} size={16} color={palette.accent} />
                    </View>
                ) : null}
            </View>
            <Text style={styles.value}>{value}</Text>
            {caption ? <Text style={styles.caption} numberOfLines={2}>{caption}</Text> : null}
        </View>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
    isCompact: boolean,
) =>
    StyleSheet.create({
        card: {
            flex: 1,
            minWidth: 140,
            gap: isCompact ? 6 : 8,
            borderRadius: BorderRadius['3xl'],
            padding: isCompact ? 14 : 16,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        topRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
        },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
        },
        iconWrap: {
            width: isCompact ? 28 : 30,
            height: isCompact ? 28 : 30,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        value: {
            ...Typography.h2,
            fontSize: scaleFontSize(isCompact ? FontSize.h3 : FontSize.h2, textSize),
            color: colors.textPrimary,
        },
        caption: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            lineHeight: isCompact ? 17 : 18,
        },
    });
