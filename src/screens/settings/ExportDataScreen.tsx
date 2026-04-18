import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useWalletStore } from '../../store/useWalletStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { MetricCard } from '../../components/common/MetricCard';
import { SelectionChip } from '../../components/common/SelectionChip';
import { StatStrip } from '../../components/common/StatStrip';
import { BorderRadius } from '../../constants/theme';
import { useResponsiveMetrics } from '../../utils/responsive';
import {
    buildFullBackupExportData,
    exportGoalsOnly,
    exportToCSV,
    exportToJSON,
    exportToTXT,
    exportTransactionsOnly,
    type ExportFormat,
} from '../../utils/exportData';

type ExportScope = 'all' | 'transactions' | 'goals';

interface ExportOption {
    id: ExportFormat;
    title: string;
    description: string;
    icon: string;
    tone: 'primary' | 'success' | 'warning';
}

const EXPORT_OPTIONS: ExportOption[] = [
    {
        id: 'json',
        title: 'JSON',
        description: 'Backup restore-safe dengan relasi data lengkap.',
        icon: 'code-json',
        tone: 'primary',
    },
    {
        id: 'csv',
        title: 'CSV',
        description: 'Cocok untuk analisis di Excel atau Google Sheets.',
        icon: 'file-delimited-outline',
        tone: 'success',
    },
    {
        id: 'txt',
        title: 'TXT',
        description: 'Ringkasan teks yang cepat dibaca untuk laporan.',
        icon: 'file-document-outline',
        tone: 'warning',
    },
];

const SCOPE_OPTIONS: { id: ExportScope; title: string; description: string; icon: string }[] = [
    {
        id: 'all',
        title: 'Semua data',
        description: 'Pakai saat ingin backup lengkap atau ekspor menyeluruh.',
        icon: 'database-export',
    },
    {
        id: 'transactions',
        title: 'Transaksi',
        description: 'Fokus ke arus kas dan histori pencatatan.',
        icon: 'swap-horizontal',
    },
    {
        id: 'goals',
        title: 'Target',
        description: 'Ambil data target tabungan dan progresnya saja.',
        icon: 'target',
    },
];

function resolveToneStyles(
    option: ExportOption,
    colors: ReturnType<typeof useTheme>['colors'],
) {
    switch (option.tone) {
        case 'success':
            return { iconBg: colors.successBg, iconColor: colors.success, borderColor: `${colors.success}2E` };
        case 'warning':
            return { iconBg: colors.warningBg, iconColor: colors.warning, borderColor: `${colors.warning}2E` };
        case 'primary':
        default:
            return { iconBg: colors.primaryBg, iconColor: colors.primary, borderColor: `${colors.primary}2E` };
    }
}

export function ExportDataScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();

    const { transactions, loadTransactions } = useTransactionStore();
    const { goals, loadGoals } = useSavingStore();
    const loadWallets = useWalletStore((state) => state.loadWallets);

    const [selectedScope, setSelectedScope] = useState<ExportScope>('all');
    const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

    useEffect(() => {
        Promise.all([loadTransactions(), loadGoals(), loadWallets()]).catch((error) => {
            console.error('Failed to prime export data:', error);
        });
    }, [loadGoals, loadTransactions, loadWallets]);

    const handleExport = async (format: ExportFormat) => {
        if (isExporting) return;

        setIsExporting(format);
        try {
            const exportData = {
                version: 1,
                exportedAt: Date.now(),
                transactions,
                goals,
            };

            switch (selectedScope) {
                case 'all':
                    switch (format) {
                        case 'json':
                            await exportToJSON(await buildFullBackupExportData());
                            break;
                        case 'csv':
                            await exportToCSV(exportData);
                            break;
                        case 'txt':
                            await exportToTXT(exportData);
                            break;
                    }
                    break;
                case 'transactions':
                    await exportTransactionsOnly(transactions, format);
                    break;
                case 'goals':
                    await exportGoalsOnly(goals, format);
                    break;
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Gagal mengekspor data');
        } finally {
            setIsExporting(null);
        }
    };

    const selectedScopeLabel =
        selectedScope === 'all' ? 'Semua data' : selectedScope === 'transactions' ? 'Transaksi' : 'Target';

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Ekspor data"
                subtitle="Siapkan backup restore-safe atau hasil ekspor yang enak dibaca untuk analisis."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
                eyebrow="Data Portability"
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, metrics.widthClass !== 'compact' ? styles.contentWide : null]}
                showsVerticalScrollIndicator={false}
            >
                <HeroSummaryCard
                    eyebrow="Export Center"
                    title="Ekspor yang mudah dipahami"
                    value={selectedScopeLabel}
                    description="Pilih cakupan data lalu tentukan format paling cocok untuk backup aman atau analisis lanjutan."
                    icon="database-export"
                    stats={[
                        { label: 'Transaksi', value: String(transactions.length), icon: 'swap-horizontal' },
                        { label: 'Target', value: String(goals.length), icon: 'target' },
                        { label: 'Mode', value: selectedScopeLabel, icon: 'tune-variant' },
                    ]}
                />

                <InlineNotice
                    icon="shield-check-outline"
                    title="Backup aman lebih dulu"
                    description="JSON tetap jadi opsi paling aman untuk restore penuh. CSV dan TXT lebih cocok untuk dibaca, dibagi, atau dianalisis."
                    tone="primary"
                />

                <FormSection
                    eyebrow="Scope"
                    title="Pilih cakupan data"
                    subtitle="Cakupan ini menentukan jenis data yang akan dikumpulkan sebelum file dibentuk."
                    variant="highlight"
                >
                    <View style={styles.selectionWrap}>
                        {SCOPE_OPTIONS.map((option) => (
                            <SelectionChip
                                key={option.id}
                                icon={option.icon}
                                label={option.title}
                                selected={selectedScope === option.id}
                                onPress={() => setSelectedScope(option.id)}
                            />
                        ))}
                    </View>
                    <Text style={styles.scopeDescription}>
                        {SCOPE_OPTIONS.find((option) => option.id === selectedScope)?.description}
                    </Text>
                    <View style={styles.metricGrid}>
                        <MetricCard
                            label="Total transaksi"
                            value={String(transactions.length)}
                            icon="swap-horizontal"
                            tone="primary"
                        />
                        <MetricCard label="Total target" value={String(goals.length)} icon="target" tone="success" />
                    </View>
                </FormSection>

                <FormSection
                    eyebrow="Format"
                    title="Pilih format ekspor"
                    subtitle="Semua format memakai data yang sama, tetapi masing-masing punya tujuan yang berbeda."
                >
                    <View style={styles.optionList}>
                        {EXPORT_OPTIONS.map((option) => {
                            const palette = resolveToneStyles(option, colors);
                            const disabled = Boolean(isExporting && isExporting !== option.id);

                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.optionCard,
                                        { borderColor: palette.borderColor },
                                        disabled ? styles.optionCardDisabled : null,
                                    ]}
                                    onPress={() => handleExport(option.id)}
                                    disabled={Boolean(isExporting)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ekspor data sebagai ${option.title}`}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: palette.iconBg }]}>
                                        {isExporting === option.id ? (
                                            <MaterialCommunityIcons
                                                name="progress-clock"
                                                size={26}
                                                color={palette.iconColor}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons name={option.icon as any} size={26} color={palette.iconColor} />
                                        )}
                                    </View>
                                    <View style={styles.optionCopy}>
                                        <Text style={styles.optionTitle}>{option.title}</Text>
                                        <Text style={styles.optionDescription}>{option.description}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textTertiary} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </FormSection>

                <StatStrip
                    items={[
                        { label: 'Prioritas', value: 'JSON untuk restore' },
                        { label: 'Analisis', value: 'CSV untuk spreadsheet' },
                        { label: 'Laporan', value: 'TXT untuk dibaca cepat' },
                    ]}
                    vertical={metrics.widthClass === 'compact'}
                />

                <FormSection
                    eyebrow="Guidance"
                    title="Sebelum mengekspor"
                    subtitle="Beberapa panduan sederhana ini membantu file hasil ekspor tetap mudah dipakai lagi nanti."
                    density="compact"
                    variant="subtle"
                >
                    <InlineNotice
                        icon="archive-arrow-down-outline"
                        description="Pilih JSON kalau file akan disimpan sebagai cadangan utama atau dipakai kembali untuk restore di perangkat lain."
                        tone="success"
                    />
                    <InlineNotice
                        icon="table-large"
                        description="Pilih CSV saat kamu ingin mengolah pola transaksi lebih lanjut di Excel atau Google Sheets."
                        tone="info"
                    />
                    <InlineNotice
                        icon="text-box-outline"
                        description="Pilih TXT untuk laporan yang mudah dibaca manusia tanpa struktur kolom yang berat."
                        tone="warning"
                    />
                    <Button
                        label="Cek ulang cakupan"
                        onPress={() => setSelectedScope('all')}
                        variant="outline"
                    />
                </FormSection>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        scrollContent: {
            paddingHorizontal: 20,
            paddingBottom: 108,
            gap: 18,
        },
        contentWide: {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
        },
        selectionWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        scopeDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textSecondary,
        },
        metricGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        optionList: {
            gap: 12,
        },
        optionCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
        },
        optionCardDisabled: {
            opacity: 0.56,
        },
        optionIcon: {
            width: 54,
            height: 54,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        optionCopy: {
            flex: 1,
            gap: 3,
        },
        optionTitle: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textPrimary,
        },
        optionDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 18,
            color: colors.textSecondary,
        },
    });
