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
import { validateEmail } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';
import { useTheme } from '../../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';

export function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { sendResetPassword } = useAuthStore();
    const { colors, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validate = (): boolean => {
        const emailErr = validateEmail(email);
        if (emailErr) {
            setError(emailErr);
            return false;
        }
        return true;
    };

    const handleReset = async () => {
        if (!validate()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendResetPassword(email.trim());
            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsSuccess(true);
            } else {
                setError(result.error || 'Gagal mengirim email reset password.');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <SafeAreaView style={styles.safe}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                >
                    <ScrollView contentContainerStyle={styles.container}>
                        <View style={styles.successContainer}>
                            <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.successIcon}>
                                <MaterialCommunityIcons name='email-check' size={64} color={colors.textInverse} />
                            </LinearGradient>
                            <Text style={styles.successTitle}>Email Terkirim!</Text>
                            <Text style={styles.successSubtitle}>
                                Kami telah mengirim link reset password ke email:
                            </Text>
                            <Text style={styles.successEmail}>{email}</Text>
                            <Text style={styles.successHint}>
                                Cek inbox atau folder spam Anda. Link berlaku selama 24 jam.
                            </Text>
                        </View>

                        <Button
                            label="Kembali ke Login"
                            onPress={() => navigation.navigate('Login')}
                            variant="primary"
                            size="lg"
                            fullWidth
                            style={{ marginTop: 24 }}
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Kembali ke login"
                    >
                        <MaterialCommunityIcons name='arrow-left' size={24} color={colors.primary} />
                        <Text style={styles.backText} allowFontScaling={true}> Kembali</Text>
                    </TouchableOpacity>

                    <View style={styles.headerSection}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.iconContainer}>
                            <MaterialCommunityIcons name='lock-reset' size={48} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.heading} allowFontScaling={true} accessibilityRole="header">
                            Lupa Password?
                        </Text>
                        <Text style={styles.subHeading} allowFontScaling={true}>
                            Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
                        </Text>
                    </View>

                    <View style={styles.fields}>
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={(value) => {
                                setEmail(value);
                                setError(undefined);
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="email"
                            error={error}
                            placeholder="nama@email.com"
                            required
                        />
                    </View>

                    <Button
                        label="Kirim Link Reset"
                        onPress={handleReset}
                        variant="primary"
                        size="lg"
                        loading={isLoading}
                        fullWidth
                        style={{ marginTop: 8 }}
                        accessibilityHint="Ketuk dua kali untuk mengirim link reset password"
                    />

                    <View style={styles.helpSection}>
                        <Text style={styles.helpText}>
                            Tidak menerima email?
                        </Text>
                        <Text style={styles.helpHint}>
                            Pastikan email yang Anda masukkan benar dan coba lagi dalam beberapa menit.
                        </Text>
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
        container: { flexGrow: 1, padding: 24 },
        backBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            minHeight: 48,
            width: 120,
        },
        backText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.primary },
        headerSection: { alignItems: 'center', marginVertical: 24, gap: 12 },
        iconContainer: {
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 18,
            elevation: 4,
        },
        heading: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: colors.textPrimary },
        subHeading: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
        },
        fields: { gap: 14 },
        helpSection: {
            marginTop: 24,
            backgroundColor: colors.primaryBg,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: `${colors.primary}1F`,
        },
        helpText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginBottom: 4,
        },
        helpHint: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        successContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
        successIcon: {
            width: 120,
            height: 120,
            borderRadius: 60,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 18,
            elevation: 4,
        },
        successTitle: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: colors.textPrimary },
        successSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        successEmail: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
        successHint: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 8,
        },
    });
