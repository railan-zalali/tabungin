import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

type ActionTileTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

interface ActionTileProps {
    icon: string;
    title: string;
    description?: string;
    tone?: ActionTileTone;
    onPress: () => void;
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
}: ActionTileProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
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
                {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        tile: {
            minHeight: 96,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 16,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
        },
        iconWrap: {
            width: 50,
            height: 50,
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
    });
