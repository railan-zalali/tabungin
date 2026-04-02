import React from 'react';
import { StyleSheet, View } from 'react-native';
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
}

export function PrimaryActionBar({
    primaryLabel,
    onPrimaryPress,
    primaryLoading = false,
    secondaryLabel,
    onSecondaryPress,
    offset = 0,
}: PrimaryActionBarProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 + offset }]}>
            <View style={styles.bar}>
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
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 14,
            backgroundColor: colors.stickyHeader,
            borderTopWidth: 1,
            borderTopColor: colors.glassStroke,
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
