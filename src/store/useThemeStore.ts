import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as BaseColors } from '../constants/colors';
import { useProfileStore } from './useProfileStore';

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

// Helper to get dynamic colors
export function useTheme() {
    const { mode } = useThemeStore();
    const { profiles, activeProfileId } = useProfileStore();
    
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    // Use profile color if available, otherwise default primary
    const primaryColor = activeProfile?.color || BaseColors.primary;

    const isDark = mode === 'dark';

    const colors = {
        ...BaseColors,
        // Override Primary
        primary: primaryColor,
        primaryDark: primaryColor, // In a real app we might darken this
        primaryLight: isDark ? `${primaryColor}30` : `${primaryColor}20`, // Opacity for light variant
        primaryBg: isDark ? `${primaryColor}10` : `${primaryColor}10`,

        // Mode overrides
        background: isDark ? BaseColors.dark.background : BaseColors.background,
        surface: isDark ? BaseColors.dark.surface : BaseColors.surface,
        textPrimary: isDark ? BaseColors.dark.textPrimary : BaseColors.textPrimary,
        textSecondary: isDark ? BaseColors.dark.textSecondary : BaseColors.textSecondary,
        border: isDark ? BaseColors.dark.border : BaseColors.border,
        divider: isDark ? BaseColors.dark.divider : BaseColors.divider,
    };

    return { colors, isDark, mode };
}
