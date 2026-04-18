// Sistem tipografi Tabungin
import { StyleSheet } from 'react-native';
import type { TextSize } from '../store/useThemeStore';

export const FontFamily = {
    heading: 'PlusJakartaSans_700Bold',
    headingMedium: 'PlusJakartaSans_600SemiBold',
    headingRegular: 'PlusJakartaSans_400Regular',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
} as const;

export const FontSize = {
    display: 28,
    h1: 22,
    h2: 18,
    h3: 16,
    h4: 16, // Legacy support (mapped to new H3)
    body: 14,
    caption: 12,
    label: 11,
} as const;

export const LineHeight = {
    display: 36,
    h1: 28,
    h2: 24,
    h3: 24,
    h4: 24, // Legacy support
    body: 20,
    caption: 16,
    label: 16,
} as const;

export const LetterSpacing = {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
} as const;

export const Typography = StyleSheet.create({
    display: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.display,
        lineHeight: LineHeight.display,
        letterSpacing: LetterSpacing.tight,
    },
    h1: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h1,
        lineHeight: LineHeight.h1,
        letterSpacing: LetterSpacing.tight,
    },
    h2: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h2,
        lineHeight: LineHeight.h2,
    },
    h3: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h3,
        lineHeight: LineHeight.h3,
    },
    h4: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        lineHeight: LineHeight.h4,
    },
    body: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        lineHeight: LineHeight.body,
    },
    bodyMedium: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        lineHeight: LineHeight.body,
    },
    bodyBold: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        lineHeight: LineHeight.body,
    },
    caption: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        lineHeight: LineHeight.caption,
    },
    label: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.label,
        lineHeight: LineHeight.label,
        letterSpacing: LetterSpacing.wide,
    },
});

const TEXT_SCALE_MAP: Record<TextSize, number> = {
    normal: 1,
    large: 1.08,
    xlarge: 1.16,
};

export function getTextScale(textSize: TextSize = 'normal'): number {
    return TEXT_SCALE_MAP[textSize] ?? 1;
}

export function scaleFontSize(size: number, textSize: TextSize = 'normal'): number {
    return Math.round(size * getTextScale(textSize));
}

export function scaleLineHeight(lineHeight: number, textSize: TextSize = 'normal'): number {
    return Math.round(lineHeight * getTextScale(textSize));
}
