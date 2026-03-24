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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FontFamily, FontSize } from '../../constants/typography';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

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
}: ButtonProps) {
    const scale = useSharedValue(1);
    const hapticEnabled = useAuthStore((s) => s.hapticEnabled);
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, []);

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
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        minWidth: 48,
        borderRadius: 12,
    },
    fullWidth: { width: '100%' },
    disabled: { opacity: 0.5 },

    // Variants
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.danger },

    // Text variants
    primaryText: { color: colors.textInverse },
    secondaryText: { color: colors.textPrimary },
    outlineText: { color: colors.primary },
    ghostText: { color: colors.primary },
    dangerText: { color: colors.textInverse },

    // Sizes
    sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, borderRadius: 8 },
    md: { paddingHorizontal: 20, paddingVertical: 14 },
    lg: { paddingHorizontal: 28, paddingVertical: 18, borderRadius: 14 },

    labelBase: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
    },
    smText: { fontSize: 13 },
    mdText: { fontSize: FontSize.body },
    lgText: { fontSize: FontSize.h4 },
});
