import React from 'react';
import { StatusBar, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';

interface ScreenShellProps extends ViewProps {
    children: React.ReactNode;
    topInset?: boolean;
    bottomInset?: boolean;
    bottomPadding?: number;
    contentPadding?: number;
    stickyFooterOffset?: number;
    headerMode?: 'default' | 'transparent' | 'sticky';
    surfaceVariant?: 'default' | 'panel' | 'alt';
}

export function ScreenShell({
    children,
    style,
    topInset = true,
    bottomInset = false,
    bottomPadding = 0,
    contentPadding = 0,
    stickyFooterOffset = 0,
    headerMode = 'default',
    surfaceVariant = 'default',
    ...rest
}: ScreenShellProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View
            style={[
                styles.container,
                surfaceVariant === 'panel' ? styles.panelSurface : null,
                surfaceVariant === 'alt' ? styles.altSurface : null,
                topInset ? { paddingTop: insets.top } : null,
                bottomInset
                    ? { paddingBottom: insets.bottom + bottomPadding + stickyFooterOffset }
                    : { paddingBottom: bottomPadding + stickyFooterOffset },
                contentPadding ? { paddingHorizontal: contentPadding } : null,
                headerMode === 'sticky' ? styles.stickyHeader : null,
                style,
            ]}
            {...rest}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <View style={styles.bgAuraBottom} pointerEvents="none" />
            {children}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        panelSurface: {
            backgroundColor: colors.panelSurfaceAlt,
        },
        altSurface: {
            backgroundColor: colors.backgroundAlt,
        },
        stickyHeader: {
            backgroundColor: colors.stickyHeader,
        },
        bgAuraTop: {
            position: 'absolute',
            top: -126,
            right: -18,
            width: 260,
            height: 260,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primaryLight,
            opacity: 0.72,
        },
        bgAuraBottom: {
            position: 'absolute',
            bottom: 84,
            left: -58,
            width: 236,
            height: 236,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.energeticHighlight,
            opacity: 0.58,
        },
    });
