import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { syncDatabase } from '../../database/sync';
import { commitImportPreview, previewCsvImport, previewJsonImport, type ImportPreview } from '../../utils/importData';
import { useResponsiveMetrics } from '../../utils/responsive';

export function ImportDataScreen() {
    const navigation = useNavigation<SettingsChildNavigationProp<'ImportData'>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const userId = useAuthStore((state) => state.user?.id);
    const loadGoals = useSavingStore((state) => state.loadGoals);
    const { loadTransactions, loadRecent, refreshSummary } = useTransactionStore();
    const loadWallets = useWalletStore((state) => state.loadWallets);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain'],
                multiple: false,
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            const content = await FileSystem.readAsStringAsync(asset.uri);
            const lowerName = asset.name.toLowerCase();
            const lowerMime = (asset.mimeType || '').toLowerCase();
            const nextPreview =
                lowerName.endsWith('.json') || lowerMime.includes('json')
                    ? previewJsonImport(content)
                    : previewCsvImport(content);

            setSelectedFileName(asset.name);
            setPreview(nextPreview);
        } catch (error: any) {
            Alert.alert('Import gagal', error?.message || 'File belum berhasil dibaca.');
        }
    };

    const handleCommit = async () => {
        if (!userId || !preview) return;

        setIsBusy(true);
        try {
            const result = await commitImportPreview(preview, userId);
            setPreview(result);
            await Promise.all([loadGoals(), loadTransactions(), loadRecent(), refreshSummary(), loadWallets()]);
            await syncDatabase();
            Alert.alert(
                'Import selesai',
                result.fullBackup
                    ? `${result.importedProfiles} profil, ${result.importedWallets} dompet, ${result.importedTransactions} transaksi, ${result.importedGoals} target, dan ${result.importedSavingLogs} log tabungan berhasil dimasukkan.`
                    : `${result.importedTransactions} transaksi dan ${result.importedGoals} target berhasil dimasukkan.`,
            );
        } catch (error: any) {
            Alert.alert('Import gagal', error?.message || 'Data belum berhasil diimpor.');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Import data"
                subtitle="Masukkan backup JSON Tabungin untuk restore aman, atau CSV transaksi untuk impor analisis."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}>
                <View style={styles.card}>
                    <Text style={styles.title}>Format yang didukung</Text>
                    <Text style={styles.body}>JSON Tabungin dipakai untuk restore backup lengkap. CSV tetap didukung untuk impor transaksi massal, tetapi bukan restore penuh.</Text>
                    <View style={styles.badges}>
                        <ContextBadge icon="code-json" label="JSON backup" tone="success" />
                        <ContextBadge icon="file-delimited-outline" label="CSV transaksi" tone="info" />
                        <ContextBadge icon="shield-check-outline" label="Non-destruktif" tone="primary" />
                    </View>
                </View>

                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.filePicker}
                        onPress={handlePickFile}
                        accessibilityRole="button"
                        accessibilityLabel={selectedFileName ? `Ganti file import, saat ini ${selectedFileName}` : 'Pilih file import'}
                    >
                        <View style={styles.filePickerIcon}>
                            <MaterialCommunityIcons name="file-upload-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.filePickerCopy}>
                            <Text style={styles.filePickerTitle}>{selectedFileName || 'Pilih file import'}</Text>
                            <Text style={styles.filePickerSubtitle}>Tabungin akan menampilkan preview item valid, duplikat, dan baris gagal sebelum commit.</Text>
                        </View>
                    </TouchableOpacity>
                    <Button label="Pilih file" onPress={handlePickFile} variant="primary" />
                </View>

                {!preview ? (
                    <EmptyState
                        icon="database-import-outline"
                        title="Belum ada file dipilih"
                        description="Setelah file dipilih, preview import akan tampil sebelum data benar-benar ditulis."
                        actionLabel="Pilih file"
                        onAction={handlePickFile}
                    />
                ) : (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.title}>Preview import</Text>
                            <View style={styles.previewGrid}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{preview.importedTransactions}</Text>
                                    <Text style={styles.statLabel}>Transaksi valid</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{preview.importedGoals}</Text>
                                    <Text style={styles.statLabel}>Target valid</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{preview.skippedTransactions + preview.skippedGoals}</Text>
                                    <Text style={styles.statLabel}>Duplikat di-skip</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{preview.failedRows}</Text>
                                    <Text style={styles.statLabel}>Baris gagal</Text>
                                </View>
                            </View>
                            <Text style={styles.body}>
                                {preview.fullBackup
                                    ? `Backup JSON ini juga memuat ${preview.importedProfiles} profil, ${preview.importedWallets} dompet, ${preview.importedBudgets} budget, dan ${preview.importedSavingLogs} log tabungan.`
                                    : 'Import berjalan dalam mode merge aman. Data existing tidak akan ditimpa.'}
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.title}>Siap commit ke antrean sync</Text>
                            <Text style={styles.body}>Semua item baru akan ditulis sebagai `pending_create` lalu ikut sinkronisasi normal.</Text>
                            <View style={styles.actions}>
                                <Button label="Pilih file lain" onPress={handlePickFile} variant="outline" style={{ flex: 1 }} />
                                <Button label="Commit import" onPress={handleCommit} variant="primary" style={{ flex: 1 }} disabled={isBusy} loading={isBusy} />
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: { paddingHorizontal: 20, paddingBottom: 108, gap: 18 },
        contentWide: { maxWidth: 920, width: '100%', alignSelf: 'center' },
        card: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 12,
        },
        title: { ...Typography.h4, color: colors.textPrimary },
        body: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 21, color: colors.textSecondary },
        badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        filePicker: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
        },
        filePickerIcon: {
            width: 48,
            height: 48,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        filePickerCopy: { flex: 1, gap: 3 },
        filePickerTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
        filePickerSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 18, color: colors.textSecondary },
        previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        statCard: {
            minWidth: 140,
            flexGrow: 1,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            gap: 4,
        },
        statValue: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: colors.textPrimary },
        statLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        actions: { flexDirection: 'row', gap: 10 },
    });
