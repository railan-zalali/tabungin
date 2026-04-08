import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { MetricCard } from '../../components/common/MetricCard';
import { StatStrip } from '../../components/common/StatStrip';
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
                subtitle="Masukkan backup JSON Tabungin atau CSV transaksi dengan preview yang jelas sebelum commit."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
                eyebrow="Data Recovery"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}
            >
                <HeroSummaryCard
                    eyebrow="Import Preview"
                    title="Restore atau merge data"
                    value={selectedFileName || 'Belum ada file'}
                    description="Tabungin menampilkan preview item valid, duplikat, dan baris gagal sebelum data benar-benar ditulis."
                    icon="database-import-outline"
                    stats={[
                        { label: 'Format utama', value: 'JSON', icon: 'code-json' },
                        { label: 'Format tambahan', value: 'CSV', icon: 'file-delimited-outline' },
                        { label: 'Mode', value: preview?.fullBackup ? 'Restore' : 'Merge aman', icon: 'shield-check-outline' },
                    ]}
                />

                <InlineNotice
                    icon="shield-check-outline"
                    title="Import non-destruktif"
                    description="Data existing tidak langsung ditimpa. Item baru akan lewat jalur preview lalu masuk ke antrean sinkronisasi normal setelah commit."
                    tone="primary"
                />

                <FormSection
                    eyebrow="File Input"
                    title="Pilih file sumber"
                    subtitle="JSON Tabungin dipakai untuk restore lengkap, sedangkan CSV dipakai untuk impor transaksi massal."
                    variant="highlight"
                >
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
                            <Text style={styles.filePickerSubtitle}>
                                Tabungin akan membaca isi file lalu menampilkan preview sebelum commit.
                            </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                    <Button label="Pilih file" onPress={handlePickFile} variant="primary" />
                </FormSection>

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
                        <FormSection
                            eyebrow="Validation"
                            title="Preview import"
                            subtitle="Angka di bawah ini membantu menilai seberapa bersih file yang akan dimasukkan."
                        >
                            <View style={styles.metricGrid}>
                                <MetricCard
                                    label="Transaksi valid"
                                    value={String(preview.importedTransactions)}
                                    icon="swap-horizontal"
                                    tone="primary"
                                />
                                <MetricCard
                                    label="Target valid"
                                    value={String(preview.importedGoals)}
                                    icon="target"
                                    tone="success"
                                />
                                <MetricCard
                                    label="Duplikat di-skip"
                                    value={String(preview.skippedTransactions + preview.skippedGoals)}
                                    icon="content-copy"
                                    tone="warning"
                                />
                                <MetricCard
                                    label="Baris gagal"
                                    value={String(preview.failedRows)}
                                    icon="alert-circle-outline"
                                    tone="danger"
                                />
                            </View>
                            <StatStrip
                                items={[
                                    { label: 'Mode', value: preview.fullBackup ? 'Restore penuh' : 'Merge aman' },
                                    { label: 'Profil', value: String(preview.importedProfiles) },
                                    { label: 'Dompet', value: String(preview.importedWallets) },
                                ]}
                                vertical={metrics.widthClass === 'compact'}
                            />
                            <Text style={styles.body}>
                                {preview.fullBackup
                                    ? `Backup JSON ini juga memuat ${preview.importedBudgets} budget dan ${preview.importedSavingLogs} log tabungan, sehingga cocok untuk pemulihan perangkat atau migrasi penuh.`
                                    : 'Import berjalan dalam mode merge aman. Data yang sudah ada tetap dipertahankan dan item baru ditambahkan lewat alur sinkronisasi normal.'}
                            </Text>
                        </FormSection>

                        <FormSection
                            eyebrow="Commit"
                            title="Siap dimasukkan ke antrean sync"
                            subtitle="Setelah commit, item baru akan ditulis lalu diproses pada siklus sinkronisasi berikutnya."
                            density="compact"
                        >
                            <InlineNotice
                                icon="cloud-sync-outline"
                                description="Kalau file berisi backup penuh, proses commit tetap menjaga ritme sync yang sama supaya perubahan lebih aman dan mudah dilacak."
                                tone="info"
                            />
                            <View style={styles.actions}>
                                <Button label="Pilih file lain" onPress={handlePickFile} variant="outline" style={styles.actionButton} />
                                <Button
                                    label="Commit import"
                                    onPress={handleCommit}
                                    variant="primary"
                                    style={styles.actionButton}
                                    disabled={isBusy}
                                    loading={isBusy}
                                />
                            </View>
                        </FormSection>
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
        body: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 22, color: colors.textSecondary },
        filePicker: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
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
        metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        actions: { flexDirection: 'row', gap: 10 },
        actionButton: { flex: 1 },
    });
