import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { validateName } from '../../utils/validation';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { Input } from '../../components/common/Input';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';

export function ProfileScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { contentBottomSpacing } = useScreenLayout();
    const { user, updateProfile } = useAuthStore();
    const [name, setName] = useState(user?.name ?? '');
    const [nameError, setNameError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const userInitial = name?.charAt(0)?.toUpperCase() ?? '?';

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
                title="Profil utama"
                subtitle="Rapikan identitas akun agar konteks personal dan kolaboratif tetap terbaca jelas."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
            >
                <HeroSummaryCard
                    eyebrow="Identitas akun"
                    title={user?.name ?? 'Pengguna Tabungin'}
                    value={user?.email ?? '-'}
                    description="Profil ini menjadi identitas utama untuk sinkronisasi, dompet bersama, dan histori aktivitas akun."
                    icon="account-circle-outline"
                    badges={
                        <>
                            <ContextBadge icon="shield-check-outline" label="Akun utama" inverse />
                            <ContextBadge icon="account-group-outline" label="Dipakai lintas konteks" inverse />
                        </>
                    }
                />

                <ContentPanel>
                    <View style={styles.identityRow}>
                        <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
                            <Text style={styles.avatarText}>{userInitial}</Text>
                        </View>
                        <View style={styles.identityCopy}>
                            <Text style={styles.identityTitle}>Nama tampilan aktif</Text>
                            <Text style={styles.identitySubtitle}>
                                Gunakan nama yang mudah dikenali saat muncul di shared wallet dan alur kolaborasi lain.
                            </Text>
                        </View>
                    </View>
                </ContentPanel>

                <ContentPanel>
                    <SectionHeader
                        title="Informasi profil"
                        subtitle="Edit bagian yang memang perlu berubah, tanpa menyentuh identitas akun yang sensitif."
                    />

                    <Input
                        label="Nama Lengkap"
                        value={name}
                        onChangeText={(value) => {
                            setName(value);
                            setNameError(null);
                        }}
                        error={nameError}
                        leftIcon="account-outline"
                        placeholder="Masukkan nama lengkap"
                        required
                    />

                    {user?.email ? (
                        <Input
                            label="Email"
                            value={user.email}
                            editable={false}
                            leftIcon="email-outline"
                            hint="Email dipakai sebagai identitas login dan tidak diubah dari layar ini."
                        />
                    ) : null}
                </ContentPanel>

                <ContentPanel compact>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.primary} />
                        </View>
                        <View style={styles.infoCopy}>
                            <Text style={styles.infoTitle}>Kenapa ini penting?</Text>
                            <Text style={styles.infoText}>
                                Nama profil yang konsisten membantu orang lain mengenali pemilik transaksi, dompet bersama, dan aktivitas berbagi target.
                            </Text>
                        </View>
                    </View>
                </ContentPanel>

                <Button
                    label="Simpan perubahan"
                    onPress={handleSave}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isSaving}
                />
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        identityRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
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
            fontSize: 32,
            color: colors.textInverse,
        },
        identityCopy: {
            flex: 1,
        },
        identityTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        identitySubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 3,
        },
        infoRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        infoIcon: {
            width: 36,
            height: 36,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        infoCopy: {
            flex: 1,
        },
        infoTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        infoText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 3,
        },
    });
