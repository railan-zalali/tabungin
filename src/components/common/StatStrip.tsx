import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

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
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={[styles.strip, vertical ? styles.stripVertical : null]}>
            {items.map((item, index) => (
                <React.Fragment key={`${item.label}-${item.value}`}>
                    {index > 0 ? <View style={[styles.divider, vertical ? styles.dividerVertical : null]} /> : null}
                    <View style={styles.item}>
                        <Text style={styles.label}>{item.label}</Text>
                        <Text style={[styles.value, item.valueColor ? { color: item.valueColor } : null]}>{item.value}</Text>
                    </View>
                </React.Fragment>
            ))}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        strip: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        stripVertical: {
            flexDirection: 'column',
            alignItems: 'stretch',
        },
        item: {
            flex: 1,
            alignItems: 'center',
            gap: 4,
        },
        divider: {
            width: 1,
            height: 28,
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
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.textPrimary,
            textAlign: 'center',
        },
    });
