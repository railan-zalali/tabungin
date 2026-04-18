export type WidthClass = 'compact' | 'regular' | 'wide';
export type ResponsiveDensity = 'comfortable' | 'compact';
export type ResponsiveHeaderDensity = 'default' | 'compact';
export type ResponsiveHeroDensity = 'default' | 'compact';

export interface ResponsiveMetricsShape {
    width: number;
    height: number;
    widthClass: WidthClass;
    isCompact: boolean;
    isRegular: boolean;
    isWide: boolean;
    isShortViewport: boolean;
    density: ResponsiveDensity;
    heroDensity: ResponsiveHeroDensity;
    headerDensity: ResponsiveHeaderDensity;
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
    compactBottomClearance: number;
    cardColumns: 1 | 2;
}

interface ResponsiveMetricInput {
    width: number;
    height: number;
    topInset: number;
    bottomInset: number;
    textScale: number;
    platformOS?: string;
}

export function resolveWidthClass(width: number): WidthClass {
    if (width >= 720) return 'wide';
    if (width >= 420) return 'regular';
    return 'compact';
}

export function getResponsiveGridColumns(width: number, minColumnWidth = 160): 1 | 2 {
    return width >= minColumnWidth * 2 + 24 ? 2 : 1;
}

export function calculateResponsiveMetrics({
    width,
    height,
    topInset,
    bottomInset,
    textScale,
    platformOS = 'native',
}: ResponsiveMetricInput): ResponsiveMetricsShape {
    const widthClass = resolveWidthClass(width);
    const isCompact = widthClass === 'compact';
    const isRegular = widthClass === 'regular';
    const isWide = widthClass === 'wide';
    const isNativePhone = platformOS !== 'web' && width <= 480;
    const isShortViewport = isNativePhone && height < (textScale >= 1.16 ? 900 : textScale >= 1.08 ? 840 : 780);
    const density: ResponsiveDensity =
        isNativePhone && width <= 412 && (height < 860 || textScale > 1)
            ? 'compact'
            : 'comfortable';
    const heroDensity: ResponsiveHeroDensity = isNativePhone && width <= 412 ? 'compact' : 'default';
    const headerDensity: ResponsiveHeaderDensity = isNativePhone && width <= 412 ? 'compact' : 'default';
    const horizontalPadding = density === 'compact' ? 16 : isCompact ? 16 : isWide ? 24 : 20;
    const verticalGap = density === 'compact' ? 12 : isCompact ? 14 : 18;
    const heroSpacing = heroDensity === 'compact' ? 8 : isCompact ? 10 : isWide ? 18 : 14;
    const headerTopOffset = topInset + (density === 'compact' ? 6 : isCompact ? 8 : 12);
    const safeBottomSpacing = Math.max(bottomInset, density === 'compact' ? 12 : 16);
    const compactBottomClearance = safeBottomSpacing + (density === 'compact' ? 84 : 92);
    const tabBarClearance = safeBottomSpacing + (density === 'compact' ? 72 : isCompact ? 78 : 90);
    const contentBottomInset = tabBarClearance + (density === 'compact' ? 10 : isCompact ? 14 : 18);
    const floatingActionClearance = safeBottomSpacing + (density === 'compact' ? 96 : isCompact ? 104 : 116);

    return {
        width,
        height,
        widthClass,
        isCompact,
        isRegular,
        isWide,
        isShortViewport,
        density,
        heroDensity,
        headerDensity,
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
        compactBottomClearance,
        cardColumns: getResponsiveGridColumns(width),
    };
}
