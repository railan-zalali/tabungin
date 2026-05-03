import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { Button } from './Button';

type StateTone = 'default' | 'success' | 'warning' | 'danger';

interface StatePanelProps {
    icon?: string;
    title: string;
    description?: string;
    tone?: StateTone;
    loading?: boolean;
    actionLabel?: string;
    onAction?: () => void;
}

export function StatePanel({
    icon = 'information-outline',
    title,
    description,
    tone = 'default',
    loading = false,
    actionLabel,
    onAction,
}: StatePanelProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const toneMap = {
        default: { bg: colors.brutalWhite, accent: colors.brutalYellow },
        success: { bg: colors.brutalLime, accent: colors.brutalGreen },
        warning: { bg: colors.brutalYellow, accent: colors.warning },
        danger: { bg: colors.brutalRed, accent: colors.danger },
    };
    const palette = toneMap[tone];

    return (
        <View style={[styles.panel, { backgroundColor: palette.bg }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${palette.accent}18` }]}>
                {loading ? (
                    <ActivityIndicator size="small" color={palette.accent} />
                ) : (
                    <MaterialCommunityIcons name={icon as any} size={22} color={palette.accent} />
                )}
            </View>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {actionLabel && onAction ? (
                <Button label={actionLabel} onPress={onAction} variant="secondary" />
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        panel: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 28,
            gap: 12,
            borderRadius: BorderRadius.md,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
        },
        iconWrap: {
            width: 56,
            height: 56,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.brutalInk,
            backgroundColor: colors.brutalWhite,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
            textAlign: 'center',
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            lineHeight: 18,
            textAlign: 'center',
        },
    });
