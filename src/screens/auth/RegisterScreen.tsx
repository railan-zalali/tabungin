import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { AuthScreenLayout } from '../../components/common/AuthScreenLayout';
import { FormSection } from '../../components/common/FormSection';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import {
    validateConfirmPassword,
    validateEmail,
    validateName,
    validatePassword,
} from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

function getStrength(password: string) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Perlu diperkuat', color: '#E5533D', width: '36%' as const };
    if (score <= 3) return { label: 'Sudah cukup', color: '#FF9F1C', width: '68%' as const };
    return { label: 'Kuat', color: '#18A957', width: '100%' as const };
}

export function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { register, authError } = useAuthStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const strength = useMemo(() => getStrength(password), [password]);

    const clearError = (field: string) => {
        setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        const nameError = validateName(name);
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        const confirmError = validateConfirmPassword(password, confirmPassword);

        if (nameError) nextErrors.name = nameError;
        if (emailError) nextErrors.email = emailError;
        if (passwordError) nextErrors.password = passwordError;
        if (confirmError) nextErrors.confirmPassword = confirmError;

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        try {
            await register(name.trim(), email.trim(), password);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthScreenLayout
            eyebrow="Bangun basis yang kuat"
            title="Mulai dengan akun utama yang siap dipakai lintas profil dan dompet."
            subtitle="Pendaftaran tetap ringkas, tetapi cukup solid untuk dipakai jangka panjang dan kolaboratif."
            icon="account-plus-outline"
            topAction={{
                label: 'Kembali ke login',
                onPress: () => navigation.navigate('Login'),
                icon: 'arrow-left',
            }}
            footerAction={{
                label: 'Sudah punya akun? Masuk saja',
                onPress: () => navigation.navigate('Login'),
            }}
        >
            <FormSection title="Buat akun baru" subtitle="Isi identitas utama dulu. Detail lain bisa dirapikan nanti di pengaturan.">
                <Input
                    label="Nama Lengkap"
                    value={name}
                    onChangeText={(value) => {
                        setName(value);
                        clearError('name');
                    }}
                    leftIcon="account-outline"
                    error={errors.name}
                    placeholder="Budi Santoso"
                    required
                />
                <Input
                    label="Email"
                    value={email}
                    onChangeText={(value) => {
                        setEmail(value);
                        clearError('email');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon="email-outline"
                    error={errors.email}
                    placeholder="nama@email.com"
                    required
                />
                <View style={styles.passwordBlock}>
                    <Input
                        label="Password"
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            clearError('password');
                        }}
                        secureTextEntry
                        leftIcon="lock-outline"
                        error={errors.password}
                        placeholder="Minimal 8 karakter"
                        required
                    />
                    {password ? (
                        <View style={styles.strengthCard}>
                            <View style={styles.strengthBar}>
                                <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                            </View>
                            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                        </View>
                    ) : null}
                </View>
                <Input
                    label="Konfirmasi Password"
                    value={confirmPassword}
                    onChangeText={(value) => {
                        setConfirmPassword(value);
                        clearError('confirmPassword');
                    }}
                    secureTextEntry
                    leftIcon="lock-check-outline"
                    error={errors.confirmPassword}
                    placeholder="Ulangi password"
                    required
                />

                {authError ? (
                    <StatePanel
                        icon="alert-circle-outline"
                        title="Akun belum berhasil dibuat"
                        description={authError}
                        tone="danger"
                    />
                ) : null}

                <Button label="Buat Akun" onPress={handleRegister} variant="primary" size="lg" fullWidth loading={isLoading} />
            </FormSection>
        </AuthScreenLayout>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        passwordBlock: {
            gap: 10,
        },
        strengthCard: {
            gap: 6,
            paddingHorizontal: 2,
        },
        strengthBar: {
            height: 8,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.surfaceMuted,
            overflow: 'hidden',
        },
        strengthFill: {
            height: '100%',
            borderRadius: BorderRadius.full,
        },
        strengthLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
    });
