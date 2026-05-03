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
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
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
    const { colors, motion, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

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
                    color={variant === 'primary' ? colors.brutalInk : colors.primary}
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
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: colors.brutalInk,
        shadowColor: colors.brutalInk,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    fullWidth: { width: '100%' },
    mediumEmphasis: {
        shadowOffset: { width: 3, height: 3 },
        elevation: 3,
    },
    glass: {
        backgroundColor: colors.brutalWhite,
        borderColor: colors.brutalInk,
    },

    primary: {
        backgroundColor: colors.brutalLime,
        borderColor: colors.brutalInk,
    },
    secondary: {
        backgroundColor: colors.brutalWhite,
        borderColor: colors.brutalInk,
    },
    outline: {
        backgroundColor: colors.brutalPaper,
        borderColor: colors.brutalInk,
    },
    ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    danger: {
        backgroundColor: colors.brutalRed,
        borderColor: colors.brutalInk,
    },

    primaryText: { color: colors.brutalInk },
    secondaryText: { color: colors.brutalInk },
    outlineText: { color: colors.brutalInk },
    ghostText: { color: colors.primary },
    dangerText: { color: colors.brutalInk },

    sm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 38,
        borderRadius: BorderRadius.md,
    },
    md: { paddingHorizontal: 18, paddingVertical: 14 },
    lg: {
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: BorderRadius.md,
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
        backgroundColor: 'rgba(255,255,255,0)',
    },
});
