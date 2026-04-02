import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { ScreenShell } from '../../components/common/ScreenShell';
import { FormSection } from '../../components/common/FormSection';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { validateEmail } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

export function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { sendResetPassword } = useAuthStore();
    const { colors, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleReset = async () => {
        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendResetPassword(email.trim());
            if (result.success) {
                setIsSuccess(true);
                setError(undefined);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setError(result.error || 'Link reset belum berhasil dikirim.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
                        <Text style={styles.backLinkText}>Kembali ke login</Text>
                    </TouchableOpacity>

                    <View style={styles.hero}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.heroIcon}>
                            <MaterialCommunityIcons name="lock-reset" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Reset akses akun</Text>
                        <Text style={styles.title}>Kami bantu kirim link reset tanpa membuat flow terasa membingungkan.</Text>
                        <Text style={styles.subtitle}>Masukkan email akun utama. Setelah itu, cek inbox atau folder spam untuk link pemulihan.</Text>
                    </View>

                    {isSuccess ? (
                        <StatePanel
                            icon="email-check-outline"
                            title="Link reset sudah dikirim"
                            description={`Kami sudah mengirim petunjuk reset ke ${email}. Link berlaku terbatas, jadi sebaiknya langsung dibuka.`}
                            tone="success"
                            actionLabel="Kembali ke Login"
                            onAction={() => navigation.navigate('Login')}
                        />
                    ) : (
                        <FormSection title="Kirim link reset" subtitle="Kami hanya perlu satu detail: email akun yang ingin dipulihkan.">
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
                                leftIcon="email-outline"
                                error={error}
                                placeholder="nama@email.com"
                                required
                            />

                            <Button
                                label="Kirim Link Reset"
                                onPress={handleReset}
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
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
