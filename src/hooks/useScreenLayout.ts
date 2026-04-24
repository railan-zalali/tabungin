import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout } from '../constants/layout';

export function useScreenLayout() {
    const insets = useSafeAreaInsets();

    return useMemo(
        () => ({
            insets,
            horizontalPadding: Layout.screenPadding,
            screenGap: Layout.screenGap,
            contentBottomSpacing: Math.max(insets.bottom, 12) + Layout.tabBarHeight + Layout.tabBarBottomSpacing,
            stickyFooterSpacing: Math.max(insets.bottom, Layout.footerSpacing) + Layout.tabBarHeight + Layout.footerSpacing,
        }),
        [insets],
    );
}
