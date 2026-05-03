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
            backgroundColor: colors.brutalPaper,
        },
        panelSurface: {
            backgroundColor: colors.brutalPaperAlt,
        },
        altSurface: {
            backgroundColor: colors.brutalPaper,
        },
        stickyHeader: {
            backgroundColor: colors.brutalPaper,
        },
        bgAuraTop: {
            position: 'absolute',
            top: -110,
            right: -36,
            width: 240,
            height: 240,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primaryLight,
            opacity: 0,
        },
        bgAuraBottom: {
            position: 'absolute',
            bottom: 100,
            left: -64,
            width: 220,
            height: 220,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.infoBg,
            opacity: 0,
        },
    });
