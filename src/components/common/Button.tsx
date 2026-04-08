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
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';
import { triggerHapticImpact } from '../../utils/haptics';

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
    accessibilityLabel?: string;
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
    accessibilityLabel,
    accessibilityHint,
    fullWidth = false,
    surface = 'solid',
    emphasis = 'high',
}: ButtonProps) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(variant === 'primary' ? 1 : 0);
    const { colors, motion, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled || loading ? 0.54 : 1,
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
        triggerHapticImpact();
        onPress();
    }, [onPress]);

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
            accessibilityLabel={accessibilityLabel || label}
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

const getStyles = (colors: any, textSize: ReturnType<typeof useTheme>['textSize']) => StyleSheet.create({
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
        borderColor: colors.cardBorder,
    },
    fullWidth: { width: '100%' },
    mediumEmphasis: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    glass: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.cardBorder,
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
        backgroundColor: colors.panelSurfaceStrong,
        borderColor: colors.cardBorderStrong,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        borderColor: colors.chipSelectedBorder,
    },
    ghost: {
        backgroundColor: colors.interactiveSoft,
        borderColor: 'transparent',
    },
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
        fontSize: scaleFontSize(FontSize.body, textSize),
        letterSpacing: 0.1,
    },
    smText: { fontSize: scaleFontSize(13, textSize) },
    mdText: { fontSize: scaleFontSize(FontSize.body, textSize) },
    lgText: { fontSize: scaleFontSize(FontSize.h4, textSize) },
    primaryGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
