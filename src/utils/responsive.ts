import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/useThemeStore';
import { getResponsiveGridColumns, resolveWidthClass, type WidthClass } from './responsiveHelpers';
export type { WidthClass } from './responsiveHelpers';

export interface ResponsiveMetrics {
    width: number;
    height: number;
    widthClass: WidthClass;
    isCompact: boolean;
    isRegular: boolean;
    isWide: boolean;
    horizontalPadding: number;
    verticalGap: number;
    heroSpacing: number;
    headerTopOffset: number;
    maxContentWidth: number;
    contentBottomInset: number;
    floatingActionClearance: number;
    tabBarClearance: number;
    bottomActionInset: number;
    safeBottomSpacing: number;
    cardColumns: 1 | 2;
}

export function useResponsiveMetrics(): ResponsiveMetrics {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { textScale } = useTheme();

    return useMemo(() => {
        const widthClass = resolveWidthClass(width);
        const isCompact = widthClass === 'compact';
        const isRegular = widthClass === 'regular';
        const isWide = widthClass === 'wide';
        const horizontalPadding = isCompact ? 16 : isWide ? 24 : 20;
        const verticalGap = isCompact ? 14 : 18;
        const heroSpacing = isCompact ? 10 : isWide ? 18 : 14;
        const headerTopOffset = insets.top + (isCompact ? 8 : 12);
        const safeBottomSpacing = Math.max(insets.bottom, 16);
        const tabBarClearance = safeBottomSpacing + (isCompact ? 78 : 90);
        const contentBottomInset = tabBarClearance + (isCompact ? 14 : 18);
        const floatingActionClearance = safeBottomSpacing + (isCompact ? 104 : 116);

        return {
            width,
            height,
            widthClass,
            isCompact,
            isRegular,
            isWide,
            horizontalPadding,
            verticalGap,
            heroSpacing,
            headerTopOffset,
            maxContentWidth: isWide ? 760 : 640,
            contentBottomInset,
            floatingActionClearance,
            tabBarClearance,
            bottomActionInset: floatingActionClearance,
            safeBottomSpacing,
            cardColumns: width >= 560 ? 2 : 1,
        };
    }, [height, insets.bottom, textScale, width]);
}
