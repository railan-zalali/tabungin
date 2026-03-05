// Settings Screen — pengaturan notifikasi, tema, aksesibilitas
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
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
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

function SettingRow({ icon, iconColor, title, subtitle, onPress, rightElement, accessibilityLabel, accessibilityHint }: SettingRowProps) {
    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={!onPress && !rightElement}
            accessible={true}
            accessibilityRole={onPress ? 'button' : 'none'}
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityHint={accessibilityHint}
        >
            <View style={[styles.rowIcon, { backgroundColor: `${iconColor}20` }]} accessibilityElementsHidden={true}>
                <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} allowFontScaling={true}>{title}</Text>
                {subtitle && <Text style={styles.rowSubtitle} allowFontScaling={true}>{subtitle}</Text>}
            </View>
            {rightElement ?? (onPress && (
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDisabled} accessibilityElementsHidden={true} />
            ))}
        </TouchableOpacity>
    );
}

export function SettingsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { user, isDarkMode, textSize, hapticEnabled, setDarkMode, setTextSize, setHapticEnabled, logout } = useAuthStore();
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
        { id: 'xlarge', label: 'Sangat Besar' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.title} allowFontScaling={true} accessibilityRole="header">Pengaturan</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profil */}
                <TouchableOpacity
                    style={[styles.profileCard, Shadow.sm]}
                    onPress={() => navigation.navigate('Profile')}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Profil: ${user?.name ?? 'Pengguna'}. Ketuk untuk mengedit`}
                >
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? Colors.primary }]}>
                        <Text style={styles.avatarText} allowFontScaling={false}>{userInitial}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName} allowFontScaling={true}>{user?.name ?? 'Pengguna'}</Text>
                        <Text style={styles.profileEmail} allowFontScaling={true}>{user?.email || 'Mode Offline'}</Text>
                    </View>
                    <MaterialCommunityIcons name="pencil" size={18} color={Colors.textSecondary} accessibilityElementsHidden={true} />
                </TouchableOpacity>

                {/* Tampilan */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle} allowFontScaling={true}>Tampilan</Text>
                    <View style={[styles.card, Shadow.sm]}>
                        <SettingRow
                            icon="theme-light-dark"
                            iconColor={Colors.primary}
                            title="Mode Gelap"
                            subtitle={isDarkMode ? 'Aktif' : 'Nonaktif'}
                            accessibilityLabel={`Mode gelap, saat ini ${isDarkMode ? 'aktif' : 'nonaktif'}`}
                            rightElement={
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={setDarkMode}
                                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                    thumbColor={isDarkMode ? Colors.primary : Colors.textDisabled}
                                    accessible={true}
                                    accessibilityLabel="Aktifkan mode gelap"
                                    accessibilityRole="switch"
                                    accessibilityState={{ checked: isDarkMode }}
                                />
                            }
                        />
                        <View style={styles.divider} />
                        <View style={styles.textSizeRow}>
                            <View style={[styles.rowIcon, { backgroundColor: `${Colors.info}20` }]}>
                                <MaterialCommunityIcons name="format-size" size={20} color={Colors.info} />
                            </View>
                            <Text style={styles.rowTitle} allowFontScaling={true}>Ukuran Teks</Text>
                        </View>
                        <View style={styles.textSizeOptions} accessibilityRole="radiogroup" accessibilityLabel="Pilih ukuran teks">
                            {textSizeOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.textSizeBtn, textSize === opt.id && styles.textSizeBtnActive]}
                                    onPress={() => setTextSize(opt.id)}
                                    accessible={true}
                                    accessibilityRole="radio"
                                    accessibilityLabel={opt.label}
                                    accessibilityState={{ selected: textSize === opt.id }}
                                >
                                    <Text style={[styles.textSizeBtnText, textSize === opt.id && styles.textSizeBtnTextActive]} allowFontScaling={false}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Aksesibilitas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle} allowFontScaling={true}>Aksesibilitas</Text>
                    <View style={[styles.card, Shadow.sm]}>
                        <SettingRow
                            icon="vibrate"
                            iconColor={Colors.secondary}
                            title="Haptic Feedback"
                            subtitle="Getaran saat tombol ditekan"
                            accessibilityLabel={`Haptic feedback, saat ini ${hapticEnabled ? 'aktif' : 'nonaktif'}`}
                            rightElement={
                                <Switch
                                    value={hapticEnabled}
                                    onValueChange={setHapticEnabled}
                                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                    thumbColor={hapticEnabled ? Colors.primary : Colors.textDisabled}
                                    accessible={true}
                                    accessibilityLabel="Aktifkan haptic feedback"
                                    accessibilityRole="switch"
                                    accessibilityState={{ checked: hapticEnabled }}
                                />
                            }
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle} allowFontScaling={true}>Keuangan</Text>
                    <View style={[styles.card, Shadow.sm]}>
                        <SettingRow
                            icon="wallet"
                            iconColor={Colors.success}
                            title="Budget Bulanan"
                            subtitle="Atur batas pengeluaran kategori"
                            onPress={() => navigation.navigate('Budget')}
                            accessibilityHint="Navigasi ke halaman pengaturan budget"
                        />
                    </View>
                </View>

                {/* Data */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle} allowFontScaling={true}>Data</Text>
                    <View style={[styles.card, Shadow.sm]}>
                        <SettingRow
                            icon="database-export"
                            iconColor={Colors.info}
                            title="Backup Data"
                            subtitle={isExporting ? "Mengekspor..." : "Ekspor data ke file JSON"}
                            onPress={handleBackup}
                            accessibilityHint="Ketuk dua kali untuk membackup data keuangan"
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="database-import"
                            iconColor={Colors.warning}
                            title="Restore Data"
                            subtitle="Impor data dari file backup"
                            onPress={handleRestore}
                            accessibilityHint="Ketuk dua kali untuk restore data dari backup"
                        />
                    </View>
                </View>

                {/* Tentang */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle} allowFontScaling={true}>Tentang</Text>
                    <View style={[styles.card, Shadow.sm]}>
                        <SettingRow
                            icon="information"
                            iconColor={Colors.info}
                            title="Tentang Tabungin"
                            subtitle="Versi 1.0.0"
                            onPress={() => Alert.alert('Tabungin', 'Tabungin v1.0.0\nCapture, Manage, Achieve.\n\nDibuat dengan ❤️ untuk Indonesia')}
                        />
                    </View>
                </View>

                {/* Keluar */}
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Keluar dari aplikasi"
                    accessibilityHint="Ketuk dua kali untuk keluar dari akun Anda"
                >
                    <MaterialCommunityIcons name="logout" size={20} color={Colors.danger} accessibilityElementsHidden={true} />
                    <Text style={styles.logoutText} allowFontScaling={true}>Keluar</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: 20, paddingVertical: 16 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
    content: { padding: 16, gap: 20, paddingBottom: 100 },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
    },
    avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: FontFamily.heading, fontSize: 24, color: Colors.textInverse },
    profileInfo: { flex: 1 },
    profileName: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    profileEmail: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    section: { gap: 8 },
    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.caption, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 60 },
    rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1 },
    rowTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textPrimary },
    rowSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 70 },
    textSizeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 14 },
    textSizeOptions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8 },
    textSizeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, minHeight: 40, justifyContent: 'center' },
    textSizeBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    textSizeBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.textSecondary },
    textSizeBtnTextActive: { color: Colors.primaryDark, fontFamily: FontFamily.bodyBold },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        backgroundColor: Colors.dangerLight,
        borderRadius: 14,
        minHeight: 56,
    },
    logoutText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.danger },
});
