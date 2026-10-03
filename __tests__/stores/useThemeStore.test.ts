import { useThemeStore, useTheme } from '../../src/store/useThemeStore';
import { renderHook, act } from '@testing-library/react-native';

describe('useThemeStore', () => {
    beforeEach(() => {
        useThemeStore.setState({ mode: 'light', textSize: 'normal', hapticEnabled: true });
    });

    it('starts with light mode defaults', () => {
        const { mode, textSize, hapticEnabled } = useThemeStore.getState();
        expect(mode).toBe('light');
        expect(textSize).toBe('normal');
        expect(hapticEnabled).toBe(true);
    });

    it('toggles to dark mode', () => {
        act(() => {
            useThemeStore.getState().setMode('dark');
        });
        expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('toggles back to light mode', () => {
        act(() => {
            useThemeStore.getState().setMode('dark');
            useThemeStore.getState().setMode('light');
        });
        expect(useThemeStore.getState().mode).toBe('light');
    });

    it('updates text size', () => {
        act(() => {
            useThemeStore.getState().setTextSize('xlarge');
        });
        expect(useThemeStore.getState().textSize).toBe('xlarge');
    });

    it('updates haptic preference', () => {
        act(() => {
            useThemeStore.getState().setHapticEnabled(false);
        });
        expect(useThemeStore.getState().hapticEnabled).toBe(false);
    });
});

describe('useTheme', () => {
    beforeEach(() => {
        useThemeStore.setState({ mode: 'light', textSize: 'normal', hapticEnabled: true });
    });

    it('exposes light colors when mode is light', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(false);
        expect(result.current.mode).toBe('light');
        expect(result.current.colors.background).toBeTruthy();
        expect(result.current.colors.textPrimary).toBeTruthy();
    });

    it('exposes dark colors when mode is dark', () => {
        const lightBackground = renderHook(() => useTheme()).result.current.colors.background;
        act(() => {
            useThemeStore.setState({ mode: 'dark' });
        });
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(true);
        expect(result.current.colors.background).not.toBe(lightBackground);
        expect(result.current.colors.background).toBe('#07110C');
    });

    it('provides gradients with at least two stops', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.gradients.hero.length).toBeGreaterThanOrEqual(2);
        expect(result.current.gradients.surface.length).toBeGreaterThanOrEqual(2);
    });

    it('derives primary color from active profile when available', () => {
        act(() => {
            useThemeStore.setState({ mode: 'light' });
        });
        const { result } = renderHook(() => useTheme());
        // tanpa profil aktif -> primary default tetap terpakai
        expect(result.current.colors.primary).toMatch(/^#/);
    });

    it('exposes motion and text scale', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.motion).toBeDefined();
        expect(typeof result.current.textScale).toBe('number');
    });
});
