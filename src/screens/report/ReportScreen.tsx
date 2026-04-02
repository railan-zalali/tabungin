import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import type { CategorySummary, MonthlySummary } from '../../types/transaction';
import { formatCurrency } from '../../utils/currency';
import { resolveCategoryByKey } from '../../utils/categoryResolver';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InsightPanel } from '../../components/common/InsightPanel';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { EmptyState } from '../../components/common/EmptyState';

type PeriodFilter = 'month' | '3months' | '6months' | 'year';

const PERIOD_OPTIONS: Array<{ id: PeriodFilter; label: string }> = [
    { id: 'month', label: 'Bulan ini' },
    { id: '3months', label: '3 bulan' },
    { id: '6months', label: '6 bulan' },
    { id: 'year', label: 'Tahun ini' },
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

function getPeriodDates(period: PeriodFilter) {
    const now = new Date();
    const end = now.getTime();
    const start = new Date();
    if (period === 'month') start.setDate(1);
    else if (period === '3months') start.setMonth(start.getMonth() - 3);
    else if (period === '6months') start.setMonth(start.getMonth() - 6);
    else {
        start.setMonth(0);
        start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end };
}

function generateHTMLReport(
    expenseCategories: CategorySummary[],
    incomeCategories: CategorySummary[],
    totalIncome: number,
    totalExpense: number,
    period: PeriodFilter,
) {
    const rows = expenseCategories
        .map((item) => `<tr><td>${item.category}</td><td>Pengeluaran</td><td>${formatCurrency(item.total)}</td></tr>`)
        .concat(incomeCategories.map((item) => `<tr><td>${item.category}</td><td>Pemasukan</td><td>${formatCurrency(item.total)}</td></tr>`))
        .join('');

    return `
        <html>
            <body style="font-family: Arial, sans-serif; padding: 24px;">
                <h1>Laporan Tabungin</h1>
                <p>Periode: ${period}</p>
                <p>Total pemasukan: ${formatCurrency(totalIncome)}</p>
                <p>Total pengeluaran: ${formatCurrency(totalExpense)}</p>
                <p>Selisih: ${formatCurrency(totalIncome - totalExpense)}</p>
                <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
                    <thead>
                        <tr>
                            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Kategori</th>
                            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Tipe</th>
                            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Nominal</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
        </html>
    `;
}

export function ReportScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { getCategorySummary, getMonthlyData } = useTransactionStore();
    const { categories, loadCategories } = useCategoryStore();
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [expenseCategories, setExpenseCategories] = useState<CategorySummary[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<CategorySummary[]>([]);
    const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (categories.length === 0) {
            loadCategories();
        }
    }, [categories.length, loadCategories]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const { start, end } = getPeriodDates(period);
                const [expense, income, monthly] = await Promise.all([
                    getCategorySummary('expense', start, end),
                    getCategorySummary('income', start, end),
                    getMonthlyData(),
                ]);
                setExpenseCategories(expense);
                setIncomeCategories(income);
                setMonthlyData(monthly);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [getCategorySummary, getMonthlyData, period]);

    const totalIncome = useMemo(() => incomeCategories.reduce((sum, item) => sum + item.total, 0), [incomeCategories]);
    const totalExpense = useMemo(() => expenseCategories.reduce((sum, item) => sum + item.total, 0), [expenseCategories]);
    const netBalance = totalIncome - totalExpense;
    const maxMonthly = Math.max(...monthlyData.map((item) => Math.max(item.totalIncome, item.totalExpense)), 1);

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const html = generateHTMLReport(expenseCategories, incomeCategories, totalIncome, totalExpense, period);
            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ekspor laporan Tabungin' });
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Laporan"
                subtitle="Snapshot, tren, dan breakdown utama untuk membaca ritme keuanganmu."
                rightSlot={
                    <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF} disabled={isExporting}>
                        {isExporting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <MaterialCommunityIcons name="file-pdf-box" size={22} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                }
                variant="transparent"
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <HeroSummaryCard
                    eyebrow="Snapshot Periode"
                    title="Selisih kas pada periode terpilih"
                    value={formatCurrency(Math.abs(netBalance))}
                    description={netBalance >= 0 ? 'Kondisi masih surplus pada rentang waktu yang sedang dibaca.' : 'Pengeluaran lebih tinggi dari pemasukan pada periode ini.'}
                    icon="chart-areaspline"
                    badges={
                        <>
                            <ContextBadge icon="arrow-up-circle-outline" label={formatCurrency(totalIncome)} inverse />
                            <ContextBadge icon="arrow-down-circle-outline" label={formatCurrency(totalExpense)} inverse />
                        </>
                    }
                    tone={netBalance >= 0 ? 'primary' : 'warning'}
                />

                <View style={styles.periodCard}>
                    <SectionHeader
                        title="Pilih periode"
                        subtitle="Ubah horizon waktu supaya snapshot dan insight tetap relevan."
                    />
                    <SegmentedControl
                        value={period}
                        onChange={setPeriod}
                        scrollable
                        options={PERIOD_OPTIONS}
                    />
                </View>

                <InsightPanel
                    title="Insight cepat"
                    description={
                        expenseCategories[0]
                            ? `Kategori pengeluaran terbesar saat ini adalah ${resolveCategoryByKey(expenseCategories[0].category, categories)?.name ?? expenseCategories[0].category}.`
                            : 'Belum ada pengeluaran yang cukup untuk dibaca pada periode ini.'
                    }
                    badges={
                        <>
                            <ContextBadge
                                icon={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                                label={netBalance >= 0 ? 'Surplus' : 'Defisit'}
                                tone={netBalance >= 0 ? 'success' : 'warning'}
                            />
                            <ContextBadge
                                icon="lightning-bolt-outline"
                                label={totalIncome > 0 ? `${Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100).toFixed(0)}% saving rate` : '0% saving rate'}
                                tone="neutral"
                            />
                        </>
                    }
                />

                {isLoading ? (
                    <EmptyState icon="chart-box-outline" title="Menyiapkan laporan" description="Sedang memuat snapshot dan breakdown kategori." compact />
                ) : expenseCategories.length === 0 && incomeCategories.length === 0 ? (
                    <EmptyState
                        icon="chart-box-outline"
                        title="Belum ada data laporan"
                        description="Tambahkan transaksi dulu agar snapshot dan insight mulai terbentuk."
                    />
                ) : (
                    <>
                        <View style={styles.panel}>
                            <SectionHeader
                                title="Breakdown kategori"
                                subtitle="Kategori dengan dampak terbesar pada periode yang sedang dibaca."
                            />
                            {expenseCategories.slice(0, 5).map((item) => (
                                <View key={`expense-${item.category}`} style={styles.categoryRow}>
                                    <View style={styles.categoryCopy}>
                                        <Text style={styles.categoryTitle}>{resolveCategoryByKey(item.category, categories)?.name ?? item.category}</Text>
                                        <Text style={styles.categoryMeta}>Pengeluaran</Text>
                                    </View>
                                    <Text style={[styles.categoryAmount, { color: colors.danger }]}>{formatCurrency(item.total)}</Text>
                                </View>
                            ))}
                            {incomeCategories.slice(0, 3).map((item) => (
                                <View key={`income-${item.category}`} style={styles.categoryRow}>
                                    <View style={styles.categoryCopy}>
                                        <Text style={styles.categoryTitle}>{resolveCategoryByKey(item.category, categories)?.name ?? item.category}</Text>
                                        <Text style={styles.categoryMeta}>Pemasukan</Text>
                                    </View>
                                    <Text style={[styles.categoryAmount, { color: colors.success }]}>{formatCurrency(item.total)}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.panel}>
                            <SectionHeader
                                title="Tren bulanan"
                                subtitle="Perbandingan cepat pemasukan dan pengeluaran beberapa bulan terakhir."
                            />
                            <View style={styles.chartRow}>
                                {monthlyData.slice(-6).map((month, index) => (
                                    <View key={`${month.month}-${index}`} style={styles.chartGroup}>
                                        <View style={styles.barPair}>
                                            <View
                                                style={[
                                                    styles.chartBar,
                                                    {
                                                        height: Math.max((month.totalIncome / maxMonthly) * 110, 6),
                                                        backgroundColor: colors.success,
                                                    },
                                                ]}
                                            />
                                            <View
                                                style={[
                                                    styles.chartBar,
                                                    {
                                                        height: Math.max((month.totalExpense / maxMonthly) * 110, 6),
                                                        backgroundColor: colors.danger,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.chartLabel}>{MONTH_LABELS[Math.max(0, month.month - 1)]}</Text>
                                    </View>
                                ))}
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
        exportButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        content: {
            paddingHorizontal: 20,
            paddingBottom: 108,
            gap: 18,
        },
        periodCard: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        panel: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 12,
        },
        categoryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
        },
        categoryCopy: {
            flex: 1,
        },
        categoryTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        categoryMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 3,
        },
        categoryAmount: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
        },
        chartRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 10,
            minHeight: 150,
            paddingTop: 18,
        },
        chartGroup: {
            flex: 1,
            alignItems: 'center',
            gap: 8,
        },
        barPair: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 4,
            height: 118,
        },
        chartBar: {
            width: 12,
            borderTopLeftRadius: BorderRadius.sm,
            borderTopRightRadius: BorderRadius.sm,
        },
        chartLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
    });
