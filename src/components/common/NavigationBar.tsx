import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';

type NavigationBarProps = {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    showClose?: boolean;
    onBackPress?: () => void;
    onClosePress?: () => void;
    rightActions?: React.ReactNode;
    transparent?: boolean;
    elevation?: 'none' | 'sm' | 'md' | 'lg';
};

export function NavigationBar({
    title,
    subtitle,
    showBack = false,
    showClose = false,
    onBackPress,
    onClosePress,
    rightActions,
    transparent = false,
    elevation = 'none',
}: NavigationBarProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const elevationStyle = React.useMemo(() => {
        switch (elevation) {
            case 'sm':
                return styles.elevationSm;
            case 'md':
                return styles.elevationMd;
            case 'lg':
                return styles.elevationLg;
            case 'none':
            default:
                return undefined;
        }
    }, [elevation, styles]);

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={[
                styles.navigationBar,
                { paddingTop: insets.top },
                transparent && styles.transparent,
                elevationStyle,
            ]}>
                <View style={styles.leftSection}>
                    {showBack && onBackPress && (
                        <TouchableOpacity style={styles.iconButton} onPress={onBackPress}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    )}
                    {showClose && onClosePress && (
                        <TouchableOpacity style={styles.iconButton} onPress={onClosePress}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    )}
                    {(title || subtitle) && (
                        <View style={styles.titleSection}>
                            {title && <Text style={styles.title}>{title}</Text>}
                            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                        </View>
                    )}
                </View>
                {rightActions && <View style={styles.rightSection}>{rightActions}</View>}
            </View>
        </Animated.View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        zIndex: 100,
    },
    navigationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
        backgroundColor: colors.surfaceGlass,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassStroke,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
    },
    transparent: {
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
    elevationSm: {
        ...Platform.select({
            ios: { shadowColor: colors.shadowColor, shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
            android: { elevation: 2 },
        }),
    },
    elevationMd: {
        ...Platform.select({
            ios: { shadowColor: colors.shadowColor, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 4 },
        }),
    },
    elevationLg: {
        ...Platform.select({
            ios: { shadowColor: colors.shadowColor, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 8 },
        }),
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.md,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    titleSection: {
        flex: 1,
    },
    title: {
        ...Typography.h3,
        color: colors.textPrimary,
    },
    subtitle: {
        ...Typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    rightSection: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
});
