// Komponen Input yang accessible dengan label selalu terlihat
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface InputProps extends TextInputProps {
    label: string;
    error?: string | null;
    hint?: string;
    leftIcon?: string;
    rightIcon?: string;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
    required?: boolean;
}

export function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    required = false,
    ...textInputProps
}: InputProps) {
    const [focused, setFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const isPassword = textInputProps.secureTextEntry;
    const effectiveSecure = isPassword && !isPasswordVisible;

    const inputId = `input-${label.replace(/\s/g, '-').toLowerCase()}`;

    return (
        <View style={[styles.container, containerStyle]}>
            {/* Label selalu terlihat — WCAG Understandable */}
            <Text
                style={styles.label}
                allowFontScaling={true}
                accessibilityRole="text"
                nativeID={inputId}
            >
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <View
                style={[
                    styles.inputContainer,
                    focused && styles.inputContainerFocused,
                    !!error && styles.inputContainerError,
                ]}
            >
                {leftIcon && (
                    <MaterialCommunityIcons
                        name={leftIcon as any}
                        size={20}
                        color={error ? colors.danger : focused ? colors.primary : colors.textSecondary}
                        style={styles.leftIcon}
                        accessibilityElementsHidden={true}
                    />
                )}

                <TextInput
                    style={[
                        styles.input,
                        leftIcon ? styles.inputWithLeft : undefined,
                        (rightIcon || isPassword) ? styles.inputWithRight : undefined,
                    ]}
                    placeholderTextColor={colors.textDisabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    accessible={true}
                    accessibilityLabel={label}
                    accessibilityLabelledBy={inputId}
                    accessibilityHint={hint}
                    accessibilityState={{ disabled: textInputProps.editable === false }}
                    allowFontScaling={true}
                    secureTextEntry={effectiveSecure}
                    {...textInputProps}
                />

                {/* Tombol show/hide password */}
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible((v) => !v)}
                        style={styles.rightIconBtn}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={isPasswordVisible ? 'eye-off' : 'eye'}
                            size={20}
                            color={colors.textSecondary}
                            accessibilityElementsHidden={true}
                        />
                    </TouchableOpacity>
                )}

                {rightIcon && !isPassword && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={styles.rightIconBtn}
                        accessible={!!onRightIconPress}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={rightIcon as any}
                            size={20}
                            color={colors.textSecondary}
                            accessibilityElementsHidden={true}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Pesan error spesifik — WCAG Understandable */}
            {error && (
                <View style={styles.errorRow} accessible={true} accessibilityLiveRegion="polite">
                    <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} accessibilityElementsHidden={true} />
                    <Text style={styles.errorText} allowFontScaling={true} accessibilityRole="alert">
                        {error}
                    </Text>
                </View>
            )}

            {/* Hint tanpa error */}
            {hint && !error && (
                <Text style={styles.hintText} allowFontScaling={true}>
                    {hint}
                </Text>
            )}
        </View>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        container: { gap: 6 },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
        },
        required: { color: colors.danger },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 54,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 1,
        },
        inputContainerFocused: {
            borderColor: colors.primary,
            backgroundColor: colors.surface,
            shadowOpacity: 0.08,
            elevation: 2,
        },
        inputContainerError: { borderColor: colors.danger },
        leftIcon: { paddingLeft: 14 },
        rightIconBtn: { paddingRight: 14, paddingLeft: 8, minHeight: 48, justifyContent: 'center' },
        input: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            minHeight: 54,
        },
        inputWithLeft: { paddingLeft: 10 },
        inputWithRight: { paddingRight: 0 },
        errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
            flex: 1,
        },
        hintText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textTertiary,
        },
    });
