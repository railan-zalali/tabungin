// Komponen EmptyState dengan ilustrasi dan pesan motivasi
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { Button } from './Button';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius, Shadow } from '../../constants/theme';

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
            <View style={styles.illustrationShell}>
                <View style={styles.illustrationHalo} />
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={56}
                        color={colors.primary}
                        accessibilityElementsHidden={true}
                    />
                </View>
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
                    emphasis="medium"
                    style={styles.button}
                />
            )}
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 34,
        gap: 14,
        backgroundColor: colors.surfaceGlass,
        borderRadius: BorderRadius['4xl'],
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
        ...Shadow.sm,
    },
    illustrationShell: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    illustrationHalo: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryBg,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.surfaceCard,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassStroke,
    },
    title: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    description: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 300,
    },
    button: { marginTop: 10, paddingHorizontal: 28 },
});
