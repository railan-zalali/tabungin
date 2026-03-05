// Komponen Card dengan fade + slide-up entrance animation
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Shadow } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    elevated?: boolean;
    variant?: 'default' | 'flat' | 'outlined';
    animationDelay?: number;
    onPress?: () => void;
    accessibilityLabel?: string;
}

export function Card({
    children,
    style,
    elevated = false,
    variant = 'default',
    animationDelay = 0,
}: CardProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(
            animationDelay,
            withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) })
        );
        translateY.value = withDelay(
            animationDelay,
            withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[
                styles.base,
                variant === 'outlined' && styles.outlined,
                elevated && Shadow.md,
                !elevated && variant === 'default' && Shadow.sm,
                style,
                animatedStyle,
            ]}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        overflow: 'hidden',
    },
    flat: {
        backgroundColor: Colors.background,
    },
    outlined: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
});
