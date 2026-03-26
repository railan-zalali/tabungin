import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../store/useThemeStore';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { validateName } from '../../utils/validation';

export function ProfileScreen() {
    const navigation = useNavigation();
    const { user, updateProfile } = useAuthStore();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [name, setName] = useState(user?.name ?? '');
    const [nameError, setNameError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const userInitial = name?.charAt(0)?.toUpperCase() ?? '?';

    const handleSave = async () => {
        const err = validateName(name);
        if (err) {
            setNameError(err);
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
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={styles.bgAuraTop} pointerEvents="none" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Kembali ke pengaturan"
                >
                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} allowFontScaling accessibilityRole="header">Edit Profil</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
                        <Text style={styles.avatarText} allowFontScaling={false}>{userInitial}</Text>
                    </View>
                    <Text style={styles.heroTitle}>{user?.name ?? 'Pengguna'}</Text>
                    <Text style={styles.heroSubtitle}>{user?.email || 'Akun utama yang digunakan untuk sinkronisasi data.'}</Text>
                </View>

                <View style={styles.formCard}>
                    <Input
                        label="Nama Lengkap"
                        value={name}
                        onChangeText={(v) => { setName(v); setNameError(null); }}
                        error={nameError}
                        leftIcon="account"
                        placeholder="Masukkan nama lengkap"
                        required
                    />

                    {user?.email && (
                        <Input
                            label="Email"
                            value={user.email}
                            editable={false}
                            leftIcon="email"
                            hint="Email tidak dapat diubah"
                        />
                    )}
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>Nama profil dipakai untuk konteks shared wallet dan identitas utama aplikasi.</Text>
                    </View>
                </View>

                <Button
                    label="Simpan Perubahan"
                    onPress={handleSave}
                    variant="primary"
                    size="lg"
                    loading={isSaving}
                    fullWidth
                    style={{ marginTop: 8 }}
                    accessibilityHint="Ketuk dua kali untuk menyimpan perubahan profil"
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -100,
        right: -30,
        width: 220,
        height: 220,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryLight,
        opacity: 0.4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    content: { padding: 20, gap: 16, paddingBottom: 32 },
    heroCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 22,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2,
    },
    avatar: {
        width: 92,
        height: 92,
        borderRadius: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontFamily: FontFamily.heading, fontSize: 40, color: colors.textInverse },
    heroTitle: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: colors.textPrimary, textAlign: 'center' },
    heroSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    formCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['3xl'],
        padding: 18,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 1,
    },
    infoCard: {
        backgroundColor: colors.primaryBg,
        borderRadius: BorderRadius['3xl'],
        padding: 16,
        borderWidth: 1,
        borderColor: `${colors.primary}22`,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textSecondary,
        lineHeight: 22,
    },
});
