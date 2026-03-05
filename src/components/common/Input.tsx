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
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

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
                        color={error ? Colors.danger : focused ? Colors.primary : Colors.textSecondary}
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
                    placeholderTextColor={Colors.textDisabled}
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
                            color={Colors.textSecondary}
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
                            color={Colors.textSecondary}
                            accessibilityElementsHidden={true}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Pesan error spesifik — WCAG Understandable */}
            {error && (
                <View style={styles.errorRow} accessible={true} accessibilityLiveRegion="polite">
                    <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.danger} accessibilityElementsHidden={true} />
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

const styles = StyleSheet.create({
    container: { gap: 6 },
    label: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    required: { color: Colors.danger },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
        minHeight: 52,
    },
    inputContainerFocused: { borderColor: Colors.primary },
    inputContainerError: { borderColor: Colors.danger },
    leftIcon: { paddingLeft: 14 },
    rightIconBtn: { paddingRight: 14, paddingLeft: 8, minHeight: 48, justifyContent: 'center' },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
        minHeight: 52,
    },
    inputWithLeft: { paddingLeft: 10 },
    inputWithRight: { paddingRight: 0 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    errorText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.danger,
        flex: 1,
    },
    hintText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
    },
});
