// Komponen EmptyState dengan ilustrasi dan pesan motivasi
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { Button } from './Button';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    illustrationVariant?: 'soft' | 'ring';
    compact?: boolean;
    actionVariant?: 'primary' | 'secondary' | 'outline';
}

export function EmptyState({
    icon,
    title,
    description,
    message,
    actionLabel,
    onAction,
    style,
    tone = 'default',
    illustrationVariant = 'soft',
    compact = false,
    actionVariant = 'primary',
}: EmptyStateProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const toneMap = {
        default: { accent: colors.primary, bg: colors.panelSurface },
        success: { accent: colors.success, bg: colors.successSurface },
        warning: { accent: colors.warning, bg: colors.warningSurface },
        danger: { accent: colors.danger, bg: colors.dangerSurface },
        info: { accent: colors.info, bg: colors.infoBg },
    };
    const palette = toneMap[tone];
    return (
        <View
            style={[
                styles.container,
                compact && styles.compact,
                illustrationVariant === 'ring' && styles.containerRing,
                { backgroundColor: palette.bg, borderColor: colors.cardBorder },
                style,
            ]}
            accessible={true}
            accessibilityLabel={`${title}${description || message ? '. ' + (description || message) : ''}`}
        >
            <View style={styles.illustrationShell}>
                <View style={[styles.illustrationHalo, { backgroundColor: `${palette.accent}12` }]} />
                <View
                    style={[
                        styles.iconContainer,
                        illustrationVariant === 'ring' ? styles.iconContainerRing : null,
                        { borderColor: `${palette.accent}24` },
                    ]}
                >
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={56}
                        color={palette.accent}
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
                    variant={actionVariant}
                    size="md"
                    emphasis="medium"
                    style={styles.button}
                />
            )}
        </View>
    );
}

const getStyles = (colors: any, textSize: ReturnType<typeof useTheme>['textSize']) => StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 34,
        gap: 14,
            backgroundColor: colors.emptyStateBg,
            borderRadius: BorderRadius['4xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
    },
    compact: {
        paddingVertical: 24,
    },
    containerRing: {
        borderStyle: 'dashed',
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
            backgroundColor: colors.emptyStateHalo,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
            borderColor: colors.emptyStateRing,
        },
    iconContainerRing: {
        backgroundColor: 'transparent',
    },
    title: {
        fontFamily: FontFamily.headingMedium,
        fontSize: scaleFontSize(FontSize.h3, textSize),
        color: colors.textPrimary,
        textAlign: 'center',
    },
    description: {
        fontFamily: FontFamily.body,
        fontSize: scaleFontSize(FontSize.body, textSize),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 300,
    },
    button: { marginTop: 10, paddingHorizontal: 28 },
});
