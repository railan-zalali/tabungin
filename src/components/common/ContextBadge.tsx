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
            backgroundColor: colors.brutalWhite,
            borderColor: colors.brutalInk,
            textColor: colors.brutalInk,
        };
    }

    switch (tone) {
        case 'primary':
            return { backgroundColor: colors.brutalGreen, borderColor: colors.brutalInk, textColor: colors.brutalInk };
        case 'success':
            return { backgroundColor: colors.brutalLime, borderColor: colors.brutalInk, textColor: colors.brutalInk };
        case 'warning':
            return { backgroundColor: colors.brutalYellow, borderColor: colors.brutalInk, textColor: colors.brutalInk };
        case 'info':
            return { backgroundColor: colors.brutalBlue, borderColor: colors.brutalInk, textColor: colors.brutalWhite };
        case 'neutral':
        default:
            return { backgroundColor: colors.brutalWhite, borderColor: colors.brutalInk, textColor: colors.brutalInk };
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
            borderWidth: 2,
            maxWidth: '100%',
        },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.label, textSize),
            color: colors.textSecondary,
        },
    });
