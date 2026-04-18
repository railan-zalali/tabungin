import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

interface PrimaryActionBarProps {
    primaryLabel: string;
    onPrimaryPress: () => void;
    primaryLoading?: boolean;
    secondaryLabel?: string;
    onSecondaryPress?: () => void;
    bottomInset?: number;
    offset?: number;
    absolute?: boolean;
    containerStyle?: ViewStyle;
    barStyle?: ViewStyle;
}

export function PrimaryActionBar({
    primaryLabel,
    onPrimaryPress,
    primaryLoading = false,
    secondaryLabel,
    onSecondaryPress,
    bottomInset,
    offset = 0,
    absolute = true,
    containerStyle,
    barStyle,
}: PrimaryActionBarProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const compactLayout = metrics.density === 'compact';
    const styles = React.useMemo(() => getStyles(colors, compactLayout), [colors, compactLayout]);
    const stackActions = Boolean(secondaryLabel && compactLayout);
    const resolvedBottomInset = React.useMemo(() => {
        if (typeof bottomInset === 'number') {
            return bottomInset;
        }

        if (offset) {
            return insets.bottom + 12 + offset;
        }

        return metrics.compactBottomClearance;
    }, [bottomInset, insets.bottom, metrics.compactBottomClearance, offset]);

    return (
        <View
            style={[
                styles.wrap,
                absolute ? styles.absoluteWrap : styles.inlineWrap,
                {
                    paddingBottom: resolvedBottomInset,
                    paddingHorizontal: metrics.horizontalPadding,
                },
                containerStyle,
            ]}
        >
            <View style={[styles.bar, stackActions ? styles.barStacked : null, barStyle]}>
                {secondaryLabel && onSecondaryPress ? (
                    <Button
                        label={secondaryLabel}
                        onPress={onSecondaryPress}
                        variant="outline"
                        fullWidth={stackActions}
                        style={stackActions ? undefined : { flex: 1 }}
                    />
                ) : null}
                <Button
                    label={primaryLabel}
                    onPress={onPrimaryPress}
                    loading={primaryLoading}
                    variant="primary"
                    fullWidth={stackActions || !secondaryLabel}
                    style={secondaryLabel && !stackActions ? { flex: 1 } : undefined}
                />
            </View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isCompact: boolean) =>
    StyleSheet.create({
        wrap: {
            paddingTop: isCompact ? 12 : 16,
            backgroundColor: colors.stickyHeader,
            borderTopWidth: 1,
            borderTopColor: colors.headerDivider,
        },
        absoluteWrap: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
        },
        inlineWrap: {
            marginTop: 'auto',
        },
        bar: {
            flexDirection: 'row',
            gap: 12,
            padding: isCompact ? 10 : 12,
            borderRadius: BorderRadius['4xl'],
            backgroundColor: colors.tabBarGlass,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 4,
        },
        barStacked: {
            flexDirection: 'column',
        },
    });
