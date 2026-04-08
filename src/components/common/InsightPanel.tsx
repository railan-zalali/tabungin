import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface InsightPanelProps {
    icon?: string;
    title: string;
    description: string;
    badges?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    tone?: 'primary' | 'success' | 'warning' | 'info';
}

export function InsightPanel({
    icon = 'lightbulb-on-outline',
    title,
    description,
    badges,
    actionLabel,
    onAction,
    tone = 'primary',
}: InsightPanelProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const palette = tone === 'success'
        ? { accent: colors.success, softBg: colors.successBg }
        : tone === 'warning'
            ? { accent: colors.warning, softBg: colors.warningBg }
            : tone === 'info'
                ? { accent: colors.info, softBg: colors.infoBg }
                : { accent: colors.primary, softBg: colors.primaryBg };

    return (
        <View style={styles.panel}>
            <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: palette.softBg }]}>
                    <MaterialCommunityIcons name={icon as any} size={18} color={palette.accent} />
                </View>
                <View style={styles.copy}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                </View>
            </View>

            {badges ? <View style={styles.badges}>{badges}</View> : null}

            {actionLabel && onAction ? (
                <TouchableOpacity style={styles.action} onPress={onAction}>
                    <Text style={styles.actionText}>{actionLabel}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        panel: {
            backgroundColor: colors.panelSurface,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 4,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        iconWrap: {
            width: 38,
            height: 38,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        copy: {
            flex: 1,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.textPrimary,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 4,
        },
        badges: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 14,
        },
        action: {
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            paddingVertical: 10,
            borderRadius: BorderRadius.xl,
            backgroundColor: colors.panelSurfaceStrong,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        actionText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.primary,
        },
    });
