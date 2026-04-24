import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { exportGoalsOnly, exportToCSV, exportToJSON, exportToTXT, exportTransactionsOnly, type ExportFormat } from '../../utils/exportData';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';

type ExportScope = 'all' | 'transactions' | 'goals';

const SCOPE_OPTIONS: Array<{
    id: ExportScope;
    title: string;
    description: string;
    icon: string;
}> = [
    {
        id: 'all',
        title: 'Semua data',
        description: 'Transaksi dan target tabungan dalam satu paket backup.',
        icon: 'database-export-outline',
    },
    {
        id: 'transactions',
        title: 'Hanya transaksi',
        description: 'Cocok untuk audit arus kas atau analisis kategori.',
        icon: 'swap-horizontal',
    },
    {
        id: 'goals',
        title: 'Hanya target',
        description: 'Fokus pada progres tabungan, target, dan status penyelesaian.',
        icon: 'bullseye-arrow',
    },
];

const FORMAT_OPTIONS: Array<{
    id: ExportFormat;
    title: string;
    description: string;
    icon: string;
    tone: 'primary' | 'success' | 'info';
}> = [
    {
        id: 'json',
        title: 'JSON',
        description: 'Backup paling lengkap untuk restore atau migrasi data.',
        icon: 'code-json',
        tone: 'primary',
    },
    {
        id: 'csv',
        title: 'CSV',
        description: 'Siap dibaca di Excel, Sheets, atau alat analisis lain.',
        icon: 'file-delimited-outline',
        tone: 'success',
    },
    {
        id: 'txt',
        title: 'TXT',
        description: 'Ringkas dan mudah dibaca untuk arsip atau laporan cepat.',
        icon: 'file-document-outline',
        tone: 'info',
    },
];

export function ExportDataScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { contentBottomSpacing } = useScreenLayout();
    const { transactions } = useTransactionStore();
    const { goals } = useSavingStore();
    const [selectedScope, setSelectedScope] = useState<ExportScope>('all');
    const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);

    const selectedScopeLabel = useMemo(
        () => SCOPE_OPTIONS.find((option) => option.id === selectedScope)?.title ?? 'Semua data',
        [selectedScope],
    );

    const handleExport = async (format: ExportFormat) => {
        if (activeFormat) return;

        setActiveFormat(format);
        try {
            const exportData = {
                version: 1,
                exportedAt: Date.now(),
                transactions,
                goals,
            };

            if (selectedScope === 'all') {
                if (format === 'json') await exportToJSON(exportData);
                if (format === 'csv') await exportToCSV(exportData);
                if (format === 'txt') await exportToTXT(exportData);
            } else if (selectedScope === 'transactions') {
                await exportTransactionsOnly(transactions, format);
            } else {
                await exportGoalsOnly(goals, format);
            }
        } finally {
            setActiveFormat(null);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Ekspor data"
                subtitle="Pilih cakupan yang tepat lalu ekspor langsung ke format yang paling berguna."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
            >
                <HeroSummaryCard
                    eyebrow="Backup dan analisis"
                    title="Semua data siap dibawa keluar"
                    value={`${transactions.length + goals.length} item`}
                    description="Pilih satu cakupan yang paling relevan, lalu ekspor tanpa langkah tambahan yang membingungkan."
                    icon="database-export-outline"
                    badges={
                        <>
                            <ContextBadge icon="swap-horizontal" label={`${transactions.length} transaksi`} inverse />
                            <ContextBadge icon="bullseye-arrow" label={`${goals.length} target`} inverse />
                        </>
                    }
                />

                <ContentPanel>
                    <SectionHeader
                        title="Cakupan ekspor"
                        subtitle="Tentukan dulu data apa yang ingin kamu bawa keluar dari aplikasi."
                    />

                    <View style={styles.scopeList}>
                        {SCOPE_OPTIONS.map((option) => {
                            const active = selectedScope === option.id;
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.scopeOption,
                                        active ? styles.scopeOptionActive : null,
                                    ]}
                                    onPress={() => setSelectedScope(option.id)}
                                >
                                    <View style={[styles.scopeIcon, active ? styles.scopeIconActive : null]}>
                                        <MaterialCommunityIcons
                                            name={option.icon as any}
                                            size={22}
                                            color={active ? colors.primary : colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.scopeCopy}>
                                        <Text style={styles.scopeTitle}>{option.title}</Text>
                                        <Text style={styles.scopeDescription}>{option.description}</Text>
                                    </View>
                                    {active ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} /> : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ContentPanel>

                <ContentPanel>
                    <SectionHeader
                        title="Format siap ekspor"
                        subtitle="Setiap kartu di bawah ini langsung menjalankan ekspor untuk cakupan yang sedang aktif."
                    />

                    <View style={styles.badgeRow}>
                        <ContextBadge icon="database-outline" label={selectedScopeLabel} tone="primary" />
                        <ContextBadge icon="gesture-tap-button" label="Satu tap per format" tone="neutral" />
                    </View>

                    <View style={styles.formatList}>
                        {FORMAT_OPTIONS.map((option) => {
                            const isBusy = activeFormat === option.id;
                            const toneColor =
                                option.tone === 'success'
                                    ? colors.success
                                    : option.tone === 'info'
                                      ? colors.info
                                      : colors.primary;
                            const toneBg =
                                option.tone === 'success'
                                    ? colors.successBg
                                    : option.tone === 'info'
                                      ? colors.infoBg
                                      : colors.primaryBg;

                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={styles.formatOption}
                                    onPress={() => handleExport(option.id)}
                                    disabled={Boolean(activeFormat)}
                                >
                                    <View style={[styles.formatIcon, { backgroundColor: toneBg }]}>
                                        {isBusy ? (
                                            <ActivityIndicator size="small" color={toneColor} />
                                        ) : (
                                            <MaterialCommunityIcons name={option.icon as any} size={24} color={toneColor} />
                                        )}
                                    </View>
                                    <View style={styles.formatCopy}>
                                        <Text style={styles.formatTitle}>{option.title}</Text>
                                        <Text style={styles.formatDescription}>{option.description}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ContentPanel>

                <ContentPanel compact>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Cakupan aktif</Text>
                            <Text style={styles.summaryValue}>{selectedScopeLabel}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Siap diekspor</Text>
                            <Text style={styles.summaryValue}>
                                {selectedScope === 'all'
                                    ? transactions.length + goals.length
                                    : selectedScope === 'transactions'
                                      ? transactions.length
                                      : goals.length}
                            </Text>
                        </View>
                    </View>
                </ContentPanel>
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
        scopeList: {
            gap: 10,
        },
        scopeOption: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        scopeOptionActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
        },
        scopeIcon: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
        },
        scopeIconActive: {
            backgroundColor: colors.surface,
        },
        scopeCopy: {
            flex: 1,
        },
        scopeTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        scopeDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 2,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        formatList: {
            gap: 10,
        },
        formatOption: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        formatIcon: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        formatCopy: {
            flex: 1,
        },
        formatTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        formatDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 2,
        },
        summaryRow: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        summaryItem: {
            flex: 1,
            gap: 4,
        },
        summaryDivider: {
            width: 1,
            marginHorizontal: 14,
            backgroundColor: colors.divider,
        },
        summaryLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        summaryValue: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
    });
