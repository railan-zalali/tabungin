import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    eyebrow?: string;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, eyebrow }: SectionHeaderProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.copy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {actionLabel && onAction ? (
                <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.actionLabel}>{actionLabel}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        wrapper: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
        },
        copy: {
            flex: 1,
            gap: 2,
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
            fontSize: scaleFontSize(FontSize.h2, textSize),
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            lineHeight: 18,
        },
        actionLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.primary,
        },
    });
