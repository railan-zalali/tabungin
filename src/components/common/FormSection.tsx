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
    eyebrow?: string;
    density?: 'comfortable' | 'compact';
    variant?: 'default' | 'highlight' | 'subtle';
}

export function FormSection({
    title,
    subtitle,
    children,
    style,
    eyebrow,
    density = 'comfortable',
    variant = 'default',
}: FormSectionProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View
            style={[
                styles.section,
                density === 'compact' ? styles.sectionCompact : null,
                variant === 'highlight' ? styles.sectionHighlight : null,
                variant === 'subtle' ? styles.sectionSubtle : null,
                style,
            ]}
        >
            <View style={styles.header}>
                {eyebrow ? <Text style={[styles.eyebrow, variant === 'highlight' ? styles.eyebrowHighlight : null]}>{eyebrow}</Text> : null}
                <Text style={[styles.title, variant === 'highlight' ? styles.titleHighlight : null]}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, variant === 'highlight' ? styles.subtitleHighlight : null]}>{subtitle}</Text> : null}
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
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
            gap: 14,
        },
        sectionCompact: {
            padding: 16,
            gap: 12,
        },
        sectionHighlight: {
            backgroundColor: colors.panelSurfaceStrong,
            borderColor: colors.cardBorderStrong,
        },
        sectionSubtle: {
            backgroundColor: colors.surfaceAlt,
            shadowOpacity: 0,
            elevation: 0,
        },
        header: {
            gap: 4,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.label, textSize),
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        eyebrowHighlight: {
            color: 'rgba(255,255,255,0.72)',
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
        },
        titleHighlight: {
            color: colors.textInverse,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: 18,
            color: colors.textSecondary,
        },
        subtitleHighlight: {
            color: 'rgba(255,255,255,0.82)',
        },
        content: {
            gap: 14,
        },
    });
