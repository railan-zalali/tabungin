import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/useThemeStore';
import {
    calculateResponsiveMetrics,
    type ResponsiveMetricsShape as ResponsiveMetrics,
    type WidthClass,
} from './responsiveHelpers';
export type { WidthClass } from './responsiveHelpers';

export function useResponsiveMetrics(): ResponsiveMetrics {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { textScale } = useTheme();

    return useMemo(() => {
        return calculateResponsiveMetrics({
            width,
            height,
            topInset: insets.top,
            bottomInset: insets.bottom,
            textScale,
            platformOS: Platform.OS,
        });
    }, [height, insets.bottom, insets.top, textScale, width]);
}
