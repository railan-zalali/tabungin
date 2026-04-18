import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

interface StatStripItem {
    label: string;
    value: string;
    valueColor?: string;
}

interface StatStripProps {
    items: StatStripItem[];
    vertical?: boolean;
}

export function StatStrip({ items, vertical = false }: StatStripProps) {
    const { colors, textSize } = useTheme();
    const metrics = useResponsiveMetrics();
    const compactLayout = metrics.density === 'compact';
    const shouldStack = vertical || (metrics.isShortViewport && items.length > 3);
    const styles = React.useMemo(() => getStyles(colors, textSize, compactLayout), [colors, compactLayout, textSize]);

    return (
        <View style={[styles.strip, shouldStack ? styles.stripVertical : null]}>
            {items.map((item, index) => (
                <React.Fragment key={`${item.label}-${item.value}`}>
                    {index > 0 ? <View style={[styles.divider, shouldStack ? styles.dividerVertical : null]} /> : null}
                    <View style={[styles.item, shouldStack ? styles.itemVertical : null]}>
                        <Text style={styles.label}>{item.label}</Text>
                        <Text style={[styles.value, shouldStack ? styles.valueVertical : null, item.valueColor ? { color: item.valueColor } : null]}>
                            {item.value}
                        </Text>
                    </View>
                </React.Fragment>
            ))}
        </View>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
    isCompact: boolean,
) =>
    StyleSheet.create({
        strip: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: isCompact ? 10 : 14,
            paddingVertical: isCompact ? 10 : 14,
        },
        stripVertical: {
            flexDirection: 'column',
            alignItems: 'stretch',
        },
        item: {
            flex: 1,
            alignItems: 'center',
            gap: isCompact ? 2 : 4,
            paddingHorizontal: isCompact ? 4 : 8,
        },
        itemVertical: {
            alignItems: 'flex-start',
            paddingHorizontal: 0,
        },
        divider: {
            width: 1,
            height: isCompact ? 22 : 28,
            backgroundColor: colors.divider,
        },
        dividerVertical: {
            width: '100%',
            height: 1,
            marginVertical: 10,
        },
        label: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
        },
        value: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(isCompact ? FontSize.caption : FontSize.body, textSize),
            color: colors.textPrimary,
            textAlign: 'center',
        },
        valueVertical: {
            textAlign: 'left',
        },
    });
