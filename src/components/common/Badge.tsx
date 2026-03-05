// Komponen Badge / Chip untuk label status
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'neutral';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    style?: ViewStyle;
    accessibilityLabel?: string;
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: Colors.successLight, text: Colors.success },
    danger: { bg: Colors.dangerLight, text: Colors.danger },
    warning: { bg: Colors.warningLight, text: Colors.warning },
    info: { bg: Colors.infoLight, text: Colors.info },
    primary: { bg: Colors.primaryLight, text: Colors.primaryDark },
    secondary: { bg: Colors.secondaryLight, text: '#B45309' },
    neutral: { bg: Colors.surfaceElevated, text: Colors.textSecondary },
};

export function Badge({ label, variant = 'neutral', size = 'md', style, accessibilityLabel }: BadgeProps) {
    const config = variantConfig[variant];
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
