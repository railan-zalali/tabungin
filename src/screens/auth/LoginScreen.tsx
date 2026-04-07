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
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { triggerHapticNotification } from '../../utils/haptics';
import { validateEmail, validatePassword } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

const REMEMBER_EMAIL_KEY = '@tabungin_remember_email';

export function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { login, authError, continueAsGuest, sessionStatus, pendingGuestMergeResolution, postAuthRedirect, clearPostAuthRedirect } = useAuthStore();
    const { colors, gradients } = useTheme();
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
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.hero}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.heroIcon}>
                            <MaterialCommunityIcons name="piggy-bank-outline" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Masuk ke ritme keuanganmu</Text>
                        <Text style={styles.title}>Semua dompet, target, dan insight harian siap dilanjutkan.</Text>
                        <Text style={styles.subtitle}>Masuk untuk melihat konteks profil aktif, target tabungan, dan arus kas terbaru di satu tempat.</Text>
                        {sessionStatus === 'guest' ? (
                            <Text style={styles.guestUpgradeNote}>Data lokal guest tetap ada. Setelah masuk, data lokal yang belum sinkron akan ikut terbawa ke akun.</Text>
                        ) : null}
                    </View>

                    <FormSection title="Masuk ke akun" subtitle="Kami buat tetap singkat supaya kamu cepat kembali ke aktivitas utama.">
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
                            variant="outline"
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
        guestUpgradeNote: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.primary,
        },
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
