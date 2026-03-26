// Komponen Card dengan fade + slide-up entrance animation
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    elevated?: boolean;
    variant?: 'default' | 'flat' | 'outlined' | 'glass';
    animationDelay?: number;
    onPress?: () => void;
    accessibilityLabel?: string;
    interactive?: boolean;
}

export function Card({
    children,
    style,
    elevated = false,
    variant = 'default',
    animationDelay = 0,
    interactive = false,
}: CardProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    useEffect(() => {
        opacity.value = withDelay(
            animationDelay,
            withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) })
        );
        translateY.value = withDelay(
            animationDelay,
            withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) })
        );
    }, [animationDelay, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[
                styles.base,
                variant === 'flat' && styles.flat,
                variant === 'outlined' && styles.outlined,
                variant === 'glass' && styles.glass,
                elevated ? styles.shadowLg : variant !== 'flat' ? styles.shadowSm : null,
                interactive && styles.interactive,
                style,
                animatedStyle,
            ]}
        >
            {children}
        </Animated.View>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        base: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['3xl'],
            padding: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
        },
        flat: {
            backgroundColor: colors.surfaceAlt,
            borderColor: 'transparent',
        },
        outlined: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
        },
        glass: {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.glassStroke,
        },
        interactive: {
            shadowOpacity: 0.12,
        },
        shadowSm: {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 3,
        },
        shadowLg: {
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
        },
    });
