import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as BaseColors } from '../constants/colors';
import { useProfileStore } from './useProfileStore';
import { Motion } from '../constants/theme';

type ThemeMode = 'light' | 'dark';
type TextSize = 'normal' | 'large' | 'xlarge';

interface ThemeState {
    mode: ThemeMode;
    textSize: TextSize;
    
    setMode: (mode: ThemeMode) => void;
    setTextSize: (size: TextSize) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'light',
            textSize: 'normal',
            
            setMode: (mode) => set({ mode }),
            setTextSize: (textSize) => set({ textSize }),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '');
    const safeHex = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized;

    const value = parseInt(safeHex, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

function rgba(hex: string, alpha: number) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function mix(hexA: string, hexB: string, weight: number) {
    const ratio = clamp(weight, 0, 1);
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);

    const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
    const mixed = {
        r: a.r * (1 - ratio) + b.r * ratio,
        g: a.g * (1 - ratio) + b.g * ratio,
        b: a.b * (1 - ratio) + b.b * ratio,
    };

    return `#${toHex(mixed.r)}${toHex(mixed.g)}${toHex(mixed.b)}`;
}

export function useTheme() {
    const { mode } = useThemeStore();
    const { profiles, activeProfileId } = useProfileStore();
    
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const primaryColor = activeProfile?.color || BaseColors.primary;
    const isDark = mode === 'dark';
    const neutralBase = isDark ? BaseColors.dark : BaseColors;
    const primaryDark = mix(primaryColor, isDark ? '#08110D' : '#173625', isDark ? 0.35 : 0.24);
    const primarySoft = rgba(primaryColor, isDark ? 0.24 : 0.12);
    const primaryStrong = rgba(primaryColor, isDark ? 0.32 : 0.18);
    const surfaceGlass = isDark ? neutralBase.surfaceGlass : neutralBase.surfaceGlass;

    const colors = {
        ...BaseColors,
        primary: primaryColor,
        primaryDark,
        primaryLight: primarySoft,
        primaryBg: mix(primaryColor, neutralBase.surface, isDark ? 0.18 : 0.08),
        background: neutralBase.background,
        backgroundAlt: neutralBase.backgroundAlt,
        backgroundCanvas: neutralBase.backgroundCanvas,
        surface: neutralBase.surface,
        surfaceAlt: neutralBase.surfaceAlt,
        surfaceElevated: neutralBase.surfaceElevated,
        surfaceCard: neutralBase.surfaceCard,
        surfaceGlass,
        surfaceInset: neutralBase.surfaceInset,
        surfaceMuted: neutralBase.surfaceMuted,
        textPrimary: neutralBase.textPrimary,
        textSecondary: neutralBase.textSecondary,
        textTertiary: neutralBase.textTertiary,
        textDisabled: neutralBase.textDisabled,
        border: neutralBase.border,
        borderStrong: neutralBase.borderStrong,
        divider: neutralBase.divider,
        overlay: neutralBase.overlay,
        overlayLight: neutralBase.overlayLight,
        successBg: isDark ? BaseColors.dark.successBg : BaseColors.successBg,
        warningBg: isDark ? BaseColors.dark.warningBg : BaseColors.warningBg,
        dangerBg: isDark ? BaseColors.dark.dangerBg : BaseColors.dangerBg,
        infoBg: isDark ? BaseColors.dark.infoBg : BaseColors.infoBg,
        successLight: rgba(BaseColors.success, isDark ? 0.28 : 0.16),
        warningLight: rgba(BaseColors.warning, isDark ? 0.28 : 0.16),
        dangerLight: rgba(BaseColors.danger, isDark ? 0.28 : 0.16),
        infoLight: rgba(BaseColors.info, isDark ? 0.28 : 0.16),
        glassStroke: rgba('#FFFFFF', isDark ? 0.08 : 0.52),
        glassTint: surfaceGlass,
        shadowColor: isDark ? '#000000' : '#0F1714',
        heroStart: mix(primaryColor, '#FFFFFF', isDark ? 0.08 : 0.02),
        heroEnd: primaryDark,
        heroSoft: primaryStrong,
    };

    const gradients = {
        hero: [colors.heroStart, colors.primary, colors.heroEnd] as const,
        surface: [colors.surfaceCard, colors.surfaceGlass] as const,
        success: [rgba(BaseColors.success, 0.12), rgba(BaseColors.success, 0.03)] as const,
        warning: [rgba(BaseColors.warning, 0.12), rgba(BaseColors.warning, 0.03)] as const,
        info: [rgba(BaseColors.info, 0.12), rgba(BaseColors.info, 0.03)] as const,
    };

    return { colors, gradients, motion: Motion, isDark, mode };
}
