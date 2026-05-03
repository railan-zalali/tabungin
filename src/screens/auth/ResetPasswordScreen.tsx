import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { ScreenShell } from '../../components/common/ScreenShell';
import { StatePanel } from '../../components/common/StatePanel';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../types/navigation';
import { validateConfirmPassword, validatePassword } from '../../utils/validation';
import { useTheme } from '../../store/useThemeStore';

type RecoveryParams = {
    access_token?: string;
    refresh_token?: string;
    type?: string;
    error_description?: string;
};

function parseRecoveryParams(url?: string | null): RecoveryParams {
    if (!url) return {};

    const params = new URLSearchParams();
    const [, query = ''] = url.split('?');
    const [queryPart, hashPart = ''] = query.split('#');
    const hashOnly = url.includes('#') ? url.split('#').pop() ?? '' : hashPart;

    [queryPart, hashOnly].forEach((part) => {
        if (!part) return;
        const cleanPart = part.startsWith('?') || part.startsWith('#') ? part.slice(1) : part;
        const partialParams = new URLSearchParams(cleanPart);
        partialParams.forEach((value, key) => params.set(key, value));
    });

    return {
        access_token: params.get('access_token') ?? undefined,
        refresh_token: params.get('refresh_token') ?? undefined,
        type: params.get('type') ?? undefined,
        error_description: params.get('error_description') ?? undefined,
    };
}

export function ResetPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute();
    const routeParams = (route.params ?? {}) as RecoveryParams;
    const { colors } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; token?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isTokenReady, setIsTokenReady] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function prepareRecoverySession() {
            const initialUrl = await Linking.getInitialURL();
            const urlParams = parseRecoveryParams(initialUrl);
            const accessToken = routeParams.access_token ?? urlParams.access_token;
            const refreshToken = routeParams.refresh_token ?? urlParams.refresh_token;
            const urlError = routeParams.error_description ?? urlParams.error_description;

            if (urlError) {
                if (mounted) setErrors({ token: decodeURIComponent(urlError) });
                return;
            }

            if (!accessToken || !refreshToken) {
                if (mounted) setErrors({ token: 'Link reset tidak membawa token pemulihan yang valid.' });
                return;
            }

            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (!mounted) return;
            if (error) {
                setErrors({ token: error.message || 'Sesi reset password tidak dapat disiapkan.' });
                return;
            }

            setIsTokenReady(true);
        }

        prepareRecoverySession();
        return () => {
            mounted = false;
        };
    }, [routeParams.access_token, routeParams.error_description, routeParams.refresh_token]);

    const validate = () => {
        const nextErrors: typeof errors = {};
        const passwordError = validatePassword(password);
        const confirmError = validateConfirmPassword(password, confirmPassword);

        if (passwordError) nextErrors.password = passwordError;
        if (confirmError) nextErrors.confirmPassword = confirmError;

        setErrors((current) => ({ token: current.token, ...nextErrors }));
        return Object.keys(nextErrors).length === 0;
    };

    const handleUpdatePassword = async () => {
        if (!isTokenReady || !validate()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setErrors((current) => ({ ...current, token: error.message }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            await supabase.auth.signOut();
            setIsSuccess(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity
                        style={styles.backLink}
                        onPress={() => navigation.navigate('Login')}
                        accessibilityRole="button"
                        accessibilityLabel="Kembali ke login"
                    >
                        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
                        <Text style={styles.backLinkText}>Kembali ke login</Text>
                    </TouchableOpacity>

                    <View style={styles.hero}>
                        <View style={styles.heroIcon}>
                            <MaterialCommunityIcons name="key-variant" size={32} color={colors.brutalInk} />
                        </View>
                        <Text style={styles.eyebrow}>Pemulihan akses</Text>
                        <Text style={styles.title}>Buat password baru untuk akun Tabungin.</Text>
                        <Text style={styles.subtitle}>Gunakan minimal 8 karakter. Setelah berhasil, masuk kembali dengan password baru.</Text>
                    </View>

                    {isSuccess ? (
                        <StatePanel
                            icon="check-decagram-outline"
                            title="Password sudah diperbarui"
                            description="Silakan masuk kembali memakai password baru."
                            tone="success"
                            actionLabel="Masuk ke Login"
                            onAction={() => navigation.navigate('Login')}
                        />
                    ) : errors.token ? (
                        <StatePanel
                            icon="alert-circle-outline"
                            title="Link reset tidak valid"
                            description={errors.token}
                            tone="danger"
                            actionLabel="Kirim ulang link"
                            onAction={() => navigation.navigate('ForgotPassword')}
                        />
                    ) : (
                        <FormSection title="Password baru" subtitle="Satu langkah terakhir untuk mengunci ulang akunmu.">
                            <Input
                                label="Password baru"
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value);
                                    setErrors((current) => ({ ...current, password: undefined }));
                                }}
                                secureTextEntry
                                autoComplete="new-password"
                                leftIcon="lock-outline"
                                error={errors.password}
                                placeholder="Minimal 8 karakter"
                                required
                            />
                            <Input
                                label="Konfirmasi password"
                                value={confirmPassword}
                                onChangeText={(value) => {
                                    setConfirmPassword(value);
                                    setErrors((current) => ({ ...current, confirmPassword: undefined }));
                                }}
                                secureTextEntry
                                autoComplete="new-password"
                                leftIcon="lock-check-outline"
                                error={errors.confirmPassword}
                                placeholder="Ulangi password baru"
                                required
                            />
                            <Button
                                label="Simpan Password Baru"
                                onPress={handleUpdatePassword}
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                disabled={!isTokenReady}
                            />
                        </FormSection>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex: { flex: 1 },
        content: {
            paddingHorizontal: 20,
            paddingTop: 72,
            paddingBottom: 28,
            gap: 20,
        },
        backLink: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            minHeight: 44,
        },
        backLinkText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
        hero: {
            gap: 10,
        },
        heroIcon: {
            width: 58,
            height: 58,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brutalYellow,
            borderWidth: 3,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 5, height: 5 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 6,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        title: {
            ...Typography.h1,
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textSecondary,
        },
    });
