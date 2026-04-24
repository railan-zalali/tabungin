import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { AuthScreenLayout } from '../../components/common/AuthScreenLayout';
import { FormSection } from '../../components/common/FormSection';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { validateEmail, validatePassword } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

const REMEMBER_EMAIL_KEY = '@tabungin_remember_email';

export function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { login, authError } = useAuthStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(REMEMBER_EMAIL_KEY)
            .then((value) => {
                if (value) {
                    setEmail(value);
                    setRememberMe(true);
                }
            })
            .catch((error) => console.error('Failed to load remembered email:', error));
    }, []);

    const validate = () => {
        const nextErrors: typeof errors = {};
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);

        if (emailError) nextErrors.email = emailError;
        if (passwordError) nextErrors.password = passwordError;

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const success = await login(email.trim(), password);
            if (success && rememberMe) {
                await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
            } else if (!rememberMe) {
                await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthScreenLayout
            eyebrow="Masuk dan ambil alih ritme"
            title="Dashboard, dompet, dan target aktif siap dilanjutkan."
            subtitle="Masuk untuk kembali ke command center keuangan harian dengan fokus yang lebih cepat dan rapi."
            icon="login-variant"
            footerAction={{
                label: 'Belum punya akun? Buat akun baru',
                onPress: () => navigation.navigate('Register'),
            }}
        >
            <FormSection title="Masuk ke akun" subtitle="Flow dibuat cepat untuk penggunaan harian di Android, tanpa langkah yang tidak perlu.">
                <Input
                    label="Email"
                    value={email}
                    onChangeText={(value) => {
                        setEmail(value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon="email-outline"
                    error={errors.email}
                    placeholder="nama@email.com"
                    required
                />
                <Input
                    label="Password"
                    value={password}
                    onChangeText={(value) => {
                        setPassword(value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    secureTextEntry
                    autoComplete="password"
                    leftIcon="lock-outline"
                    error={errors.password}
                    placeholder="Minimal 8 karakter"
                    required
                />

                <View style={styles.optionsRow}>
                    <TouchableOpacity style={styles.checkRow} onPress={() => setRememberMe((value) => !value)}>
                        <MaterialCommunityIcons
                            name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={20}
                            color={rememberMe ? colors.primary : colors.textSecondary}
                        />
                        <Text style={styles.checkText}>Ingat email saya</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.inlineLink} onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.inlineLinkText}>Lupa password?</Text>
                    </TouchableOpacity>
                </View>

                {authError ? (
                    <StatePanel
                        icon="alert-circle-outline"
                        title="Masih belum bisa masuk"
                        description={authError}
                        tone="danger"
                    />
                ) : null}

                <Button label="Masuk ke Tabungin" onPress={handleLogin} variant="primary" size="lg" fullWidth loading={isLoading} />
            </FormSection>
        </AuthScreenLayout>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        optionsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        checkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
        },
        checkText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        inlineLink: {
            paddingVertical: 6,
        },
        inlineLinkText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
    });
