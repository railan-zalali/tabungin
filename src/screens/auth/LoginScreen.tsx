import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { ScreenShell } from '../../components/common/ScreenShell';
import { FormSection } from '../../components/common/FormSection';
import { InlineNotice } from '../../components/common/InlineNotice';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { triggerHapticNotification } from '../../utils/haptics';
import { useResponsiveMetrics } from '../../utils/responsive';
import { validateEmail, validatePassword } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

const REMEMBER_EMAIL_KEY = '@tabungin_remember_email';

export function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { login, authError, continueAsGuest, sessionStatus, pendingGuestMergeResolution, postAuthRedirect, clearPostAuthRedirect } = useAuthStore();
    const { colors, gradients } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
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

    useEffect(() => {
        if (sessionStatus === 'authenticated' && !pendingGuestMergeResolution) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main', params: postAuthRedirect ?? undefined }],
            });
            clearPostAuthRedirect();
        }
    }, [clearPostAuthRedirect, navigation, pendingGuestMergeResolution, postAuthRedirect, sessionStatus]);

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
            triggerHapticNotification();
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
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: metrics.horizontalPadding,
                            paddingTop: metrics.headerTopOffset + 20,
                            paddingBottom: metrics.safeBottomSpacing + 12,
                            gap: metrics.verticalGap + 2,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.hero}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.heroIcon}>
                            <MaterialCommunityIcons name="piggy-bank-outline" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Finance Premium Workspace</Text>
                        <Text style={styles.title}>Semua dompet, target, dan insight harian siap dilanjutkan.</Text>
                        <Text style={styles.subtitle}>Masuk untuk kembali ke ritme keuanganmu tanpa kehilangan konteks profil, target, dan arus kas terbaru.</Text>
                        {sessionStatus === 'guest' ? (
                            <InlineNotice
                                icon="account-switch-outline"
                                title="Data guest tetap aman"
                                description="Setelah masuk, data lokal yang belum sinkron akan tetap dibawa agar transisi ke akun terasa aman."
                                tone="primary"
                            />
                        ) : null}
                    </View>

                    <FormSection
                        eyebrow="Secure Sign In"
                        title="Masuk ke akun"
                        subtitle="Flow ini dibuat singkat supaya kamu cepat kembali ke aktivitas utama."
                        variant="highlight"
                    >
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

                            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                                <Text style={styles.linkText}>Lupa password?</Text>
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

                        <Button label="Masuk" onPress={handleLogin} variant="primary" size="lg" fullWidth loading={isLoading} />
                        <Button
                            label="Lanjut tanpa akun"
                            onPress={continueAsGuest}
                            variant="secondary"
                            size="lg"
                            fullWidth
                        />
                    </FormSection>

                    <TouchableOpacity style={styles.bottomLink} onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.bottomLinkText}>Belum punya akun? Daftar sekarang</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isCompact: boolean) =>
    StyleSheet.create({
        flex: { flex: 1 },
        content: {
            gap: 18,
        },
        hero: {
            gap: 8,
        },
        heroIcon: {
            width: isCompact ? 52 : 58,
            height: isCompact ? 52 : 58,
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
            lineHeight: 21,
            color: colors.textSecondary,
        },
        optionsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
        },
        checkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        checkText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        linkText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
        bottomLink: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
        },
        bottomLinkText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
    });
