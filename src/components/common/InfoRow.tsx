import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface InfoRowProps {
    icon: string;
    label: string;
    value: string;
    tone?: 'primary' | 'neutral';
}

export function InfoRow({
    icon,
    label,
    value,
    tone = 'neutral',
}: InfoRowProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const accent = tone === 'primary' ? colors.primary : colors.textSecondary;

    return (
        <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: tone === 'primary' ? colors.primaryBg : colors.statSurface }]}>
                <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
            </View>
            <View style={styles.copy}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        iconWrap: {
            width: 36,
            height: 36,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        copy: {
            flex: 1,
            gap: 2,
        },
        label: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
        },
        value: {
            ...Typography.h4,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
        },
    });
