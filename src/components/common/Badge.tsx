// Komponen Badge / Chip untuk label status
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

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
                return { bg: colors.successLight, text: colors.success };
            case 'danger':
                return { bg: colors.dangerLight, text: colors.danger };
            case 'warning':
                return { bg: colors.warningLight, text: colors.warning };
            case 'info':
                return { bg: colors.infoLight, text: colors.info };
            case 'primary':
                return { bg: colors.primaryLight, text: colors.primaryDark };
            case 'secondary':
                return { bg: colors.secondaryLight, text: '#B45309' };
            case 'neutral':
            default:
                return { bg: colors.surfaceElevated, text: colors.textSecondary };
        }
    };

    const config = getVariantConfig();
    return (
        <View
            style={[
                styles.base,
                size === 'sm' && styles.sm,
                { backgroundColor: config.bg },
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
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    sm: { paddingHorizontal: 8, paddingVertical: 3 },
    text: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
    },
    textSm: { fontSize: FontSize.label },
});
