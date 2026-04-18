import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

type InlineNoticeTone = 'primary' | 'info' | 'warning' | 'danger' | 'success';

interface InlineNoticeProps {
    icon?: string;
    title?: string;
    description: string;
    tone?: InlineNoticeTone;
}

function resolvePalette(colors: ReturnType<typeof useTheme>['colors'], tone: InlineNoticeTone) {
    switch (tone) {
        case 'info':
            return { accent: colors.info, bg: colors.infoBg, border: `${colors.info}22` };
        case 'warning':
            return { accent: colors.warning, bg: colors.warningBg, border: `${colors.warning}22` };
        case 'danger':
            return { accent: colors.danger, bg: colors.dangerBg, border: `${colors.danger}22` };
        case 'success':
            return { accent: colors.success, bg: colors.successBg, border: `${colors.success}22` };
        case 'primary':
        default:
            return { accent: colors.primary, bg: colors.primaryBg, border: `${colors.primary}22` };
    }
}

export function InlineNotice({
    icon = 'information-outline',
    title,
    description,
    tone = 'primary',
}: InlineNoticeProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const palette = resolvePalette(colors, tone);

    return (
        <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={icon as any} size={18} color={palette.accent} />
            </View>
            <View style={styles.copy}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                <Text style={styles.description}>{description}</Text>
            </View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        notice: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            padding: 16,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
        },
        iconWrap: {
            width: 36,
            height: 36,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
        },
        copy: {
            flex: 1,
            gap: 3,
        },
        title: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textPrimary,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: 19,
            color: colors.textSecondary,
        },
    });
