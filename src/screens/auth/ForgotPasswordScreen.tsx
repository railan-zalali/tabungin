import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthScreenLayout } from '../../components/common/AuthScreenLayout';
import { FormSection } from '../../components/common/FormSection';
import { StatePanel } from '../../components/common/StatePanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { validateEmail } from '../../utils/validation';
import type { RootStackParamList } from '../../types/navigation';

export function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { sendResetPassword } = useAuthStore();
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
        <AuthScreenLayout
            eyebrow="Pulihkan akses dengan cepat"
            title="Kami bantu kirim link reset tanpa membuat flow terasa ribet."
            subtitle="Masukkan email akun utama. Setelah itu, cek inbox atau folder spam untuk link pemulihan."
            icon="lock-reset"
            topAction={{
                label: 'Kembali ke login',
                onPress: () => navigation.navigate('Login'),
                icon: 'arrow-left',
            }}
        >
            {isSuccess ? (
                <StatePanel
                    icon="email-check-outline"
                    title="Link reset sudah dikirim"
                    description={`Petunjuk reset sudah dikirim ke ${email}. Link berlaku terbatas, jadi sebaiknya langsung dibuka.`}
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
        </AuthScreenLayout>
    );
}
