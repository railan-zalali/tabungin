import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface FormSectionProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    style?: ViewStyle;
}

export function FormSection({ title, subtitle, children, style }: FormSectionProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={[styles.section, style]}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        section: {
            backgroundColor: colors.panelSurface,
            borderRadius: BorderRadius['4xl'],
            padding: 20,
            borderWidth: 1,
            borderColor: colors.energeticBorder,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 4,
            gap: 16,
        },
        header: {
            gap: 6,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: 18,
            color: colors.textSecondary,
        },
        content: {
            gap: 16,
        },
    });
