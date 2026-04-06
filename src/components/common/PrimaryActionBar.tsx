import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';

interface PrimaryActionBarProps {
    primaryLabel: string;
    onPrimaryPress: () => void;
    primaryLoading?: boolean;
    secondaryLabel?: string;
    onSecondaryPress?: () => void;
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
    offset = 0,
    absolute = true,
    containerStyle,
    barStyle,
}: PrimaryActionBarProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View
            style={[
                styles.wrap,
                absolute ? styles.absoluteWrap : styles.inlineWrap,
                { paddingBottom: insets.bottom + 12 + offset },
                containerStyle,
            ]}
        >
            <View style={[styles.bar, barStyle]}>
                {secondaryLabel && onSecondaryPress ? (
                    <Button label={secondaryLabel} onPress={onSecondaryPress} variant="outline" style={{ flex: 1 }} />
                ) : null}
                <Button
                    label={primaryLabel}
                    onPress={onPrimaryPress}
                    loading={primaryLoading}
                    variant="primary"
                    fullWidth={!secondaryLabel}
                    style={secondaryLabel ? { flex: 1 } : undefined}
                />
            </View>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        wrap: {
            paddingHorizontal: 20,
            paddingTop: 14,
            backgroundColor: colors.stickyHeader,
            borderTopWidth: 1,
            borderTopColor: colors.glassStroke,
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
            padding: 10,
            borderRadius: BorderRadius['4xl'],
            backgroundColor: colors.tabBarGlass,
            borderWidth: 1,
            borderColor: colors.glassStroke,
        },
    });
