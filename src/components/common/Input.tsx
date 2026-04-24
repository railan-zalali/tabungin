import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    type TextInputProps,
    type ViewStyle,
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
            <Text
                style={styles.label}
                allowFontScaling
                accessibilityRole="text"
                nativeID={inputId}
            >
                {label}
                {required ? <Text style={styles.required}> *</Text> : null}
            </Text>

            <View
                style={[
                    styles.inputContainer,
                    focused ? styles.inputContainerFocused : null,
                    error ? styles.inputContainerError : null,
                ]}
            >
                {leftIcon ? (
                    <MaterialCommunityIcons
                        name={leftIcon as any}
                        size={20}
                        color={error ? colors.danger : focused ? colors.primary : colors.textSecondary}
                        style={styles.leftIcon}
                        accessibilityElementsHidden
                    />
                ) : null}

                <TextInput
                    style={[
                        styles.input,
                        leftIcon ? styles.inputWithLeft : null,
                        rightIcon || isPassword ? styles.inputWithRight : null,
                    ]}
                    placeholderTextColor={colors.textDisabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    accessibilityLabel={label}
                    accessibilityLabelledBy={inputId}
                    accessibilityHint={hint}
                    accessibilityState={{ disabled: textInputProps.editable === false }}
                    allowFontScaling
                    secureTextEntry={effectiveSecure}
                    {...textInputProps}
                />

                {isPassword ? (
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible((value) => !value)}
                        style={styles.rightIconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={isPasswordVisible ? 'eye-off' : 'eye'}
                            size={20}
                            color={colors.textSecondary}
                            accessibilityElementsHidden
                        />
                    </TouchableOpacity>
                ) : null}

                {rightIcon && !isPassword ? (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={styles.rightIconBtn}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={rightIcon as any}
                            size={20}
                            color={colors.textSecondary}
                            accessibilityElementsHidden
                        />
                    </TouchableOpacity>
                ) : null}
            </View>

            {error ? (
                <View style={styles.errorRow} accessibilityLiveRegion="polite">
                    <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} accessibilityElementsHidden />
                    <Text style={styles.errorText} allowFontScaling accessibilityRole="alert">
                        {error}
                    </Text>
                </View>
            ) : null}

            {hint && !error ? (
                <Text style={styles.hintText} allowFontScaling>
                    {hint}
                </Text>
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        container: { gap: 6 },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            letterSpacing: 0.45,
            textTransform: 'uppercase',
        },
        required: { color: colors.danger },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.formFieldBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 58,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
        },
        inputContainerFocused: {
            borderColor: colors.primary,
            backgroundColor: colors.actionTint,
            shadowOpacity: 0.12,
            elevation: 3,
        },
        inputContainerError: {
            borderColor: colors.danger,
            backgroundColor: colors.formFieldError,
        },
        leftIcon: { paddingLeft: 16 },
        rightIconBtn: {
            paddingRight: 16,
            paddingLeft: 8,
            minHeight: 52,
            justifyContent: 'center',
        },
        input: {
            flex: 1,
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            minHeight: 58,
        },
        inputWithLeft: { paddingLeft: 12 },
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
