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
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
} as const;

export const Shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
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
        surface: Colors.surface,
        surfaceElevated: Colors.surfaceElevated,
        textPrimary: Colors.textPrimary,
        textSecondary: Colors.textSecondary,
        textDisabled: Colors.textDisabled,
        textInverse: Colors.textInverse,
        danger: Colors.danger,
        dangerLight: Colors.dangerLight,
        success: Colors.success,
        successLight: Colors.successLight,
        warning: Colors.warning,
        border: Colors.border,
        divider: Colors.divider,
        overlay: Colors.overlay,
    },
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadow: Shadow,
    isDark: false,
} as const;

// Tema gelap
export const DarkTheme = {
    colors: {
        primary: Colors.primary,
        primaryDark: Colors.primaryDark,
        primaryLight: '#0D3320',
        secondary: Colors.secondary,
        background: Colors.dark.background,
        surface: Colors.dark.surface,
        surfaceElevated: Colors.dark.surfaceElevated,
        textPrimary: Colors.dark.textPrimary,
        textSecondary: Colors.dark.textSecondary,
        textDisabled: '#64748B',
        textInverse: Colors.textPrimary,
        danger: Colors.danger,
        dangerLight: '#450A0A',
        success: Colors.success,
        successLight: '#052E16',
        warning: Colors.warning,
        border: Colors.dark.border,
        divider: Colors.dark.divider,
        overlay: Colors.overlay,
    },
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadow: Shadow,
    isDark: true,
} as const;

export type AppTheme = typeof LightTheme;
