export type WidthClass = 'compact' | 'regular' | 'wide';

export function resolveWidthClass(width: number): WidthClass {
    if (width >= 720) return 'wide';
    if (width >= 420) return 'regular';
    return 'compact';
}

export function getResponsiveGridColumns(width: number, minColumnWidth = 160): 1 | 2 {
    return width >= minColumnWidth * 2 + 24 ? 2 : 1;
}
