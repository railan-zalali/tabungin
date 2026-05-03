// Komponen Badge / Chip untuk label status
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'neutral';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    style?: ViewStyle;
    accessibilityLabel?: string;
}

export function Badge({ label, variant = 'neutral', size = 'md', style, accessibilityLabel }: BadgeProps) {
    const { colors } = useTheme();

    const getVariantConfig = () => {
        switch (variant) {
            case 'success':
                return { bg: colors.brutalLime, text: colors.brutalInk, border: colors.brutalInk };
            case 'danger':
                return { bg: colors.brutalRed, text: colors.brutalInk, border: colors.brutalInk };
            case 'warning':
                return { bg: colors.brutalYellow, text: colors.brutalInk, border: colors.brutalInk };
            case 'info':
                return { bg: colors.brutalBlue, text: colors.brutalWhite, border: colors.brutalInk };
            case 'primary':
                return { bg: colors.brutalGreen, text: colors.brutalInk, border: colors.brutalInk };
            case 'secondary':
                return { bg: colors.brutalPink, text: colors.brutalInk, border: colors.brutalInk };
            case 'neutral':
            default:
                return { bg: colors.brutalWhite, text: colors.brutalInk, border: colors.brutalInk };
        }
    };

    const config = getVariantConfig();
    return (
        <View
            style={[
                styles.base,
                size === 'sm' && styles.sm,
                { backgroundColor: config.bg, borderColor: config.border },
                style,
            ]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={accessibilityLabel ?? label}
        >
            <Text
                style={[styles.text, size === 'sm' && styles.textSm, { color: config.text }]}
                allowFontScaling={true}
                numberOfLines={1}
            >
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        alignSelf: 'flex-start',
    },
    sm: { paddingHorizontal: 8, paddingVertical: 4 },
    text: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        letterSpacing: 0.15,
    },
    textSm: { fontSize: FontSize.label },
});
