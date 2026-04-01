import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.copy}>
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
            marginTop: 2,
        },
        actionLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.primary,
        },
    });
