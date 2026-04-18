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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
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

    if (score <= 2) return { label: 'Perlu diperkuat', color: Colors.danger, width: '36%' as const };
    if (score <= 3) return { label: 'Sudah cukup', color: Colors.warning, width: '68%' as const };
    return { label: 'Kuat', color: Colors.success, width: '100%' as const };
}

export function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { register, authError, sessionStatus, pendingGuestMergeResolution, postAuthRedirect, clearPostAuthRedirect } = useAuthStore();
    const { colors, gradients } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const strength = useMemo(() => getStrength(password), [password]);

    useEffect(() => {
        if (sessionStatus === 'authenticated' && !pendingGuestMergeResolution) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main', params: postAuthRedirect ?? undefined }],
            });
            clearPostAuthRedirect();
        }
    }, [clearPostAuthRedirect, navigation, pendingGuestMergeResolution, postAuthRedirect, sessionStatus]);

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
            triggerHapticNotification();
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
                            <MaterialCommunityIcons name="account-plus-outline" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Create Your Main Workspace</Text>
                        <Text style={styles.title}>Mulai dengan akun utama yang nanti jadi pusat profil, dompet, dan kolaborasi.</Text>
                        <Text style={styles.subtitle}>Kami jaga flow pendaftaran tetap singkat, tetapi cukup jelas untuk dipakai jangka panjang.</Text>
                        {sessionStatus === 'guest' ? (
                            <InlineNotice
                                icon="account-switch-outline"
                                title="Data guest tetap aman"
                                description="Setelah akun dibuat, data lokal yang belum sinkron tetap bisa dibawa ke akun tanpa memutus ritme pencatatanmu."
                                tone="primary"
                            />
                        ) : null}
                    </View>

                    <FormSection
                        eyebrow="Primary Identity"
                        title="Buat akun baru"
                        subtitle="Lengkapi identitas utama dulu, nanti detail lain bisa disesuaikan di pengaturan."
                        variant="highlight"
                    >
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

                    <TouchableOpacity style={styles.bottomLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.bottomLinkText}>Sudah punya akun? Masuk saja</Text>
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
