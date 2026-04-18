import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

type ActionTileTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

interface ActionTileProps {
    icon: string;
    title: string;
    description?: string;
    tone?: ActionTileTone;
    onPress: () => void;
    layout?: 'default' | 'compact';
}

function resolvePalette(colors: ReturnType<typeof useTheme>['colors'], tone: ActionTileTone) {
    switch (tone) {
        case 'success':
            return { accent: colors.success, bg: colors.successBg, border: `${colors.success}22` };
        case 'warning':
            return { accent: colors.warning, bg: colors.warningBg, border: `${colors.warning}22` };
        case 'info':
            return { accent: colors.info, bg: colors.infoBg, border: `${colors.info}22` };
        case 'neutral':
            return { accent: colors.textPrimary, bg: colors.statSurface, border: colors.cardBorder };
        case 'primary':
        default:
            return { accent: colors.primary, bg: colors.primaryBg, border: `${colors.primary}22` };
    }
}

export function ActionTile({
    icon,
    title,
    description,
    tone = 'primary',
    onPress,
    layout = 'default',
}: ActionTileProps) {
    const { colors, textSize } = useTheme();
    const metrics = useResponsiveMetrics();
    const compactLayout = layout === 'compact' || metrics.density === 'compact';
    const styles = React.useMemo(() => getStyles(colors, textSize, compactLayout), [colors, compactLayout, textSize]);
    const palette = resolvePalette(colors, tone);

    return (
        <TouchableOpacity
            style={[styles.tile, { borderColor: palette.border }]}
            onPress={onPress}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={description}
        >
            <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                <MaterialCommunityIcons name={icon as any} size={22} color={palette.accent} />
            </View>
            <View style={styles.copy}>
                <Text style={styles.title}>{title}</Text>
                {description ? <Text style={styles.description} numberOfLines={compactLayout ? 2 : 3}>{description}</Text> : null}
            </View>
            <View style={styles.trailing}>
                <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
    isCompact: boolean,
) =>
    StyleSheet.create({
        tile: {
            minHeight: isCompact ? 88 : 96,
            flexDirection: 'row',
            alignItems: isCompact ? 'flex-start' : 'center',
            gap: 14,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            paddingHorizontal: isCompact ? 14 : 16,
            paddingVertical: isCompact ? 14 : 16,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
        },
        iconWrap: {
            width: isCompact ? 46 : 50,
            height: isCompact ? 46 : 50,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        copy: {
            flex: 1,
            gap: 3,
        },
        title: {
            ...Typography.h4,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            lineHeight: 18,
        },
        trailing: {
            paddingTop: isCompact ? 2 : 0,
        },
    });
