import React from 'react';
import * as Linking from 'expo-linking';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { ScreenShell } from '../../components/common/ScreenShell';
import { FormSection } from '../../components/common/FormSection';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../store/useThemeStore';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import type { RootStackParamList } from '../../types/navigation';
import { extractAuthCallbackParams } from '../../utils/authCallback';

export function AuthCallbackScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const loadSession = useAuthStore((state) => state.loadSession);
    const [status, setStatus] = React.useState<'loading' | 'ready' | 'success' | 'error'>('loading');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        let active = true;

        const hydrateRecoverySession = async (url: string | null) => {
            const params = extractAuthCallbackParams(url);

            if (params.errorDescription) {
                if (active) {
                    setError(params.errorDescription);
                    setStatus('error');
                }
                return;
            }

            if (params.accessToken && params.refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: params.accessToken,
                    refresh_token: params.refreshToken,
                });

                if (sessionError) {
                    if (active) {
                        setError(sessionError.message);
                        setStatus('error');
                    }
                    return;
                }

                if (active) {
                    setStatus('ready');
                }
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                if (active) {
                    setStatus('ready');
                }
                return;
            }

            if (active) {
                setError('Link reset tidak valid atau sudah kedaluwarsa.');
                setStatus('error');
            }
        };

        Linking.getInitialURL()
            .then((url) => hydrateRecoverySession(url))
            .catch((sessionError) => {
                if (active) {
                    setError(sessionError instanceof Error ? sessionError.message : 'Gagal memproses link reset.');
                    setStatus('error');
                }
            });

        const subscription = Linking.addEventListener('url', ({ url }) => {
            hydrateRecoverySession(url).catch((sessionError) => {
                if (active) {
                    setError(sessionError instanceof Error ? sessionError.message : 'Gagal memproses link reset.');
                    setStatus('error');
                }
            });
        });

        return () => {
            active = false;
            subscription.remove();
        };
    }, []);

    const handleSubmit = async () => {
        if (password.length < 8) {
            setError('Password baru minimal 8 karakter.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Konfirmasi password belum sama.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                setError(updateError.message);
                return;
            }

            await supabase.auth.signOut();
            await loadSession();
            setStatus('success');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.hero}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.heroIcon}>
                            <MaterialCommunityIcons name="lock-reset" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Reset password</Text>
                        <Text style={styles.title}>Selesaikan pemulihan akun dari link yang baru saja dibuka.</Text>
                        <Text style={styles.subtitle}>Kami validasi sesi recovery dulu, lalu kamu bisa langsung memasang password baru tanpa keluar dari alur ini.</Text>
                    </View>

                    {status === 'loading' ? (
                        <StatePanel loading title="Memeriksa link reset" description="Token recovery sedang diverifikasi agar sesi reset aman dipakai." />
                    ) : null}

                    {status === 'error' ? (
                        <StatePanel
                            icon="alert-circle-outline"
                            title="Link reset tidak bisa dipakai"
                            description={error || 'Token recovery tidak valid atau sudah kedaluwarsa.'}
                            tone="danger"
                            actionLabel="Kembali ke login"
                            onAction={() => navigation.navigate('Login')}
                        />
                    ) : null}

                    {status === 'ready' ? (
                        <FormSection title="Atur password baru" subtitle="Gunakan password baru yang belum pernah dipakai di perangkat ini.">
                            <Input
                                label="Password baru"
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value);
                                    setError(null);
                                }}
                                secureTextEntry
                                leftIcon="lock-outline"
                                placeholder="Minimal 8 karakter"
                                required
                            />
                            <Input
                                label="Konfirmasi password"
                                value={confirmPassword}
                                onChangeText={(value) => {
                                    setConfirmPassword(value);
                                    setError(null);
                                }}
                                secureTextEntry
                                leftIcon="shield-check-outline"
                                placeholder="Ulangi password baru"
                                error={error || undefined}
                                required
                            />
                            <Button
                                label="Simpan Password Baru"
                                onPress={handleSubmit}
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isSubmitting}
                            />
                        </FormSection>
                    ) : null}

                    {status === 'success' ? (
                        <StatePanel
                            icon="check-circle-outline"
                            title="Password berhasil diperbarui"
                            description="Sesi recovery sudah ditutup. Silakan login lagi menggunakan password baru."
                            tone="success"
                            actionLabel="Masuk ke Login"
                            onAction={() => navigation.navigate('Login')}
                        />
                    ) : null}
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
        hero: {
            gap: 10,
        },
        heroIcon: {
            width: 58,
            height: 58,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
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
