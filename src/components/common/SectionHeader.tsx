import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    eyebrow?: string;
    hideSubtitleOnCompact?: boolean;
}

export function SectionHeader({
    title,
    subtitle,
    actionLabel,
    onAction,
    eyebrow,
    hideSubtitleOnCompact = false,
}: SectionHeaderProps) {
    const { colors, textSize } = useTheme();
    const metrics = useResponsiveMetrics();
    const compactLayout = metrics.density === 'compact';
    const styles = React.useMemo(() => getStyles(colors, textSize, compactLayout), [colors, compactLayout, textSize]);
    const shouldStack = compactLayout && Boolean(actionLabel && onAction);
    const shouldShowSubtitle = Boolean(subtitle) && !(hideSubtitleOnCompact && compactLayout);

    return (
        <View style={[styles.wrapper, shouldStack ? styles.wrapperStacked : null]}>
            <View style={styles.copy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title}>{title}</Text>
                {shouldShowSubtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {actionLabel && onAction ? (
                <TouchableOpacity style={styles.actionButton} onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.actionLabel}>{actionLabel}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
    isCompact: boolean,
) =>
    StyleSheet.create({
        wrapper: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: isCompact ? 'flex-start' : 'center',
            gap: 12,
        },
        wrapperStacked: {
            flexDirection: 'column',
        },
        copy: {
            flex: 1,
            gap: isCompact ? 1 : 2,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.label, textSize),
            textTransform: 'uppercase',
            letterSpacing: 0.6,
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
            color: colors.textSecondary,
            lineHeight: isCompact ? 17 : 18,
        },
        actionButton: {
            minHeight: isCompact ? 34 : 36,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: isCompact ? 10 : 12,
            paddingVertical: isCompact ? 7 : 8,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primaryBg,
            borderWidth: 1,
            borderColor: colors.focusRing,
        },
        actionLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.primary,
        },
    });
