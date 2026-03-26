// Komponen Button yang accessible dengan spring animation
import React, { useCallback } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FontFamily, FontSize } from '../../constants/typography';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonSurface = 'solid' | 'glass';
type ButtonEmphasis = 'high' | 'medium';

interface ButtonProps {
    onPress: () => void;
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityHint?: string;
    fullWidth?: boolean;
    surface?: ButtonSurface;
    emphasis?: ButtonEmphasis;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
    onPress,
    label,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    style,
    textStyle,
    accessibilityHint,
    fullWidth = false,
    surface = 'solid',
    emphasis = 'high',
}: ButtonProps) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(variant === 'primary' ? 1 : 0);
    const hapticEnabled = useAuthStore((s) => s.hapticEnabled);
    const { colors, motion } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled || loading ? 0.48 : 1,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.97, motion.spring.soft);
        glowOpacity.value = withTiming(0.88, { duration: motion.duration.fast });
    }, [glowOpacity, motion.duration.fast, motion.spring.soft, scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, motion.spring.snappy);
        glowOpacity.value = withTiming(variant === 'primary' ? 1 : 0, { duration: motion.duration.normal });
    }, [glowOpacity, motion.duration.normal, motion.spring.snappy, scale, variant]);

    const handlePress = useCallback(() => {
        if (hapticEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    }, [onPress, hapticEnabled]);

    const buttonStyle = [
        styles.base,
        styles[variant],
        styles[size],
        surface === 'glass' && styles.glass,
        emphasis === 'medium' && styles.mediumEmphasis,
        fullWidth && styles.fullWidth,
        style,
    ];

    const labelStyle = [
        styles.labelBase,
        styles[`${variant}Text` as keyof typeof styles],
        styles[`${size}Text` as keyof typeof styles],
        textStyle,
    ];

    return (
        <AnimatedTouchable
            style={[animatedStyle, buttonStyle]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
        >
            {variant === 'primary' && <Animated.View pointerEvents="none" style={[styles.primaryGlow, glowStyle]} />}
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? colors.textInverse : colors.primary}
                    size="small"
                    accessibilityLabel="Memuat..."
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    <Text style={labelStyle} allowFontScaling={true} numberOfLines={1}>
                        {label}
                    </Text>
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </AnimatedTouchable>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    base: {
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        minWidth: 48,
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: 'transparent',
    },
    fullWidth: { width: '100%' },
    mediumEmphasis: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
    },
    glass: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.glassStroke,
    },

    primary: {
        backgroundColor: colors.primary,
        borderColor: `${colors.primaryDark}55`,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 6,
    },
    secondary: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.borderStrong,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        borderColor: `${colors.primary}66`,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: {
        backgroundColor: colors.danger,
        borderColor: `${colors.danger}66`,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 5,
    },

    primaryText: { color: colors.textInverse },
    secondaryText: { color: colors.textPrimary },
    outlineText: { color: colors.primary },
    ghostText: { color: colors.primary },
    dangerText: { color: colors.textInverse },

    sm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 38,
        borderRadius: BorderRadius.lg,
    },
    md: { paddingHorizontal: 18, paddingVertical: 14 },
    lg: {
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: BorderRadius['2xl'],
    },

    labelBase: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        letterSpacing: 0.1,
    },
    smText: { fontSize: 13 },
    mdText: { fontSize: FontSize.body },
    lgText: { fontSize: FontSize.h4 },
    primaryGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
});
