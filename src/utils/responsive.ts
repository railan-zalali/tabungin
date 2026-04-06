import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/useThemeStore';

export type WidthClass = 'compact' | 'regular' | 'wide';

export interface ResponsiveMetrics {
    width: number;
    height: number;
    widthClass: WidthClass;
    isCompact: boolean;
    isRegular: boolean;
    isWide: boolean;
    horizontalPadding: number;
    verticalGap: number;
    maxContentWidth: number;
    bottomActionInset: number;
    safeBottomSpacing: number;
    cardColumns: 1 | 2;
}

function resolveWidthClass(width: number): WidthClass {
    if (width >= 720) return 'wide';
    if (width >= 420) return 'regular';
    return 'compact';
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
        const safeBottomSpacing = Math.max(insets.bottom, 16);

        return {
            width,
            height,
            widthClass,
            isCompact,
            isRegular,
            isWide,
            horizontalPadding,
            verticalGap,
            maxContentWidth: isWide ? 760 : 640,
            bottomActionInset: safeBottomSpacing + (isCompact ? 80 : 92),
            safeBottomSpacing,
            cardColumns: width >= 560 ? 2 : 1,
        };
    }, [height, insets.bottom, textScale, width]);
}

export function getResponsiveGridColumns(width: number, minColumnWidth = 160): 1 | 2 {
    return width >= minColumnWidth * 2 + 24 ? 2 : 1;
}
