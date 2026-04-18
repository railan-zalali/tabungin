import React from 'react';
import { StatusBar, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

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
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(
        () => getStyles(colors, metrics.density === 'compact', metrics.isShortViewport),
        [colors, metrics.density, metrics.isShortViewport]
    );

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
            {!metrics.isShortViewport ? <View style={styles.bgAuraTop} pointerEvents="none" /> : null}
            {!metrics.isShortViewport ? <View style={styles.bgAuraBottom} pointerEvents="none" /> : null}
            {children}
        </View>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    isCompactDensity: boolean,
    isShortViewport: boolean,
) =>
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
            top: isCompactDensity ? -92 : -136,
            right: -42,
            width: isCompactDensity ? 180 : 280,
            height: isCompactDensity ? 180 : 280,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.emptyStateHalo,
            opacity: isShortViewport ? 0.45 : 0.7,
        },
        bgAuraBottom: {
            position: 'absolute',
            bottom: isCompactDensity ? 42 : 84,
            left: -72,
            width: isCompactDensity ? 170 : 250,
            height: isCompactDensity ? 170 : 250,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.illustrationSecondary,
            opacity: isShortViewport ? 0.22 : 0.34,
        },
    });
