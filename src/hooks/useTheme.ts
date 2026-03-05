// useTheme — Hook untuk mengambil warna sesuai dark/light mode dari Auth store
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';

export type ThemeColors = {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    secondaryLight: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceCard: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textInverse: string;
    danger: string;
    dangerLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
    border: string;
    divider: string;
    overlay: string;
    overlayLight: string;
    transparent: string;
    isDark: boolean;
};

const LIGHT_THEME: ThemeColors = {
    primary: Colors.primary,
    primaryDark: Colors.primaryDark,
    primaryLight: Colors.primaryLight,
    secondary: Colors.secondary,
    secondaryLight: Colors.secondaryLight,
    background: Colors.background,
    surface: Colors.surface,
    surfaceElevated: Colors.surfaceElevated,
    surfaceCard: '#FFFFFF',
    textPrimary: Colors.textPrimary,
    textSecondary: Colors.textSecondary,
    textDisabled: Colors.textDisabled,
    textInverse: Colors.textInverse,
    danger: Colors.danger,
    dangerLight: Colors.dangerLight,
    success: Colors.success,
    successLight: Colors.successLight,
    warning: Colors.warning,
    warningLight: Colors.warningLight,
    info: Colors.info,
    infoLight: Colors.infoLight,
    border: Colors.border,
    divider: Colors.divider,
    overlay: Colors.overlay,
    overlayLight: Colors.overlayLight,
    transparent: Colors.transparent,
    isDark: false,
};

const DARK_THEME: ThemeColors = {
    ...LIGHT_THEME,
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    surfaceCard: '#253047',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textDisabled: '#64748B',
    textInverse: '#0F172A',
    primaryLight: 'rgba(29, 185, 84, 0.15)',
    secondaryLight: 'rgba(245, 166, 35, 0.15)',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    successLight: 'rgba(16, 185, 129, 0.15)',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    infoLight: 'rgba(59, 130, 246, 0.15)',
    border: '#334155',
    divider: '#1E293B',
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    isDark: true,
};

/**
 * Hook utama untuk menggunakan theme.
 * Kembalikan objek ThemeColors sesuai mode saat ini.
 * 
 * Contoh penggunaan:
 * ```ts
 * const theme = useTheme();
 * <View style={{ backgroundColor: theme.background }} />
 * ```
 */
export function useTheme(): ThemeColors {
    const isDarkMode = useAuthStore((state) => state.isDarkMode);
    return isDarkMode ? DARK_THEME : LIGHT_THEME;
}
