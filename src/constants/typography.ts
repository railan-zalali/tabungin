// Sistem tipografi Tabungin
import { StyleSheet } from 'react-native';

export const FontFamily = {
    heading: 'PlusJakartaSans_700Bold',
    headingMedium: 'PlusJakartaSans_600SemiBold',
    headingRegular: 'PlusJakartaSans_400Regular',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
} as const;

export const FontSize = {
    h1: 28,
    h2: 22,
    h3: 18,
    h4: 16,
    body: 14,
    caption: 12,
    label: 11,
} as const;

export const LineHeight = {
    h1: 36,
    h2: 30,
    h3: 26,
    h4: 24,
    body: 22,
    caption: 18,
    label: 16,
} as const;

export const LetterSpacing = {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
} as const;

export const Typography = StyleSheet.create({
    h1: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h1,
        lineHeight: LineHeight.h1,
        letterSpacing: LetterSpacing.tight,
    },
    h2: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h2,
        lineHeight: LineHeight.h2,
        letterSpacing: LetterSpacing.tight,
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
