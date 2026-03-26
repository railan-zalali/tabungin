import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { validateEmail, validatePassword, validateConfirmPassword, validateName } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';
import { useTheme } from '../../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';

function getPasswordStrength(password: string): { label: string; color: string; progress: number } {
    if (!password) return { label: '', color: Colors.border, progress: 0 };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Lemah', color: '#EF4444', progress: 0.33 };
    if (score <= 3) return { label: 'Sedang', color: '#F59E0B', progress: 0.66 };
    return { label: 'Kuat', color: '#10B981', progress: 1 };
}

export function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { register, authError } = useAuthStore();
    const { colors, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const passwordStrength = getPasswordStrength(password);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        const nameErr = validateName(name);
        const emailErr = validateEmail(email);
        const passErr = validatePassword(password);
        const confirmErr = validateConfirmPassword(password, confirm);
        if (nameErr) errs.name = nameErr;
        if (emailErr) errs.email = emailErr;
        if (passErr) errs.password = passErr;
        if (confirmErr) errs.confirm = confirmErr;
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        setIsLoading(true);
        try {
            const ok = await register(name.trim(), email.trim(), password);
            if (!ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearFieldError = (field: string) => setErrors((state) => {
        const next = { ...state };
        delete next[field];
        return next;
    });

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <View style={styles.bgAuraBottom} pointerEvents="none" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Kembali ke login"
                    >
                        <Text style={styles.backText} allowFontScaling={true}>Kembali</Text>
                    </TouchableOpacity>

                    <View style={styles.heroCard}>
                        <Text style={styles.heading} allowFontScaling={true} accessibilityRole="header">
                            Buat Akun Baru
                        </Text>
                        <Text style={styles.subHeading} allowFontScaling={true}>
                            Mulai perjalanan finansialmu bersama Tabungin.
                        </Text>
                    </View>

                    <View style={styles.fields}>
                        <Input
                            label="Nama Lengkap"
                            value={name}
                            onChangeText={(value) => { setName(value); clearFieldError('name'); }}
                            autoCapitalize="words"
                            leftIcon="account"
                            error={errors.name}
                            placeholder="Budi Santoso"
                            required
                        />
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={(value) => { setEmail(value); clearFieldError('email'); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="email"
                            error={errors.email}
                            placeholder="nama@email.com"
                            required
                        />
                        <View>
                            <Input
                                label="Password"
                                value={password}
                                onChangeText={(value) => { setPassword(value); clearFieldError('password'); }}
                                secureTextEntry
                                leftIcon="lock"
                                error={errors.password}
                                placeholder="Minimal 8 karakter"
                                required
                            />
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        <View 
                                            style={[
                                                styles.strengthProgress, 
                                                { 
                                                    width: `${passwordStrength.progress * 100}%`,
                                                    backgroundColor: passwordStrength.color 
                                                }
                                            ]} 
                                        />
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Input
                            label="Konfirmasi Password"
                            value={confirm}
                            onChangeText={(value) => { setConfirm(value); clearFieldError('confirm'); }}
                            secureTextEntry
                            leftIcon="lock-check"
                            error={errors.confirm}
                            placeholder="Ulangi password"
                            required
                        />
                    </View>

                    {authError && (
                        <View style={styles.errorBanner} accessible={true} accessibilityRole="alert">
                            <Text style={styles.errorBannerText} allowFontScaling={true}>{authError}</Text>
                        </View>
                    )}

                    <Button
                        label="Buat Akun"
                        onPress={handleRegister}
                        variant="primary"
                        size="lg"
                        loading={isLoading}
                        fullWidth
                        style={{ marginTop: 8 }}
                        accessibilityHint="Ketuk dua kali untuk membuat akun baru"
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText} allowFontScaling={true}>Sudah punya akun? </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            accessible={true}
                            accessibilityRole="link"
                            accessibilityLabel="Masuk ke akun yang sudah ada"
                            hitSlop={{ top: 10, bottom: 10 }}
                        >
                            <Text style={styles.footerLink} allowFontScaling={true}>Masuk</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },
        container: { flexGrow: 1, padding: 24, gap: 14 },
        bgAuraTop: {
            position: 'absolute',
            top: -100,
            right: -40,
            width: 240,
            height: 240,
            borderRadius: 9999,
            backgroundColor: colors.primaryLight,
            opacity: 0.68,
        },
        bgAuraBottom: {
            position: 'absolute',
            left: -70,
            bottom: 80,
            width: 180,
            height: 180,
            borderRadius: 9999,
            backgroundColor: colors.infoBg,
            opacity: 0.32,
        },
        backBtn: { paddingVertical: 8, minHeight: 48, justifyContent: 'center', width: 120 },
        backText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.primary },
        heroCard: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['4xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18,
            gap: 6,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
        },
        heading: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: colors.textPrimary },
        subHeading: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textSecondary, lineHeight: 22 },
        fields: { gap: 14 },
        strengthContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            gap: 12,
        },
        strengthBar: {
            flex: 1,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            overflow: 'hidden',
        },
        strengthProgress: {
            height: '100%',
            borderRadius: 2,
        },
        strengthLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            minWidth: 50,
        },
        errorBanner: {
            backgroundColor: colors.dangerBg,
            borderRadius: 14,
            borderLeftWidth: 3,
            borderLeftColor: colors.danger,
            padding: 12,
            borderWidth: 1,
            borderColor: `${colors.danger}20`,
        },
        errorBannerText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.danger },
        footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 },
        footerText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textSecondary },
        footerLink: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.primary },
    });
