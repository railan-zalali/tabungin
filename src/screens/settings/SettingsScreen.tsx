import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SettingsNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { deleteUserAccount } from '../../database/authQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useTheme, useThemeStore } from '../../store/useThemeStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';

interface SettingRowProps {
    icon: string;
    tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    title: string;
    subtitle: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

function SettingRow({ icon, tone, title, subtitle, onPress, rightElement }: SettingRowProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const toneMap = {
        primary: { bg: colors.primaryBg, fg: colors.primary },
        success: { bg: colors.successBg, fg: colors.success },
        warning: { bg: colors.warningBg, fg: colors.warning },
        danger: { bg: colors.dangerBg, fg: colors.danger },
        info: { bg: colors.infoBg, fg: colors.info },
    };
    const palette = toneMap[tone];

    return (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress && !rightElement}>
            <View style={[styles.settingIcon, { backgroundColor: palette.bg }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={palette.fg} />
            </View>
            <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
            </View>
            {rightElement ?? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />}
        </TouchableOpacity>
    );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCard}>{children}</View>
        </View>
    );
}

export function SettingsScreen() {
    const navigation = useNavigation<SettingsNavigationProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { user, hapticEnabled, setHapticEnabled, logout } = useAuthStore();
    const { unreadCount } = useNotificationStore();
    const { mode, setMode, textSize, setTextSize } = useThemeStore();

    const handleLogout = () => {
        Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: logout },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Hapus akun',
            'Semua data transaksi, dompet, target, dan preferensi akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus permanen',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            logout();
                        } catch (error) {
                            Alert.alert('Gagal', 'Akun belum berhasil dihapus.');
                        }
                    },
                },
            ],
        );
    };

    const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader title="Pengaturan" subtitle="Akun, tampilan, data, dan ruang kolaborasi ada di satu tempat." variant="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <HeroSummaryCard
                    eyebrow="Akun Utama"
                    title={user?.name ?? 'Pengguna Tabungin'}
                    value={user?.email || '-'}
                    description="Profil ini dipakai untuk sinkronisasi, shared wallet, dan konteks identitas utama aplikasi."
                    icon="account-circle-outline"
                    badges={
                        <>
                            <ContextBadge icon="bell-outline" label={unreadCount > 0 ? `${unreadCount} notifikasi` : 'Inbox bersih'} inverse />
                            <ContextBadge icon="theme-light-dark" label={mode === 'dark' ? 'Mode gelap aktif' : 'Mode terang aktif'} inverse />
                        </>
                    }
                />

                <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
                        <Text style={styles.avatarText}>{userInitial}</Text>
                    </View>
                    <View style={styles.profileCopy}>
                        <Text style={styles.profileTitle}>Edit profil utama</Text>
                        <Text style={styles.profileSubtitle}>Perbarui nama tampilan dan pastikan identitas akun tetap jelas.</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
                </TouchableOpacity>

                <SettingSection title="Prioritas harian">
                    <SettingRow
                        icon="bell-outline"
                        tone="warning"
                        title="Notifikasi"
                        subtitle={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
                        onPress={() => navigation.navigate('Notifications')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="wallet-outline"
                        tone="primary"
                        title="Daftar dompet"
                        subtitle="Kelola dompet pribadi, shared wallet, dan saldo aktif."
                        onPress={() => navigation.navigate('WalletList')}
                    />
                </SettingSection>

                <SettingSection title="Tampilan dan aksesibilitas">
                    <SettingRow
                        icon="theme-light-dark"
                        tone="info"
                        title="Mode gelap"
                        subtitle={mode === 'dark' ? 'Aktif sekarang' : 'Masih memakai mode terang'}
                        rightElement={
                            <Switch
                                value={mode === 'dark'}
                                onValueChange={(value) => setMode(value ? 'dark' : 'light')}
                                trackColor={{ false: colors.surfaceMuted, true: colors.primaryLight }}
                                thumbColor={mode === 'dark' ? colors.primary : colors.surfaceElevated}
                            />
                        }
                    />
                    <View style={styles.divider} />
                    <View style={styles.textSizeBlock}>
                        <SettingRow
                            icon="format-size"
                            tone="info"
                            title="Ukuran teks"
                            subtitle="Pilih skala baca yang paling nyaman untuk penggunaan harian."
                            rightElement={<View />}
                        />
                        <View style={styles.textSizeRow}>
                            {[
                                { id: 'normal', label: 'Normal' },
                                { id: 'large', label: 'Besar' },
                                { id: 'xlarge', label: 'X-Large' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.textSizeButton, textSize === option.id ? styles.textSizeButtonActive : null]}
                                    onPress={() => setTextSize(option.id as typeof textSize)}
                                >
                                    <Text style={[styles.textSizeButtonText, textSize === option.id ? styles.textSizeButtonTextActive : null]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <SettingRow
                        icon="vibrate"
                        tone="warning"
                        title="Haptic feedback"
                        subtitle="Getaran halus saat interaksi penting."
                        rightElement={
                            <Switch
                                value={hapticEnabled}
                                onValueChange={setHapticEnabled}
                                trackColor={{ false: colors.surfaceMuted, true: colors.primaryLight }}
                                thumbColor={hapticEnabled ? colors.primary : colors.surfaceElevated}
                            />
                        }
                    />
                </SettingSection>

                <SettingSection title="Data dan otomasi">
                    <SettingRow
                        icon="chart-pie"
                        tone="success"
                        title="Budget bulanan"
                        subtitle="Atur batas kategori supaya arus kas bulanan lebih terjaga."
                        onPress={() => navigation.navigate('Budget')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="autorenew"
                        tone="info"
                        title="Transaksi berulang"
                        subtitle="Jadwalkan pemasukan atau pengeluaran rutin."
                        onPress={() => navigation.navigate('Transactions', { screen: 'RecurringTransaction' })}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="tag-multiple-outline"
                        tone="warning"
                        title="Kelola kategori"
                        subtitle="Rapikan kategori bawaan dan kategori kustom agar pencatatan tetap presisi."
                        onPress={() => navigation.navigate('CategoryManagement')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="database-export-outline"
                        tone="primary"
                        title="Ekspor data"
                        subtitle="Pilih cakupan dan format export untuk backup atau analisis."
                        onPress={() => navigation.navigate('ExportData')}
                    />
                </SettingSection>

                <SettingSection title="Keamanan akun">
                    <SettingRow
                        icon="logout"
                        tone="danger"
                        title="Keluar dari aplikasi"
                        subtitle="Akhiri sesi saat ini tanpa menghapus data."
                        onPress={handleLogout}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="delete-alert-outline"
                        tone="danger"
                        title="Hapus akun"
                        subtitle="Hapus permanen seluruh data dan identitas akun."
                        onPress={handleDeleteAccount}
                    />
                </SettingSection>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            paddingBottom: 108,
            gap: 18,
        },
        profileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textInverse,
        },
        profileCopy: {
            flex: 1,
        },
        profileTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        profileSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 4,
            lineHeight: 18,
        },
        section: {
            gap: 10,
        },
        sectionTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            paddingLeft: 4,
        },
        sectionCard: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
        },
        settingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 16,
            paddingVertical: 16,
        },
        settingIcon: {
            width: 42,
            height: 42,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        settingCopy: {
            flex: 1,
        },
        settingTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        settingSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            lineHeight: 18,
            marginTop: 3,
        },
        divider: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 72,
            marginRight: 16,
        },
        textSizeBlock: {
            paddingVertical: 4,
        },
        textSizeRow: {
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            paddingLeft: 72,
        },
        textSizeButton: {
            flex: 1,
            minHeight: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.interactiveIdle,
        },
        textSizeButtonActive: {
            backgroundColor: colors.primaryBg,
            borderColor: colors.focusRing,
        },
        textSizeButtonText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        textSizeButtonTextActive: {
            fontFamily: FontFamily.bodyBold,
            color: colors.primary,
        },
    });
