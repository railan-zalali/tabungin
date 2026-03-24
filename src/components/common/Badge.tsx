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
                return { bg: colors.successBg, text: colors.success, border: `${colors.success}28` };
            case 'danger':
                return { bg: colors.dangerBg, text: colors.danger, border: `${colors.danger}28` };
            case 'warning':
                return { bg: colors.warningBg, text: colors.warning, border: `${colors.warning}28` };
            case 'info':
                return { bg: colors.infoBg, text: colors.info, border: `${colors.info}28` };
            case 'primary':
                return { bg: colors.primaryBg, text: colors.primaryDark, border: `${colors.primary}28` };
            case 'secondary':
                return { bg: colors.secondaryLight, text: colors.warning, border: `${colors.warning}22` };
            case 'neutral':
            default:
                return { bg: colors.surfaceGlass, text: colors.textSecondary, border: `${colors.borderStrong}66` };
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
        borderWidth: 1,
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
