// Animated progress bar untuk saving goals
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
} from 'react-native-reanimated';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface ProgressBarProps {
    progress: number; // 0-100
    color?: string;
    height?: number;
    showLabel?: boolean;
    label?: string;
    style?: ViewStyle;
    animationDelay?: number;
    accessibilityLabel?: string;
}

export function ProgressBar({
    progress,
    color,
    height = 10,
    showLabel = false,
    label,
    style,
    animationDelay = 0,
    accessibilityLabel,
}: ProgressBarProps) {
    const widthValue = useSharedValue(0);
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const resolvedColor = color ?? colors.primary;
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    useEffect(() => {
        widthValue.value = withDelay(
            animationDelay,
            withSpring(clampedProgress, { damping: 20, stiffness: 100 })
        );
    }, [clampedProgress, animationDelay]);

    const animFill = useAnimatedStyle(() => ({
        width: `${widthValue.value}%`,
    }));

    return (
        <View style={style}>
            {(showLabel || label) && (
                <View style={styles.labelRow}>
                    {label && (
                        <Text style={styles.labelText} allowFontScaling={true}>
                            {label}
                        </Text>
                    )}
                    {showLabel && (
                        <Text
                            style={[styles.percentText, { color: resolvedColor }]}
                            allowFontScaling={true}
                            accessibilityLiveRegion="polite"
                            accessibilityLabel={accessibilityLabel ?? `Progress ${clampedProgress.toFixed(0)} persen`}
                        >
                            {clampedProgress.toFixed(0)}%
                        </Text>
                    )}
                </View>
            )}

            <View
                style={[styles.track, { height }]}
                accessible={true}
                accessibilityRole="progressbar"
                accessibilityLabel={accessibilityLabel ?? `Progress ${clampedProgress.toFixed(0)} persen`}
                accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: clampedProgress,
                }}
                accessibilityLiveRegion="polite"
            >
                <Animated.View
                    style={[
                        styles.fill,
                        { backgroundColor: resolvedColor, height },
                        animFill,
                    ]}
                />
            </View>
        </View>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        labelRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6,
        },
        labelText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        percentText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
        track: {
            width: '100%',
            backgroundColor: colors.surfaceMuted,
            borderRadius: 999,
            overflow: 'hidden',
        },
        fill: {
            borderRadius: 999,
        },
    });
