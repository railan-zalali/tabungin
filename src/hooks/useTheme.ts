// Compatibility re-export for older imports.
// The store-backed theme hook is the single source of truth.
import { useTheme as useAppTheme } from '../store/useThemeStore';

export const useTheme = useAppTheme;
export type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
