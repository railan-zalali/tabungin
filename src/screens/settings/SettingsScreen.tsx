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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore, useTheme } from '../../store/useThemeStore';
import { deleteUserAccount } from '../../database/authQueries';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { exportBackupJSON } from '../../utils/exportUtils';

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
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { user, hapticEnabled, setHapticEnabled, logout } = useAuthStore();
    const { mode, setMode, textSize, setTextSize } = useThemeStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

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
            await exportBackupJSON({
                version: 1,
                exportedAt: Date.now(),
                transactions,
                goals
            });
            Alert.alert('Sukses', 'Data berhasil diekspor.');
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

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
            
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pengaturan</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profil */}
                <TouchableOpacity
                    style={[styles.profileCard, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
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

                {/* Tampilan */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tampilan</Text>
                    <View style={[styles.card, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                                    thumbColor={mode === 'dark' ? colors.primary : '#FFF'}
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
                    <View style={[styles.card, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                                    thumbColor={hapticEnabled ? colors.primary : '#FFF'}
                                />
                            }
                        />
                    </View>
                </View>

                {/* Keuangan */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Keuangan</Text>
                    <View style={[styles.card, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                            onPress={() => navigation.navigate('Budget')}
                        />
                    </View>
                </View>

                {/* Data */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
                    <View style={[styles.card, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <SettingRow
                            icon="database-export"
                            iconColor={colors.info}
                            title="Backup Data"
                            subtitle={isExporting ? "Mengekspor..." : "Ekspor data ke file JSON"}
                            onPress={handleBackup}
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
                    <View style={[styles.card, Shadow.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: { 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    avatarText: { fontFamily: FontFamily.heading, fontSize: 24, color: colors.textInverse },
    profileInfo: { flex: 1 },
    profileName: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    profileEmail: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    
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
        backgroundColor: colors.surface, 
        borderRadius: 16, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
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
        borderRadius: 12, 
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
        paddingVertical: 8, 
        alignItems: 'center', 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: colors.border, 
        backgroundColor: colors.surface 
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
        borderRadius: 16,
        minHeight: 56,
        borderWidth: 1,
        borderColor: colors.dangerBg,
    },
    logoutText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.danger },
});
