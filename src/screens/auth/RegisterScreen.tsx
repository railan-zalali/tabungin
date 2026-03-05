// Register Screen — Validasi real-time semua field
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { validateEmail, validatePassword, validateConfirmPassword, validateName } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

export function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { register, authError, clearError } = useAuthStore();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

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

    const clearFieldError = (field: string) => setErrors((e) => { const n = { ...e }; delete n[field]; return n; });

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Kembali ke login"
                    >
                        <Text style={styles.backText} allowFontScaling={true}>← Kembali</Text>
                    </TouchableOpacity>

                    <Text style={styles.heading} allowFontScaling={true} accessibilityRole="header">
                        Buat Akun Baru ✨
                    </Text>
                    <Text style={styles.subHeading} allowFontScaling={true}>
                        Mulai perjalanan finansialmu bersama Tabungin
                    </Text>

                    <View style={styles.fields}>
                        <Input
                            label="Nama Lengkap"
                            value={name}
                        onChangeText={(v) => { setName(v); clearFieldError('name'); }}
                            autoCapitalize="words"
                            leftIcon="account"
                            error={errors.name}
                            placeholder="Budi Santoso"
                            required
                        />
                        <Input
                            label="Email"
                            value={email}
                        onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="email"
                            error={errors.email}
                            placeholder="nama@email.com"
                            required
                        />
                        <Input
                            label="Password"
                            value={password}
                        onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
                            secureTextEntry
                            leftIcon="lock"
                            error={errors.password}
                            placeholder="Minimal 8 karakter"
                            hint="Gunakan kombinasi huruf dan angka"
                            required
                        />
                        <Input
                            label="Konfirmasi Password"
                            value={confirm}
                        onChangeText={(v) => { setConfirm(v); clearFieldError('confirm'); }}
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

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.surface },
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: 24, gap: 14 },
    backBtn: { paddingVertical: 8, minHeight: 48, justifyContent: 'center', width: 120 },
    backText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.primary },
    heading: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
    subHeading: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary },
    fields: { gap: 14 },
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#DC2626',
        padding: 12,
    },
    errorBannerText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: '#DC2626' },
    footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 },
    footerText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary },
    footerLink: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.primary },
});
