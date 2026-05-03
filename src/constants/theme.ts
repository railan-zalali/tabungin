// Sistem tema Tabungin — mendukung light & dark mode
import { Colors } from './colors';

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
} as const;

export const BorderRadius = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 48,
    full: 9999,
} as const;

export const BorderWidth = {
    hairline: 1,
    brutal: 2,
    brutalStrong: 3,
} as const;

export const Shadow = {
    sm: {
        shadowColor: '#0F1714',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    md: {
        shadowColor: '#0F1714',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
        elevation: 4,
    },
    lg: {
        shadowColor: '#0F1714',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.14,
        shadowRadius: 26,
        elevation: 8,
    },
    xl: {
        shadowColor: '#0F1714',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.16,
        shadowRadius: 36,
        elevation: 12,
    },
    brutal: {
        shadowColor: '#111111',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 6,
    },
    brutalSm: {
        shadowColor: '#111111',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
} as const;

export const Motion = {
    duration: {
        fast: 160,
        normal: 240,
        slow: 360,
    },
    spring: {
        soft: { damping: 18, stiffness: 180 },
        snappy: { damping: 14, stiffness: 240 },
        lift: { damping: 16, stiffness: 210 },
    },
    stagger: {
        xs: 40,
        sm: 70,
        md: 100,
    },
} as const;

// Tema terang
export const LightTheme = {
    colors: {
        primary: Colors.primary,
        primaryDark: Colors.primaryDark,
        primaryLight: Colors.primaryLight,
        secondary: Colors.secondary,
        background: Colors.background,
        backgroundAlt: Colors.backgroundAlt,
        backgroundCanvas: Colors.backgroundCanvas,
        surface: Colors.surface,
        surfaceAlt: Colors.surfaceAlt,
        surfaceElevated: Colors.surfaceElevated,
        surfaceCard: Colors.surfaceCard,
        surfaceGlass: Colors.surfaceGlass,
        surfaceInset: Colors.surfaceInset,
        surfaceMuted: Colors.surfaceMuted,
        textPrimary: Colors.textPrimary,
        textSecondary: Colors.textSecondary,
        textTertiary: Colors.textTertiary,
        textDisabled: Colors.textDisabled,
        textInverse: Colors.textInverse,
        danger: Colors.danger,
        dangerLight: Colors.dangerLight,
        dangerBg: Colors.dangerBg,
        success: Colors.success,
        successLight: Colors.successLight,
        successBg: Colors.successBg,
        warning: Colors.warning,
        warningBg: Colors.warningBg,
        info: Colors.info,
        infoLight: Colors.infoLight,
        infoBg: Colors.infoBg,
        border: Colors.border,
        borderStrong: Colors.borderStrong,
        divider: Colors.divider,
        overlay: Colors.overlay,
        overlayLight: Colors.overlayLight,
    },
    spacing: Spacing,
    borderRadius: BorderRadius,
    borderWidth: BorderWidth,
    shadow: Shadow,
    motion: Motion,
    isDark: false,
} as const;

// Tema gelap
export const DarkTheme = {
    colors: {
        primary: Colors.primary,
        primaryDark: Colors.primaryDark,
        primaryLight: Colors.dark.primaryLight,
        secondary: Colors.secondary,
        background: Colors.dark.background,
        backgroundAlt: Colors.dark.backgroundAlt,
        backgroundCanvas: Colors.dark.backgroundCanvas,
        surface: Colors.dark.surface,
        surfaceAlt: Colors.dark.surfaceAlt,
        surfaceElevated: Colors.dark.surfaceElevated,
        surfaceCard: Colors.dark.surfaceCard,
        surfaceGlass: Colors.dark.surfaceGlass,
        surfaceInset: Colors.dark.surfaceInset,
        surfaceMuted: Colors.dark.surfaceMuted,
        textPrimary: Colors.dark.textPrimary,
        textSecondary: Colors.dark.textSecondary,
        textTertiary: Colors.dark.textTertiary,
        textDisabled: Colors.dark.textDisabled,
        textInverse: Colors.textPrimary,
        danger: Colors.danger,
        dangerLight: Colors.dangerLight,
        dangerBg: Colors.dark.dangerBg,
        success: Colors.success,
        successLight: Colors.successLight,
        successBg: Colors.dark.successBg,
        warning: Colors.warning,
        warningBg: Colors.dark.warningBg,
        info: Colors.info,
        infoLight: Colors.infoLight,
        infoBg: Colors.dark.infoBg,
        border: Colors.dark.border,
        borderStrong: Colors.dark.borderStrong,
        divider: Colors.dark.divider,
        overlay: Colors.overlay,
        overlayLight: Colors.dark.overlayLight,
    },
    spacing: Spacing,
    borderRadius: BorderRadius,
    borderWidth: BorderWidth,
    shadow: Shadow,
    motion: Motion,
    isDark: true,
} as const;

export type AppTheme = typeof LightTheme;
