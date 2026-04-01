import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { SettingsNavigationProp } from '../../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore, useTheme } from '../../store/useThemeStore';
import { deleteUserAccount } from '../../database/authQueries';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { exportBackupJSON } from '../../utils/exportUtils';
import { exportToJSON, exportToCSV, exportToTXT } from '../../utils/exportData';

interface SettingRowProps {
    icon: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

function SettingRow({ icon, iconColor, title, subtitle, onPress, rightElement }: SettingRowProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={!onPress && !rightElement}
        >
            <View style={[styles.rowIcon, { backgroundColor: `${iconColor}15` }]}>
                <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
            </View>
            <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
                {subtitle && <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {rightElement ?? (onPress && (
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
            ))}
        </TouchableOpacity>
    );
}

export function SettingsScreen() {
    const navigation = useNavigation<SettingsNavigationProp>();
    const insets = useSafeAreaInsets();
    const { user, hapticEnabled, setHapticEnabled, logout } = useAuthStore();
    const { mode, setMode, textSize, setTextSize } = useThemeStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { unreadCount } = useNotificationStore();

    const { transactions } = useTransactionStore();
    const { goals } = useSavingStore();
    const [isExporting, setIsExporting] = React.useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Keluar',
            'Yakin ingin keluar dari aplikasi?',
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Keluar', style: 'destructive', onPress: logout },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Hapus Akun',
            'PERINGATAN: Tindakan ini akan menghapus SEMUA data transaksi, tabungan, dan budget Anda secara permanen. Tindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin?',
            [
                { text: 'Batal', style: 'cancel' },
                { 
                    text: 'Hapus Permanen', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            logout(); 
                        } catch (e) {
                            Alert.alert('Error', 'Gagal menghapus akun.');
                        }
                    } 
                },
            ]
        );
    };

    const handleBackup = async () => {
        try {
            setIsExporting(true);
            const exportData = {
                version: 1,
                exportedAt: Date.now(),
                transactions,
                goals
            };
            await exportToJSON(exportData);
        } catch (error) {
            Alert.alert('Error', 'Terjadi kesalahan saat membackup data.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleRestore = () => {
        Alert.alert('Restore Data', 'Fitur restore dari file JSON akan segera hadir di update mendatang!');
    };

    const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

    const textSizeOptions: Array<{ id: 'normal' | 'large' | 'xlarge'; label: string }> = [
        { id: 'normal', label: 'Normal' },
        { id: 'large', label: 'Besar' },
        { id: 'xlarge', label: 'X-Large' },
    ];

    const navigateToBudget = () => navigation.navigate('Budget');

    const navigateToRecurringTransactions = () =>
        navigation.navigate('Transactions', { screen: 'RecurringTransaction' });

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
            
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pengaturan</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profil */}
                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.textInverse }]}>{userInitial}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name ?? 'Pengguna'}</Text>
                        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || '-'}</Text>
                    </View>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Notifikasi */}
                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => navigation.navigate('Notifications' as never)}
                >
                    <View style={[styles.avatar, { backgroundColor: colors.warning + '20' }]}>
                        <MaterialCommunityIcons name="bell" size={24} color={colors.warning} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textPrimary }]}>Notifikasi</Text>
                        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
                        </Text>
                    </View>
                    {unreadCount > 0 && (
                        <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
                            <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Tampilan */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tampilan</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="theme-light-dark"
                            iconColor={colors.primary}
                            title="Mode Gelap"
                            subtitle={mode === 'dark' ? 'Aktif' : 'Nonaktif'}
                            onPress={() => setMode(mode === 'light' ? 'dark' : 'light')}
                            rightElement={
                                <Switch
                                    value={mode === 'dark'}
                                    onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                                    trackColor={{ false: colors.neutral300, true: colors.primaryLight }}
                                    thumbColor={mode === 'dark' ? colors.primary : colors.surfaceElevated}
                                />
                            }
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <View style={styles.textSizeRow}>
                            <View style={[styles.rowIcon, { backgroundColor: `${colors.info}15` }]}>
                                <MaterialCommunityIcons name="format-size" size={22} color={colors.info} />
                            </View>
                            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Ukuran Teks</Text>
                        </View>
                        <View style={styles.textSizeOptions}>
                            {textSizeOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.textSizeBtn, 
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        textSize === opt.id && { backgroundColor: colors.primaryBg, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setTextSize(opt.id)}
                                >
                                    <Text style={[
                                        styles.textSizeBtnText, 
                                        { color: colors.textSecondary },
                                        textSize === opt.id && { color: colors.primary, fontFamily: FontFamily.bodyBold }
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Aksesibilitas */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Aksesibilitas</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="vibrate"
                            iconColor={colors.warning}
                            title="Haptic Feedback"
                            subtitle="Getaran saat interaksi"
                            rightElement={
                                <Switch
                                    value={hapticEnabled}
                                    onValueChange={setHapticEnabled}
                                    trackColor={{ false: colors.neutral300, true: colors.primaryLight }}
                                    thumbColor={hapticEnabled ? colors.primary : colors.surfaceElevated}
                                />
                            }
                        />
                    </View>
                </View>

                {/* Keuangan */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Keuangan</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="wallet-outline"
                            iconColor={colors.primary}
                            title="Daftar Dompet"
                            subtitle="Kelola akun dan saldo"
                            onPress={() => navigation.navigate('WalletList')}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <SettingRow
                            icon="chart-pie"
                            iconColor={colors.success}
                            title="Budget Bulanan"
                            subtitle="Atur batas pengeluaran kategori"
                            onPress={navigateToBudget}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <SettingRow
                            icon="autorenew"
                            iconColor={colors.info}
                            title="Transaksi Berulang"
                            subtitle="Atur transaksi rutin otomatis"
                            onPress={navigateToRecurringTransactions}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <SettingRow
                            icon="tag-multiple"
                            iconColor={colors.warning}
                            title="Kelola Kategori"
                            subtitle="Kustomisasi kategori transaksi"
                            onPress={() => navigation.navigate('CategoryManagement')}
                        />
                    </View>
                </View>

                {/* Data */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="export"
                            iconColor={colors.primary}
                            title="Ekspor Data"
                            subtitle="Pilih format (JSON, CSV, TXT)"
                            onPress={() => navigation.navigate('ExportData')}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <SettingRow
                            icon="database-import"
                            iconColor={colors.warning}
                            title="Restore Data"
                            subtitle="Impor data dari file backup"
                            onPress={handleRestore}
                        />
                    </View>
                </View>

                {/* Tentang */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tentang</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="information"
                            iconColor={colors.textSecondary}
                            title="Tentang Tabungin"
                            subtitle="Versi 1.0.0"
                            onPress={() => Alert.alert('Tabungin', 'Tabungin v1.0.0\nCapture, Manage, Achieve.\n\nDibuat dengan ❤️ untuk Indonesia')}
                        />
                    </View>
                </View>

                {/* Keluar */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg }]}
                        onPress={handleLogout}
                    >
                        <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
                        <Text style={[styles.logoutText, { color: colors.danger }]}>Keluar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: 'transparent', marginTop: 8, borderWidth: 0 }]}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={[styles.logoutText, { color: colors.textTertiary, fontSize: 12 }]}>Hapus Akun & Data</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -110,
        right: -30,
        width: 240,
        height: 240,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryLight,
        opacity: 0.5,
    },
    
    header: { 
        paddingHorizontal: 20, 
        paddingVertical: 12,
        backgroundColor: colors.background,
    },
    headerTitle: { ...Typography.h2, color: colors.textPrimary },
    
    content: { padding: 20, gap: 24, paddingBottom: 100 },
    
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2,
    },
    avatar: { 
        width: 60, 
        height: 60, 
        borderRadius: BorderRadius.full, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    avatarText: { fontFamily: FontFamily.heading, fontSize: 24, color: colors.textInverse },
    profileInfo: { flex: 1 },
    profileName: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    profileEmail: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.danger,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationBadgeText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: 10,
        color: '#FFFFFF',
    },
    
    section: { gap: 12 },
    sectionTitle: { 
        fontFamily: FontFamily.bodyBold, 
        fontSize: FontSize.caption, 
        color: colors.textSecondary, 
        textTransform: 'uppercase', 
        letterSpacing: 0.5, 
        paddingLeft: 4 
    },
    
    card: { 
        backgroundColor: colors.surfaceElevated, 
        borderRadius: BorderRadius['3xl'], 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 1,
    },
    row: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 16, 
        paddingHorizontal: 16, 
        paddingVertical: 16, 
        minHeight: 64 
    },
    rowIcon: { 
        width: 44, 
        height: 44, 
        borderRadius: BorderRadius.lg, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    rowInfo: { flex: 1 },
    rowTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.textPrimary },
    rowSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginTop: 2 },
    
    divider: { height: 1, backgroundColor: colors.divider, marginLeft: 76 },
    
    textSizeRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 16, 
        paddingHorizontal: 16, 
        paddingTop: 16 
    },
    textSizeOptions: { 
        flexDirection: 'row', 
        gap: 8, 
        paddingHorizontal: 16, 
        paddingBottom: 16, 
        paddingTop: 12,
        paddingLeft: 76 
    },
    textSizeBtn: { 
        flex: 1, 
        paddingVertical: 10, 
        alignItems: 'center', 
        borderRadius: BorderRadius.lg, 
        borderWidth: 1, 
        borderColor: colors.border, 
        backgroundColor: colors.surfaceElevated 
    },
    textSizeBtnActive: { 
        backgroundColor: colors.primaryBg, 
        borderColor: colors.primary 
    },
    textSizeBtnText: { 
        fontFamily: FontFamily.body, 
        fontSize: 12, 
        color: colors.textSecondary 
    },
    textSizeBtnTextActive: { 
        color: colors.primary, 
        fontFamily: FontFamily.bodyBold 
    },
    
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        backgroundColor: colors.dangerBg,
        borderRadius: BorderRadius['3xl'],
        minHeight: 56,
        borderWidth: 1,
        borderColor: colors.dangerBg,
    },
    logoutText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.danger },
});
