// Komponen EmptyState dengan ilustrasi dan pesan motivasi
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { Button } from './Button';
import { useTheme } from '../../store/useThemeStore';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export function EmptyState({
    icon,
    title,
    description,
    message,
    actionLabel,
    onAction,
    style,
}: EmptyStateProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    return (
        <View
            style={[styles.container, style]}
            accessible={true}
            accessibilityLabel={`${title}${description || message ? '. ' + (description || message) : ''}`}
        >
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                    name={icon as any}
                    size={56}
                    color={colors.textDisabled}
                    accessibilityElementsHidden={true}
                />
            </View>
            <Text style={styles.title} allowFontScaling={true}>
                {title}
            </Text>
            {(description || message) && (
                <Text style={styles.description} allowFontScaling={true}>
                    {description || message}
                </Text>
            )}
            {actionLabel && onAction && (
                <Button
                    label={actionLabel}
                    onPress={onAction}
                    variant="primary"
                    size="md"
                    style={styles.button}
                />
            )}
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
        gap: 12,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    description: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    button: { marginTop: 8, paddingHorizontal: 32 },
});
