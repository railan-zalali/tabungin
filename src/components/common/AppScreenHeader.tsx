import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

type HeaderVariant = 'solid' | 'glass' | 'transparent';
type HeaderDensity = 'default' | 'compact';

export interface HeaderAction {
    icon: string;
    label: string;
    onPress: () => void;
    tone?: 'primary' | 'default';
}

interface AppScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    showClose?: boolean;
    onBackPress?: () => void;
    onClosePress?: () => void;
    rightAction?: HeaderAction;
    rightSlot?: React.ReactNode;
    contextBadges?: React.ReactNode;
    sticky?: boolean;
    variant?: HeaderVariant;
    eyebrow?: string;
    density?: HeaderDensity;
}

export function AppScreenHeader({
    title,
    subtitle,
    showBack = false,
    showClose = false,
    onBackPress,
    onClosePress,
    rightAction,
    rightSlot,
    contextBadges,
    sticky = false,
    variant = 'glass',
    eyebrow,
    density = 'default',
}: AppScreenHeaderProps) {
    const { colors, textSize } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, textSize, metrics.isCompact), [colors, metrics.isCompact, textSize]);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: metrics.headerTopOffset,
                    paddingHorizontal: metrics.horizontalPadding,
                },
                sticky && styles.sticky,
                variant === 'solid' && styles.solid,
                variant === 'transparent' && styles.transparent,
                density === 'compact' && styles.compact,
            ]}
        >
            <View style={styles.row}>
                <View style={styles.leading}>
                    {showBack && onBackPress ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onBackPress}
                            accessibilityRole="button"
                            accessibilityLabel="Kembali"
                        >
                            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}
                    {showClose && onClosePress ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onClosePress}
                            accessibilityRole="button"
                            accessibilityLabel="Tutup"
                        >
                            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}
                    <View style={styles.copy}>
                        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                        <Text style={styles.title} numberOfLines={1}>
                            {title}
                        </Text>
                        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    </View>
                </View>

                {rightAction ? (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            rightAction.tone === 'primary' ? styles.actionButtonPrimary : null,
                        ]}
                        onPress={rightAction.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={rightAction.label}
                    >
                        <MaterialCommunityIcons
                            name={rightAction.icon as any}
                            size={20}
                            color={rightAction.tone === 'primary' ? colors.textInverse : colors.primary}
                        />
                    </TouchableOpacity>
                ) : rightSlot ? (
                    rightSlot
                ) : (
                    <View style={styles.actionPlaceholder} />
                )}
            </View>

            {contextBadges ? <View style={styles.contextBadges}>{contextBadges}</View> : null}
        </View>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
    isCompact: boolean,
) =>
    StyleSheet.create({
        container: {
            paddingBottom: isCompact ? 12 : 16,
            backgroundColor: colors.pageHeader,
            borderBottomWidth: 1,
            borderBottomColor: colors.headerDivider,
        },
        compact: {
            paddingBottom: 10,
        },
        sticky: {
            backgroundColor: colors.stickyHeader,
        },
        solid: {
            backgroundColor: colors.background,
        },
        transparent: {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isCompact ? 10 : 12,
        },
        leading: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            flex: 1,
            gap: isCompact ? 10 : 12,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.interactiveIdle,
            borderWidth: 1,
            borderColor: colors.border,
        },
        copy: {
            flex: 1,
            paddingTop: 2,
            gap: 2,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.label, textSize),
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: colors.primary,
        },
        title: {
            ...Typography.h2,
            fontSize: scaleFontSize(isCompact ? FontSize.h3 : FontSize.h2, textSize),
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: isCompact ? 18 : 19,
            color: colors.textSecondary,
        },
        actionButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.statSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        actionButtonPrimary: {
            backgroundColor: colors.primary,
            borderColor: `${colors.primaryDark}44`,
        },
        actionPlaceholder: {
            width: 44,
            height: 44,
        },
        contextBadges: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: isCompact ? 10 : 12,
        },
    });
