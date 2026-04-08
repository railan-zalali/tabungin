import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SettingsGroupProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function SettingsGroup({ title, description, children }: SettingsGroupProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.group}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
            <View style={styles.card}>{children}</View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        group: {
            gap: 10,
        },
        header: {
            gap: 3,
            paddingHorizontal: 4,
        },
        title: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textTertiary,
            lineHeight: 18,
        },
        card: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
        },
    });
