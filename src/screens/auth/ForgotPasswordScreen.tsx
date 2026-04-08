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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { validateEmail } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

export function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { sendResetPassword } = useAuthStore();
    const { colors, gradients } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleReset = async () => {
        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            triggerHapticNotification();
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendResetPassword(email.trim());
            if (result.success) {
                setIsSuccess(true);
                setError(undefined);
                triggerHapticNotification();
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
                    <View style={styles.backLinkWrap}>
                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => navigation.goBack()}
                            accessibilityRole="button"
                            accessibilityLabel="Kembali ke login"
                        >
                            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
                            <Text style={styles.backLinkText}>Kembali ke login</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.hero}>
                        <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.heroIcon}>
                            <MaterialCommunityIcons name="lock-reset" size={32} color={colors.textInverse} />
                        </LinearGradient>
                        <Text style={styles.eyebrow}>Recovery Flow</Text>
                        <Text style={styles.title}>Kami bantu kirim link reset tanpa membuat flow terasa membingungkan.</Text>
                        <Text style={styles.subtitle}>Masukkan email akun utama. Setelah itu, cek inbox atau folder spam untuk link pemulihan.</Text>
                        <InlineNotice
                            icon="email-fast-outline"
                            description="Link reset berlaku terbatas. Buka segera setelah email masuk agar proses pemulihan tetap mulus."
                            tone="info"
                        />
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
                        <FormSection
                            eyebrow="Reset Access"
                            title="Kirim link reset"
                            subtitle="Kami hanya perlu satu detail: email akun yang ingin dipulihkan."
                            variant="highlight"
                        >
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

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isCompact: boolean) =>
    StyleSheet.create({
        flex: { flex: 1 },
        content: {
            gap: 18,
        },
        backLinkWrap: {
            alignItems: 'flex-start',
        },
        backLink: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 42,
        },
        backLinkText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
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
    });
