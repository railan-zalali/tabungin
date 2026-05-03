import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

type HeaderVariant = 'solid' | 'glass' | 'transparent';

export interface HeaderAction {
    icon: string;
    label: string;
    onPress: () => void;
    tone?: 'primary' | 'default';
}

interface AppScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    showClose?: boolean;
    onBackPress?: () => void;
    onClosePress?: () => void;
    rightAction?: HeaderAction;
    rightSlot?: React.ReactNode;
    contextBadges?: React.ReactNode;
    sticky?: boolean;
    variant?: HeaderVariant;
}

export function AppScreenHeader({
    title,
    subtitle,
    showBack = false,
    showClose = false,
    onBackPress,
    onClosePress,
    rightAction,
    rightSlot,
    contextBadges,
    sticky = false,
    variant = 'glass',
}: AppScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top + 4 },
                sticky && styles.sticky,
                variant === 'solid' && styles.solid,
                variant === 'transparent' && styles.transparent,
            ]}
        >
            <View style={styles.row}>
                <View style={styles.leading}>
                    {showBack && onBackPress ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onBackPress}
                            accessibilityRole="button"
                            accessibilityLabel="Kembali"
                        >
                            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}
                    {showClose && onClosePress ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onClosePress}
                            accessibilityRole="button"
                            accessibilityLabel="Tutup"
                        >
                            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}
                    <View style={styles.copy}>
                        <Text style={styles.title} numberOfLines={1}>
                            {title}
                        </Text>
                        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    </View>
                </View>

                {rightAction ? (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            rightAction.tone === 'primary' ? styles.actionButtonPrimary : null,
                        ]}
                        onPress={rightAction.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={rightAction.label}
                    >
                        <MaterialCommunityIcons
                            name={rightAction.icon as any}
                            size={20}
                            color={colors.brutalInk}
                        />
                    </TouchableOpacity>
                ) : rightSlot ? (
                    rightSlot
                ) : (
                    <View style={styles.actionPlaceholder} />
                )}
            </View>

            {contextBadges ? <View style={styles.contextBadges}>{contextBadges}</View> : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: 20,
            paddingBottom: 14,
            backgroundColor: colors.brutalPaper,
            borderBottomWidth: 2,
            borderBottomColor: colors.brutalInk,
        },
        sticky: {
            backgroundColor: colors.brutalPaper,
        },
        solid: {
            backgroundColor: colors.brutalPaper,
        },
        transparent: {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
        },
        leading: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            flex: 1,
            gap: 12,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brutalWhite,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 3, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 3,
        },
        copy: {
            flex: 1,
            paddingTop: 3,
        },
        title: {
            ...Typography.h2,
            fontSize: scaleFontSize(FontSize.h2, textSize),
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 3,
        },
        actionButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brutalYellow,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 3, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 3,
        },
        actionButtonPrimary: {
            backgroundColor: colors.brutalLime,
            borderColor: colors.brutalInk,
        },
        actionPlaceholder: {
            width: 44,
            height: 44,
        },
        contextBadges: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
        },
    });
