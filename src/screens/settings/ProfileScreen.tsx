import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { validateName } from '../../utils/validation';
import { useResponsiveMetrics } from '../../utils/responsive';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';

export function ProfileScreen() {
    const navigation = useNavigation();
    const { user, updateProfile, sessionStatus } = useAuthStore();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [name, setName] = useState(user?.name ?? '');
    const [nameError, setNameError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const userInitial = name?.trim().charAt(0)?.toUpperCase() || '?';

    const handleSave = async () => {
        const error = validateName(name);
        if (error) {
            setNameError(error);
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({ name: name.trim() });
            navigation.goBack();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Edit Profil"
                subtitle="Perbarui identitas utama akun tanpa mengubah konteks sinkronisasi."
                showBack
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: 152,
                    },
                ]}
            >
                <View style={styles.heroCard}>
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
                        <Text style={styles.avatarText}>{userInitial}</Text>
                    </View>
                    <View style={styles.heroCopy}>
                        <Text style={styles.heroTitle}>{user?.name ?? 'Pengguna'}</Text>
                        <Text style={styles.heroSubtitle}>
                            {user?.email || (sessionStatus === 'guest'
                                ? 'Mode guest lokal aktif. Nama ini hanya dipakai di perangkat ini sampai kamu masuk dengan akun.'
                                : 'Akun utama yang dipakai untuk sinkronisasi dan konteks shared wallet.')}
                        </Text>
                    </View>
                </View>

                <FormSection
                    title="Informasi profil"
                    subtitle="Nama tampilan ini akan muncul di ruang personal, shared wallet, dan aktivitas kolaborasi."
                >
                    <Input
                        label="Nama Lengkap"
                        value={name}
                        onChangeText={(value) => {
                            setName(value);
                            setNameError(null);
                        }}
                        error={nameError}
                        leftIcon="account"
                        placeholder="Masukkan nama lengkap"
                        required
                    />

                    {user?.email ? (
                        <Input
                            label="Email"
                            value={user.email}
                            editable={false}
                            leftIcon="email-outline"
                            hint="Email login utama tidak dapat diubah dari layar ini."
                        />
                    ) : null}
                </FormSection>

                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.primary} />
                    <Text style={styles.infoText}>
                        {sessionStatus === 'guest'
                            ? 'Nama ini dipakai sebagai identitas lokal selama mode guest aktif. Sinkronisasi dan shared wallet baru aktif setelah masuk dengan akun.'
                            : 'Nama profil dipakai untuk membedakan ownership, aktivitas berbagi, dan identitas utama aplikasi.'}
                    </Text>
                </View>
            </ScrollView>

            <PrimaryActionBar primaryLabel="Simpan Perubahan" onPrimaryPress={handleSave} primaryLoading={isSaving} />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 18,
            paddingTop: 20,
        },
        heroCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 20,
        },
        avatar: {
            width: 72,
            height: 72,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontFamily: FontFamily.heading,
            fontSize: 30,
            color: colors.textInverse,
        },
        heroCopy: {
            flex: 1,
        },
        heroTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        heroSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textSecondary,
            marginTop: 4,
        },
        infoCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            backgroundColor: colors.primaryBg,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
        },
        infoText: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.textSecondary,
        },
    });
