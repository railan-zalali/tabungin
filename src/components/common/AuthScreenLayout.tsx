import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from './ScreenShell';

interface AuthScreenLayoutProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: string;
    children: React.ReactNode;
    topAction?: {
        label: string;
        onPress: () => void;
        icon?: string;
    };
    footerAction?: {
        label: string;
        onPress: () => void;
    };
}

export function AuthScreenLayout({
    eyebrow,
    title,
    subtitle,
    icon,
    children,
    topAction,
    footerAction,
}: AuthScreenLayoutProps) {
    const { colors, gradients } = useTheme();
    const { horizontalPadding } = useScreenLayout();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {topAction ? (
                        <TouchableOpacity style={styles.topAction} onPress={topAction.onPress}>
                            {topAction.icon ? (
                                <MaterialCommunityIcons name={topAction.icon as any} size={18} color={colors.primary} />
                            ) : null}
                            <Text style={styles.topActionText}>{topAction.label}</Text>
                        </TouchableOpacity>
                    ) : null}

                    <LinearGradient
                        colors={gradients.hero as unknown as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroGlowTop} />
                        <View style={styles.heroGlowBottom} />
                        <View style={styles.heroIcon}>
                            <MaterialCommunityIcons name={icon as any} size={34} color={colors.textInverse} />
                        </View>
                        <Text style={styles.eyebrow}>{eyebrow}</Text>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </LinearGradient>

                    {children}

                    {footerAction ? (
                        <TouchableOpacity style={styles.footerAction} onPress={footerAction.onPress}>
                            <Text style={styles.footerActionText}>{footerAction.label}</Text>
                        </TouchableOpacity>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex: { flex: 1 },
        content: {
            paddingTop: 44,
            paddingBottom: 28,
            gap: 18,
        },
        topAction: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        topActionText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
        heroCard: {
            padding: 22,
            borderRadius: BorderRadius['5xl'],
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.18,
            shadowRadius: 28,
            elevation: 8,
            gap: 10,
        },
        heroGlowTop: {
            position: 'absolute',
            top: -60,
            right: -10,
            width: 180,
            height: 180,
            borderRadius: BorderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.14)',
        },
        heroGlowBottom: {
            position: 'absolute',
            bottom: -40,
            left: -30,
            width: 130,
            height: 130,
            borderRadius: BorderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.1)',
        },
        heroIcon: {
            width: 64,
            height: 64,
            borderRadius: BorderRadius['3xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.82)',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        title: {
            ...Typography.h1,
            color: colors.textInverse,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: 'rgba(255,255,255,0.86)',
        },
        footerAction: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
        },
        footerActionText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
    });
