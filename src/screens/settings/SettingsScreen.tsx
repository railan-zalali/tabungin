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
import { InlineNotice } from '../../components/common/InlineNotice';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SettingsGroup } from '../../components/common/SettingsGroup';
import { StatStrip } from '../../components/common/StatStrip';
import { useResponsiveMetrics } from '../../utils/responsive';
import { getSemanticColors } from '../../utils/semanticColors';
import { getReadableTextColor } from '../../utils/colorContrast';

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
    const palette = getSemanticColors(colors, tone);

    return (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            disabled={!onPress && !rightElement}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={subtitle}
        >
            <View style={[styles.settingIcon, { backgroundColor: palette.softBg, borderColor: palette.border }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={palette.icon} />
            </View>
            <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
            </View>
            {rightElement ?? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />}
        </TouchableOpacity>
    );
}

export function SettingsScreen() {
    const navigation = useNavigation<SettingsNavigationProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const { user, hapticEnabled, setHapticEnabled, logout, sessionStatus, canUseCloudCollaboration, setPostAuthRedirect } = useAuthStore();
    const { unreadCount } = useNotificationStore();
    const { mode, setMode, textSize, setTextSize } = useThemeStore();

    const handleLogout = () => {
        Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: logout },
        ]);
    };

    const handleDeleteAccount = () => {
        if (sessionStatus !== 'authenticated') {
            Alert.alert('Perlu akun', 'Hapus akun hanya tersedia untuk sesi yang terhubung ke akun.');
            return;
        }

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
    const avatarColor = user?.avatarColor ?? colors.primary;
    const avatarTextColor = getReadableTextColor(avatarColor, {
        light: colors.textInverse,
        dark: colors.textPrimary,
    });

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                eyebrow="Workspace Control"
                title="Pengaturan"
                subtitle="Akun, tampilan, data, dan ruang kolaborasi ada di satu tempat."
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                        gap: metrics.verticalGap,
                    },
                    metrics.widthClass !== 'compact' ? styles.contentWide : null,
                ]}
            >
                <HeroSummaryCard
                    eyebrow={sessionStatus === 'guest' ? 'Mode Guest Lokal' : 'Akun Utama'}
                    title={user?.name ?? 'Pengguna Tabungin'}
                    value={user?.email || 'Belum terhubung ke akun'}
                    description={
                        sessionStatus === 'guest'
                            ? 'Kamu sedang memakai mode lokal. Data tetap bisa dipakai di perangkat ini, tetapi sinkronisasi dan shared wallet belum aktif.'
                            : 'Profil ini dipakai untuk sinkronisasi, shared wallet, dan konteks identitas utama aplikasi.'
                    }
                    icon="account-circle-outline"
                    badges={
                        <>
                            <ContextBadge icon="bell-outline" label={unreadCount > 0 ? `${unreadCount} notifikasi` : 'Inbox bersih'} inverse />
                            <ContextBadge icon="theme-light-dark" label={mode === 'dark' ? 'Mode gelap aktif' : 'Mode terang aktif'} inverse />
                            {!canUseCloudCollaboration ? <ContextBadge icon="cloud-off-outline" label="Cloud nonaktif" inverse /> : null}
                        </>
                    }
                />

                {!canUseCloudCollaboration ? (
                    <InlineNotice
                        icon="cloud-off-outline"
                        title="Beberapa capability masih terkunci"
                        description="Shared wallet, sinkronisasi cloud, dan reset password membutuhkan akun. Fitur lokal seperti pencatatan, export, dan import tetap tersedia."
                        tone="warning"
                    />
                ) : null}

                {!canUseCloudCollaboration ? (
                    <View style={styles.accountUpgradeRow}>
                        <TouchableOpacity
                            style={[styles.accountUpgradeButton, styles.accountUpgradePrimary]}
                            onPress={() => {
                                setPostAuthRedirect({ screen: 'Settings', params: { screen: 'SettingsMain' } });
                                navigation.navigate('Login');
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Masuk dengan akun"
                        >
                            <Text style={styles.accountUpgradePrimaryText}>Masuk dengan akun</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.accountUpgradeButton, styles.accountUpgradeSecondary]}
                            onPress={() => {
                                setPostAuthRedirect({ screen: 'Settings', params: { screen: 'SettingsMain' } });
                                navigation.navigate('Register');
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Buat akun baru"
                        >
                            <Text style={styles.accountUpgradeSecondaryText}>Buat akun</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <StatStrip
                    items={[
                        { label: 'Pencatatan lokal', value: 'Aktif', valueColor: colors.success },
                        { label: 'Sinkronisasi', value: canUseCloudCollaboration ? 'Aktif' : 'Nonaktif', valueColor: canUseCloudCollaboration ? colors.success : colors.warning },
                        { label: 'Shared wallet', value: canUseCloudCollaboration ? 'Aktif' : 'Butuh akun', valueColor: canUseCloudCollaboration ? colors.info : colors.warning },
                    ]}
                    vertical={metrics.isWide}
                />

                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => navigation.navigate('Profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profil utama"
                >
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={[styles.avatarText, { color: avatarTextColor }]}>{userInitial}</Text>
                    </View>
                    <View style={styles.profileCopy}>
                        <Text style={styles.profileTitle}>Edit profil utama</Text>
                        <Text style={styles.profileSubtitle}>Perbarui nama tampilan dan pastikan identitas akun tetap jelas.</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
                </TouchableOpacity>

                <SettingsGroup title="Prioritas harian" description="Area yang paling sering disentuh saat mengelola ritme keuangan.">
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
                </SettingsGroup>

                <SettingsGroup title="Tampilan dan aksesibilitas" description="Kontrol supaya aplikasi terasa nyaman dibaca dan digunakan setiap hari.">
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
                                    style={[
                                        styles.textSizeButton,
                                        { minWidth: metrics.widthClass === 'compact' ? '30%' : 104 },
                                        textSize === option.id ? styles.textSizeButtonActive : null,
                                    ]}
                                    onPress={() => setTextSize(option.id as typeof textSize)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Atur ukuran teks ${option.label}`}
                                    accessibilityState={{ selected: textSize === option.id }}
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
                </SettingsGroup>

                <SettingsGroup title="Data dan otomasi" description="Semua pengaturan yang mengubah struktur, jadwal, atau cadangan data.">
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
                    <View style={styles.divider} />
                    <SettingRow
                        icon="database-import-outline"
                        tone="success"
                        title="Import data"
                        subtitle="Gabungkan backup JSON Tabungin atau CSV transaksi tanpa menimpa data lama."
                        onPress={() => navigation.navigate('ImportData')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="bell-cog-outline"
                        tone="warning"
                        title="Reminder Center"
                        subtitle="Kelola reminder target, budget, transaksi berulang, dan reminder manual."
                        onPress={() => navigation.navigate('ReminderCenter')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="update"
                        tone="info"
                        title="Pembaruan aplikasi"
                        subtitle="Cek versi terbaru, release notes, dan link unduh resmi."
                        onPress={() => navigation.navigate('AppUpdate')}
                    />
                </SettingsGroup>

                <SettingsGroup title="Keamanan akun" description="Aksi sensitif yang berdampak ke sesi dan identitas akun.">
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
                        title={sessionStatus === 'authenticated' ? 'Hapus akun' : 'Akun belum terhubung'}
                        subtitle={
                            sessionStatus === 'authenticated'
                                ? 'Hapus permanen seluruh data dan identitas akun.'
                                : 'Masuk dengan akun bila ingin mengelola atau menghapus akun cloud.'
                        }
                        onPress={handleDeleteAccount}
                    />
                </SettingsGroup>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 18,
        },
        contentWide: {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
        },
        accountUpgradeRow: {
            flexDirection: 'row',
            gap: 12,
        },
        accountUpgradeButton: {
            flex: 1,
            minHeight: 52,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
        },
        accountUpgradePrimary: {
            backgroundColor: colors.primary,
        },
        accountUpgradeSecondary: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.borderStrong,
        },
        accountUpgradePrimaryText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textInverse,
        },
        accountUpgradeSecondaryText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        profileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
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
            borderWidth: 1,
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
            flexWrap: 'wrap',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            paddingLeft: 72,
        },
        textSizeButton: {
            minHeight: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
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
