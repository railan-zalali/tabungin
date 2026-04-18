import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info';

interface ContextBadgeProps {
    label: string;
    icon?: string;
    tone?: BadgeTone;
    inverse?: boolean;
}

function resolveBadgeColors(colors: ReturnType<typeof useTheme>['colors'], tone: BadgeTone, inverse: boolean) {
    if (inverse) {
        return {
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderColor: 'rgba(255,255,255,0.18)',
            textColor: colors.textInverse,
        };
    }

    switch (tone) {
        case 'primary':
            return { backgroundColor: colors.primaryBg, borderColor: `${colors.primary}26`, textColor: colors.primary };
        case 'success':
            return { backgroundColor: colors.successBg, borderColor: `${colors.success}26`, textColor: colors.success };
        case 'warning':
            return { backgroundColor: colors.warningBg, borderColor: `${colors.warning}26`, textColor: colors.warning };
        case 'info':
            return { backgroundColor: colors.infoBg, borderColor: `${colors.info}26`, textColor: colors.info };
        case 'neutral':
        default:
            return { backgroundColor: colors.statSurface, borderColor: colors.cardBorder, textColor: colors.textSecondary };
    }
}

export function ContextBadge({
    label,
    icon,
    tone = 'neutral',
    inverse = false,
}: ContextBadgeProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const palette = resolveBadgeColors(colors, tone, inverse);

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: palette.backgroundColor,
                    borderColor: palette.borderColor,
                },
            ]}
        >
            {icon ? <MaterialCommunityIcons name={icon as any} size={12} color={palette.textColor} /> : null}
            <Text style={[styles.label, { color: palette.textColor }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            maxWidth: '100%',
        },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.label, textSize),
            color: colors.textSecondary,
        },
    });
